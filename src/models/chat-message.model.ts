import mongoose, { Schema } from "mongoose";
import type { IChatMessage } from "../types/chat-message.types.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const chatMessageSchema = new Schema<IChatMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      required: true,
      index: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
    read: { type: Boolean, required: true, default: false, index: true },
  },
  schemaUtils.baseOptions(),
);

// Thread view, and the unread roll-up per conversation.
chatMessageSchema.index({ conversationId: 1, createdAt: -1 });
chatMessageSchema.index({ conversationId: 1, read: 1, senderId: 1 });

export const ChatMessageModel = mongoose.model<IChatMessage>(
  "ChatMessage",
  chatMessageSchema,
);

export const chatMessageQueries = {
  findByConversation: (conversationId: string) =>
    ChatMessageModel.find({ conversationId }).sort({ createdAt: -1 }),

  /**
   * Batch mark-as-read: a single updateMany over the unread messages the caller
   * did not send. Never a read-modify-write of the collection.
   */
  markConversationRead: (conversationId: string, readerId: string) =>
    ChatMessageModel.updateMany(
      { conversationId, read: false, senderId: { $ne: readerId } },
      { $set: { read: true } },
    ),

  countUnreadForMember: (conversationId: string, memberId: string) =>
    ChatMessageModel.countDocuments({
      conversationId,
      read: false,
      senderId: { $ne: memberId },
    }),

  deleteForConversation: (conversationId: string) =>
    ChatMessageModel.deleteMany({ conversationId }),
};
