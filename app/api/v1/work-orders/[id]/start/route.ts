import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { startWorkOrder } from "@/lib/services/work-order-service";

export const PATCH = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;

  try {
    const wo = await startWorkOrder(id, user.organizationId, user.id);
    return apiSuccess(wo);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("must be approved")) return apiError(e.message, 409);
    if (e.message.includes("Only the assignee")) return apiError(e.message, 403);
    throw e;
  }
}, PERMISSIONS.MAINTENANCE_VIEW);
