import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, _ctx, user) => {
  const org = await prisma.organization.findUnique({
    where: { id: user.organizationId },
    include: {
      _count: { select: { users: true, locations: true, equipmentTypes: true } },
    },
  });
  if (!org) return apiError("Not found", 404);
  return apiSuccess(org);
}, PERMISSIONS.ADMIN_ORG);

export const PATCH = withAuth(async (req, _ctx, user) => {
  const body = await req.json();

  const updateData: any = {};
  if (body.name) updateData.name = body.name;
  if (body.settings) {
    const current = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    });
    updateData.settings = { ...(current?.settings as any || {}), ...body.settings };
  }

  const org = await prisma.organization.update({
    where: { id: user.organizationId },
    data: updateData,
  });

  return apiSuccess(org);
}, PERMISSIONS.ADMIN_ORG);
