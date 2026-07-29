import mongoose, { Schema } from "mongoose";
import type { IConversation } from "../types/conversation.types.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const conversationSchema = new Schema<IConversation>(
  {
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: "TeamMember" }],
      required: true,
      validate: {
        validator: (value: unknown[]) => value.length === 2,
        message: "a conversation must have exactly two participants",
      },
      index: true,
    },
    lastMessage: { type: String, default: "", trim: true, maxlength: 5000 },
    lastMessageAt: { type: Date, required: true, default: () => new Date() },
    archivedBy: {
      type: [{ type: Schema.Types.ObjectId, ref: "TeamMember" }],
      default: [],
    },
  },
  schemaUtils.baseOptions(),
);

// Inbox ordering, and the participant-pair lookup used to reuse a thread.
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export const ConversationModel = mongoose.model<IConversation>(
  "Conversation",
  conversationSchema,
);

export const conversationQueries = {
  findForMember: (memberId: string) =>
    ConversationModel.find({ participants: memberId }).sort({
      lastMessageAt: -1,
    }),

  /**
   * Finds the existing thread between two members regardless of the order they
   * were stored in, so opening a chat twice never creates a duplicate.
   */
  findBetween: (memberA: string, memberB: string) =>
    ConversationModel.findOne({ participants: { $all: [memberA, memberB] } }),

  isParticipant: (conversationId: string, memberId: string) =>
    ConversationModel.exists({ _id: conversationId, participants: memberId }),

  touchLastMessage: (conversationId: string, body: string, when: Date) =>
    ConversationModel.updateOne(
      { _id: conversationId },
      { $set: { lastMessage: body, lastMessageAt: when } },
    ),
};
