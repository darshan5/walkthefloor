import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { addCAComment } from "@/lib/services/corrective-action-service";
import { z } from "zod";

const commentSchema = z.object({
  content: z.string().min(1, "Comment is required").max(2000),
});

export const POST = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = commentSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const comment = await addCAComment(id, user.organizationId, user.id, parsed.data.content);
    return apiSuccess(comment, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_VIEW);
