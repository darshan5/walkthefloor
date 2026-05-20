import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateUserSchema } from "@/lib/validators/user";
import { getUser, updateUser, deactivateUser } from "@/lib/services/user-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const found = await getUser(id, user.organizationId);
  if (!found) return apiError("Not found", 404);
  return apiSuccess(found);
}, PERMISSIONS.ADMIN_USERS);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const updated = await updateUser(id, user.organizationId, parsed.data);
    return apiSuccess(updated);
  } catch (e: any) {
    if (e.message === "User not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_USERS);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  try {
    await deactivateUser(id, user.organizationId);
    return apiSuccess({ deactivated: true });
  } catch (e: any) {
    if (e.message === "User not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_USERS);
