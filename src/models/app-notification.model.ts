import mongoose, { Schema } from "mongoose";
import type { IAppNotification } from "../types/app-notification.types.ts";
import { NOTIFICATION_CATEGORIES } from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const appNotificationSchema = new Schema<IAppNotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      required: true,
      index: true,
    },
    category: {
      type: String,
      enum: NOTIFICATION_CATEGORIES,
      required: true,
      default: "system",
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    read: { type: Boolean, required: true, default: false, index: true },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
    },
    href: { type: String, default: null, trim: true, maxlength: 500 },
  },
  schemaUtils.baseOptions(),
);

// The bell menu: this recipient's newest first, and their unread roll-up.
appNotificationSchema.index({ recipientId: 1, createdAt: -1 });
appNotificationSchema.index({ recipientId: 1, read: 1 });

export const AppNotificationModel = mongoose.model<IAppNotification>(
  "AppNotification",
  appNotificationSchema,
);

export const appNotificationQueries = {
  findForRecipient: (recipientId: string) =>
    AppNotificationModel.find({ recipientId }).sort({ createdAt: -1 }),

  countUnread: (recipientId: string) =>
    AppNotificationModel.countDocuments({ recipientId, read: false }),

  /** Bulk mark-as-read — one write, never a read-modify-write of the list. */
  markAllRead: (recipientId: string) =>
    AppNotificationModel.updateMany(
      { recipientId, read: false },
      { $set: { read: true } },
    ),

  /** Bulk clear — one delete, never a fetch-then-delete loop. */
  clearAll: (recipientId: string) =>
    AppNotificationModel.deleteMany({ recipientId }),

  /** Cleanup hook for when a team member is removed. */
  deleteForRecipient: (recipientId: string) =>
    AppNotificationModel.deleteMany({ recipientId }),
};
