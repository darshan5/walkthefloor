import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTaskProgress } from "@/lib/services/compliance-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const weeks = parseInt(searchParams.get("weeks") || "4");

  const data = await getTaskProgress(user.organizationId, user.locationIds, weeks);
  return apiSuccess(data);
}, PERMISSIONS.CHECKLISTS_REPORTS);
