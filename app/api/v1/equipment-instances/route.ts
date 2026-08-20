import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getAllEquipmentInstances } from "@/lib/services/equipment-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || undefined;
  const instances = await getAllEquipmentInstances(user.organizationId, locationId);
  return apiSuccess(instances);
}, PERMISSIONS.MAINTENANCE_VIEW);
