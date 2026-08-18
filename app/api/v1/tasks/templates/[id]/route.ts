import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTemplate, updateTemplate, deleteTemplate } from "@/lib/services/task-template-service";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  tagIds: z.array(z.string()).optional(),
  subtasks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  })).optional(),
  recurrenceRule: z.any().optional(),
});

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const template = await getTemplate(id, user.organizationId);
  if (!template) return apiError("Not found", 404);
  return apiSuccess(template);
}, PERMISSIONS.TASKS_VIEW);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const template = await updateTemplate(id, user.organizationId, parsed.data);
    return apiSuccess(template);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.TASKS_MANAGE);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  try {
    await deleteTemplate(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.TASKS_MANAGE);
