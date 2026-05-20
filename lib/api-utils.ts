import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
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

export function withAuth(handler: AuthenticatedHandler, requiredPermission?: string) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
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
