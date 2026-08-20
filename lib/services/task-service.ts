import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

const TASK_INCLUDE = {
  tags: { include: { tag: true } },
  _count: { select: { subtasks: true, comments: true } },
};

export async function getTasks(
  organizationId: string,
  locationIds: string[],
  filters: {
    status?: string;
    priority?: string;
    tagId?: string;
    tab?: string;
    userId?: string;
    locationId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const where: any = {
    organizationId,
    parentId: null,
  };

  if (filters.locationId) {
    where.locationId = filters.locationId;
  } else {
    where.locationId = { in: locationIds };
  }

  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.tagId) where.tags = { some: { tagId: filters.tagId } };

  if (filters.tab === "my") {
    where.OR = [
      { createdById: filters.userId },
      { assigneeId: filters.userId },
    ];
  } else if (filters.tab === "assigned_by_me") {
    where.createdById = filters.userId;
    where.assigneeId = { not: null };
    where.NOT = { assigneeId: filters.userId };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      ...TASK_INCLUDE,
      subtasks: {
        select: { id: true, title: true, status: true, assigneeId: true, position: true, locationId: true, dueDate: true },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      },
    },
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  const locIds = [...new Set(tasks.map((t) => t.locationId))];
  const userIds = [...new Set([
    ...tasks.map((t) => t.createdById),
    ...tasks.filter((t) => t.assigneeId).map((t) => t.assigneeId!),
  ])];

  const [locations, users] = await Promise.all([
    prisma.location.findMany({
      where: { id: { in: locIds } },
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, title: true },
    }),
  ]);

  const locMap = new Map(locations.map((l) => [l.id, l.name]));
  const userMap = new Map(users.map((u) => [u.id, { name: u.name, title: u.title }]));

  const subtaskAssigneeIds = tasks.flatMap((t) => t.subtasks.filter((s) => s.assigneeId).map((s) => s.assigneeId!));
  if (subtaskAssigneeIds.length) {
    const subUsers = await prisma.user.findMany({
      where: { id: { in: [...new Set(subtaskAssigneeIds)] } },
      select: { id: true, name: true },
    });
    subUsers.forEach((u) => userMap.set(u.id, { name: u.name, title: null }));
  }

  return tasks.map((t) => ({
    ...t,
    locationName: locMap.get(t.locationId) || "Unknown",
    createdByName: userMap.get(t.createdById)?.name || "Unknown",
    assigneeName: t.assigneeId ? userMap.get(t.assigneeId)?.name || null : null,
    subtaskTotal: t.subtasks.length,
    subtaskCompleted: t.subtasks.filter((s) => s.status === "completed").length,
    subtasks: t.subtasks.map((s) => ({
      ...s,
      assigneeName: s.assigneeId ? userMap.get(s.assigneeId)?.name || null : null,
    })),
  }));
}

export async function getTaskCounts(
  organizationId: string,
  locationIds: string[],
  locationId?: string
) {
  const baseWhere = {
    organizationId,
    parentId: null as string | null,
    locationId: locationId ? locationId : { in: locationIds },
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [open, completedMonth, overdue] = await Promise.all([
    prisma.task.count({ where: { ...baseWhere, status: "open" } }),
    prisma.task.count({
      where: { ...baseWhere, status: "completed", completedAt: { gte: monthStart } },
    }),
    prisma.task.count({
      where: {
        ...baseWhere,
        status: "open",
        dueDate: { lt: now },
      },
    }),
  ]);

  return { open, completed: completedMonth, overdue };
}

export async function getTask(id: string, organizationId: string) {
  const task = await prisma.task.findFirst({
    where: { id, organizationId },
    include: {
      ...TASK_INCLUDE,
      subtasks: {
        include: { tags: { include: { tag: true } } },
        orderBy: { createdAt: "asc" },
      },
      comments: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!task) return null;

  const userIds = [
    task.createdById,
    ...(task.assigneeId ? [task.assigneeId] : []),
    ...task.subtasks.filter((s) => s.assigneeId).map((s) => s.assigneeId!),
    ...task.comments.map((c) => c.userId),
  ];
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(userIds)] } },
    select: { id: true, name: true, title: true },
  });
  const userMap = new Map(users.map((u) => [u.id, { name: u.name, title: u.title }]));

  const location = await prisma.location.findFirst({
    where: { id: task.locationId },
    select: { id: true, name: true },
  });

  return {
    ...task,
    locationName: location?.name || "Unknown",
    createdByName: userMap.get(task.createdById)?.name || "Unknown",
    assigneeName: task.assigneeId ? userMap.get(task.assigneeId)?.name || null : null,
    subtasks: task.subtasks.map((s) => ({
      ...s,
      assigneeName: s.assigneeId ? userMap.get(s.assigneeId)?.name || null : null,
    })),
    comments: task.comments.map((c) => ({
      ...c,
      userName: userMap.get(c.userId)?.name || "Unknown",
    })),
  };
}

