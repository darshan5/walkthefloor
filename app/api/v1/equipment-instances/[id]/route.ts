import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getEquipmentDetail, updateEquipmentDetails } from "@/lib/services/equipment-service";
import { z } from "zod";

const updateSchema = z.object({
  model: z.string().nullable().optional(),
  serialNumber: z.string().nullable().optional(),
  installDate: z.string().nullable().optional(),
  warrantyExpiry: z.string().nullable().optional(),
  purchaseCost: z.number().nullable().optional(),
  condition: z.enum(["GOOD", "FAIR", "POOR", "OUT_OF_SERVICE"]).nullable().optional(),
  trackingCode: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const detail = await getEquipmentDetail(id, user.organizationId);
  if (!detail) return apiError("Not found", 404);
  return apiSuccess(detail);
}, PERMISSIONS.MAINTENANCE_VIEW);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const updated = await updateEquipmentDetails(id, user.organizationId, parsed.data);
    return apiSuccess(updated);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_EQUIPMENT);
