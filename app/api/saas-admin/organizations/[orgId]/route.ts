import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { getOrganizationDetail } from "@/lib/saas/admin-actions";

export const GET = withSaasAuth(async (_req, ctx) => {
  const { orgId } = await ctx.params;
  try {
    const org = await getOrganizationDetail(orgId);
    return apiSuccess(org);
  } catch (e: any) {
    return apiError(e.message, 404);
  }
});
