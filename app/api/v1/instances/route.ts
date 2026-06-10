import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTodaysInstances } from "@/lib/services/instance-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || user.homeLocationId;
  const type = searchParams.get("type") || undefined;

  if (!locationId) return apiSuccess([]);

  if (user.locationIds.length > 0 && !user.locationIds.includes(locationId)) {
    return apiSuccess([]);
  }

  const instances = await getTodaysInstances(locationId, user.organizationId, type);
  return apiSuccess(instances);
}, PERMISSIONS.CHECKLISTS_VIEW);
