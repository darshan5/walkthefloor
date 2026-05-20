import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { reorderTasksSchema } from "@/lib/validators/checklist";
import { reorderTasks } from "@/lib/services/checklist-service";

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = reorderTasksSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const result = await reorderTasks(id, user.organizationId, parsed.data.taskIds);
    return apiSuccess(result);
  } catch (e: any) {
    if (e.message === "Template not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_MANAGE);
