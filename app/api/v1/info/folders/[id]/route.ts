import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { renameFolder, deleteFolder } from "@/lib/services/info-service";
import { z } from "zod";

const renameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = renameSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const folder = await renameFolder(id, user.organizationId, parsed.data.name);
    return apiSuccess(folder);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.DOCUMENTS_MANAGE);

export const DELETE = withAuth(async (_req, ctx, user) => {
  if (!["Director of Operations", "Franchisee"].includes(user.role)) {
    return apiError("Only Director or above can delete", 403);
  }
  const { id } = await ctx.params;
  try {
    await deleteFolder(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("must be empty")) return apiError(e.message);
    throw e;
  }
}, PERMISSIONS.DOCUMENTS_MANAGE);
