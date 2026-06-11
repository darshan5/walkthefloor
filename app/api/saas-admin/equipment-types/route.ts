import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const GET = withSaasAuth(async () => {
  const types = await prisma.equipmentType.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { locationEquipment: true } },
      organization: { select: { name: true } },
    },
  });
  return apiSuccess(types);
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  category: z.string().max(50).optional(),
  organizationId: z.string().min(1),
});

export const POST = withSaasAuth(async (req) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const type = await prisma.equipmentType.create({ data: parsed.data });
    return apiSuccess(type, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Equipment type already exists for this org", 409);
    throw e;
  }
});
