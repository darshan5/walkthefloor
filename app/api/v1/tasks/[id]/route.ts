import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTask, updateTask } from "@/lib/services/task-service";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const task = await getTask(id, user.organizationId);
  if (!task) return apiError("Not found", 404);
  return apiSuccess(task);
}, PERMISSIONS.TASKS_VIEW);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const task = await updateTask(id, user.organizationId, user.id, user.permissions, parsed.data);
    return apiSuccess(task);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("Not authorized") || e.message.includes("permission") || e.message.includes("Cannot change")) return apiError(e.message, 403);
    throw e;
  }
}, PERMISSIONS.TASKS_CREATE);
