import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { getOrganizations, provisionOrganization } from "@/lib/saas/admin-actions";
import { z } from "zod";

const provisionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(6),
  planId: z.string().min(1),
  trialDays: z.number().int().min(1).max(90).default(14),
});

export const GET = withSaasAuth(async () => {
  const orgs = await getOrganizations();
  return apiSuccess(orgs);
});

export const POST = withSaasAuth(async (req, _ctx, admin) => {
  const body = await req.json();
  const parsed = provisionSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const org = await provisionOrganization(parsed.data, admin.saasAdminId);
    return apiSuccess(org, 201);
  } catch (e: any) {
    if (e.message.includes("already exists")) return apiError(e.message, 409);
    throw e;
  }
});
