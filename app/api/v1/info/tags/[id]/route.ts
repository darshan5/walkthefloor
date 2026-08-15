import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { deleteTag } from "@/lib/services/info-service";

export const DELETE = withAuth(async (_req, ctx, user) => {
  if (!["Director of Operations", "Franchisee"].includes(user.role)) {
    return apiError("Only Director or above can manage tags", 403);
  }
  const { id } = await ctx.params;
  try {
    await deleteTag(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.DOCUMENTS_MANAGE);
