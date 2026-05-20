import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { createApiKey, revokeApiKey } from "@/lib/saas/admin-actions";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  scopes: z.array(z.string()).min(1),
  locationIds: z.array(z.string()).optional(),
  rateLimit: z.number().int().min(10).max(100000).optional(),
});

export const POST = withSaasAuth(async (req, ctx, admin) => {
  const { orgId } = await ctx.params;
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const result = await createApiKey(orgId, parsed.data, admin.saasAdminId);
  return apiSuccess(result, 201);
});

const revokeSchema = z.object({ keyId: z.string().min(1) });

export const DELETE = withSaasAuth(async (req, _ctx, admin) => {
  const body = await req.json();
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    await revokeApiKey(parsed.data.keyId, admin.saasAdminId);
    return apiSuccess({ revoked: true });
  } catch (e: any) {
    return apiError(e.message, 404);
  }
});
