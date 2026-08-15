import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getComplaint } from "@/lib/services/guest-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const complaint = await getComplaint(id, user.organizationId);
  if (!complaint) return apiError("Not found", 404);
  return apiSuccess(complaint);
}, PERMISSIONS.GUEST_SERVICE_VIEW);
