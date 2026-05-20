import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { createEquipmentTypeSchema } from "@/lib/validators/equipment";
import { getEquipmentTypes, createEquipmentType } from "@/lib/services/equipment-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const types = await getEquipmentTypes(user.organizationId);
  return apiSuccess(types);
}, PERMISSIONS.CHECKLISTS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createEquipmentTypeSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const type = await createEquipmentType(user.organizationId, parsed.data);
    return apiSuccess(type, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Equipment type with this name already exists", 409);
    throw e;
  }
}, PERMISSIONS.ADMIN_EQUIPMENT);
