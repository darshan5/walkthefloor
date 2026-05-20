import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess } from "@/lib/api-utils";
import { getAuditLog } from "@/lib/saas/admin-actions";

export const GET = withSaasAuth(async () => {
  const log = await getAuditLog();
  return apiSuccess(log);
});
