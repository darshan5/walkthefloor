import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getConfig, saveConfig, testConnection } from "@/lib/services/guest-service";
import { z } from "zod";

const saveSchema = z.object({
  inboxClerkApiKey: z.string().optional(),
  isEnabled: z.boolean().optional(),
  testOnly: z.boolean().optional(),
});

export const GET = withAuth(async (_req, _ctx, user) => {
  const config = await getConfig(user.organizationId);
  return apiSuccess(config);
}, PERMISSIONS.ADMIN_ORG);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  if (parsed.data.testOnly && parsed.data.inboxClerkApiKey) {
    const result = await testConnection(parsed.data.inboxClerkApiKey);
    return apiSuccess(result);
  }

  const config = await saveConfig(user.organizationId, {
    inboxClerkApiKey: parsed.data.inboxClerkApiKey,
    isEnabled: parsed.data.isEnabled,
  });
  return apiSuccess({ id: config.id, isEnabled: config.isEnabled, hasApiKey: !!config.inboxClerkApiKey });
}, PERMISSIONS.ADMIN_ORG);
