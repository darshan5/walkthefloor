import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { reactivateOrganization } from "@/lib/saas/admin-actions";

export const POST = withSaasAuth(async (_req, ctx, admin) => {
  const { orgId } = await ctx.params;
  try {
    await reactivateOrganization(orgId, admin.saasAdminId);
    return apiSuccess({ reactivated: true });
  } catch (e: any) {
    return apiError(e.message, 400);
  }
});
