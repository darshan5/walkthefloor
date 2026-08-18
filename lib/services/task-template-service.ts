import { prisma } from "@/lib/prisma";

export async function getTemplates(organizationId: string) {
  return prisma.taskTemplate.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function getTemplate(id: string, organizationId: string) {
  return prisma.taskTemplate.findFirst({
    where: { id, organizationId },
  });
}

export async function createTemplate(
  organizationId: string,
  data: {
    name: string;
    title: string;
    description?: string;
    priority?: string;
    tagIds?: string[];
    subtasks?: { title: string; description?: string }[];
    recurrenceRule?: any;
  }
) {
  return prisma.taskTemplate.create({
    data: {
      name: data.name,
      title: data.title,
      description: data.description,
      priority: (data.priority as any) || "MEDIUM",
      tagIds: data.tagIds || [],
      subtasks: data.subtasks || [],
      recurrenceRule: data.recurrenceRule || undefined,
      organizationId,
    },
  });
}

export async function updateTemplate(
  id: string,
  organizationId: string,
  data: {
    name?: string;
    title?: string;
    description?: string | null;
    priority?: string;
    tagIds?: string[];
    subtasks?: { title: string; description?: string }[];
    recurrenceRule?: any;
  }
) {
  const template = await prisma.taskTemplate.findFirst({ where: { id, organizationId } });
  if (!template) throw new Error("Template not found");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.tagIds !== undefined) updateData.tagIds = data.tagIds;
  if (data.subtasks !== undefined) updateData.subtasks = data.subtasks;
  if (data.recurrenceRule !== undefined) updateData.recurrenceRule = data.recurrenceRule;

  return prisma.taskTemplate.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteTemplate(id: string, organizationId: string) {
  const template = await prisma.taskTemplate.findFirst({ where: { id, organizationId } });
  if (!template) throw new Error("Template not found");
  return prisma.taskTemplate.delete({ where: { id } });
}
