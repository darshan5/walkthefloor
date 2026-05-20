import { prisma } from "@/lib/prisma";

export async function getPublishedArticles(category?: string, search?: string) {
  return prisma.knowledgeBaseArticle.findMany({
    where: {
      isPublished: true,
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { summary: { contains: search, mode: "insensitive" as const } },
          { body: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    },
    select: { id: true, title: true, slug: true, summary: true, category: true, tags: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getArticleBySlug(slug: string) {
  return prisma.knowledgeBaseArticle.findUnique({
    where: { slug },
  });
}

export async function getAllArticles() {
  return prisma.knowledgeBaseArticle.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
  });
}

export async function createArticle(data: {
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  tags?: string[];
}) {
  return prisma.knowledgeBaseArticle.create({
    data: {
      ...data,
      tags: data.tags || [],
      isPublished: false,
    },
  });
}

export async function updateArticle(id: string, data: {
  title?: string;
  summary?: string;
  body?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
  sortOrder?: number;
}) {
  return prisma.knowledgeBaseArticle.update({
    where: { id },
    data,
  });
}

export async function deleteArticle(id: string) {
  return prisma.knowledgeBaseArticle.delete({ where: { id } });
}
