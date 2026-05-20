import { prisma } from "@/lib/prisma";
import crypto from "crypto";

type ApiKeyAuth = {
  organizationId: string;
  scopes: string[];
  locationIds: string[];
  keyId: string;
};

export async function validateApiKey(bearerToken: string): Promise<ApiKeyAuth | null> {
  if (!bearerToken.startsWith("wtf_live_")) return null;

  const keyHash = crypto.createHash("sha256").update(bearerToken).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash },
  });

  if (!apiKey || !apiKey.isActive) return null;

  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) return null;

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    organizationId: apiKey.organizationId,
    scopes: apiKey.scopes as string[],
    locationIds: apiKey.locationIds as string[],
    keyId: apiKey.id,
  };
}

export function hasScope(auth: ApiKeyAuth, requiredScope: string): boolean {
  return auth.scopes.includes(requiredScope);
}
