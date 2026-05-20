import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { getTicketDetail, closeMyTicket } from "@/lib/saas/support-service";

export const GET = withAuth(async (_req, ctx, user) => {
  const { ticketId } = await ctx.params;
  try {
    const ticket = await getTicketDetail(ticketId, user.id, false);
    return apiSuccess(ticket);
  } catch {
    return apiError("Not found", 404);
  }
});

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { ticketId } = await ctx.params;
  try {
    await closeMyTicket(ticketId, user.id);
    return apiSuccess({ closed: true });
  } catch {
    return apiError("Not found", 404);
  }
});
