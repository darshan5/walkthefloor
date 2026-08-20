import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getEquipmentDetail } from "@/lib/services/equipment-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const detail = await getEquipmentDetail(id, user.organizationId);
  if (!detail) return apiError("Not found", 404);
  return apiSuccess({
    history: detail.maintenanceHistory,
    totalEstimatedCost: detail.totalEstimatedCost,
    totalActualCost: detail.totalActualCost,
  });
}, PERMISSIONS.MAINTENANCE_VIEW);
