import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { getTemperatureLogs, createTemperatureLog } from "@/lib/services/temperature-service";
import { z } from "zod";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId") || undefined;
  const logs = await getTemperatureLogs(user.organizationId, locationId);
  return apiSuccess(logs);
}, PERMISSIONS.CHECKLISTS_VIEW);

const createSchema = z.object({
  locationId: z.string().min(1),
  equipmentName: z.string().min(1),
  temperature: z.number(),
  unit: z.string().default("F"),
  notes: z.string().optional(),
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const log = await createTemperatureLog(user.id, user.organizationId, parsed.data);
    return apiSuccess(log, 201);
  } catch (e: any) {
    if (e.message.includes("not found")) return apiError(e.message, 404);
    throw e;
  }
}, PERMISSIONS.CHECKLISTS_COMPLETE);
