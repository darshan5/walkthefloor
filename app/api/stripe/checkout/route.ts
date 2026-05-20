import { auth } from "@/lib/auth";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { createCheckoutSession } from "@/lib/saas/subscription-service";
import { z } from "zod";

const checkoutSchema = z.object({
  planSlug: z.string().min(1),
  billingInterval: z.enum(["monthly", "annual"]).default("monthly"),
});

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.organizationId) return apiError("Unauthorized", 401);

  const body = await req.json();
  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const origin = new URL(req.url).origin;
    const result = await createCheckoutSession(
      user.organizationId,
      parsed.data.planSlug,
      parsed.data.billingInterval,
      `${origin}/admin/organization?checkout=success`,
      `${origin}/pricing?checkout=canceled`
    );
    return apiSuccess(result);
  } catch (e: any) {
    return apiError(e.message, 400);
  }
}
