import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateShiftSchema } from "@/lib/validators/equipment";
import { updateShift, deleteShift } from "@/lib/services/equipment-service";

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateShiftSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const shift = await updateShift(id, user.organizationId, parsed.data);
    return apiSuccess(shift);
  } catch (e: any) {
    if (e.message === "Shift not found") return apiError(e.message, 404);
    if (e.code === "P2002") return apiError("Name already exists", 409);
    throw e;
  }
}, PERMISSIONS.ADMIN_ORG);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  try {
    await deleteShift(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message === "Shift not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_ORG);
