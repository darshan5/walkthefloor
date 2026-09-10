import { apiSuccess, apiError } from "@/lib/api-utils";
import { validateApiKey } from "@/lib/services/api-key-service";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";
import { z } from "zod";

const schema = z.object({
  status: z.enum(["in_progress", "deferred", "completed", "declined"]),
  deferredDate: z.string().optional(),
  deferredReason: z.string().max(500).optional(),
  declinedReason: z.string().max(500).optional(),
  actualCost: z.number().optional(),
  notes: z.string().max(2000).optional(),
});

export async function PATCH(req: NextRequest, context: { params: Promise<Record<string, string>> }) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer wtf_live_")) {
    return apiError("API key required", 401);
  }

  const token = authHeader.substring(7);
  const apiKeyAuth = await validateApiKey(token);
  if (!apiKeyAuth) return apiError("Invalid API key", 401);

  const { id } = await context.params;
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const wo = await prisma.workOrder.findFirst({
    where: { id, location: { organizationId: apiKeyAuth.organizationId } },
  });
  if (!wo) return apiError("Work order not found", 404);

  if (["completed", "rejected", "cancelled"].includes(wo.status)) {
    return apiError("Cannot update a closed work order", 409);
  }

  const data: any = { status: parsed.data.status };

  if (parsed.data.status === "deferred") {
    if (!parsed.data.deferredDate) return apiError("Deferred date is required");
    data.deferredDate = new Date(parsed.data.deferredDate);
    data.deferredReason = parsed.data.deferredReason || null;
  }

  if (parsed.data.status === "completed") {
    data.completedAt = new Date();
    if (parsed.data.actualCost != null) data.actualCost = parsed.data.actualCost;
  }

  if (parsed.data.status === "declined") {
    data.status = "rejected";
    data.rejectedAt = new Date();
    data.rejectionNotes = parsed.data.declinedReason || null;
  }

  await prisma.workOrder.update({ where: { id }, data });

  if (parsed.data.notes) {
    await prisma.workOrderComment.create({
      data: {
        workOrderId: id,
        userId: `apikey:${apiKeyAuth.keyId}`,
        content: parsed.data.notes,
        statusChange: parsed.data.status,
      },
    });
  }

  return apiSuccess({ id, status: parsed.data.status });
}
