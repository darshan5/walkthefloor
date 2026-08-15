import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { syncGuestData } from "@/lib/services/guest-service";

export const POST = withAuth(async (_req, _ctx, user) => {
  try {
    const result = await syncGuestData(user.organizationId);
    return apiSuccess(result);
  } catch (e: any) {
    return apiError(e.message || "Sync failed", 500);
  }
}, PERMISSIONS.ADMIN_ORG);
