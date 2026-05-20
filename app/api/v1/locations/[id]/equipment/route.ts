import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { assignEquipmentSchema } from "@/lib/validators/location";
import { getLocationEquipment, addEquipmentToLocation } from "@/lib/services/location-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  try {
    const equipment = await getLocationEquipment(id, user.organizationId);
    return apiSuccess(equipment);
  } catch (e: any) {
    if (e.message === "Location not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_VIEW);

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = assignEquipmentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const equipment = await addEquipmentToLocation(id, user.organizationId, parsed.data);
    return apiSuccess(equipment, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_EQUIPMENT);
