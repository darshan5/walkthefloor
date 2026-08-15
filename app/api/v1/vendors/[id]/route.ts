import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { updateVendor, toggleVendorActive } from "@/lib/services/vendor-service";
import { z } from "zod";

const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contactName: z.string().max(200).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  specialty: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const PATCH = withAuth(async (req, ctx, user) => {
  const { id } = await ctx.params;
  const body = await req.json();
  const parsed = updateVendorSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const vendor = await updateVendor(id, user.organizationId, parsed.data);
    return apiSuccess(vendor);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_VENDORS);

export const DELETE = withAuth(async (_req, ctx, user) => {
  const { id } = await ctx.params;

  try {
    const vendor = await toggleVendorActive(id, user.organizationId);
    return apiSuccess(vendor);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.ADMIN_VENDORS);
