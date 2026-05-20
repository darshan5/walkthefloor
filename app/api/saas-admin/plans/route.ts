import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess } from "@/lib/api-utils";
import { getPlans } from "@/lib/saas/admin-actions";

export const GET = withSaasAuth(async () => {
  const plans = await getPlans();
  return apiSuccess(plans);
});
