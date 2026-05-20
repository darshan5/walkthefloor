import { apiSuccess } from "@/lib/api-utils";
import { getPublishedArticles, getArticleBySlug } from "@/lib/saas/knowledge-base-service";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const search = searchParams.get("search") || undefined;
  const slug = searchParams.get("slug");

  if (slug) {
    const article = await getArticleBySlug(slug);
    if (!article) return Response.json({ error: "Not found" }, { status: 404 });
    return apiSuccess(article);
  }

  const articles = await getPublishedArticles(category, search);
  return apiSuccess(articles);
}
