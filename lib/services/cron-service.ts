import { prisma } from "@/lib/prisma";

export async function generateChecklistInstances() {
  const templates = await prisma.checklistTemplate.findMany({
    where: { isActive: true },
    select: {
      id: true,
      schedule: true,
      organizationId: true,
      categoryFilters: true,
      locationAssignments: { select: { locationId: true } },
      tasks: {
        where: { equipmentTypeId: null },
        select: { id: true, title: true, taskType: true, config: true, isRequired: true, isCritical: true, requiresPhoto: true, sortOrder: true },
      },
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
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      if (!shouldGenerateToday(schedule, today)) continue;

      const storeHours = getStoreHoursForDay(location.operatingHours as any, today);
      if (!storeHours) continue;
      const windows = generateWindows(schedule, today, storeHours);

      for (const window of windows) {
        try {
          const instance = await prisma.checklistInstance.create({
            data: {
              templateId: template.id,
              locationId: location.id,
              date: today,
              windowLabel: window.label || `${window.start}-${window.end}`,
              windowStart: window.startDate,
              windowEnd: window.endDate,
            },
          });

          await generateInstanceTasks(instance.id, template, locId);
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

async function generateInstanceTasks(instanceId: string, template: any, locationId: string) {
  const categoryFilters = (template.categoryFilters as any[]) || [];
  let sortOrder = 0;

  if (categoryFilters.length > 0) {
    const categoryIds = categoryFilters.map((f: any) => f.categoryId);

    const equipment = await prisma.locationEquipment.findMany({
      where: {
        locationId,
        isActive: true,
        equipmentType: { categoryId: { in: categoryIds } },
      },
      include: {
        equipmentType: {
          include: { equipmentCategory: true },
        },
      },
      orderBy: [{ equipmentType: { name: "asc" } }, { sortOrder: "asc" }],
    });

    for (const eq of equipment) {
      const cat = eq.equipmentType.equipmentCategory;
      if (!cat) continue;

      const filter = categoryFilters.find((f: any) => f.categoryId === cat.id);
      if (!filter) continue;

      const checkTypes = filter.checkTypes || (cat.checkTypes as string[]);
      const rules = cat.complianceRules as any;

      for (const checkType of checkTypes) {
        const rule = rules[checkType];
        let taskType: string = "TEMPERATURE";
        let config: any = {};
        let title = eq.instanceName;

        if (checkType === "temperature") {
          taskType = "TEMPERATURE";
          title = `${eq.instanceName} — Temperature`;
          if (rule) {
            const threshold = rule.threshold ?? rule.maxTemp;
            if (rule.direction === "below") {
              config = { min: threshold, max: 999, target: threshold, unit: rule.unit || "F" };
            } else {
              config = { min: -999, max: threshold, target: threshold, unit: rule.unit || "F" };
            }
          }
        } else if (checkType === "calibration") {
          taskType = "NUMERIC";
          title = `${eq.instanceName} — Calibration`;
          if (rule) {
            config = {
              min: rule.target - rule.tolerance,
              max: rule.target + rule.tolerance,
              target: rule.target,
              unit: rule.unit || "",
            };
          }
        } else if (checkType === "yes_no") {
          taskType = "YES_NO";
          title = rule?.question || `${eq.instanceName} — Check`;
          config = { expectedAnswer: rule?.expectedAnswer || "yes" };
        }

        await prisma.instanceTask.create({
          data: {
            instanceId,
            locationEquipmentId: eq.id,
            title,
            taskType: taskType as any,
            config,
            isRequired: true,
            isCritical: checkType === "temperature",
            sortOrder: sortOrder++,
          },
        });
      }
    }
  }

  for (const task of template.tasks || []) {
    await prisma.instanceTask.create({
      data: {
        instanceId,
        sourceTaskId: task.id,
        title: task.title,
        taskType: task.taskType,
        config: task.config,
        isRequired: task.isRequired,
        isCritical: task.isCritical,
        requiresPhoto: task.requiresPhoto,
        sortOrder: sortOrder++,
      },
    });
  }
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
  storeOpen.setUTCHours(openH, openM, 0, 0);

  const storeClose = new Date(today);
  storeClose.setUTCHours(closeH, closeM, 0, 0);
  if (storeClose <= storeOpen) storeClose.setUTCDate(storeClose.getUTCDate() + 1);

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
        startDate.setUTCHours(startH, startM, 0, 0);

        const endDate = new Date(today);
        endDate.setUTCHours(endH, endM, 0, 0);
        if (endDate <= startDate) endDate.setUTCDate(endDate.getUTCDate() + 1);

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
    windowEnd.setUTCHours(windowEnd.getUTCHours() + intervalHours);

    if (windowEnd > storeClose) {
      windowEnd.setTime(storeClose.getTime());
    }

    if (windowEnd > windowStart) {
      const startStr = `${String(windowStart.getUTCHours()).padStart(2, "0")}:${String(windowStart.getUTCMinutes()).padStart(2, "0")}`;
      const endStr = `${String(windowEnd.getUTCHours()).padStart(2, "0")}:${String(windowEnd.getUTCMinutes()).padStart(2, "0")}`;

      let label: string;
      const h = windowStart.getUTCHours();
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
