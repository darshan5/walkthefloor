import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const clearSchema = z.object({
  locationId: z.string().min(1).optional(),
});

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json().catch(() => ({}));
  const parsed = clearSchema.safeParse(body);

  const where: any = {};
  if (parsed.success && parsed.data.locationId) {
    where.locationId = parsed.data.locationId;
    const loc = await prisma.location.findFirst({
      where: { id: parsed.data.locationId, organizationId: user.organizationId },
    });
    if (!loc) return apiError("Location not found", 404);
  } else {
    const locs = await prisma.location.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true },
    });
    where.locationId = { in: locs.map((l) => l.id) };
  }

  const deleted = await prisma.complianceFailure.deleteMany({ where });

  return apiSuccess({ cleared: deleted.count });
}, PERMISSIONS.ADMIN_LOCATIONS);
