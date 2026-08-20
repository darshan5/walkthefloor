import { prisma } from "@/lib/prisma";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { createNotificationsForMany } from "@/lib/services/notification-service";
import { sendEmail, workOrderApprovalEmail } from "@/lib/email";

const WO_INCLUDE = {
  location: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true, title: true } },
  approvedBy: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true, title: true } },
  vendor: { select: { id: true, name: true, specialty: true } },
  equipment: {
    select: {
      id: true,
      instanceName: true,
      equipmentType: { select: { name: true } },
    },
  },
  _count: { select: { comments: true } },
};

export async function getWorkOrders(
  organizationId: string,
  filters: {
    locationId?: string;
    status?: string;
    priority?: string;
    tab?: string;
    userId?: string;
    locationIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }
) {
  const where: any = {
    location: { organizationId },
  };

  if (filters.locationId) where.locationId = filters.locationId;
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;

  if (filters.tab === "my") {
    where.createdById = filters.userId;
  } else if (filters.tab === "needs_approval") {
    where.status = "pending_approval";
    where.locationId = { in: filters.locationIds };
  } else {
    where.locationId = { in: filters.locationIds };
  }

  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
  }

  return prisma.workOrder.findMany({
    where,
    include: WO_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getWorkOrderCounts(organizationId: string, locationIds: string[]) {
  const where = {
    location: { organizationId },
    locationId: { in: locationIds },
  };

  const [pendingApproval, approved, inProgress, completed] = await Promise.all([
    prisma.workOrder.count({ where: { ...where, status: "pending_approval" } }),
    prisma.workOrder.count({ where: { ...where, status: "approved" } }),
    prisma.workOrder.count({ where: { ...where, status: "in_progress" } }),
    prisma.workOrder.count({ where: { ...where, status: "completed" } }),
  ]);

  return { pendingApproval, approved, inProgress, completed };
}

export async function getWorkOrder(id: string, organizationId: string) {
  return prisma.workOrder.findFirst({
    where: { id, location: { organizationId } },
    include: {
      ...WO_INCLUDE,
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          workOrder: false,
        },
      },
    },
  });
}

export async function createWorkOrder(
  organizationId: string,
  userId: string,
  userPermissions: string[],
  data: {
    title: string;
    description?: string;
    priority: string;
    locationId: string;
    equipmentId?: string;
    photoUrls?: string[];
    dueDate?: string;
    assigneeId?: string;
    vendorId?: string;
    estimatedCost?: number;
  }
) {
  const canApprove = hasPermission(userPermissions, PERMISSIONS.MAINTENANCE_APPROVE);
  const isAutoApproved = canApprove && (data.assigneeId || data.vendorId);

  const wo = await prisma.workOrder.create({
    data: {
      title: data.title,
      description: data.description,
      priority: data.priority as any,
      status: isAutoApproved ? "approved" : "pending_approval",
      locationId: data.locationId,
      equipmentId: data.equipmentId,
      createdById: userId,
      photoUrls: data.photoUrls || [],
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      ...(isAutoApproved && {
        approvedById: userId,
        approvedAt: new Date(),
        assigneeId: data.assigneeId,
        vendorId: data.vendorId,
        estimatedCost: data.estimatedCost,
      }),
    },
    include: WO_INCLUDE,
  });

  if (isAutoApproved) {
    await addSystemComment(wo.id, userId, "Created and approved work order");
  } else {
    await addSystemComment(wo.id, userId, "Submitted work order for approval");
    await notifyApprovers(wo.locationId, organizationId, wo.id, wo.title, {
      description: data.description,
      priority: data.priority,
      locationName: wo.location.name,
      createdByName: wo.createdBy.name,
    });
  }

  return wo;
}

export async function approveWorkOrder(
  id: string,
  organizationId: string,
  userId: string,
  data: {
    assigneeId?: string;
    vendorId?: string;
    estimatedCost?: number;
    dueDate?: string;
    notes?: string;
  }
) {
  const wo = await prisma.workOrder.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!wo) throw new Error("Work order not found");
  if (wo.status !== "pending_approval") throw new Error("Work order is not pending approval");
  if (!data.assigneeId && !data.vendorId) throw new Error("Must assign to a user or vendor");
  if (data.assigneeId && data.vendorId) throw new Error("Cannot assign to both a user and vendor");

  const updated = await prisma.workOrder.update({
    where: { id },
    data: {
      status: "approved",
      approvedById: userId,
      approvedAt: new Date(),
      assigneeId: data.assigneeId || null,
      vendorId: data.vendorId || null,
      estimatedCost: data.estimatedCost,
      dueDate: data.dueDate ? new Date(data.dueDate) : wo.dueDate,
    },
    include: WO_INCLUDE,
  });

  const note = data.notes ? `Approved: ${data.notes}` : "Approved work order";
  await addSystemComment(id, userId, note, "approved");

  if (data.assigneeId) {
    await createNotificationsForMany(
      [data.assigneeId],
      organizationId,
      "wo_assigned",
      `Work Order Assigned: ${wo.title}`,
      "You have been assigned a maintenance work order",
      `/maintenance/${id}`
    );
  }

  return updated;
}