export async function createTask(
  organizationId: string,
  userId: string,
  userPermissions: string[],
  data: {
    title: string;
    description?: string;
    priority?: string;
    locationId: string;
    assigneeId?: string;
    dueDate?: string;
    tagIds?: string[];
    subtasks?: { title: string; assigneeId?: string }[];
    templateId?: string;
    recurrenceRule?: any;
    source?: string;
    completionId?: string;
    externalId?: string;
  }
) {
  if (data.assigneeId && data.assigneeId !== userId) {
    if (!hasPermission(userPermissions, PERMISSIONS.TASKS_ASSIGN)) {
      throw new Error("You do not have permission to assign tasks to others");
    }
  }

  let title = data.title;
  let baseTitle: string | null = null;
  const dueDate = data.dueDate ? new Date(data.dueDate) : undefined;

  if (data.recurrenceRule && dueDate) {
    baseTitle = data.title;
    title = formatRecurringTitle(baseTitle, dueDate);
  }

  const lastTask = await prisma.task.findFirst({
    where: { organizationId, parentId: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (lastTask?.position ?? 0) + 1;

  const task = await prisma.task.create({
    data: {
      title,
      baseTitle,
      description: data.description,
      priority: (data.priority as any) || "MEDIUM",
      status: "open",
      source: data.source || "manual",
      locationId: data.locationId,
      organizationId,
      createdById: userId,
      assigneeId: data.assigneeId || null,
      dueDate,
      position,
      templateId: data.templateId,
      completionId: data.completionId,
      externalId: data.externalId,
      recurrenceRule: data.recurrenceRule || undefined,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: TASK_INCLUDE,
  });

  if (data.subtasks?.length) {
    for (const sub of data.subtasks) {
      await prisma.task.create({
        data: {
          title: sub.title,
          priority: (data.priority as any) || "MEDIUM",
          status: "open",
          source: data.source || "manual",
          locationId: data.locationId,
          organizationId,
          createdById: userId,
          assigneeId: sub.assigneeId || data.assigneeId || null,
          parentId: task.id,
        },
      });
    }
  }

  await addSystemComment(task.id, userId, "Created task");

  return task;
}

export async function updateTask(
  id: string,
  organizationId: string,
  userId: string,
  userPermissions: string[],
  data: {
    title?: string;
    description?: string | null;
    priority?: string;
    dueDate?: string | null;
    assigneeId?: string | null;
    tagIds?: string[];
  }
) {
  const task = await prisma.task.findFirst({ where: { id, organizationId, parentId: null } });
  if (!task) throw new Error("Task not found");

  const isOwner = task.createdById === userId;
  const canManage = hasPermission(userPermissions, PERMISSIONS.TASKS_MANAGE);
  if (!isOwner && !canManage) throw new Error("Not authorized to edit this task");

  const isAssigned = task.assigneeId && task.assigneeId !== task.createdById;
  if (isAssigned && data.priority && data.priority !== task.priority) {
    throw new Error("Cannot change priority of an assigned task");
  }

  if (data.assigneeId !== undefined && data.assigneeId !== userId && data.assigneeId !== null) {
    if (!hasPermission(userPermissions, PERMISSIONS.TASKS_ASSIGN)) {
      throw new Error("You do not have permission to assign tasks to others");
    }
  }

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;

  if (data.tagIds !== undefined) {
    await prisma.taskItemTag.deleteMany({ where: { taskId: id } });
    if (data.tagIds.length > 0) {
      updateData.tags = { create: data.tagIds.map((tagId) => ({ tagId })) };
    }
  }

  return prisma.task.update({
    where: { id },
    data: updateData,
    include: TASK_INCLUDE,
  });
}

export async function updateTaskStatus(
  id: string,
  organizationId: string,
  userId: string,
  userPermissions: string[],
  newStatus: string
) {
  const task = await prisma.task.findFirst({
    where: { id, organizationId },
    include: { tags: true },
  });
  if (!task) throw new Error("Task not found");

  const isOwner = task.createdById === userId;
  const isAssignee = task.assigneeId === userId;
  const canManage = hasPermission(userPermissions, PERMISSIONS.TASKS_MANAGE);

  if (!isOwner && !isAssignee && !canManage) {
    throw new Error("Not authorized to change task status");
  }

  if (task.status === "missed") {
    throw new Error("Cannot change status of a missed task");
  }

  if (newStatus !== "open" && newStatus !== "completed") {
    throw new Error("Status must be open or completed");
  }

  if (task.status === newStatus) {
    return prisma.task.findFirst({ where: { id }, include: TASK_INCLUDE });
  }

  const updateData: any = { status: newStatus };
  if (newStatus === "completed") {
    updateData.completedAt = new Date();
  } else if (newStatus === "open") {
    updateData.completedAt = null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: updateData,
    include: TASK_INCLUDE,
  });

  const statusLabel = newStatus === "completed" ? "Marked as completed" : "Reopened";
  await addSystemComment(id, userId, statusLabel, newStatus);

  if (newStatus === "completed" && task.recurrenceRule) {
    await createNextRecurrence(task);
  }

  return updated;
}

export async function addComment(
  taskId: string,
  organizationId: string,
  userId: string,
  userPermissions: string[],
  content: string
) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId },
  });
  if (!task) throw new Error("Task not found");

  const isOwner = task.createdById === userId;
  const canManage = hasPermission(userPermissions, PERMISSIONS.TASKS_MANAGE);
  if (!isOwner && !canManage) {
    throw new Error("Only the task owner or a manager can comment");
  }

  return prisma.taskComment.create({
    data: { taskId, userId, content },
  });
}

