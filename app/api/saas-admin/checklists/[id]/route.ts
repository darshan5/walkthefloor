import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const GET = withSaasAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const template = await prisma.checklistTemplate.findUnique({
    where: { id },
    include: {
      tasks: { orderBy: { sortOrder: "asc" } },
      _count: { select: { instances: true } },
    },
  });
  if (!template) return apiError("Not found", 404);
  return apiSuccess(template);
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  assignmentType: z.enum(["book", "task"]).optional(),
  schedule: z.object({ frequency: z.string() }).optional(),
  isActive: z.boolean().optional(),
  isBuiltIn: z.boolean().optional(),
});

export const PATCH = withSaasAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const existing = await prisma.checklistTemplate.findUnique({ where: { id } });
  if (!existing) return apiError("Not found", 404);

  const template = await prisma.checklistTemplate.update({
    where: { id },
    data: {
      ...parsed.data,
      schedule: parsed.data.schedule ? (parsed.data.schedule as any) : undefined,
    },
  });
  return apiSuccess(template);
});

export const DELETE = withSaasAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  const existing = await prisma.checklistTemplate.findUnique({
    where: { id },
    include: { _count: { select: { instances: true } } },
  });
  if (!existing) return apiError("Not found", 404);

  if (existing._count.instances > 0) {
    const instanceIds = (
      await prisma.checklistInstance.findMany({
        where: { templateId: id },
        select: { id: true },
      })
    ).map((i) => i.id);

    const completionIds = (
      await prisma.taskCompletion.findMany({
        where: { instanceId: { in: instanceIds } },
        select: { id: true },
      })
    ).map((c) => c.id);

    if (completionIds.length > 0) {
      await prisma.cAComment.deleteMany({
        where: { correctiveAction: { completionId: { in: completionIds } } },
      });
      await prisma.correctiveAction.deleteMany({
        where: { completionId: { in: completionIds } },
      });
    }

    await prisma.complianceFailure.deleteMany({ where: { instanceId: { in: instanceIds } } });
    await prisma.taskCompletion.deleteMany({ where: { instanceId: { in: instanceIds } } });
    await prisma.instanceTask.deleteMany({ where: { instanceId: { in: instanceIds } } });
    await prisma.checklistInstance.deleteMany({ where: { templateId: id } });
  }

  await prisma.templateLocationAssignment.deleteMany({ where: { templateId: id } });
  await prisma.checklistTask.deleteMany({ where: { templateId: id } });
  await prisma.checklistTemplate.delete({ where: { id } });

  return apiSuccess({ deleted: true });
});
