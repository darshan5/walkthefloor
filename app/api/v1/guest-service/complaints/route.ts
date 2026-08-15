import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getComplaints, getComplaintCounts } from "@/lib/services/guest-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || undefined;
  const locationId = searchParams.get("locationId") || undefined;
  const responded = searchParams.get("responded") || undefined;
  const countsOnly = searchParams.get("counts") === "true";

  if (countsOnly) {
    const counts = await getComplaintCounts(user.organizationId, user.locationIds, month, locationId);
    return apiSuccess(counts);
  }

  const complaints = await getComplaints(user.organizationId, user.locationIds, {
    month,
    locationId,
    responded,
  });
  return apiSuccess(complaints);
}, PERMISSIONS.GUEST_SERVICE_VIEW);
