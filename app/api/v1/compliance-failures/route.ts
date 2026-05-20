import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getComplianceFailures } from "@/lib/services/dashboard-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab");
  const status = searchParams.get("status") || undefined;

  const filters: any = { status };
  if (tab === "my") filters.userId = user.id;

  const data = await getComplianceFailures(user.organizationId, user.locationIds, filters);
  return apiSuccess(data);
}, PERMISSIONS.CHECKLISTS_VIEW);
