import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { rejectWorkOrder } from "@/lib/services/work-order-service";
import { z } from "zod";

const rejectSchema = z.object({
  rejectionNotes: z.string().min(1, "Rejection notes are required").max(2000),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const wo = await rejectWorkOrder(id, user.organizationId, user.id, parsed.data.rejectionNotes);
    return apiSuccess(wo);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("not pending")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.MAINTENANCE_APPROVE);
