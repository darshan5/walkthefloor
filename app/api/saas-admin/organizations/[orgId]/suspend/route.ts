import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { suspendOrganization } from "@/lib/saas/admin-actions";

export const POST = withSaasAuth(async (_req, ctx, admin) => {
  const { orgId } = await ctx.params;
  try {
    await suspendOrganization(orgId, admin.saasAdminId);
    return apiSuccess({ suspended: true });
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
