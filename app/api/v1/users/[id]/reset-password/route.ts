import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS, canManageRole } from "@/lib/permissions";
import { resetPasswordSchema } from "@/lib/validators/user";
import { resetPassword, getUser } from "@/lib/services/user-service";

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const target = await getUser(id, user.organizationId);
  if (!target) return apiError("User not found", 404);

  if (user.role !== "Franchisee" && !canManageRole(user.role, target.role.name)) {
    return apiError("You cannot set passwords for users at or above your role level", 403);
  }

  try {
    await resetPassword(id, user.organizationId, parsed.data.newPassword);
    return apiSuccess({ reset: true });
  } catch (e: any) {
    if (e.message === "User not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_USERS);
