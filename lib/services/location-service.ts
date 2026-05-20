import { prisma } from "@/lib/prisma";
import type { CreateLocationInput, UpdateLocationInput } from "@/lib/validators/location";

export async function getLocations(organizationId: string) {
  return prisma.location.findMany({
    where: { organizationId },
    include: {
      region: { select: { id: true, name: true } },
      _count: {
        select: {
          locationEquipment: true,
          homeUsers: true,
          checklistInstances: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getLocation(id: string, organizationId: string) {
  return prisma.location.findFirst({
    where: { id, organizationId },
    include: {
      region: true,
      locationEquipment: {
        where: { isActive: true },
        include: {
          equipmentType: { select: { id: true, name: true, category: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      templateConfigs: {
        include: {
          template: { select: { id: true, name: true, category: true } },
        },
      },
    },
  });
}

export async function createLocation(organizationId: string, data: CreateLocationInput) {
  const { operatingHours, complianceStartDate, ...rest } = data;
  return prisma.location.create({
    data: {
      ...rest,
      operatingHours: operatingHours ? (operatingHours as any) : undefined,
      complianceStartDate: complianceStartDate ? new Date(complianceStartDate) : undefined,
      organizationId,
    },
  });
}

export async function updateLocation(id: string, organizationId: string, data: UpdateLocationInput) {
  const existing = await prisma.location.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Location not found");

  const { operatingHours, complianceStartDate, regionId, ...rest } = data;
  return prisma.location.update({
    where: { id },
    data: {
      ...rest,
      ...(operatingHours !== undefined && { operatingHours: operatingHours as any }),
      ...(complianceStartDate !== undefined && { complianceStartDate: new Date(complianceStartDate) }),
      ...(regionId !== undefined && { region: regionId ? { connect: { id: regionId } } : { disconnect: true } }),
    },
  });
}

export async function deleteLocation(id: string, organizationId: string) {
  const existing = await prisma.location.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { checklistInstances: true, homeUsers: true } } },
  });
  if (!existing) throw new Error("Location not found");
  if (existing._count.checklistInstances > 0 || existing._count.homeUsers > 0) {
    throw new Error("Cannot delete: location has data or assigned users");
  }

  return prisma.location.delete({ where: { id } });
}

export async function getLocationEquipment(locationId: string, organizationId: string) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId },
  });
  if (!location) throw new Error("Location not found");

  return prisma.locationEquipment.findMany({
    where: { locationId, isActive: true },
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
    },
    orderBy: [{ equipmentType: { name: "asc" } }, { sortOrder: "asc" }],
  });
}

export async function addEquipmentToLocation(
  locationId: string,
  organizationId: string,
  data: { equipmentTypeId: string; instanceName: string; sortOrder?: number }
) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId },
  });
  if (!location) throw new Error("Location not found");

  const equipmentType = await prisma.equipmentType.findFirst({
    where: { id: data.equipmentTypeId, organizationId },
  });
  if (!equipmentType) throw new Error("Equipment type not found");

  return prisma.locationEquipment.create({
    data: {
      locationId,
      equipmentTypeId: data.equipmentTypeId,
      instanceName: data.instanceName,
      sortOrder: data.sortOrder ?? 0,
    },
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
    },
  });
}

export async function removeEquipmentFromLocation(equipmentId: string, locationId: string, organizationId: string) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId },
  });
  if (!location) throw new Error("Location not found");

  const equipment = await prisma.locationEquipment.findFirst({
    where: { id: equipmentId, locationId },
  });
  if (!equipment) throw new Error("Equipment not found");

  return prisma.locationEquipment.update({
    where: { id: equipmentId },
    data: { isActive: false },
  });
}

export async function updateEquipmentInstance(
  equipmentId: string,
  locationId: string,
  organizationId: string,
  data: { instanceName?: string; sortOrder?: number }
) {
  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId },
  });
  if (!location) throw new Error("Location not found");

  return prisma.locationEquipment.update({
    where: { id: equipmentId },
    data,
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
    },
  });
}

export async function cloneBookConfig(
  targetLocationId: string,
  sourceLocationId: string,
  organizationId: string
) {
  const [source, target] = await Promise.all([
    prisma.location.findFirst({ where: { id: sourceLocationId, organizationId } }),
    prisma.location.findFirst({ where: { id: targetLocationId, organizationId } }),
  ]);
  if (!source) throw new Error("Source location not found");
  if (!target) throw new Error("Target location not found");

  const sourceEquipment = await prisma.locationEquipment.findMany({
    where: { locationId: sourceLocationId, isActive: true },
  });

  const sourceConfigs = await prisma.locationTemplateConfig.findMany({
    where: { locationId: sourceLocationId },
  });

  await prisma.locationEquipment.updateMany({
    where: { locationId: targetLocationId },
    data: { isActive: false },
  });

  if (sourceEquipment.length > 0) {
    await prisma.locationEquipment.createMany({
      data: sourceEquipment.map((eq) => ({
        locationId: targetLocationId,
        equipmentTypeId: eq.equipmentTypeId,
        instanceName: eq.instanceName,
        sortOrder: eq.sortOrder,
      })),
    });
  }

  await prisma.locationTemplateConfig.deleteMany({
    where: { locationId: targetLocationId },
  });

  if (sourceConfigs.length > 0) {
    await prisma.locationTemplateConfig.createMany({
      data: sourceConfigs.map((cfg) => ({
        locationId: targetLocationId,
        templateId: cfg.templateId,
        windowOverrides: cfg.windowOverrides as any,
      })),
    });
  }

  return { clonedEquipment: sourceEquipment.length, clonedConfigs: sourceConfigs.length };
}
