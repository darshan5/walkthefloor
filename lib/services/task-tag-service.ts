import { prisma } from "@/lib/prisma";

export async function getTaskTags(organizationId: string) {
  return prisma.taskTag.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createTaskTag(organizationId: string, name: string) {
  return prisma.taskTag.create({
    data: { name, organizationId },
  });
}

export async function deleteTaskTag(id: string, organizationId: string) {
  const tag = await prisma.taskTag.findFirst({ where: { id, organizationId } });
  if (!tag) throw new Error("Tag not found");
  return prisma.taskTag.delete({ where: { id } });
}
