import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { BUILT_IN_ROLES } from "@/lib/permissions";
import { generateToken } from "@/lib/utils";

export async function getOrganizations() {
  const orgs = await prisma.organization.findMany({
    include: {
      _count: { select: { users: true, locations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const subscriptions = await prisma.subscription.findMany({
    include: { plan: { select: { name: true } } },
  });
  const subMap = new Map(subscriptions.map((s) => [s.organizationId, s]));

  return orgs.map((org) => ({
    ...org,
    subscription: subMap.get(org.id) || null,
  }));
}

export async function getOrganizationDetail(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      users: {
        select: { id: true, name: true, email: true, title: true, isActive: true, role: { select: { name: true } } },
        orderBy: { name: "asc" },
      },
      locations: { select: { id: true, name: true, storeNumber: true, isActive: true } },
      _count: { select: { users: true, locations: true } },
    },
  });
  if (!org) throw new Error("Organization not found");

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: orgId },
    include: { plan: true },
  });

  const webhooks = await prisma.webhookEndpoint.findMany({ where: { organizationId: orgId } });
  const apiKeys = await prisma.apiKey.findMany({
    where: { organizationId: orgId },
    select: { id: true, name: true, keyPrefix: true, scopes: true, isActive: true, lastUsedAt: true, createdAt: true },
  });

  return { ...org, subscription, webhooks, apiKeys };
}

export async function provisionOrganization(data: {
  name: string;
  slug: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  planId: string;
  trialDays?: number;
}, adminId: string) {
  const existing = await prisma.organization.findUnique({ where: { slug: data.slug } });
  if (existing) throw new Error("Organization slug already exists");

  const org = await prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      settings: {
        book: { taskExpiryMinutes: 15, sendDailySummaryEmails: false, criticalTaskIds: [], ca: { retakeReadingOnCA: false, defaultDueDays: 2 }, defaultDashboardCategories: [] },
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

  await prisma.shift.createMany({
    data: [
      { name: "AM", startTime: "05:00", endTime: "13:00", organizationId: org.id },
      { name: "PM", startTime: "13:00", endTime: "21:00", organizationId: org.id },
      { name: "Overnight", startTime: "21:00", endTime: "05:00", organizationId: org.id },
    ],
  });

  const hashedPassword = await bcrypt.hash(data.adminPassword, 10);
  await prisma.user.create({
    data: {
      email: data.adminEmail,
      hashedPassword,
      name: data.adminName,
      title: "Franchisee",
      userType: "full",
      isActive: true,
      isConfirmed: true,
      organizationId: org.id,
      roleId: roles.FRANCHISEE,
      appAccess: ["checklists", "audits", "maintenance", "guest_service", "admin", "documents", "reports", "support"],
    },
  });

  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + (data.trialDays || 14));

  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: data.planId,
      status: "TRIALING",
      trialEndsAt: trialEnd,
      provisionedManually: true,
      provisionedById: adminId,
    },
  });

  await logAdminAction(adminId, "provision_org", org.id, null, { slug: data.slug, plan: data.planId });

  return org;
}

export async function suspendOrganization(orgId: string, adminId: string) {
  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
  if (!sub) throw new Error("No subscription found");

  await prisma.subscription.update({
    where: { organizationId: orgId },
    data: { status: "SUSPENDED", suspendedAt: new Date() },
  });

  await logAdminAction(adminId, "suspend_org", orgId, null, {});
}

export async function reactivateOrganization(orgId: string, adminId: string) {
  const sub = await prisma.subscription.findUnique({ where: { organizationId: orgId } });
  if (!sub) throw new Error("No subscription found");

  await prisma.subscription.update({
    where: { organizationId: orgId },
    data: { status: "ACTIVE", suspendedAt: null },
  });

  await logAdminAction(adminId, "reactivate_org", orgId, null, {});
}

export async function createWebhookEndpoint(orgId: string, channel: string, adminId: string) {
  const secret = generateToken(32);
  const endpoint = await prisma.webhookEndpoint.create({
    data: { organizationId: orgId, channel, secret },
  });
  await logAdminAction(adminId, "create_webhook", orgId, null, { channel });
  return { ...endpoint, secret };
}

export async function createApiKey(
  orgId: string,
  data: { name: string; scopes: string[]; locationIds?: string[]; rateLimit?: number },
  adminId: string
) {
  const rawKey = `wtf_live_${generateToken(32)}`;
  const crypto = await import("crypto");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.substring(0, 16);

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId: orgId,
      name: data.name,
      keyHash,
      keyPrefix,
      scopes: data.scopes,
      locationIds: data.locationIds || [],
      rateLimit: data.rateLimit || 1000,
    },
  });

  await logAdminAction(adminId, "create_api_key", orgId, null, { name: data.name });

  return { ...apiKey, rawKey };
}

export async function revokeApiKey(keyId: string, adminId: string) {
  const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
  if (!key) throw new Error("API key not found");

  await prisma.apiKey.update({ where: { id: keyId }, data: { isActive: false } });
  await logAdminAction(adminId, "revoke_api_key", key.organizationId, null, { keyId });
}

export async function getAuditLog(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getPlans() {
  return prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function getSystemSettings() {
  return prisma.systemSettings.findUnique({ where: { id: "system" } });
}

export async function updateSystemSettings(data: { disableLogin?: boolean }) {
  return prisma.systemSettings.upsert({
    where: { id: "system" },
    update: data,
    create: { id: "system", ...data },
  });
}

async function logAdminAction(
  adminId: string,
  action: string,
  targetOrgId: string | null,
  targetUserId: string | null,
  metadata: any
) {
  await prisma.auditLog.create({
    data: { adminId, action, targetOrgId, targetUserId, metadata },
  });
}
