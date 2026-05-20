import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateLocationSchema } from "@/lib/validators/location";
import { getLocation, updateLocation, deleteLocation } from "@/lib/services/location-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const location = await getLocation(id, user.organizationId);
  if (!location) return apiError("Not found", 404);
  return apiSuccess(location);
}, PERMISSIONS.CHECKLISTS_VIEW);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateLocationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const location = await updateLocation(id, user.organizationId, parsed.data);
    return apiSuccess(location);
  } catch (e: any) {
    if (e.message === "Location not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_LOCATIONS);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  try {
    await deleteLocation(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("Cannot delete")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.ADMIN_LOCATIONS);
