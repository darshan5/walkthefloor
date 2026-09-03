import { apiSuccess, apiError } from "@/lib/api-utils";
import { validateApiKey } from "@/lib/services/api-key-service";
import { prisma } from "@/lib/prisma";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer wtf_live_")) {
    return apiError("API key required", 401);
  }

  const token = authHeader.substring(7);
  const apiKeyAuth = await validateApiKey(token);
  if (!apiKeyAuth) return apiError("Invalid API key", 401);

  const locations = await prisma.location.findMany({
    where: { organizationId: apiKeyAuth.organizationId, isActive: true },
    select: {
      id: true,
      name: true,
      storeNumber: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      phone: true,
      email: true,
    },
    orderBy: { name: "asc" },
  });

  return apiSuccess(locations);
}
