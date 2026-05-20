import { withAuth, apiSuccess } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getDevices } from "@/lib/services/user-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const devices = await getDevices(user.organizationId);
  return apiSuccess(devices);
}, PERMISSIONS.ADMIN_DEVICES);
