import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getRoles } from "@/lib/services/user-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const roles = await getRoles(user.organizationId);
  return apiSuccess(roles);
}, PERMISSIONS.ADMIN_ROLES);
