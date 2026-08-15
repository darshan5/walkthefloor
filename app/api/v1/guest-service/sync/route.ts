import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { syncGuestData } from "@/lib/services/guest-service";

export const POST = withAuth(async (req, _ctx, user) => {
  let daysBack = 60;
  try {
    const body = await req.json();
    if (body.daysBack && typeof body.daysBack === "number") {
      daysBack = Math.min(Math.max(body.daysBack, 1), 365);
    }
  } catch {
    // empty body is fine, use default
  }

  try {
    const result = await syncGuestData(user.organizationId, daysBack);
    return apiSuccess(result);
  } catch (e: any) {
    return apiError(e.message || "Sync failed", 500);
  }
}, PERMISSIONS.ADMIN_ORG);
