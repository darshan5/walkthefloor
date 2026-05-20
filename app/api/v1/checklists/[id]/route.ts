import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateTemplateSchema } from "@/lib/validators/checklist";
import { getTemplate, updateTemplate, deleteTemplate } from "@/lib/services/checklist-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  const template = await getTemplate(id, user.organizationId);
  if (!template) return apiError("Not found", 404);
  return apiSuccess(template);
}, PERMISSIONS.CHECKLISTS_VIEW);

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const template = await updateTemplate(id, user.organizationId, parsed.data);
    return apiSuccess(template);
  } catch (e: any) {
    if (e.message === "Template not found") return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_MANAGE);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;
  try {
    await deleteTemplate(id, user.organizationId);
    return apiSuccess({ deleted: true });
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("Cannot delete")) return apiError(e.message, 409);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_MANAGE);
