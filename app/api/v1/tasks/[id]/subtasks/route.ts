import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { createSubtask } from "@/lib/services/task-service";
import { z } from "zod";

const subtaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  assigneeId: z.string().optional(),
});

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = subtaskSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const subtask = await createSubtask(id, user.organizationId, user.id, parsed.data);
    return apiSuccess(subtask, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("Cannot nest")) return apiError(e.message, 400);
    throw e;
  }
}, PERMISSIONS.TASKS_CREATE);
