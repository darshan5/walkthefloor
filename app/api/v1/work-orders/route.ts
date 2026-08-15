import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getWorkOrders, createWorkOrder } from "@/lib/services/work-order-service";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  locationId: z.string().min(1, "Location is required"),
  equipmentId: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional(),
  vendorId: z.string().optional(),
  estimatedCost: z.number().min(0).optional(),
});

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);

  const workOrders = await getWorkOrders(user.organizationId, {
    locationId: searchParams.get("locationId") || undefined,
    status: searchParams.get("status") || undefined,
    priority: searchParams.get("priority") || undefined,
    tab: searchParams.get("tab") || undefined,
    userId: user.id,
    locationIds: user.locationIds,
    dateFrom: searchParams.get("dateFrom") || undefined,
    dateTo: searchParams.get("dateTo") || undefined,
  });

  return apiSuccess(workOrders);
}, PERMISSIONS.MAINTENANCE_VIEW);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  const wo = await createWorkOrder(
    user.organizationId,
    user.id,
    user.permissions,
    parsed.data
  );

  return apiSuccess(wo, 201);
}, PERMISSIONS.MAINTENANCE_SUBMIT);
