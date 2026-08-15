import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { respondToComplaint } from "@/lib/services/guest-service";
import { z } from "zod";

const respondSchema = z.object({
  responseText: z.string().min(1, "Response is required").max(5000),
});

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = respondSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const complaint = await respondToComplaint(id, user.organizationId, user.id, parsed.data.responseText);
    return apiSuccess(complaint);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("already has")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.GUEST_SERVICE_MANAGE);
