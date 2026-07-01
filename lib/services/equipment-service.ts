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

