import { processWebhookEvent } from "@/lib/services/webhook-service";

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const toAddress = body.to?.[0] || "";
  const orgSlugMatch = toAddress.match(/^complaints\+([a-z0-9-]+)@/);
  if (!orgSlugMatch) {
    return Response.json({ error: "Could not determine organization from email address" }, { status: 400 });
  }

  const orgSlug = orgSlugMatch[1];

  const complaintPayload = {
    subject: body.subject || "Email Complaint",
    description: body.text || body.html || "",
    source: "email",
    guestName: body.from_name || body.from?.split("<")[0]?.trim() || null,
    guestEmail: body.from_email || body.from?.match(/<(.+)>/)?.[1] || body.from || null,
    externalId: body.message_id || null,
  };

  try {
    const result = await processWebhookEvent(orgSlug, "complaints", complaintPayload, null);
    return Response.json({ message: "Processed", eventId: (result as any).eventId }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: e.message.includes("not found") ? 404 : 500 });
  }
}
