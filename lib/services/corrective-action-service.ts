import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification-service";

export async function getCorrectiveActions(
  organizationId: string,
  filters: {
    locationId?: string;
    assigneeId?: string;
    status?: string;
    locationIds?: string[];
  }
) {
  return prisma.correctiveAction.findMany({
    where: {
      location: { organizationId },
      ...(filters.locationId && { locationId: filters.locationId }),
      ...(filters.assigneeId && { assigneeId: filters.assigneeId }),
      ...(filters.status && { status: filters.status as any }),
      ...(filters.locationIds && { locationId: { in: filters.locationIds } }),
    },
    include: {
      location: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, title: true } },
      createdBy: { select: { id: true, name: true } },
      completion: {
        select: {
          id: true,
          task: { select: { title: true, taskType: true, equipmentType: { select: { name: true } } } },
          instanceTask: { select: { title: true, taskType: true, locationEquipment: { select: { instanceName: true, equipmentType: { select: { name: true } } } } } },
        },
      },
      _count: { select: { comments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getCorrectiveAction(id: string, organizationId: string) {
  return prisma.correctiveAction.findFirst({
    where: { id, location: { organizationId } },
    include: {
      location: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, title: true } },
      createdBy: { select: { id: true, name: true } },
      completion: {
        select: {
          id: true,
          task: {
            select: {
              title: true,
              taskType: true,
              config: true,
              equipmentType: { select: { name: true } },
            },
          },
          instanceTask: {
            select: {
              title: true,
              taskType: true,
              config: true,
              locationEquipment: { select: { instanceName: true, equipmentType: { select: { name: true } } } },
            },
          },
          instance: {
            select: { template: { select: { name: true } }, windowLabel: true },
          },
        },
      },
      comments: {
        include: { },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function updateCAStatus(
  id: string,
  organizationId: string,
  userId: string,
  newStatus: string,
  resolvedNotes?: string
) {
  const ca = await prisma.correctiveAction.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!ca) throw new Error("Corrective action not found");

  const oldStatus = ca.status;
  const data: any = { status: newStatus };

  if (newStatus === "RESOLVED") {
    data.resolvedAt = new Date();
    data.resolvedNotes = resolvedNotes;
  }

  const updated = await prisma.correctiveAction.update({
    where: { id },
    data,
  });

  await prisma.cAComment.create({
    data: {
      correctiveActionId: id,
      userId,
      content: resolvedNotes || `Status changed`,
      statusChange: `${oldStatus} → ${newStatus}`,
    },
  });

  if (ca.assigneeId && ca.assigneeId !== userId) {
    await createNotification({
      userId: ca.assigneeId,
      organizationId,
      type: "ca_status_change",
      title: `CA Updated: ${ca.title}`,
      body: `Status changed from ${oldStatus} to ${newStatus}`,
      link: `/checklists/corrective-actions`,
    });
  }

  return updated;
}

export async function addCAComment(
  caId: string,
  organizationId: string,
  userId: string,
  content: string
) {
  const ca = await prisma.correctiveAction.findFirst({
    where: { id: caId, location: { organizationId } },
  });
  if (!ca) throw new Error("Corrective action not found");

  return prisma.cAComment.create({
    data: {
      correctiveActionId: caId,
      userId,
      content,
    },
  });
}
