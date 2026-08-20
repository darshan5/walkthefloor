import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { completeWorkOrder } from "@/lib/services/work-order-service";
import { z } from "zod";

const completeSchema = z.object({
  completionNotes: z.string().min(1, "Completion notes are required").max(2000),
  actualCost: z.number().min(0, "Actual cost is required"),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const wo = await completeWorkOrder(
      id,
      user.organizationId,
      user.id,
      parsed.data.completionNotes,
      parsed.data.actualCost
    );
    return apiSuccess(wo);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("must be")) return apiError(e.message, 409);
    if (e.message.includes("required")) return apiError(e.message, 400);
    throw e;
  }
}, PERMISSIONS.MAINTENANCE_MANAGE);
