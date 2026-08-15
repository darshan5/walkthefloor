import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTags, createTag } from "@/lib/services/info-service";
import { z } from "zod";

const createTagSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
});

export const GET = withAuth(async (_req, _ctx, user) => {
  const tags = await getTags(user.organizationId);
  return apiSuccess(tags);
}, PERMISSIONS.DOCUMENTS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  if (!["Director of Operations", "Franchisee"].includes(user.role)) {
    return apiError("Only Director or above can manage tags", 403);
  }
  const body = await req.json();
  const parsed = createTagSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const tag = await createTag(user.organizationId, parsed.data.name);
    return apiSuccess(tag, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Tag already exists");
    throw e;
  }
}, PERMISSIONS.DOCUMENTS_MANAGE);
