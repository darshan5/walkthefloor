import { prisma } from "@/lib/prisma";

export async function getTemperatureLogs(
  organizationId: string,
  locationId?: string,
  limit = 50
) {
  return prisma.temperatureLog.findMany({
    where: {
      location: { organizationId },
      ...(locationId && { locationId }),
    },
    include: {
      location: { select: { name: true } },
      user: { select: { name: true } },
    },
    orderBy: { recordedAt: "desc" },
    take: limit,
  });
}

export async function createTemperatureLog(
  userId: string,
  organizationId: string,
  data: {
    locationId: string;
    equipmentName: string;
    temperature: number;
    unit?: string;
    notes?: string;
  }
) {
  const location = await prisma.location.findFirst({
    where: { id: data.locationId, organizationId },
  });
  if (!location) throw new Error("Location not found");

  return prisma.temperatureLog.create({
    data: {
      locationId: data.locationId,
      userId,
      equipmentName: data.equipmentName,
      temperature: data.temperature,
      unit: data.unit || "F",
      isCompliant: true,
      notes: data.notes,
    },
  });
}
