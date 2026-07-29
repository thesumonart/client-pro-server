import { Router } from "express";
import { notificationController } from "../controllers/app-notification.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { appNotificationValidation } from "../validations/app-notification.validation.ts";

/**
 * Every route is scoped to the caller by the service — a notification only ever
 * belongs to one recipient. There is no create route: notifications are raised
 * internally via `notificationService.notify`.
 */
const notificationRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        appNotificationValidation.listNotificationQuerySchema,
        "query",
      ),
    ],
    handler: notificationController.getNotifications,
  },
  // Literal paths declared before "/:id" so they are not captured as ids.
  unreadCount: {
    method: "get",
    path: "/unread-count",
    middlewares: [authMiddleware.protect],
    handler: notificationController.getUnreadCount,
  },
  markAllRead: {
    method: "patch",
    path: "/read-all",
    middlewares: [authMiddleware.protect],
    handler: notificationController.markAllRead,
  },
  clearAll: {
    method: "delete",
    path: "/clear-all",
    middlewares: [authMiddleware.protect],
    handler: notificationController.clearAll,
  },
  markRead: {
    method: "patch",
    path: "/:id/read",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        appNotificationValidation.idParamSchema,
        "params",
      ),
    ],
    handler: notificationController.markRead,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        appNotificationValidation.idParamSchema,
        "params",
      ),
    ],
    handler: notificationController.deleteNotification,
  },
} satisfies Record<string, RouteDefinition>;

export const notificationRoutes = routeUtils.register(
  Router(),
  notificationRouteMap,
);
