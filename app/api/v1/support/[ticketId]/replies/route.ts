import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { addCustomerReply } from "@/lib/saas/support-service";
import { z } from "zod";

const replySchema = z.object({ body: z.string().min(1).max(5000) });

export const POST = withAuth(async (req, ctx, user) => {
  const { ticketId } = await ctx.params;
  const body = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const message = await addCustomerReply(ticketId, user.id, parsed.data.body);
    return apiSuccess(message, 201);
  } catch {
    return apiError("Not found", 404);
  }
});
