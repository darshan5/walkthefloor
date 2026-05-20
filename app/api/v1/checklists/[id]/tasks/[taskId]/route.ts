import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateTaskSchema } from "@/lib/validators/checklist";
import { updateTask, deleteTask } from "@/lib/services/checklist-service";

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id, taskId } = await ctx.params;
  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const task = await updateTask(taskId, id, user.organizationId, parsed.data);
    return apiSuccess(task);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_MANAGE);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id, taskId } = await ctx.params;
  try {
    await deleteTask(taskId, id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_MANAGE);
