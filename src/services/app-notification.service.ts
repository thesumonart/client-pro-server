import { socketConfig } from "../config/socket.ts";
import {
  AppNotificationModel,
  appNotificationQueries,
} from "../models/app-notification.model.ts";
import type {
  AppNotificationDocument,
  ListNotificationQuery,
  NotificationCategory,
  NotifyInput,
} from "../types/app-notification.types.ts";
import type { AuthUser } from "../types/auth.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { queryParser } from "../utils/query.utils.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

/** Response projection — mirrors the frontend's `AppNotification` interface. */
export interface PublicAppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  actorId: string | null;
  href: string | null;
  createdAt: Date;
}

/** Loads a notification, refusing anything that belongs to someone else. */
const findOwnedOrFail = async (
  id: string,
  actor: AuthUser,
): Promise<AppNotificationDocument> => {
  const notification = await AppNotificationModel.findById(id);

  if (!notification) {
    throw ApiError.notFound("Notification not found");
  }

  if (notification.recipientId.toString() !== actor.id) {
    throw ApiError.forbidden("This notification belongs to someone else");
  }

  return notification;
};

export const notificationService = {
  serialize: (
    notification: AppNotificationDocument,
  ): PublicAppNotification => ({
    id: notification._id.toString(),
    category: notification.category,
    title: notification.title,
    body: notification.body,
    read: notification.read,
    actorId: notification.actorId ? notification.actorId.toString() : null,
    href: notification.href,
    createdAt: notification.createdAt,
  }),

  /**
   * Creates a notification and pushes it to the recipient's personal room.
   * There is no public create route — services call this as a side-effect,
   * exactly like `activityService.log`.
   *
   * A delivery failure never breaks the operation that triggered it.
   */
  notify: async (input: NotifyInput): Promise<PublicAppNotification | null> => {
    try {
      const notification = await AppNotificationModel.create({
        recipientId: schemaUtils.toObjectId(input.recipientId),
        category: input.category,
        title: input.title,
        body: input.body,
        actorId: input.actorId ? schemaUtils.toObjectId(input.actorId) : null,
        href: input.href ?? null,
        read: false,
      });

      const payload = notificationService.serialize(notification);

      socketConfig.emitToUser(
        notification.recipientId.toString(),
        "notification:new",
        payload,
      );

      return payload;
    } catch (error) {
      console.error(`Failed to notify "${input.category}":`, error);
      return null;
    }
  },

  /** Fan-out helper for notifying several recipients at once. */
  notifyMany: async (inputs: NotifyInput[]): Promise<number> => {
    const created = await Promise.all(
      inputs.map((input) => notificationService.notify(input)),
    );

    return created.filter((item) => item !== null).length;
  },

  listNotifications: async (
    query: ListNotificationQuery,
    actor: AuthUser,
  ): Promise<{ items: PublicAppNotification[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    // Recipient scoping is not optional and not client-controllable.
    const filter: Record<string, unknown> = { recipientId: actor.id };

    if (query.category) filter.category = query.category;
    if (query.read) filter.read = query.read === "true";

    const search = queryParser.buildSearchFilter(query.search, [
      "title",
      "body",
    ]);
    if (search) Object.assign(filter, search);

    const [notifications, total] = await Promise.all([
      AppNotificationModel.find(filter).sort(sort).skip(skip).limit(limit),
      AppNotificationModel.countDocuments(filter),
    ]);

    return {
      items: notifications.map(notificationService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getUnreadCount: async (actor: AuthUser): Promise<number> =>
    appNotificationQueries.countUnread(actor.id),

  markRead: async (
    id: string,
    actor: AuthUser,
  ): Promise<PublicAppNotification> => {
    const notification = await findOwnedOrFail(id, actor);

    notification.read = true;
    await notification.save();

    return notificationService.serialize(notification);
  },

  /** Single updateMany scoped to the caller. */
  markAllRead: async (actor: AuthUser): Promise<{ modified: number }> => {
    const result = await appNotificationQueries.markAllRead(actor.id);

    return { modified: result.modifiedCount };
  },

  /** Single deleteMany scoped to the caller. */
  clearAll: async (actor: AuthUser): Promise<{ deleted: number }> => {
    const result = await appNotificationQueries.clearAll(actor.id);

    return { deleted: result.deletedCount };
  },

  deleteNotification: async (id: string, actor: AuthUser): Promise<void> => {
    const notification = await findOwnedOrFail(id, actor);

    await notification.deleteOne();
  },
};
