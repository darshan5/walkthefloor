import { prisma } from "@/lib/prisma";
import type { CreateEquipmentTypeInput, UpdateEquipmentTypeInput } from "@/lib/validators/equipment";

export async function getEquipmentTypes(organizationId: string) {
  return prisma.equipmentType.findMany({
    where: { organizationId },
    include: {
      _count: { select: { locationEquipment: true, checklistTasks: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getEquipmentType(id: string, organizationId: string) {
  return prisma.equipmentType.findFirst({
    where: { id, organizationId },
    include: {
      locationEquipment: {
        include: { location: { select: { id: true, name: true } } },
        orderBy: { instanceName: "asc" },
      },
      checklistTasks: { select: { id: true, title: true, taskType: true } },
    },
  });
}

export async function createEquipmentType(organizationId: string, data: CreateEquipmentTypeInput) {
  return prisma.equipmentType.create({
    data: { ...data, organizationId },
  });
}

export async function updateEquipmentType(id: string, organizationId: string, data: UpdateEquipmentTypeInput) {
  const existing = await prisma.equipmentType.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Equipment type not found");

  return prisma.equipmentType.update({
    where: { id },
    data,
  });
}

export async function deleteEquipmentType(id: string, organizationId: string) {
  const existing = await prisma.equipmentType.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { locationEquipment: true } } },
  });
  if (!existing) throw new Error("Equipment type not found");
  if (existing._count.locationEquipment > 0) {
    throw new Error("Cannot delete: equipment type is assigned to locations");
  }

  return prisma.equipmentType.delete({ where: { id } });
}

export function generateTrackingCode(): string {
  return `WTF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export async function getEquipmentDetail(id: string, organizationId: string) {
  const equipment = await prisma.locationEquipment.findFirst({
    where: { id, location: { organizationId } },
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
      location: { select: { id: true, name: true } },
    },
  });
  if (!equipment) return null;

  const workOrders = await prisma.workOrder.findMany({
    where: { equipmentId: id, location: { organizationId } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      estimatedCost: true,
      actualCost: true,
      createdAt: true,
      completedAt: true,
    },
  });

  const totalEstimatedCost = workOrders.reduce((sum, wo) => sum + (wo.estimatedCost || 0), 0);
  const totalActualCost = workOrders.reduce((sum, wo) => sum + (wo.actualCost || 0), 0);

  return {
    ...equipment,
    maintenanceHistory: workOrders,
    totalEstimatedCost,
    totalActualCost,
  };
}

export async function getEquipmentByTrackingCode(trackingCode: string) {
  const equipment = await prisma.locationEquipment.findFirst({
    where: { trackingCode },
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
      location: { select: { id: true, name: true, organizationId: true } },
    },
  });
  if (!equipment) return null;

  const workOrders = await prisma.workOrder.findMany({
    where: { equipmentId: equipment.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      estimatedCost: true,
      actualCost: true,
      createdAt: true,
      completedAt: true,
    },
  });

  const totalActualCost = workOrders.reduce((sum, wo) => sum + (wo.actualCost || 0), 0);

  return {
    ...equipment,
    maintenanceHistory: workOrders,
    totalActualCost,
  };
}

export async function updateEquipmentDetails(
  id: string,
  organizationId: string,
  data: {
    model?: string | null;
    serialNumber?: string | null;
    installDate?: string | null;
    warrantyExpiry?: string | null;
    purchaseCost?: number | null;
    condition?: string | null;
    trackingCode?: string | null;
    notes?: string | null;
  }
) {
  const equipment = await prisma.locationEquipment.findFirst({
    where: { id, location: { organizationId } },
  });
  if (!equipment) throw new Error("Equipment not found");

  const updateData: any = {};
  if (data.model !== undefined) updateData.model = data.model;
  if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
  if (data.installDate !== undefined) updateData.installDate = data.installDate ? new Date(data.installDate) : null;
  if (data.warrantyExpiry !== undefined) updateData.warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : null;
  if (data.purchaseCost !== undefined) updateData.purchaseCost = data.purchaseCost;
  if (data.condition !== undefined) updateData.condition = data.condition;
  if (data.trackingCode !== undefined) updateData.trackingCode = data.trackingCode;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.locationEquipment.update({
    where: { id },
    data: updateData,
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
      location: { select: { id: true, name: true } },
    },
  });
}

export async function getAllEquipmentInstances(organizationId: string, locationId?: string) {
  return prisma.locationEquipment.findMany({
    where: {
      location: { organizationId },
      ...(locationId && { locationId }),
      isActive: true,
    },
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
      location: { select: { id: true, name: true } },
      _count: { select: { workOrders: true } },
    },
    orderBy: [{ location: { name: "asc" } }, { equipmentType: { name: "asc" } }, { instanceName: "asc" }],
  });
}

