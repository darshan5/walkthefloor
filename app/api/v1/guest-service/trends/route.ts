import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTrends } from "@/lib/services/guest-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);

  const trends = await getTrends(user.organizationId, user.locationIds, {
    locationId: searchParams.get("locationId") || undefined,
    months: searchParams.get("months") ? parseInt(searchParams.get("months")!) : undefined,
  });

  return apiSuccess(trends);
}, PERMISSIONS.GUEST_SERVICE_VIEW);
