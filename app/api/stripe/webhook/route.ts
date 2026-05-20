import { stripe } from "@/lib/stripe";
import { handleStripeEvent } from "@/lib/saas/subscription-service";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return Response.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (e: any) {
    return Response.json({ error: `Webhook Error: ${e.message}` }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
    return Response.json({ received: true });
  } catch (e: any) {
    console.error("Stripe webhook processing error:", e);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
