import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { createWebhookEndpoint } from "@/lib/saas/admin-actions";
import { z } from "zod";

const createSchema = z.object({
  channel: z.enum(["complaints", "sales", "generic"]),
});

export const POST = withSaasAuth(async (req, ctx, admin) => {
  const { orgId } = await ctx.params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const endpoint = await createWebhookEndpoint(orgId, parsed.data.channel, admin.saasAdminId);
    return apiSuccess(endpoint, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Webhook endpoint for this channel already exists", 409);
    throw e;
  }
});
