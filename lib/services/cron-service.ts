import { prisma } from "@/lib/prisma";

export async function generateChecklistInstances() {
  const templates = await prisma.checklistTemplate.findMany({
    where: { isActive: true },
    select: {
      id: true,
      schedule: true,
      organizationId: true,
      locationAssignments: { select: { locationId: true } },
    },
  });

  const locations = await prisma.location.findMany({
    where: { isActive: true },
    select: { id: true, organizationId: true, timezone: true, operatingHours: true },
  });

  const locationMap = new Map(locations.map((l) => [l.id, l]));

  let created = 0;

  for (const template of templates) {
    const schedule = template.schedule as any;
    const assignedLocationIds = template.locationAssignments.map((a) => a.locationId);

    if (assignedLocationIds.length === 0) continue;

    for (const locId of assignedLocationIds) {
      const location = locationMap.get(locId);
      if (!location || location.organizationId !== template.organizationId) continue;
      const now = new Date();
      const today = new Date(now.toLocaleString("en-US", { timeZone: location.timezone }));
      today.setHours(0, 0, 0, 0);

      if (!shouldGenerateToday(schedule, today)) continue;

      const storeHours = getStoreHoursForDay(location.operatingHours as any, today);
      if (!storeHours) continue;
      const windows = generateWindows(schedule, today, storeHours);

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

function getStoreHoursForDay(
  operatingHours: Record<string, any> | null,
  today: Date
): { open: string; close: string } | null {
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayName = dayNames[today.getDay()];

  if (operatingHours && operatingHours[dayName]) {
    if (operatingHours[dayName].closed) return null;
    return operatingHours[dayName];
  }

  return { open: "05:00", close: "23:00" };
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

function generateWindows(
  schedule: any,
  today: Date,
  storeHours: { open: string; close: string }
) {
  const [openH, openM] = storeHours.open.split(":").map(Number);
  const [closeH, closeM] = storeHours.close.split(":").map(Number);

  const storeOpen = new Date(today);
  storeOpen.setHours(openH, openM, 0, 0);

  const storeClose = new Date(today);
  storeClose.setHours(closeH, closeM, 0, 0);
  if (storeClose <= storeOpen) storeClose.setDate(storeClose.getDate() + 1);

  if (schedule.frequency.startsWith("every_")) {
    const intervalHours = parseInt(schedule.frequency.replace("every_", "").replace("h", ""));
    return generateIntervalWindows(today, intervalHours, storeOpen, storeClose);
  }

  if (schedule.windows && schedule.windows.length > 0) {
    return schedule.windows
      .map((w: any) => {
        const [startH, startM] = (w.start || "00:00").split(":").map(Number);
        const [endH, endM] = (w.end || "23:59").split(":").map(Number);

        const startDate = new Date(today);
        startDate.setHours(startH, startM, 0, 0);

        const endDate = new Date(today);
        endDate.setHours(endH, endM, 0, 0);
        if (endDate <= startDate) endDate.setDate(endDate.getDate() + 1);

        return { label: w.label, start: w.start, end: w.end, startDate, endDate };
      })
      .filter((w: any) => w.startDate < storeClose && w.endDate > storeOpen);
  }

  return [];
}

function generateIntervalWindows(
  today: Date,
  intervalHours: number,
  storeOpen: Date,
  storeClose: Date
) {
  const windows = [];
  let windowStart = new Date(storeOpen);

  while (windowStart < storeClose) {
    const windowEnd = new Date(windowStart);
    windowEnd.setHours(windowEnd.getHours() + intervalHours);

    if (windowEnd > storeClose) {
      windowEnd.setTime(storeClose.getTime());
    }

    if (windowEnd > windowStart) {
      const startStr = `${String(windowStart.getHours()).padStart(2, "0")}:${String(windowStart.getMinutes()).padStart(2, "0")}`;
      const endStr = `${String(windowEnd.getHours()).padStart(2, "0")}:${String(windowEnd.getMinutes()).padStart(2, "0")}`;

      let label: string;
      const h = windowStart.getHours();
      if (h < 12) label = "AM";
      else if (h < 17) label = "PM";
      else label = "Evening";
      label = `${label} (${startStr})`;

      windows.push({ label, start: startStr, end: endStr, startDate: new Date(windowStart), endDate: new Date(windowEnd) });
    }

    windowStart = new Date(windowEnd);
  }

  return windows;
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
