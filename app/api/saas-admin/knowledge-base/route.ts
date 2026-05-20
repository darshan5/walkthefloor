import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { getAllArticles, createArticle } from "@/lib/saas/knowledge-base-service";
import { z } from "zod";

export const GET = withSaasAuth(async () => {
  const articles = await getAllArticles();
  return apiSuccess(articles);
});

const createSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  summary: z.string().min(1).max(500),
  body: z.string().min(1),
  category: z.string().min(1).max(50),
  tags: z.array(z.string()).optional(),
});

export const POST = withSaasAuth(async (req) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const article = await createArticle(parsed.data);
    return apiSuccess(article, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Slug already exists", 409);
    throw e;
  }
});
