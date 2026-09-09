import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getGuestComments } from "@/lib/services/guest-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);

  const comments = await getGuestComments(user.organizationId, user.locationIds, {
    month: searchParams.get("month") || undefined,
    locationId: searchParams.get("locationId") || undefined,
  });

  return apiSuccess(comments);
}, PERMISSIONS.GUEST_SERVICE_VIEW);
