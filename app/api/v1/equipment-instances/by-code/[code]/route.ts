import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getEquipmentByTrackingCode } from "@/lib/services/equipment-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { code } = await ctx.params;
  const detail = await getEquipmentByTrackingCode(code);
  if (!detail) return apiError("Equipment not found", 404);
  if (detail.location.organizationId !== user.organizationId) return apiError("Not found", 404);
  return apiSuccess(detail);
}, PERMISSIONS.MAINTENANCE_VIEW);
