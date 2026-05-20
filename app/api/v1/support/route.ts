import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { createTicket, getMyTickets } from "@/lib/saas/support-service";
import { z } from "zod";

const createSchema = z.object({
  subject: z.string().min(1).max(200),
  category: z.enum(["bug", "question", "feature_request", "billing", "other"]).default("other"),
  body: z.string().min(1).max(5000),
});

export const GET = withAuth(async (_req, _ctx, user) => {
  const tickets = await getMyTickets(user.organizationId, user.id);
  return apiSuccess(tickets);
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const ticket = await createTicket(user.organizationId, user.id, parsed.data);
  return apiSuccess(ticket, 201);
});
