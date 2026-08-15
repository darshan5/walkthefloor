import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getRoleDashboard } from "@/lib/services/dashboard-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");

  const locationIds = locationId && user.locationIds.includes(locationId)
    ? [locationId]
    : user.locationIds;

  const dashboard = await getRoleDashboard(
    user.organizationId,
    user.id,
    locationIds,
    user.role
  );
  return apiSuccess(dashboard);
}, PERMISSIONS.CHECKLISTS_VIEW);
