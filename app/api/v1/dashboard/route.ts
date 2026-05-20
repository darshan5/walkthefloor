import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getRoleDashboard } from "@/lib/services/dashboard-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const dashboard = await getRoleDashboard(
    user.organizationId,
    user.id,
    user.locationIds,
    user.role
  );
  return apiSuccess(dashboard);
}, PERMISSIONS.CHECKLISTS_VIEW);
