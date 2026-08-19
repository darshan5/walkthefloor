import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { reorderTask } from "@/lib/services/task-service";
import { z } from "zod";

const schema = z.object({
  position: z.number(),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    await reorderTask(id, user.organizationId, parsed.data.position);
    return apiSuccess({ ok: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.TASKS_CREATE);
