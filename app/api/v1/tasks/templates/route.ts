import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTemplates, createTemplate } from "@/lib/services/task-template-service";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  tagIds: z.array(z.string()).optional(),
  subtasks: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
  })).optional(),
  recurrenceRule: z.any().optional(),
});

export const GET = withAuth(async (_req, _ctx, user) => {
  const templates = await getTemplates(user.organizationId);
  return apiSuccess(templates);
}, PERMISSIONS.TASKS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const template = await createTemplate(user.organizationId, parsed.data);
  return apiSuccess(template, 201);
}, PERMISSIONS.TASKS_MANAGE);
