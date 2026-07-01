import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getComplianceGrid, getCategoryCompliance } from "@/lib/services/compliance-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || user.homeLocationId;
  const view = searchParams.get("view") || "grid";
  const days = parseInt(searchParams.get("days") || "30");

  if (!locationId) return apiSuccess([]);

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  if (view === "category") {
    const data = await getCategoryCompliance(user.organizationId, locationId, startDate, endDate);
    return apiSuccess(data);
  }

  const data = await getComplianceGrid(user.organizationId, locationId, startDate, endDate);
  return apiSuccess(data);
}, PERMISSIONS.CHECKLISTS_VIEW);
