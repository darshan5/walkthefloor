import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const PATCH = withSaasAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  try {
    const cat = await prisma.equipmentCategory.update({ where: { id }, data: body });
    return apiSuccess(cat);
  } catch {
    return apiError("Not found", 404);
  }
});

export const DELETE = withSaasAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const cat = await prisma.equipmentCategory.findUnique({
    where: { id },
    include: { _count: { select: { equipmentTypes: true } } },
  });
  if (!cat) return apiError("Not found", 404);
  if (cat._count.equipmentTypes > 0) return apiError("Cannot delete: category has equipment types", 409);

  await prisma.equipmentCategory.delete({ where: { id } });
  return apiSuccess({ deleted: true });
});
