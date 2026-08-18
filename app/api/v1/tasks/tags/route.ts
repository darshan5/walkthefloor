import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTaskTags, createTaskTag } from "@/lib/services/task-tag-service";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
});

export const GET = withAuth(async (_req, _ctx, user) => {
  const tags = await getTaskTags(user.organizationId);
  return apiSuccess(tags);
}, PERMISSIONS.TASKS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const tag = await createTaskTag(user.organizationId, parsed.data.name);
    return apiSuccess(tag, 201);
  } catch (e: any) {
    if (e.message.includes("Unique constraint")) return apiError("Tag already exists");
    throw e;
  }
}, PERMISSIONS.TASKS_MANAGE);