export async function rejectWorkOrder(
  id: string,
  organizationId: string,
  userId: string,
  rejectionNotes: string
) {
  const wo = await prisma.workOrder.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!wo) throw new Error("Work order not found");
  if (wo.status !== "pending_approval") throw new Error("Work order is not pending approval");

  const updated = await prisma.workOrder.update({
    where: { id },
    data: {
      status: "rejected",
      rejectedAt: new Date(),
      rejectionNotes,
    },
    include: WO_INCLUDE,
  });

  await addSystemComment(id, userId, `Rejected: ${rejectionNotes}`, "rejected");

  await createNotificationsForMany(
    [wo.createdById],
    organizationId,
    "wo_rejected",
    `Work Order Rejected: ${wo.title}`,
    rejectionNotes,
    `/maintenance/${id}`
  );

  return updated;
}

export async function startWorkOrder(id: string, organizationId: string, userId: string) {
  const wo = await prisma.workOrder.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!wo) throw new Error("Work order not found");
  if (wo.status !== "approved") throw new Error("Work order must be approved to start");
  if (wo.assigneeId && wo.assigneeId !== userId) throw new Error("Only the assignee can start this work order");

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status: "in_progress" },
    include: WO_INCLUDE,
  });

  await addSystemComment(id, userId, "Started work", "in_progress");
  return updated;
}

export async function completeWorkOrder(
  id: string,
  organizationId: string,
  userId: string,
  completionNotes: string,
  actualCost: number
) {
  if (!completionNotes?.trim()) throw new Error("Completion notes are required");
  if (actualCost == null || actualCost < 0) throw new Error("Actual cost is required");

  const wo = await prisma.workOrder.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!wo) throw new Error("Work order not found");
  if (wo.status !== "in_progress" && wo.status !== "approved") {
    throw new Error("Work order must be in progress or approved to complete");
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status: "completed", completedAt: new Date(), actualCost },
    include: WO_INCLUDE,
  });

  await addSystemComment(id, userId, `Completed: ${completionNotes}\nActual cost: $${actualCost.toFixed(2)}`, "completed");
  return updated;
}

export async function cancelWorkOrder(id: string, organizationId: string, userId: string) {
  const wo = await prisma.workOrder.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!wo) throw new Error("Work order not found");
  if (wo.status === "completed" || wo.status === "rejected" || wo.status === "cancelled") {
    throw new Error("Cannot cancel a work order that is already completed, rejected, or cancelled");
  }

  const updated = await prisma.workOrder.update({
    where: { id },
    data: { status: "cancelled" },
    include: WO_INCLUDE,
  });

  await addSystemComment(id, userId, "Cancelled work order", "cancelled");
  return updated;
}

export async function updateWorkOrderCost(
  id: string,
  organizationId: string,
  data: {
    actualCost?: number;
    expenseNotes?: string;
    invoiceUrl?: string;
  }
) {
  const wo = await prisma.workOrder.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!wo) throw new Error("Work order not found");
  if (["completed", "rejected", "cancelled"].includes(wo.status)) {
    throw new Error("Cannot modify a closed work order");
  }

  return prisma.workOrder.update({
    where: { id },
    data,
    include: WO_INCLUDE,
  });
}

export async function updateWorkOrderEquipment(
  id: string,
  organizationId: string,
  equipmentId: string | null
) {
  const wo = await prisma.workOrder.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!wo) throw new Error("Work order not found");
  if (["completed", "rejected", "cancelled"].includes(wo.status)) {
    throw new Error("Cannot modify a closed work order");
  }

  return prisma.workOrder.update({
    where: { id },
    data: { equipmentId },
    include: WO_INCLUDE,
  });
}

export async function addComment(
  workOrderId: string,
  organizationId: string,
  userId: string,
  content: string
) {
  const wo = await prisma.workOrder.findFirst({
    where: { id: workOrderId, location: { organizationId } },
  });
  if (!wo) throw new Error("Work order not found");

  return prisma.workOrderComment.create({
    data: { workOrderId, userId, content },
  });
}

async function addSystemComment(
  workOrderId: string,
  userId: string,
  content: string,
  statusChange?: string
) {
  return prisma.workOrderComment.create({
    data: { workOrderId, userId, content, statusChange },
  });
}

async function notifyApprovers(
  locationId: string,
  organizationId: string,
  workOrderId: string,
  title: string,
  extra?: { description?: string; priority: string; locationName: string; createdByName: string }
) {
  const roles = await prisma.role.findMany({
    where: { organizationId },
    select: { id: true, permissions: true },
  });

  const approverRoleIds = roles
    .filter((r) => {
      const perms = r.permissions as string[];
      return perms.includes(PERMISSIONS.MAINTENANCE_APPROVE);
    })
    .map((r) => r.id);

  if (approverRoleIds.length === 0) return;

  const approvers = await prisma.user.findMany({
    where: {
      organizationId,
      isActive: true,
      roleId: { in: approverRoleIds },
      OR: [
        { homeLocationId: locationId },
        { userLocations: { some: { locationId } } },
      ],
    },
    select: { id: true, email: true },
  });

  if (approvers.length === 0) return;

  await createNotificationsForMany(
    approvers.map((a) => a.id),
    organizationId,
    "wo_pending_approval",
    `New Maintenance Request: ${title}`,
    "A new work order is pending your approval",
    `/maintenance/${workOrderId}`
  );

  if (extra) {
    const emails = approvers.map((a) => a.email).filter(Boolean) as string[];
    if (emails.length > 0) {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "";
      const { subject, html } = workOrderApprovalEmail({
        title,
        priority: extra.priority,
        description: extra.description,
        locationName: extra.locationName,
        createdByName: extra.createdByName,
        workOrderUrl: `${baseUrl}/maintenance/${workOrderId}`,
      });
      await sendEmail({ to: emails, subject, html });
    }
  }
}
