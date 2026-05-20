import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

type SaasAdmin = {
  saasAdminId: string;
  name: string;
  saasRole: string;
};

type SaasAuthHandler = (
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  admin: SaasAdmin
) => Promise<Response>;

export function withSaasAuth(handler: SaasAuthHandler) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const session = await auth();
    const user = session?.user as any;

    if (!user?.saasAdminId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return handler(req, context, {
      saasAdminId: user.saasAdminId,
      name: user.name,
      saasRole: user.saasRole,
    });
  };
}
