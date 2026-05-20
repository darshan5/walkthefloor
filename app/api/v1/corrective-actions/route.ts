import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getCorrectiveActions } from "@/lib/services/corrective-action-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const tab = searchParams.get("tab");
  const status = searchParams.get("status") || undefined;
  const locationId = searchParams.get("locationId") || undefined;

  const filters: any = { status, locationId };
  if (tab === "my") {
    filters.assigneeId = user.id;
  } else {
    filters.locationIds = user.locationIds;
  }

  const cas = await getCorrectiveActions(user.organizationId, filters);
  return apiSuccess(cas);
}, PERMISSIONS.CHECKLISTS_VIEW);
