import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { notificationService } from "../services/app-notification.service.ts";
import type { ListNotificationQuery } from "../types/app-notification.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const notificationController = {
  getNotifications: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListNotificationQuery>(req, "query");
    const { items, meta } = await notificationService.listNotifications(
      query,
      requireUser(req.user),
    );

    ApiResponse.ok(res, items, "Notifications retrieved", meta);
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const unread = await notificationService.getUnreadCount(
      requireUser(req.user),
    );

    ApiResponse.ok(res, { unread }, "Unread count retrieved");
  }),

  markRead: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const notification = await notificationService.markRead(
      id,
      requireUser(req.user),
    );

    ApiResponse.ok(res, notification, "Notification marked as read");
  }),

  markAllRead: asyncHandler(async (req, res) => {
    const result = await notificationService.markAllRead(requireUser(req.user));

    ApiResponse.ok(res, result, "All notifications marked as read");
  }),

  clearAll: asyncHandler(async (req, res) => {
    const result = await notificationService.clearAll(requireUser(req.user));

    ApiResponse.ok(res, result, "All notifications cleared");
  }),

  deleteNotification: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await notificationService.deleteNotification(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Notification deleted");
  }),
};
