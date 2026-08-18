import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTasks, createTask } from "@/lib/services/task-service";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  locationId: z.string().min(1, "Location is required"),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  subtasks: z.array(z.object({
    title: z.string().min(1),
    assigneeId: z.string().optional(),
  })).optional(),
  templateId: z.string().optional(),
  recurrenceRule: z.any().optional(),
  source: z.string().optional(),
  completionId: z.string().optional(),
  externalId: z.string().optional(),
});

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);

  const tasks = await getTasks(user.organizationId, user.locationIds, {
    status: searchParams.get("status") || undefined,
    priority: searchParams.get("priority") || undefined,
    tagId: searchParams.get("tagId") || undefined,
    tab: searchParams.get("tab") || undefined,
    userId: user.id,
    locationId: searchParams.get("locationId") || undefined,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  });

  return apiSuccess(tasks);
}, PERMISSIONS.TASKS_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const task = await createTask(
      user.organizationId,
      user.id,
      user.permissions,
      parsed.data
    );
    return apiSuccess(task, 201);
  } catch (e: any) {
    if (e.message.includes("permission")) return apiError(e.message, 403);
    throw e;
  }
}, PERMISSIONS.TASKS_CREATE);
