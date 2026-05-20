import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { resetPasswordSchema } from "@/lib/validators/user";
import { resetPassword } from "@/lib/services/user-service";

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    await resetPassword(id, user.organizationId, parsed.data.newPassword);
    return apiSuccess({ reset: true });
  } catch (e: any) {
    if (e.message === "User not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_USERS);
