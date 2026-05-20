import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateEquipmentTypeSchema } from "@/lib/validators/equipment";
import { getEquipmentType, updateEquipmentType, deleteEquipmentType } from "@/lib/services/equipment-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const type = await getEquipmentType(id, user.organizationId);
  if (!type) return apiError("Not found", 404);
  return apiSuccess(type);
}, PERMISSIONS.CHECKLISTS_VIEW);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateEquipmentTypeSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const type = await updateEquipmentType(id, user.organizationId, parsed.data);
    return apiSuccess(type);
  } catch (e: any) {
    if (e.message === "Equipment type not found") return apiError(e.message, 404);
    if (e.code === "P2002") return apiError("Name already exists", 409);
    throw e;
  }
}, PERMISSIONS.ADMIN_EQUIPMENT);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  try {
    await deleteEquipmentType(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("Cannot delete")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.ADMIN_EQUIPMENT);
