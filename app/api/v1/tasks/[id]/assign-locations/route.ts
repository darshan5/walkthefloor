import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { assignTaskToLocations } from "@/lib/services/task-service";
import { z } from "zod";

const schema = z.object({
  locationIds: z.array(z.string()).min(1, "At least one location is required"),
});

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const subtasks = await assignTaskToLocations(id, user.organizationId, user.id, parsed.data.locationIds);
    return apiSuccess(subtasks, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.TASKS_ASSIGN);
