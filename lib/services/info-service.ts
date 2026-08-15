import { prisma } from "@/lib/prisma";

export async function getItemsAndFolders(
  organizationId: string,
  filters: {
    folderId?: string | null;
    tagId?: string;
    search?: string;
  }
) {
  const folderWhere: any = {
    organizationId,
    parentId: filters.folderId || null,
  };

  const itemWhere: any = {
    organizationId,
    folderId: filters.folderId || null,
  };

  if (filters.tagId) {
    itemWhere.tags = { some: { tagId: filters.tagId } };
  }

  if (filters.search) {
    itemWhere.OR = [
      { title: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const folders = filters.search || filters.tagId
    ? []
    : await prisma.infoFolder.findMany({
        where: folderWhere,
        orderBy: { name: "asc" },
        include: {
          _count: { select: { children: true, items: true } },
        },
      });

  const items = await prisma.infoItem.findMany({
    where: itemWhere,
    orderBy: { createdAt: "desc" },
    include: {
      tags: { include: { tag: true } },
    },
    take: 100,
  });

  return { folders, items };
}

export async function getItem(id: string, organizationId: string) {
  return prisma.infoItem.findFirst({
    where: { id, organizationId },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true, parentId: true } },
    },
  });
}

export async function createItem(
  organizationId: string,
  userId: string,
  data: {
    title: string;
    url: string;
    description?: string;
    folderId?: string;
    tagIds?: string[];
  }
) {
  return prisma.infoItem.create({
    data: {
      title: data.title,
      url: data.url,
      description: data.description,
      folderId: data.folderId || null,
      organizationId,
      createdById: userId,
      tags: data.tagIds?.length
        ? { create: data.tagIds.map((tagId) => ({ tagId })) }
        : undefined,
    },
    include: {
      tags: { include: { tag: true } },
    },
  });
}

export async function updateItem(
  id: string,
  organizationId: string,
  data: {
    title?: string;
    url?: string;
    description?: string | null;
    folderId?: string | null;
    tagIds?: string[];
  }
) {
  const item = await prisma.infoItem.findFirst({ where: { id, organizationId } });
  if (!item) throw new Error("Item not found");

  const updateData: any = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.url !== undefined) updateData.url = data.url;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.folderId !== undefined) updateData.folderId = data.folderId;

  if (data.tagIds !== undefined) {
    await prisma.infoItemTag.deleteMany({ where: { itemId: id } });
    if (data.tagIds.length > 0) {
      updateData.tags = { create: data.tagIds.map((tagId) => ({ tagId })) };
    }
  }

  return prisma.infoItem.update({
    where: { id },
    data: updateData,
    include: { tags: { include: { tag: true } } },
  });
}

export async function deleteItem(id: string, organizationId: string) {
  const item = await prisma.infoItem.findFirst({ where: { id, organizationId } });
  if (!item) throw new Error("Item not found");
  return prisma.infoItem.delete({ where: { id } });
}

export async function getFolders(organizationId: string) {
  return prisma.infoFolder.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { children: true, items: true } },
    },
  });
}

export async function getFolder(id: string, organizationId: string) {
  return prisma.infoFolder.findFirst({
    where: { id, organizationId },
    include: {
      parent: { select: { id: true, name: true, parentId: true } },
    },
  });
}

export async function createFolder(
  organizationId: string,
  data: { name: string; parentId?: string }
) {
  if (data.parentId) {
    const parent = await prisma.infoFolder.findFirst({
      where: { id: data.parentId, organizationId },
    });
    if (!parent) throw new Error("Parent folder not found");
    if (parent.parentId) throw new Error("Cannot nest folders more than 2 levels deep");
  }

  return prisma.infoFolder.create({
    data: {
      name: data.name,
      parentId: data.parentId || null,
      organizationId,
    },
    include: {
      _count: { select: { children: true, items: true } },
    },
  });
}

export async function renameFolder(id: string, organizationId: string, name: string) {
  const folder = await prisma.infoFolder.findFirst({ where: { id, organizationId } });
  if (!folder) throw new Error("Folder not found");
  return prisma.infoFolder.update({ where: { id }, data: { name } });
}

export async function deleteFolder(id: string, organizationId: string) {
  const folder = await prisma.infoFolder.findFirst({
    where: { id, organizationId },
    include: { _count: { select: { children: true, items: true } } },
  });
  if (!folder) throw new Error("Folder not found");
  if (folder._count.children > 0 || folder._count.items > 0) {
    throw new Error("Folder must be empty before deleting");
  }
  return prisma.infoFolder.delete({ where: { id } });
}

export async function getTags(organizationId: string) {
  return prisma.infoTag.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function createTag(organizationId: string, name: string) {
  return prisma.infoTag.create({
    data: { name, organizationId },
  });
}

export async function deleteTag(id: string, organizationId: string) {
  const tag = await prisma.infoTag.findFirst({ where: { id, organizationId } });
  if (!tag) throw new Error("Tag not found");
  return prisma.infoTag.delete({ where: { id } });
}
