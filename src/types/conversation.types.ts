import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type { conversationValidation } from "../validations/conversation.validation.ts";

/**
 * A direct conversation between exactly two team members.
 *
 * The frontend's `Conversation` exposes a single `participantId` ("the other
 * person") and a scalar `unread`. Both are caller-relative, so they are derived
 * at serialisation time: storing them would need one row per participant and
 * would make `unread` wrong for whoever did not write it last.
 */
export interface IConversation {
  participants: Types.ObjectId[];
  lastMessage: string;
  lastMessageAt: Date;
  /** Archiving is per-participant, not shared. */
  archivedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationDocument = HydratedDocument<IConversation>;

export type CreateConversationInput = z.infer<
  typeof conversationValidation.createConversationSchema
>;
export type ListConversationQuery = z.infer<
  typeof conversationValidation.listConversationQuerySchema
>;
export type ConversationIdParam = z.infer<
  typeof conversationValidation.conversationIdParamSchema
>;
