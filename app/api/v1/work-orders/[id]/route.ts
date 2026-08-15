import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getWorkOrder } from "@/lib/services/work-order-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const wo = await getWorkOrder(id, user.organizationId);
  if (!wo) return apiError("Not found", 404);
  return apiSuccess(wo);
}, PERMISSIONS.MAINTENANCE_VIEW);
