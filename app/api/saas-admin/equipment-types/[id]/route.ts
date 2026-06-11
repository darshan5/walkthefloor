import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const PATCH = withSaasAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  try {
    const type = await prisma.equipmentType.update({ where: { id }, data: body });
    return apiSuccess(type);
  } catch {
    return apiError("Not found", 404);
  }
});

export const DELETE = withSaasAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const type = await prisma.equipmentType.findUnique({
    where: { id },
    include: { _count: { select: { locationEquipment: true } } },
  });
  if (!type) return apiError("Not found", 404);
  if (type._count.locationEquipment > 0) return apiError("Cannot delete: in use at locations", 409);

  await prisma.equipmentType.delete({ where: { id } });
  return apiSuccess({ deleted: true });
});
