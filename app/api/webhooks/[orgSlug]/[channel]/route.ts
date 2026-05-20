import { processWebhookEvent } from "@/lib/services/webhook-service";
import { NextRequest } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string; channel: string }> }
) {
  const { orgSlug, channel } = await params;

  if (!["complaints", "sales", "generic"].includes(channel)) {
    return Response.json({ error: "Invalid channel" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const signature = req.headers.get("x-webhook-signature") || req.headers.get("x-signature");

  try {
    const result = await processWebhookEvent(orgSlug, channel, body, signature);

    if ((result as any).deduplicated) {
      return Response.json({ message: "Already processed", eventId: (result as any).eventId }, { status: 200 });
    }

    return Response.json({ message: "Processed", eventId: (result as any).eventId }, { status: 201 });
  } catch (e: any) {
    const status = e.message.includes("not found") ? 404
      : e.message.includes("not configured") ? 404
      : e.message.includes("disabled") ? 403
      : e.message.includes("Invalid signature") ? 401
      : 500;

    return Response.json({ error: e.message }, { status });
  }
}
