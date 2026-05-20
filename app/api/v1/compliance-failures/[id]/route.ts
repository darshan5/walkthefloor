import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { submitExplanation, reviewExplanation } from "@/lib/services/dashboard-service";
import { z } from "zod";

const explainSchema = z.object({
  explanation: z.string().min(1, "Explanation is required").max(2000),
});

const reviewSchema = z.object({
  approved: z.boolean(),
  reviewNotes: z.string().max(1000).optional(),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();

  if ("explanation" in body) {
    const parsed = explainSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    try {
      const result = await submitExplanation(id, user.id, parsed.data.explanation);
      return apiSuccess(result);
    } catch (e: any) {
      return apiError(e.message, 404);
    }
  }

  if ("approved" in body) {
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) return apiError(parsed.error.issues[0].message);

    try {
      const result = await reviewExplanation(id, user.id, parsed.data.approved, parsed.data.reviewNotes);
      return apiSuccess(result);
    } catch (e: any) {
      return apiError(e.message, e.message.includes("not found") ? 404 : 409);
    }
  }

  return apiError("Invalid request body");
}, PERMISSIONS.CHECKLISTS_VIEW);
