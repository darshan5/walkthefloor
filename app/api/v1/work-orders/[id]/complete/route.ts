import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { completeWorkOrder } from "@/lib/services/work-order-service";

export const PATCH = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;

  try {
    const wo = await completeWorkOrder(id, user.organizationId, user.id);
    return apiSuccess(wo);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("must be")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.MAINTENANCE_MANAGE);
