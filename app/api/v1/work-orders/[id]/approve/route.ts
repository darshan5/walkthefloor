import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { approveWorkOrder } from "@/lib/services/work-order-service";
import { z } from "zod";

const approveSchema = z
  .object({
    assigneeId: z.string().optional(),
    vendorId: z.string().optional(),
    estimatedCost: z.number().min(0).optional(),
    dueDate: z.string().optional(),
    notes: z.string().max(2000).optional(),
  })
  .refine((d) => d.assigneeId || d.vendorId, "Must assign to a user or vendor")
  .refine((d) => !(d.assigneeId && d.vendorId), "Cannot assign to both a user and vendor");

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const wo = await approveWorkOrder(id, user.organizationId, user.id, parsed.data);
    return apiSuccess(wo);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("not pending")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.MAINTENANCE_APPROVE);
