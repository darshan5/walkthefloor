import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { deleteTaskTag } from "@/lib/services/task-tag-service";

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  try {
    await deleteTaskTag(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.TASKS_MANAGE);
