import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getBookDashboard } from "@/lib/services/instance-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || undefined;

  const dashboard = await getBookDashboard(user.organizationId, locationId);
  return apiSuccess(dashboard);
}, PERMISSIONS.CHECKLISTS_VIEW);
