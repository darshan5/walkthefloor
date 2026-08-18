import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTaskCounts } from "@/lib/services/task-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || undefined;
  const counts = await getTaskCounts(user.organizationId, user.locationIds, locationId);
  return apiSuccess(counts);
}, PERMISSIONS.TASKS_VIEW);
