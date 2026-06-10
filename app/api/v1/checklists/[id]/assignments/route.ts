import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const assignments = await prisma.templateLocationAssignment.findMany({
    where: { templateId: id, template: { organizationId: user.organizationId } },
    include: { location: { select: { id: true, name: true, storeNumber: true } } },
  });
  return apiSuccess(assignments);
}, PERMISSIONS.CHECKLISTS_MANAGE);

const updateSchema = z.object({
  locationIds: z.array(z.string()),
});

export const PUT = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const template = await prisma.checklistTemplate.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!template) return apiError("Template not found", 404);

  await prisma.templateLocationAssignment.deleteMany({ where: { templateId: id } });

  if (parsed.data.locationIds.length > 0) {
    await prisma.templateLocationAssignment.createMany({
      data: parsed.data.locationIds.map((locationId) => ({ templateId: id, locationId })),
    });
  }

  return apiSuccess({ assigned: parsed.data.locationIds.length });
}, PERMISSIONS.CHECKLISTS_MANAGE);
