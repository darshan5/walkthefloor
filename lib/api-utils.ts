import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { validateApiKey, hasScope } from "@/lib/services/api-key-service";
import { NextRequest } from "next/server";

type SessionUser = {
  id: string;
  name: string;
  title: string | null;
  role: string;
  permissions: string[];
  organizationId: string;
  homeLocationId: string | null;
  locationIds: string[];
  appAccess: string[];
};

type AuthenticatedHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  user: SessionUser
) => Promise<Response>;

const permissionToScope: Record<string, string> = {
  "checklists.view": "checklists.read",
  "checklists.complete": "completions.read",
  "checklists.reports": "reports.read",
};

export function withAuth(handler: AuthenticatedHandler, requiredPermission?: string) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer wtf_live_")) {
      const token = authHeader.substring(7);
      const apiKeyAuth = await validateApiKey(token);
      if (!apiKeyAuth) {
        return Response.json({ error: "Invalid or expired API key" }, { status: 401 });
      }

      if (requiredPermission) {
        const scope = permissionToScope[requiredPermission] || requiredPermission.replace(".", ".read");
        if (!hasScope(apiKeyAuth, scope) && !hasScope(apiKeyAuth, requiredPermission)) {
          return Response.json({ error: "Insufficient scope" }, { status: 403 });
        }
      }

      if (req.method !== "GET") {
        return Response.json({ error: "API keys only support read operations" }, { status: 405 });
      }

      const apiUser: SessionUser = {
        id: `apikey:${apiKeyAuth.keyId}`,
        name: "API Key",
        title: null,
        role: "api_key",
        permissions: apiKeyAuth.scopes,
        organizationId: apiKeyAuth.organizationId,
        homeLocationId: null,
        locationIds: apiKeyAuth.locationIds,
        appAccess: [],
      };

      return handler(req, context, apiUser);
    }

    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as unknown as SessionUser;

    if (requiredPermission && !hasPermission(user.permissions, requiredPermission)) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(req, context, user);
  };
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return Response.json({ data }, { status });
}
