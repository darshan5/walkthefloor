import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getWorkOrderCounts } from "@/lib/services/work-order-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const counts = await getWorkOrderCounts(user.organizationId, user.locationIds);
  return apiSuccess(counts);
}, PERMISSIONS.MAINTENANCE_VIEW);
