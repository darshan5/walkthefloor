import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getItem, updateItem, deleteItem } from "@/lib/services/info-service";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  url: z.string().url().optional(),
  description: z.string().max(2000).nullable().optional(),
  folderId: z.string().nullable().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const item = await getItem(id, user.organizationId);
  if (!item) return apiError("Not found", 404);
  return apiSuccess(item);
}, PERMISSIONS.DOCUMENTS_VIEW);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const item = await updateItem(id, user.organizationId, parsed.data);
    return apiSuccess(item);
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
    await deleteItem(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.DOCUMENTS_MANAGE);
