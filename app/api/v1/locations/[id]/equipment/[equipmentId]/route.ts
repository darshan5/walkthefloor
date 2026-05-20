import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateEquipmentInstance, removeEquipmentFromLocation } from "@/lib/services/location-service";

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id, equipmentId } = await ctx.params;
  const body = await req.json();

  try {
    const equipment = await updateEquipmentInstance(equipmentId, id, user.organizationId, body);
    return apiSuccess(equipment);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_EQUIPMENT);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id, equipmentId } = await ctx.params;
  try {
    await removeEquipmentFromLocation(equipmentId, id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_EQUIPMENT);
