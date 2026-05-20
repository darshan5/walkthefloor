import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getCorrectiveAction, updateCAStatus } from "@/lib/services/corrective-action-service";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "OVERDUE"]),
  resolvedNotes: z.string().optional(),
});

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const ca = await getCorrectiveAction(id, user.organizationId);
  if (!ca) return apiError("Not found", 404);
  return apiSuccess(ca);
}, PERMISSIONS.CHECKLISTS_VIEW);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const ca = await updateCAStatus(id, user.organizationId, user.id, parsed.data.status, parsed.data.resolvedNotes);
    return apiSuccess(ca);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_VIEW);
