import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const batchSchema = z.object({
  equipmentTypeId: z.string().min(1),
  quantity: z.number().int().min(0).max(20),
});

export const POST = withAuth(async (req, ctx, user) => {
  const { id: locationId } = await ctx.params;
  const body = await req.json();
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const location = await prisma.location.findFirst({
    where: { id: locationId, organizationId: user.organizationId },
  });
  if (!location) return apiError("Location not found", 404);

  const equipmentType = await prisma.equipmentType.findFirst({
    where: { id: parsed.data.equipmentTypeId, organizationId: user.organizationId },
  });
  if (!equipmentType) return apiError("Equipment type not found", 404);

  const current = await prisma.locationEquipment.findMany({
    where: { locationId, equipmentTypeId: parsed.data.equipmentTypeId, isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const desired = parsed.data.quantity;
  const currentCount = current.length;

  if (desired > currentCount) {
    const toAdd = desired - currentCount;
    for (let i = 0; i < toAdd; i++) {
      const num = currentCount + i + 1;
      await prisma.locationEquipment.create({
        data: {
          locationId,
          equipmentTypeId: parsed.data.equipmentTypeId,
          instanceName: `${equipmentType.name} ${num}`,
          sortOrder: num - 1,
        },
      });
    }
  } else if (desired < currentCount) {
    const toRemove = current.slice(desired);
    for (const eq of toRemove) {
      await prisma.locationEquipment.update({
        where: { id: eq.id },
        data: { isActive: false },
      });
    }
  }

  const updated = await prisma.locationEquipment.findMany({
    where: { locationId, equipmentTypeId: parsed.data.equipmentTypeId, isActive: true },
    include: { equipmentType: { select: { id: true, name: true, category: true } } },
    orderBy: { sortOrder: "asc" },
  });

  return apiSuccess({ count: updated.length, equipment: updated });
}, PERMISSIONS.ADMIN_EQUIPMENT);
