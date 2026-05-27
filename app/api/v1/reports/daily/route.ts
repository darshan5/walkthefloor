import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getDailyTasks } from "@/lib/services/compliance-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || user.homeLocationId;
  const dateStr = searchParams.get("date");

  if (!locationId) return apiSuccess([]);

  const date = dateStr ? new Date(dateStr) : new Date();
  date.setHours(0, 0, 0, 0);

  const data = await getDailyTasks(user.organizationId, locationId, date);
  return apiSuccess(data);
}, PERMISSIONS.CHECKLISTS_VIEW);
