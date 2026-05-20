import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { CreateUserInput, UpdateUserInput } from "@/lib/validators/user";

export async function getUsers(organizationId: string) {
  return prisma.user.findMany({
    where: { organizationId },
    include: {
      role: { select: { id: true, name: true } },
      manager: { select: { id: true, name: true, title: true } },
      homeLocation: { select: { id: true, name: true } },
      _count: { select: { userLocations: true, directReports: true } },
    },
    orderBy: { name: "asc" },
  });
}

export async function getUser(id: string, organizationId: string) {
  return prisma.user.findFirst({
    where: { id, organizationId },
    include: {
      role: { select: { id: true, name: true, permissions: true } },
      manager: { select: { id: true, name: true, title: true } },
      homeLocation: { select: { id: true, name: true } },
      userLocations: {
        include: { location: { select: { id: true, name: true, storeNumber: true } } },
      },
      directReports: {
        select: { id: true, name: true, title: true, homeLocation: { select: { name: true } } },
      },
    },
  });
}

export async function createUser(organizationId: string, data: CreateUserInput) {
  const createData: any = {
    name: data.name,
    title: data.title,
    userType: data.userType,
    organizationId,
    roleId: data.roleId,
    managerId: data.managerId || null,
    homeLocationId: data.homeLocationId || null,
    appAccess: data.appAccess || [],
    isConfirmed: true,
    hireDate: data.hireDate ? new Date(data.hireDate) : null,
  };

  if (data.email) createData.email = data.email;
  if (data.password) createData.hashedPassword = await bcrypt.hash(data.password, 10);
  if (data.pin) createData.pin = data.pin;

  return prisma.user.create({
    data: createData,
    include: { role: { select: { name: true } } },
  });
}

export async function updateUser(id: string, organizationId: string, data: UpdateUserInput) {
  const existing = await prisma.user.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("User not found");

  const updateData: any = { ...data };
  delete updateData.hireDate;
  if (data.hireDate) updateData.hireDate = new Date(data.hireDate);
  if (data.managerId === null) updateData.managerId = null;
  if (data.homeLocationId === null) updateData.homeLocationId = null;

  return prisma.user.update({ where: { id }, data: updateData });
}

export async function resetPassword(id: string, organizationId: string, newPassword: string) {
  const existing = await prisma.user.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("User not found");

  return prisma.user.update({
    where: { id },
    data: { hashedPassword: await bcrypt.hash(newPassword, 10) },
  });
}

export async function deactivateUser(id: string, organizationId: string) {
  const existing = await prisma.user.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("User not found");

  return prisma.user.update({
    where: { id },
    data: { isActive: false, pin: null },
  });
}

export async function assignLocations(id: string, organizationId: string, locationIds: string[]) {
  const existing = await prisma.user.findFirst({ where: { id, organizationId } });
  if (!existing) throw new Error("User not found");

  await prisma.userLocation.deleteMany({ where: { userId: id } });

  if (locationIds.length > 0) {
    await prisma.userLocation.createMany({
      data: locationIds.map((locationId) => ({ userId: id, locationId })),
    });
  }

  return { assigned: locationIds.length };
}

export async function getRoles(organizationId: string) {
  return prisma.role.findMany({
    where: { organizationId },
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
}

export async function getDevices(organizationId: string) {
  const locations = await prisma.location.findMany({
    where: { organizationId },
    select: { id: true },
  });
  const locationIds = locations.map((l) => l.id);

  return prisma.registeredDevice.findMany({
    where: { locationId: { in: locationIds } },
    orderBy: { createdAt: "desc" },
  });
}
