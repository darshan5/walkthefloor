import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { createTaskSchema } from "@/lib/validators/checklist";
import { addTask } from "@/lib/services/checklist-service";

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const task = await addTask(id, user.organizationId, parsed.data);
    return apiSuccess(task, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_MANAGE);
