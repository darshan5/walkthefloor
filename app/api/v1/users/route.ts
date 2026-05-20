import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { createUserSchema } from "@/lib/validators/user";
import { getUsers, createUser } from "@/lib/services/user-service";

export const GET = withAuth(async (_req, _ctx, user) => {
  const users = await getUsers(user.organizationId);
  return apiSuccess(users);
}, PERMISSIONS.ADMIN_USERS);

export const POST = withAuth(async (req, _ctx, user) => {
  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) return apiError(parsed.error.issues[0].message);

  try {
    const newUser = await createUser(user.organizationId, parsed.data);
    return apiSuccess(newUser, 201);
  } catch (e: any) {
    if (e.code === "P2002") return apiError("Email already exists", 409);
    throw e;
  }
}, PERMISSIONS.ADMIN_USERS);
