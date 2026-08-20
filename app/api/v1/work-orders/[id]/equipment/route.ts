import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateWorkOrderEquipment } from "@/lib/services/work-order-service";
import { z } from "zod";

const schema = z.object({
  equipmentId: z.string().nullable(),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const wo = await updateWorkOrderEquipment(id, user.organizationId, parsed.data.equipmentId);
    return apiSuccess(wo);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("Cannot modify")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.MAINTENANCE_MANAGE);
