import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { updateArticle, deleteArticle } from "@/lib/saas/knowledge-base-service";

export const PATCH = withSaasAuth(async (req, ctx) => {
  const { id } = await ctx.params;
  const body = await req.json();
  try {
    const article = await updateArticle(id, body);
    return apiSuccess(article);
  } catch {
    return apiError("Not found", 404);
  }
});

export const DELETE = withSaasAuth(async (_req, ctx) => {
  const { id } = await ctx.params;
  try {
    await deleteArticle(id);
    return apiSuccess({ deleted: true });
  } catch {
    return apiError("Not found", 404);
  }
});
