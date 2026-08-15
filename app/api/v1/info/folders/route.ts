import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getFolders, createFolder } from "@/lib/services/info-service";
import { z } from "zod";

const createFolderSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  parentId: z.string().optional(),
});

export const GET = withAuth(async (_req, _ctx, user) => {
  const folders = await getFolders(user.organizationId);
  return apiSuccess(folders);
}, PERMISSIONS.DOCUMENTS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createFolderSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const folder = await createFolder(user.organizationId, parsed.data);
    return apiSuccess(folder, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    if (e.message.includes("2 levels")) return apiError(e.message);
    throw e;
  }
}, PERMISSIONS.DOCUMENTS_MANAGE);
