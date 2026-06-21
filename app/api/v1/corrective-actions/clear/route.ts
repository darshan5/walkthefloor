import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (_req, _ctx, user) => {
  const deleted = await prisma.cAComment.deleteMany({
    where: { correctiveAction: { location: { organizationId: user.organizationId } } },
  });

  const cas = await prisma.correctiveAction.deleteMany({
    where: { location: { organizationId: user.organizationId } },
  });

  return apiSuccess({ cleared: cas.count, commentsCleared: deleted.count });
}, PERMISSIONS.ADMIN_ORG);
