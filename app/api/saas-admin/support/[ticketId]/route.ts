import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { getTicketDetail, addAdminReply, updateTicketStatus, updateTicketPriority } from "@/lib/saas/support-service";
import { z } from "zod";

export const GET = withSaasAuth(async (_req, ctx, admin) => {
  const { ticketId } = await ctx.params;
  try {
    const ticket = await getTicketDetail(ticketId, admin.saasAdminId, true);
    return apiSuccess(ticket);
  } catch {
    return apiError("Not found", 404);
  }
});

const updateSchema = z.object({
  reply: z.string().min(1).max(5000).optional(),
  status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const PATCH = withSaasAuth(async (req, ctx, admin) => {
  const { ticketId } = await ctx.params;
  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  if (parsed.data.reply) {
    await addAdminReply(ticketId, admin.saasAdminId, parsed.data.reply);
  }
  if (parsed.data.status) {
    await updateTicketStatus(ticketId, parsed.data.status);
  }
  if (parsed.data.priority) {
    await updateTicketPriority(ticketId, parsed.data.priority);
  }

  const updated = await getTicketDetail(ticketId, admin.saasAdminId, true);
  return apiSuccess(updated);
});
