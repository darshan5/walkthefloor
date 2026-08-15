import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getActiveVendors, getVendors, createVendor } from "@/lib/services/vendor-service";
import { hasPermission } from "@/lib/permissions";
import { z } from "zod";

const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  contactName: z.string().max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  specialty: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
});

export const GET = withAuth(async (_req, _ctx, user) => {
  const includeInactive = hasPermission(user.permissions, PERMISSIONS.ADMIN_VENDORS);
  const vendors = includeInactive
    ? await getVendors(user.organizationId)
    : await getActiveVendors(user.organizationId);
  return apiSuccess(vendors);
}, PERMISSIONS.MAINTENANCE_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createVendorSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const vendor = await createVendor(user.organizationId, parsed.data);
  return apiSuccess(vendor, 201);
}, PERMISSIONS.ADMIN_VENDORS);
