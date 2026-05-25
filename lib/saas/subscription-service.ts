import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function createCheckoutSession(
  organizationId: string,
  planSlug: string,
  billingInterval: "monthly" | "annual",
  successUrl: string,
  cancelUrl: string
) {
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new Error("Plan not found");

  const priceId = billingInterval === "annual" ? plan.stripePriceAnnual : plan.stripePriceMonthly;
  if (!priceId) throw new Error(`No Stripe price configured for ${billingInterval} billing`);

  const sub = await prisma.subscription.findUnique({ where: { organizationId } });

  let customerId = sub?.stripeCustomerId;
  if (!customerId) {
    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    const customer = await getStripe().customers.create({
      name: org?.name,
      metadata: { organizationId },
    });
    customerId = customer.id;
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { organizationId, planId: plan.id },
    subscription_data: {
      metadata: { organizationId, planId: plan.id },
    },
  });

  return { url: session.url, sessionId: session.id };
}

export async function createPortalSession(organizationId: string, returnUrl: string) {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub?.stripeCustomerId) throw new Error("No Stripe customer found");

  const session = await getStripe().billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

export async function handleStripeEvent(event: any) {
  await prisma.webhookEvent.create({
    data: {
      source: "stripe",
      eventType: event.type,
      externalId: event.id,
      payload: event,
      processed: false,
    },
  });

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;
    case "invoice.payment_succeeded":
      await handlePaymentSucceeded(event.data.object);
      break;
    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;
  }

  await prisma.webhookEvent.updateMany({
    where: { externalId: event.id },
    data: { processed: true },
  });
}

async function handleCheckoutCompleted(session: any) {
  const { organizationId, planId } = session.metadata || {};
  if (!organizationId) return;

  await prisma.subscription.upsert({
    where: { organizationId },
    update: {
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: session.customer,
      planId,
      status: "ACTIVE",
      billingInterval: "monthly",
      currentPeriodStart: new Date(),
    },
    create: {
      organizationId,
      planId,
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: session.customer,
      status: "ACTIVE",
      billingInterval: "monthly",
      currentPeriodStart: new Date(),
    },
  });
}

async function handlePaymentSucceeded(invoice: any) {
  const subId = invoice.subscription;
  if (!subId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subId },
  });
  if (!sub) return;

  await prisma.payment.create({
    data: {
      subscriptionId: sub.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: "succeeded",
      paidAt: new Date(invoice.status_transitions?.paid_at * 1000 || Date.now()),
    },
  });
}

async function handlePaymentFailed(invoice: any) {
  const subId = invoice.subscription;
  if (!subId) return;

  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subId },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { status: "PAST_DUE" },
  });

  await prisma.payment.create({
    data: {
      subscriptionId: sub.id,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      status: "failed",
    },
  });
}

async function handleSubscriptionUpdated(subscription: any) {
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!sub) return;

  const statusMap: Record<string, string> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
    paused: "PAUSED",
  };

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: (statusMap[subscription.status] || "ACTIVE") as any,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : null,
    },
  });
}

async function handleSubscriptionDeleted(subscription: any) {
  const sub = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!sub) return;

  await prisma.subscription.update({
    where: { id: sub.id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
    },
  });
}
