import { prisma } from "@/lib/prisma";

type CreateNotificationInput = {
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
};

export async function createNotification(data: CreateNotificationInput) {
  return prisma.notification.create({ data });
}

export async function createNotificationsForMany(
  userIds: string[],
  organizationId: string,
  type: string,
  title: string,
  body?: string,
  link?: string
) {
  if (userIds.length === 0) return;
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      organizationId,
      type,
      title,
      body,
      link,
    })),
  });
}

export async function getUnreadNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, isRead: false },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, isRead: false },
  });
}

export async function markAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function getManagersAboveLocation(locationId: string, organizationId: string) {
  const locationUsers = await prisma.user.findMany({
    where: {
      organizationId,
      isActive: true,
      OR: [
        { homeLocationId: locationId },
        { userLocations: { some: { locationId } } },
      ],
    },
    select: { id: true, managerId: true },
  });

  const managerIds = new Set<string>();
  for (const user of locationUsers) {
    if (user.managerId) {
      await collectManagerChain(user.managerId, organizationId, managerIds);
    }
  }

  return Array.from(managerIds);
}

async function collectManagerChain(userId: string, organizationId: string, collected: Set<string>) {
  if (collected.has(userId)) return;

  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId, isActive: true },
    select: { id: true, managerId: true, role: { select: { name: true } } },
  });
  if (!user) return;

  const roleName = user.role.name;
  if (
    roleName === "Multi-unit Manager" ||
    roleName === "Director of Operations" ||
    roleName === "Franchisee"
  ) {
    collected.add(user.id);
  }

  if (user.managerId) {
    await collectManagerChain(user.managerId, organizationId, collected);
  }
}

export async function alertManagersOnNonCompliantTemp(
  locationId: string,
  organizationId: string,
  taskTitle: string,
  actualValue: string,
  validRange: string,
  locationName: string,
  caLink: string
) {
  const managerIds = await getManagersAboveLocation(locationId, organizationId);
  if (managerIds.length === 0) return;

  await createNotificationsForMany(
    managerIds,
    organizationId,
    "compliance_alert",
    `Temperature Alert: ${taskTitle}`,
    `${actualValue} recorded at ${locationName} (acceptable range: ${validRange})`,
    caLink
  );
}
