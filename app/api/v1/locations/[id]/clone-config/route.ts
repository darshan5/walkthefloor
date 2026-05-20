import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { cloneBookConfigSchema } from "@/lib/validators/location";
import { cloneBookConfig } from "@/lib/services/location-service";

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = cloneBookConfigSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const result = await cloneBookConfig(id, parsed.data.sourceLocationId, user.organizationId);
    return apiSuccess(result);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_LOCATIONS);
