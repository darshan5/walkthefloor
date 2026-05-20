import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getInstance } from "@/lib/services/instance-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const instance = await getInstance(id, user.organizationId);
  if (!instance) return apiError("Not found", 404);
  return apiSuccess(instance);
}, PERMISSIONS.CHECKLISTS_VIEW);
