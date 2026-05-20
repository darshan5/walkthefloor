import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess } from "@/lib/api-utils";
import { getAllTickets } from "@/lib/saas/support-service";

export const GET = withSaasAuth(async (req) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") || undefined;
  const tickets = await getAllTickets(status);
  return apiSuccess(tickets);
});
