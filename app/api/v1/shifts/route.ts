import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { createShiftSchema } from "@/lib/validators/equipment";
import { getShifts, createShift } from "@/lib/services/equipment-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const shifts = await getShifts(user.organizationId);
  return apiSuccess(shifts);
}, PERMISSIONS.CHECKLISTS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createShiftSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const shift = await createShift(user.organizationId, parsed.data);
    return apiSuccess(shift, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Shift with this name already exists", 409);
    throw e;
  }
}, PERMISSIONS.ADMIN_ORG);
