import { prisma } from "@/lib/prisma";

export async function generateChecklistInstances() {
  const templates = await prisma.checklistTemplate.findMany({
    where: { isActive: true },
    select: { id: true, schedule: true, organizationId: true },
  });

  const locations = await prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, organizationId: true, timezone: true },
  });

  let created = 0;

  for (const template of templates) {
    const schedule = template.schedule as any;
    const orgLocations = locations.filter((l) => l.organizationId === template.organizationId);

    for (const location of orgLocations) {
      const now = new Date();
      const today = new Date(now.toLocaleString("en-US", { timeZone: location.timezone }));
      today.setHours(0, 0, 0, 0);

      if (!shouldGenerateToday(schedule, today)) continue;

      const windows = getWindows(schedule, today, location.timezone);

      for (const window of windows) {
        try {
          await prisma.checklistInstance.create({
            data: {
              templateId: template.id,
              locationId: location.id,
              date: today,
              windowLabel: window.label || `${window.start}-${window.end}`,
              windowStart: window.startDate,
              windowEnd: window.endDate,
            },
          });
          created++;
        } catch (e: any) {
          if (e.code !== "P2002") throw e;
        }
      }
    }
  }

  return { created };
}

function shouldGenerateToday(schedule: any, today: Date): boolean {
  switch (schedule.frequency) {
    case "daily":
    case "every_4h":
    case "every_8h":
    case "every_12h":
      return true;
    case "weekly": {
      const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
      const todayName = dayNames[today.getDay()];
      return schedule.days?.includes(todayName) ?? false;
    }
    case "monthly":
      return today.getDate() === (schedule.dayOfMonth || 1);
    case "custom":
      return true;
    default:
      return false;
  }
}

function getWindows(schedule: any, today: Date, timezone: string) {
  const windows = schedule.windows || [];
  return windows.map((w: any) => {
    const [startH, startM] = (w.start || "00:00").split(":").map(Number);
    const [endH, endM] = (w.end || "23:59").split(":").map(Number);

    const startDate = new Date(today);
    startDate.setHours(startH, startM, 0, 0);

    const endDate = new Date(today);
    endDate.setHours(endH, endM, 0, 0);
    if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);

    return {
      label: w.label,
      start: w.start,
      end: w.end,
      startDate,
      endDate,
    };
  });
}

export async function flagOverdueItems() {
  const now = new Date();

  const missedInstances = await prisma.checklistInstance.findMany({
    where: {
      status: { in: ["PENDING", "IN_PROGRESS"] },
      windowEnd: { lt: now },
    },
    include: {
      template: { select: { id: true, name: true } },
      location: { select: { id: true, organizationId: true } },
    },
  });

  let missedCount = 0;
  let failuresCreated = 0;

  for (const instance of missedInstances) {
    await prisma.checklistInstance.update({
      where: { id: instance.id },
      data: { status: "MISSED", isCompliant: false },
    });
    missedCount++;

    const rgm = await prisma.user.findFirst({
      where: {
        homeLocationId: instance.locationId,
        isActive: true,
        role: { name: "Restaurant General Manager" },
      },
      select: { id: true },
    });

    try {
      await prisma.complianceFailure.create({
        data: {
          instanceId: instance.id,
          templateId: instance.templateId,
          locationId: instance.locationId,
          userId: rgm?.id || null,
          windowLabel: instance.windowLabel,
          windowStart: instance.windowStart,
          windowEnd: instance.windowEnd,
        },
      });
      failuresCreated++;
    } catch (e: any) {
      if (e.code !== "P2002") throw e;
    }
  }

  const overdueCAs = await prisma.correctiveAction.updateMany({
    where: {
      status: "OPEN",
      dueDate: { lt: now },
    },
    data: { status: "OVERDUE" },
  });

  return {
    missedInstances: missedCount,
    failuresCreated,
    overdueCAs: overdueCAs.count,
  };
}
