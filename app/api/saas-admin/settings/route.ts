import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { getSystemSettings, updateSystemSettings } from "@/lib/saas/admin-actions";

export const GET = withSaasAuth(async () => {
  const settings = await getSystemSettings();
  return apiSuccess(settings);
});

export const PATCH = withSaasAuth(async (req, _ctx, admin) => {
  if (admin.saasRole !== "SUPER_ADMIN") {
    return apiError("Only SUPER_ADMIN can modify system settings", 403);
  }
  const body = await req.json();
  const settings = await updateSystemSettings(body);
  return apiSuccess(settings);
});
