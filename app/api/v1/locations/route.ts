import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { createLocationSchema } from "@/lib/validators/location";
import { getLocations, createLocation } from "@/lib/services/location-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const locations = await getLocations(user.organizationId);
  return apiSuccess(locations);
}, PERMISSIONS.CHECKLISTS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createLocationSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const location = await createLocation(user.organizationId, parsed.data);
  return apiSuccess(location, 201);
}, PERMISSIONS.ADMIN_LOCATIONS);
