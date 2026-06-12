import { withAuth, apiSuccess } from "@/lib/api-utils";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async () => {
  const categories = await prisma.equipmentCategory.findMany({
    orderBy: { name: "asc" },
  });
  return apiSuccess(categories);
});
