import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { createPortalSession } from "@/lib/saas/subscription-service";

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.organizationId) return apiError("Unauthorized", 401);

  try {
    const origin = new URL(req.url).origin;
    const result = await createPortalSession(user.organizationId, `${origin}/admin/organization`);
    return apiSuccess(result);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
}