export async function createSubtask(
  parentId: string,
  organizationId: string,
  userId: string,
  data: { title: string; assigneeId?: string }
) {
  const parent = await prisma.task.findFirst({
    where: { id: parentId, organizationId },
  });
  if (!parent) throw new Error("Parent task not found");
  if (parent.parentId) throw new Error("Cannot nest subtasks beyond 1 level");

  return prisma.task.create({
    data: {
      title: data.title,
      priority: parent.priority,
      status: "open",
      source: parent.source,
      locationId: parent.locationId,
      organizationId,
      createdById: userId,
      assigneeId: data.assigneeId || parent.assigneeId,
      parentId,
    },
  });
}

export async function updateSubtaskStatus(
  subtaskId: string,
  organizationId: string,
  userId: string,
  newStatus: string
) {
  const subtask = await prisma.task.findFirst({
    where: { id: subtaskId, organizationId, parentId: { not: null } },
  });
  if (!subtask) throw new Error("Subtask not found");

  if (newStatus !== "open" && newStatus !== "completed") {
    throw new Error("Subtasks can only be open or completed");
  }

  return prisma.task.update({
    where: { id: subtaskId },
    data: {
      status: newStatus,
      completedAt: newStatus === "completed" ? new Date() : null,
    },
  });
}

export async function processOverdueRecurring(organizationId: string) {
  const now = new Date();
  const overdueRecurring = await prisma.task.findMany({
    where: {
      organizationId,
      parentId: null,
      recurrenceRule: { not: Prisma.JsonNull },
      dueDate: { lt: now },
      status: "open",
    },
    include: { tags: true },
  });

  let processed = 0;
  for (const task of overdueRecurring) {
    await prisma.task.update({
      where: { id: task.id },
      data: { status: "missed" },
    });
    await addSystemComment(task.id, "system", "Marked as missed (overdue)", "missed");
    await createNextRecurrence(task);
    processed++;
  }

  return { processed };
}

