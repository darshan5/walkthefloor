import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { BUILT_IN_ROLES } from "@/lib/permissions";
import { execSync } from "child_process";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    execSync("npx prisma migrate deploy", { stdio: "pipe" });

    const existingOrg = await prisma.organization.findFirst();
    if (existingOrg) {
      return Response.json({ message: "Already seeded", orgId: existingOrg.id });
    }

    const org = await prisma.organization.create({
      data: {
        name: "Demo Organization",
        slug: "demo",
        settings: {
          book: {
            taskExpiryMinutes: 15,
            sendDailySummaryEmails: false,
            criticalTaskIds: [],
            ca: { retakeReadingOnCA: false, defaultDueDays: 2 },
            defaultDashboardCategories: [],
          },
          general: { timezone: "America/New_York" },
        },
      },
    });

    const roles: Record<string, string> = {};
    for (const [key, roleDef] of Object.entries(BUILT_IN_ROLES)) {
      const role = await prisma.role.create({
        data: {
          name: roleDef.name,
          permissions: roleDef.permissions as unknown as string[],
          isBuiltIn: true,
          organizationId: org.id,
        },
      });
      roles[key] = role.id;
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        email: "admin@walkthefloor.com",
        hashedPassword,
        name: "Admin User",
        title: "Franchisee",
        userType: "full",
        isActive: true,
        isConfirmed: true,
        organizationId: org.id,
        roleId: roles.FRANCHISEE,
        appAccess: ["checklists", "audits", "maintenance", "guest_service", "admin", "documents", "reports", "support"],
      },
    });

    await prisma.shift.createMany({
      data: [
        { name: "AM", startTime: "05:00", endTime: "13:00", organizationId: org.id },
        { name: "PM", startTime: "13:00", endTime: "21:00", organizationId: org.id },
        { name: "Overnight", startTime: "21:00", endTime: "05:00", organizationId: org.id },
      ],
    });

    const equipmentTypes = await Promise.all(
      [
        { name: "Walkin Freezer", category: "Refrigeration" },
        { name: "Walkin Cooler", category: "Refrigeration" },
        { name: "Reachin Cooler", category: "Refrigeration" },
        { name: "Dairy Dispenser", category: "Beverage" },
        { name: "Hot Holding Unit", category: "Cooking" },
        { name: "Sandwich Station", category: "Refrigeration" },
        { name: "Thermometer", category: "General" },
      ].map((et) =>
        prisma.equipmentType.create({
          data: { ...et, organizationId: org.id },
        })
      )
    );

    const location = await prisma.location.create({
      data: {
        name: "Main",
        storeNumber: "001",
        timezone: "America/New_York",
        complianceStartDate: new Date(),
        isActive: true,
        organizationId: org.id,
      },
    });

    await prisma.location.create({
      data: {
        name: "Downtown",
        storeNumber: "002",
        timezone: "America/New_York",
        complianceStartDate: new Date(),
        isActive: true,
        organizationId: org.id,
      },
    });

    const bookLogsTemplate = await prisma.checklistTemplate.create({
      data: {
        name: "Book Logs",
        category: "Book Logs",
        isBuiltIn: true,
        schedule: {
          frequency: "every_12h",
          windows: [
            { start: "05:00", end: "11:00", label: "AM" },
            { start: "14:00", end: "20:00", label: "PM" },
          ],
        },
        organizationId: org.id,
      },
    });

    const walkinFreezer = equipmentTypes.find((e) => e.name === "Walkin Freezer")!;
    const walkinCooler = equipmentTypes.find((e) => e.name === "Walkin Cooler")!;

    await prisma.checklistTask.createMany({
      data: [
        {
          templateId: bookLogsTemplate.id,
          equipmentTypeId: walkinFreezer.id,
          title: "Walkin Freezer Temperature",
          taskType: "TEMPERATURE",
          config: { min: -10, max: 0, target: -5, unit: "F" },
          sortOrder: 1,
          isRequired: true,
          isCritical: true,
        },
        {
          templateId: bookLogsTemplate.id,
          equipmentTypeId: walkinCooler.id,
          title: "Walkin Cooler Temperature",
          taskType: "TEMPERATURE",
          config: { min: 35, max: 41, target: 37, unit: "F" },
          sortOrder: 2,
          isRequired: true,
          isCritical: true,
        },
      ],
    });

    await prisma.checklistTemplate.create({
      data: {
        name: "Opening Checklist",
        category: "Opening",
        isBuiltIn: true,
        schedule: {
          frequency: "daily",
          timesPerDay: 1,
          windows: [{ start: "05:00", end: "08:00", label: "Opening" }],
        },
        organizationId: org.id,
      },
    });

    await prisma.checklistTemplate.create({
      data: {
        name: "Closing Checklist",
        category: "Closing",
        isBuiltIn: true,
        schedule: {
          frequency: "daily",
          timesPerDay: 1,
          windows: [{ start: "20:00", end: "23:00", label: "Closing" }],
        },
        organizationId: org.id,
      },
    });

    await prisma.checklistTemplate.create({
      data: {
        name: "Food Safety Assessment",
        category: "Food Safety",
        isBuiltIn: true,
        schedule: {
          frequency: "monthly",
          dayOfMonth: 1,
          windows: [{ start: "00:00", end: "23:59" }],
        },
        organizationId: org.id,
      },
    });

    const saasAdminPassword = await bcrypt.hash("superadmin123", 10);
    await prisma.saasAdmin.create({
      data: {
        email: "super@walkthefloor.com",
        hashedPassword: saasAdminPassword,
        name: "Super Admin",
        role: "SUPER_ADMIN",
      },
    });

    await prisma.plan.createMany({
      data: [
        {
          name: "Starter",
          slug: "starter",
          priceMonthly: 99,
          priceAnnual: 990,
          features: { modules: ["checklists"] },
          limits: { locations: 3, users: 10, apiKeysPerOrg: 1 },
          sortOrder: 1,
        },
        {
          name: "Professional",
          slug: "professional",
          priceMonthly: 249,
          priceAnnual: 2490,
          features: { modules: ["checklists", "audits", "maintenance"] },
          limits: { locations: 15, users: 50, apiKeysPerOrg: 5 },
          isPopular: true,
          sortOrder: 2,
        },
        {
          name: "Enterprise",
          slug: "enterprise",
          priceMonthly: 499,
          priceAnnual: 4990,
          features: { modules: ["checklists", "audits", "maintenance", "guest_service"] },
          limits: { locations: 999, users: 999, apiKeysPerOrg: 20 },
          sortOrder: 3,
        },
      ],
    });

    await prisma.systemSettings.upsert({
      where: { id: "system" },
      update: {},
      create: { id: "system" },
    });

    return Response.json({
      message: "Setup complete",
      orgId: org.id,
      locationId: location.id,
      credentials: {
        tenant: { email: "admin@walkthefloor.com", password: "admin123" },
        saasAdmin: { email: "super@walkthefloor.com", password: "superadmin123" },
      },
    });
  } catch (error) {
    console.error("Setup failed:", error);
    return Response.json(
      { error: "Setup failed", message: String(error) },
      { status: 500 }
    );
  }
}
