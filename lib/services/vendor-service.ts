import { prisma } from "@/lib/prisma";

export async function getVendors(organizationId: string) {
  return prisma.vendor.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
}

export async function getActiveVendors(organizationId: string) {
  return prisma.vendor.findMany({
    where: { organizationId, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function getVendor(id: string, organizationId: string) {
  return prisma.vendor.findFirst({
    where: { id, organizationId },
  });
}

export async function createVendor(
  organizationId: string,
  data: {
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    specialty?: string;
    notes?: string;
  }
) {
  return prisma.vendor.create({
    data: { ...data, organizationId },
  });
}

export async function updateVendor(
  id: string,
  organizationId: string,
  data: {
    name?: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
    specialty?: string | null;
    notes?: string | null;
  }
) {
  const vendor = await prisma.vendor.findFirst({ where: { id, organizationId } });
  if (!vendor) throw new Error("Vendor not found");

  return prisma.vendor.update({
    where: { id },
    data,
  });
}

export async function toggleVendorActive(id: string, organizationId: string) {
  const vendor = await prisma.vendor.findFirst({ where: { id, organizationId } });
  if (!vendor) throw new Error("Vendor not found");

  return prisma.vendor.update({
    where: { id },
    data: { isActive: !vendor.isActive },
  });
}
