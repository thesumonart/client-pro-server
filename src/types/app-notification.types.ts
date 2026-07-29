import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type { NOTIFICATION_CATEGORIES } from "../utils/constants.ts";
import type { appNotificationValidation } from "../validations/app-notification.validation.ts";

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface IAppNotification {
  /**
   * Owner of the notification. Every read and write is scoped to this field —
   * a notification only ever exists for one person.
   */
  recipientId: Types.ObjectId;
  category: NotificationCategory;
  title: string;
  body: string;
  read: boolean;
  /** Who triggered it, when a person did. */
  actorId: Types.ObjectId | null;
  /** Deep link into the frontend. */
  href: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type AppNotificationDocument = HydratedDocument<IAppNotification>;

/**
 * Input for `notificationService.notify`. Hand-written rather than z.infer'd:
 * notifications are system-generated, so there is no request schema to mirror.
 */
export interface NotifyInput {
  recipientId: Types.ObjectId | string;
  category: NotificationCategory;
  title: string;
  body: string;
  actorId?: Types.ObjectId | string | null;
  href?: string | null;
}

export type ListNotificationQuery = z.infer<
  typeof appNotificationValidation.listNotificationQuerySchema
>;
