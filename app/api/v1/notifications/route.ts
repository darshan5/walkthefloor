import { withAuth, apiSuccess, apiError } from "@/lib/api-utils";
import { getUnreadNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/services/notification-service";

export const GET = withAuth(async (req, _ctx, user) => {
  const { searchParams } = new URL(req.url);
  const countOnly = searchParams.get("count") === "true";

  if (countOnly) {
    const count = await getUnreadCount(user.id);
    return apiSuccess({ count });
  }

  const notifications = await getUnreadNotifications(user.id);
  return apiSuccess(notifications);
});

export const PATCH = withAuth(async (req, _ctx, user) => {
  const body = await req.json();

  if (body.markAllRead) {
    await markAllAsRead(user.id);
    return apiSuccess({ marked: true });
  }

  if (body.notificationId) {
    await markAsRead(body.notificationId, user.id);
    return apiSuccess({ marked: true });
  }

  return apiError("notificationId or markAllRead required");
});