async function createNextRecurrence(task: any) {
  if (!task.recurrenceRule || !task.dueDate) return;

  const rule = task.recurrenceRule as { type: string; interval?: number; dayOfWeek?: number; dayOfMonth?: number };
  const nextDue = calculateNextDueDate(task.dueDate, rule);
  const baseTitle = task.baseTitle || task.title;
  const newTitle = formatRecurringTitle(baseTitle, nextDue);

  const tagIds = task.tags?.map((t: any) => t.tagId) || [];

  const parentSubtasks = await prisma.task.findMany({
    where: { parentId: task.id },
    select: { title: true, assigneeId: true },
  });

  const newTask = await prisma.task.create({
    data: {
      title: newTitle,
      baseTitle,
      description: task.description,
      priority: task.priority,
      status: "open",
      source: task.source,
      locationId: task.locationId,
      organizationId: task.organizationId,
      createdById: task.createdById,
      assigneeId: task.assigneeId,
      dueDate: nextDue,
      recurrenceRule: task.recurrenceRule,
      templateId: task.templateId,
      tags: tagIds.length > 0
        ? { create: tagIds.map((tagId: string) => ({ tagId })) }
        : undefined,
    },
  });

  for (const sub of parentSubtasks) {
    await prisma.task.create({
      data: {
        title: sub.title,
        priority: task.priority,
        status: "open",
        source: task.source,
        locationId: task.locationId,
        organizationId: task.organizationId,
        createdById: task.createdById,
        assigneeId: sub.assigneeId,
        parentId: newTask.id,
      },
    });
  }

  return newTask;
}

function calculateNextDueDate(
  currentDue: Date,
  rule: { type: string; interval?: number; dayOfWeek?: number; dayOfMonth?: number }
): Date {
  const next = new Date(currentDue);

  switch (rule.type) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      if (rule.dayOfWeek !== undefined) {
        const diff = (rule.dayOfWeek - next.getDay() + 7) % 7 || 7;
        next.setDate(next.getDate() + diff);
      }
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      if (rule.dayOfMonth !== undefined) {
        next.setDate(rule.dayOfMonth);
      }
      break;
    case "custom":
      next.setDate(next.getDate() + (rule.interval || 1));
      break;
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

function formatRecurringTitle(baseTitle: string, dueDate: Date): string {
  const month = dueDate.getMonth() + 1;
  const day = dueDate.getDate();
  return `${baseTitle} by ${month}/${day}`;
}

async function addSystemComment(
  taskId: string,
  userId: string,
  content: string,
  statusChange?: string
) {
  return prisma.taskComment.create({
    data: { taskId, userId, content, statusChange },
  });
}

export async function reorderTask(
  id: string,
  organizationId: string,
  position: number
) {
  const task = await prisma.task.findFirst({ where: { id, organizationId } });
  if (!task) throw new Error("Task not found");
  return prisma.task.update({ where: { id }, data: { position } });
}

export async function cleanCompletedTasks() {
  const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const result = await prisma.task.deleteMany({
    where: { status: "completed", completedAt: { lt: cutoff }, parentId: null },
  });
  return result.count;
}

export async function assignTaskToLocations(
  taskId: string,
  organizationId: string,
  userId: string,
  locationIds: string[]
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId, parentId: null } });
  if (!task) throw new Error("Task not found");

  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds }, organizationId },
    select: { id: true, name: true },
  });

  const lastSubtask = await prisma.task.findFirst({
    where: { parentId: taskId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  let pos = (lastSubtask?.position ?? 0) + 1;

  const created = [];
  for (const loc of locations) {
    const existing = await prisma.task.findFirst({
      where: { parentId: taskId, locationId: loc.id },
    });
    if (existing) continue;

    const subtask = await prisma.task.create({
      data: {
        title: `${loc.name}: ${task.title}`,
        priority: task.priority,
        status: "open",
        source: "manual",
        locationId: loc.id,
        organizationId,
        createdById: userId,
        parentId: taskId,
        position: pos++,
      },
    });
    created.push(subtask);
  }

  return created;
}
