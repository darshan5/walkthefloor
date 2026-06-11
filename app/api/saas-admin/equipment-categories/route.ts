import { withSaasAuth } from "@/lib/saas/auth-helpers";
import { apiSuccess, apiError } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const GET = withSaasAuth(async () => {
  const categories = await prisma.equipmentCategory.findMany({
    include: { _count: { select: { equipmentTypes: true } } },
    orderBy: { name: "asc" },
  });
  return apiSuccess(categories);
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  checkTypes: z.array(z.enum(["temperature", "calibration", "yes_no"])).min(1),
  complianceRules: z.record(z.string(), z.any()),
});

export const POST = withSaasAuth(async (req) => {
  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const cat = await prisma.equipmentCategory.create({
      data: {
        name: parsed.data.name,
        checkTypes: parsed.data.checkTypes,
        complianceRules: parsed.data.complianceRules,
      },
    });
    return apiSuccess(cat, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Category name already exists", 409);
    throw e;
  }
});
