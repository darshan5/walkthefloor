import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getItemsAndFolders, createItem } from "@/lib/services/info-service";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  url: z.string().url("Must be a valid URL"),
  description: z.string().max(2000).optional(),
  folderId: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
});

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const data = await getItemsAndFolders(user.organizationId, {
    folderId: searchParams.get("folderId") || undefined,
    tagId: searchParams.get("tagId") || undefined,
    search: searchParams.get("search") || undefined,
  });
  return apiSuccess(data);
}, PERMISSIONS.DOCUMENTS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const item = await createItem(user.organizationId, user.id, parsed.data);
    return apiSuccess(item, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.DOCUMENTS_MANAGE);
