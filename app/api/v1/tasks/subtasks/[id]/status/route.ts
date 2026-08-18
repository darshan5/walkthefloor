import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateSubtaskStatus } from "@/lib/services/task-service";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["open", "completed"]),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const subtask = await updateSubtaskStatus(id, user.organizationId, user.id, parsed.data.status);
    return apiSuccess(subtask);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("can only")) return apiError(e.message, 400);
    throw e;
  }
}, PERMISSIONS.TASKS_CREATE);
