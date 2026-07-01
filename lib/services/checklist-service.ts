import { prisma } from "@/lib/prisma";
import type { CreateTemplateInput, UpdateTemplateInput, CreateTaskInput } from "@/lib/validators/checklist";

export async function getTemplates(organizationId: string) {
  return prisma.checklistTemplate.findMany({
    where: { organizationId },
    include: {
      _count: { select: { tasks: true, instances: true } },
    },
    orderBy: [{ isBuiltIn: "desc" }, { category: "asc" }, { name: "asc" }],
  });
}

export async function getTemplate(id: string, organizationId: string) {
  return prisma.checklistTemplate.findFirst({
    where: { id, organizationId },
    include: {
      tasks: {
        include: {
          equipmentType: { select: { id: true, name: true, category: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { instances: true } },
    },
  });
}

export async function createTemplate(organizationId: string, data: CreateTemplateInput) {
  return prisma.checklistTemplate.create({
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      schedule: data.schedule as any,
      isCustom: data.isCustom ?? true,
      organizationId,
    },
  });
}

export async function updateTemplate(id: string, organizationId: string, data: UpdateTemplateInput) {
  const existing = await prisma.checklistTemplate.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("Template not found");

  const { categoryFilters, ...rest } = data;
  return prisma.checklistTemplate.update({
    where: { id },
    data: {
      ...rest,
      schedule: data.schedule ? (data.schedule as any) : undefined,
      ...(categoryFilters !== undefined && { categoryFilters: categoryFilters as any }),
      version: { increment: 1 },
    },
  });
}

export async function deleteTemplate(id: string, organizationId: string) {
  const existing = await prisma.checklistTemplate.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { instances: true } } },
  });
  if (!existing) throw new Error("Template not found");
  if (existing.isBuiltIn) throw new Error("Cannot delete built-in templates");

  if (existing._count.instances > 0) {
    const instanceIds = (
      await prisma.checklistInstance.findMany({
        where: { templateId: id },
        select: { id: true },
      })
    ).map((i) => i.id);

    const completionIds = (
      await prisma.taskCompletion.findMany({
        where: { instanceId: { in: instanceIds } },
        select: { id: true },
      })
    ).map((c) => c.id);

    if (completionIds.length > 0) {
      await prisma.cAComment.deleteMany({
        where: { correctiveAction: { completionId: { in: completionIds } } },
      });
      await prisma.correctiveAction.deleteMany({
        where: { completionId: { in: completionIds } },
      });
    }

    await prisma.complianceFailure.deleteMany({ where: { instanceId: { in: instanceIds } } });
    await prisma.taskCompletion.deleteMany({ where: { instanceId: { in: instanceIds } } });
    await prisma.instanceTask.deleteMany({ where: { instanceId: { in: instanceIds } } });
    await prisma.checklistInstance.deleteMany({ where: { templateId: id } });
  }

  await prisma.templateLocationAssignment.deleteMany({ where: { templateId: id } });
  await prisma.checklistTask.deleteMany({ where: { templateId: id } });
  return prisma.checklistTemplate.delete({ where: { id } });
}

export async function addTask(templateId: string, organizationId: string, data: CreateTaskInput) {
  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, organizationId },
  });
  if (!template) throw new Error("Template not found");

  if (data.equipmentTypeId) {
    const equipType = await prisma.equipmentType.findFirst({
      where: { id: data.equipmentTypeId, organizationId },
    });
    if (!equipType) throw new Error("Equipment type not found in this organization");
  }

  const maxOrder = await prisma.checklistTask.aggregate({
    where: { templateId },
    _max: { sortOrder: true },
  });

  return prisma.checklistTask.create({
    data: {
      ...data,
      config: data.config as any,
      sortOrder: data.sortOrder || (maxOrder._max.sortOrder ?? 0) + 1,
      templateId,
    },
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
    },
  });
}

export async function updateTask(
  taskId: string,
  templateId: string,
  organizationId: string,
  data: Partial<CreateTaskInput>
) {
  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, organizationId },
  });
  if (!template) throw new Error("Template not found");

  const task = await prisma.checklistTask.findFirst({
    where: { id: taskId, templateId },
  });
  if (!task) throw new Error("Task not found");

  return prisma.checklistTask.update({
    where: { id: taskId },
    data: {
      ...data,
      config: data.config ? (data.config as any) : undefined,
    },
    include: {
      equipmentType: { select: { id: true, name: true, category: true } },
    },
  });
}

export async function deleteTask(taskId: string, templateId: string, organizationId: string) {
  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, organizationId },
  });
  if (!template) throw new Error("Template not found");

  return prisma.checklistTask.delete({ where: { id: taskId } });
}

export async function reorderTasks(templateId: string, organizationId: string, taskIds: string[]) {
  const template = await prisma.checklistTemplate.findFirst({
    where: { id: templateId, organizationId },
  });
  if (!template) throw new Error("Template not found");

  await Promise.all(
    taskIds.map((id, index) =>
      prisma.checklistTask.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  return { reordered: taskIds.length };
}
