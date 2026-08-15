import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateWorkOrderCost } from "@/lib/services/work-order-service";
import { z } from "zod";

const costSchema = z.object({
  actualCost: z.number().min(0).optional(),
  expenseNotes: z.string().max(2000).optional(),
  invoiceUrl: z.string().url().optional(),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = costSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const wo = await updateWorkOrderCost(id, user.organizationId, parsed.data);
    return apiSuccess(wo);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.MAINTENANCE_MANAGE);
