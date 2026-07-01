import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const GET = withSaasAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgId") || undefined;

  const templates = await prisma.checklistTemplate.findMany({
    where: orgId ? { organizationId: orgId } : {},
    include: {
      _count: { select: { instances: true, tasks: true } },
    },
    orderBy: [{ organizationId: "asc" }, { name: "asc" }],
  });
  return apiSuccess(templates);
});

const createSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  assignmentType: z.enum(["book", "task"]).default("book"),
  schedule: z.object({ frequency: z.string() }).default({ frequency: "daily" }),
  isBuiltIn: z.boolean().default(true),
  organizationId: z.string().min(1),
});

export const POST = withSaasAuth(async (req) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const org = await prisma.organization.findUnique({ where: { id: parsed.data.organizationId } });
  if (!org) return apiError("Organization not found", 404);

  const template = await prisma.checklistTemplate.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      category: parsed.data.category,
      assignmentType: parsed.data.assignmentType,
      schedule: parsed.data.schedule as any,
      isBuiltIn: parsed.data.isBuiltIn,
      organizationId: parsed.data.organizationId,
    },
  });
  return apiSuccess(template, 201);
});
