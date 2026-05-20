import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { assignLocationsSchema } from "@/lib/validators/user";
import { assignLocations } from "@/lib/services/user-service";

export const PUT = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = assignLocationsSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const result = await assignLocations(id, user.organizationId, parsed.data.locationIds);
    return apiSuccess(result);
  } catch (e: any) {
    if (e.message === "User not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_USERS);
