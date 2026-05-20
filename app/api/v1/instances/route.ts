import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTodaysInstances } from "@/lib/services/instance-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || user.homeLocationId;

  if (!locationId) return apiError("locationId is required");

  if (!user.locationIds.includes(locationId)) {
    return apiError("Access denied to this location", 403);
  }

  const instances = await getTodaysInstances(locationId, user.organizationId);
  return apiSuccess(instances);
}, PERMISSIONS.CHECKLISTS_VIEW);
