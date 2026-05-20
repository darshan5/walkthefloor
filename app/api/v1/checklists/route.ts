import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { createTemplateSchema } from "@/lib/validators/checklist";
import { getTemplates, createTemplate } from "@/lib/services/checklist-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const templates = await getTemplates(user.organizationId);
  return apiSuccess(templates);
}, PERMISSIONS.CHECKLISTS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const template = await createTemplate(user.organizationId, parsed.data);
  return apiSuccess(template, 201);
}, PERMISSIONS.CHECKLISTS_MANAGE);
