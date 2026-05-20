import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export function verifyHmacSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function processWebhookEvent(
  orgSlug: string,
  channel: string,
  payload: any,
  signature: string | null
) {
  const org = await prisma.organization.findUnique({
    where: { slug: orgSlug },
    select: { id: true },
  });
  if (!org) throw new Error("Organization not found");

  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { organizationId_channel: { organizationId: org.id, channel } },
  });
  if (!endpoint) throw new Error("Webhook endpoint not configured");
  if (!endpoint.isActive) throw new Error("Webhook endpoint is disabled");

  if (signature) {
    const raw = typeof payload === "string" ? payload : JSON.stringify(payload);
    if (!verifyHmacSignature(raw, signature, endpoint.secret)) {
      throw new Error("Invalid signature");
    }
  }

  const data = typeof payload === "string" ? JSON.parse(payload) : payload;

  if (data.externalId) {
    const existing = await prisma.webhookEvent.findFirst({
      where: { endpointId: endpoint.id, externalId: data.externalId, processed: true },
    });
    if (existing) return { deduplicated: true, eventId: existing.id };
  }

  const event = await prisma.webhookEvent.create({
    data: {
      endpointId: endpoint.id,
      source: data.source || "external",
      eventType: `${channel}.received`,
      externalId: data.externalId || null,
      payload: data,
    },
  });

  await prisma.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: { lastReceivedAt: new Date() },
  });

  try {
    switch (channel) {
      case "complaints":
        await processComplaint(org.id, data, event.id);
        break;
      case "sales":
        await processSales(org.id, data, event.id);
        break;
    }

    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { processed: true },
    });
  } catch (e: any) {
    await prisma.webhookEvent.update({
      where: { id: event.id },
      data: { error: e.message },
    });
    throw e;
  }

  return { eventId: event.id, processed: true };
}

async function processComplaint(organizationId: string, data: any, webhookEventId: string) {
  const location = await prisma.location.findFirst({
    where: {
      organizationId,
      OR: [
        { storeNumber: data.locationStoreNumber },
        { name: data.locationName },
      ],
    },
  });
  if (!location) throw new Error(`Location not found: ${data.locationStoreNumber || data.locationName}`);

  const rgm = await prisma.user.findFirst({
    where: {
      homeLocationId: location.id,
      isActive: true,
      role: { name: "Restaurant General Manager" },
    },
    select: { id: true },
  });

  const slaHours = 24;
  const responseDeadline = new Date();
  responseDeadline.setHours(responseDeadline.getHours() + slaHours);

  await prisma.complaint.create({
    data: {
      subject: data.subject || "Guest Complaint",
      description: data.description || "",
      source: data.source || "webhook",
      priority: data.priority || "MEDIUM",
      status: rgm ? "assigned" : "new",
      guestName: data.guestName || null,
      guestEmail: data.guestEmail || null,
      guestPhone: data.guestPhone || null,
      locationId: location.id,
      assigneeId: rgm?.id || null,
      responseDeadline,
    },
  });
}

async function processSales(organizationId: string, data: any, webhookEventId: string) {
  const location = await prisma.location.findFirst({
    where: {
      organizationId,
      OR: [
        { storeNumber: data.locationStoreNumber },
        { name: data.locationName },
      ],
    },
  });
  if (!location) throw new Error(`Location not found: ${data.locationStoreNumber || data.locationName}`);

  const date = new Date(data.date);
  date.setHours(0, 0, 0, 0);

  await prisma.salesData.upsert({
    where: {
      organizationId_locationId_date: {
        organizationId,
        locationId: location.id,
        date,
      },
    },
    update: {
      totalAmount: data.totalAmount,
      transactionCount: data.transactionCount || 0,
      checkAverage: data.checkAverage || (data.transactionCount ? data.totalAmount / data.transactionCount : null),
      channelSplit: data.channelSplit || {},
      metadata: data.metadata || {},
      webhookEventId,
    },
    create: {
      organizationId,
      locationId: location.id,
      date,
      totalAmount: data.totalAmount,
      transactionCount: data.transactionCount || 0,
      checkAverage: data.checkAverage || (data.transactionCount ? data.totalAmount / data.transactionCount : null),
      channelSplit: data.channelSplit || {},
      metadata: data.metadata || {},
      webhookEventId,
    },
  });
}
