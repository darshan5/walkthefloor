import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateTaskStatus } from "@/lib/services/task-service";
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
    const task = await updateTaskStatus(id, user.organizationId, user.id, user.permissions, parsed.data.status);
    return apiSuccess(task);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("Not authorized")) return apiError(e.message, 403);
    if (e.message.includes("Cannot transition")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.TASKS_CREATE);
