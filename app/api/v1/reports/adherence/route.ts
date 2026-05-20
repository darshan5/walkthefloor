import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getAdherenceGrid } from "@/lib/services/dashboard-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const days = parseInt(searchParams.get("days") || "7");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const data = await getAdherenceGrid(user.organizationId, user.locationIds, startDate, endDate);
  return apiSuccess(data);
}, PERMISSIONS.CHECKLISTS_REPORTS);
