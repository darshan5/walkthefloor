import { prisma } from "@/lib/prisma";

export async function getTodaysInstances(locationId: string, organizationId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.checklistInstance.findMany({
    where: {
      locationId,
      location: { organizationId },
      date: { gte: today, lt: tomorrow },
    },
    include: {
      template: {
        select: { id: true, name: true, category: true, schedule: true },
      },
      completions: {
        select: { id: true, taskId: true, isCompliant: true, completedAt: true },
      },
      _count: { select: { completions: true } },
    },
    orderBy: [{ windowStart: "asc" }, { template: { name: "asc" } }],
  });
}

export async function getInstance(instanceId: string, organizationId: string) {
  return prisma.checklistInstance.findFirst({
    where: {
      id: instanceId,
      location: { organizationId },
    },
    include: {
      template: {
        include: {
          tasks: {
            include: {
              equipmentType: { select: { id: true, name: true } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
      location: { select: { id: true, name: true, timezone: true } },
      completions: {
        include: {
          user: { select: { id: true, name: true } },
          correctiveAction: { select: { id: true, status: true } },
        },
      },
    },
  });
}

export async function completeTask(
  instanceId: string,
  taskId: string,
  userId: string,
  organizationId: string,
  data: {
    value: any;
    locationEquipmentId?: string;
    photoUrls?: string[];
    signatureUrl?: string;
    notes?: string;
  }
) {
  const instance = await prisma.checklistInstance.findFirst({
    where: { id: instanceId, location: { organizationId } },
    include: {
      template: {
        include: { tasks: true },
      },
    },
  });
  if (!instance) throw new Error("Instance not found");
  if (instance.status === "MISSED") throw new Error("Cannot complete a missed checklist");

  const task = instance.template.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error("Task not found in this checklist");

  const existing = await prisma.taskCompletion.findFirst({
    where: { instanceId, taskId },
  });
  if (existing) {
    return prisma.taskCompletion.update({
      where: { id: existing.id },
      data: {
        value: data.value,
        isCompliant: checkCompliance(task, data.value),
        photoUrls: data.photoUrls || [],
        signatureUrl: data.signatureUrl,
        notes: data.notes,
        completedAt: new Date(),
        userId,
      },
      include: { correctiveAction: { select: { id: true, status: true } } },
    });
  }

  const isCompliant = checkCompliance(task, data.value);

  const completion = await prisma.taskCompletion.create({
    data: {
      instanceId,
      taskId,
      userId,
      value: data.value,
      isCompliant,
      locationEquipmentId: data.locationEquipmentId,
      photoUrls: data.photoUrls || [],
      signatureUrl: data.signatureUrl,
      notes: data.notes,
    },
    include: { correctiveAction: { select: { id: true, status: true } } },
  });

  if (instance.status === "PENDING") {
    await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: { status: "IN_PROGRESS" },
    });
  }

  if (!isCompliant) {
    await createCorrectiveAction(completion.id, instance, task, data.value, userId);
  }

  const totalRequired = instance.template.tasks.filter((t) => t.isRequired).length;
  const completedCount = await prisma.taskCompletion.count({
    where: {
      instanceId,
      task: { isRequired: true },
    },
  });

  if (completedCount >= totalRequired) {
    const now = new Date();
    const isLate = instance.windowEnd && now > instance.windowEnd;
    await prisma.checklistInstance.update({
      where: { id: instanceId },
      data: {
        status: isLate ? "COMPLETED_LATE" : "COMPLETED",
        isCompliant: !isLate,
        completedAt: now,
      },
    });
  }

  return completion;
}

function checkCompliance(task: any, value: any): boolean {
  const config = task.config as any;
  switch (task.taskType) {
    case "TEMPERATURE":
    case "NUMERIC": {
      const num = typeof value === "object" ? value.temp ?? value.value : value;
      if (typeof num !== "number") return true;
      if (config.min != null && num < config.min) return false;
      if (config.max != null && num > config.max) return false;
      return true;
    }
    case "YES_NO": {
      const answer = typeof value === "object" ? value.answer : value;
      if (config.expectedAnswer == null) return true;
      return String(answer).toLowerCase() === String(config.expectedAnswer).toLowerCase();
    }
    default:
      return true;
  }
}

async function createCorrectiveAction(
  completionId: string,
  instance: any,
  task: any,
  value: any,
  userId: string
) {
  const config = task.config as any;
  let actualValue = "";
  let targetValue = "";
  let validRange = "";

  if (task.taskType === "TEMPERATURE" || task.taskType === "NUMERIC") {
    const num = typeof value === "object" ? value.temp ?? value.value : value;
    const unit = config.unit ? `°${config.unit}` : "";
    actualValue = `${num}${unit}`;
    targetValue = config.target != null ? `${config.target}${unit}` : "";
    validRange = config.min != null && config.max != null
      ? `${config.min}${unit} to ${config.max}${unit}`
      : "";
  } else if (task.taskType === "YES_NO") {
    const answer = typeof value === "object" ? value.answer : value;
    actualValue = String(answer);
    targetValue = config.expectedAnswer || "";
  }

  const orgSettings = await prisma.organization.findFirst({
    where: { id: instance.location?.organizationId || "" },
    select: { settings: true },
  });
  const settings = orgSettings?.settings as any;
  const defaultDueDays = settings?.book?.ca?.defaultDueDays ?? 2;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + defaultDueDays);

  const homeUser = await prisma.user.findFirst({
    where: {
      homeLocationId: instance.locationId,
      role: { name: "Restaurant General Manager" },
      isActive: true,
    },
    select: { id: true },
  });

  await prisma.correctiveAction.create({
    data: {
      title: `${task.title} — Non-Compliant`,
      description: `Recorded ${actualValue}, expected ${targetValue || "compliant value"}`,
      priority: task.isCritical ? "CRITICAL" : "MEDIUM",
      locationId: instance.locationId,
      createdById: userId,
      assigneeId: homeUser?.id || null,
      completionId,
      actualValue,
      targetValue,
      validRange,
      dueDate,
    },
  });
}

export async function getBookDashboard(organizationId: string, locationId?: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const where = {
    location: { organizationId },
    date: { gte: today, lt: tomorrow },
    ...(locationId && { locationId }),
  };

  const [total, completed, missed, inProgress, overdueCAs] = await Promise.all([
    prisma.checklistInstance.count({ where }),
    prisma.checklistInstance.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.checklistInstance.count({ where: { ...where, status: "MISSED" } }),
    prisma.checklistInstance.count({ where: { ...where, status: "IN_PROGRESS" } }),
    prisma.correctiveAction.count({
      where: {
        location: { organizationId },
        ...(locationId && { locationId }),
        status: "OPEN",
      },
    }),
  ]);

  return {
    today: {
      total,
      completed,
      missed,
      inProgress,
      pending: total - completed - missed - inProgress,
    },
    openCAs: overdueCAs,
  };
}
