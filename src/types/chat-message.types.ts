import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type { chatMessageValidation } from "../validations/chat-message.validation.ts";

export interface IChatMessage {
  conversationId: Types.ObjectId;
  /** The authenticated sender's id. Never the "me" literal the frontend uses. */
  senderId: Types.ObjectId;
  body: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatMessageDocument = HydratedDocument<IChatMessage>;

export type SendMessageInput = z.infer<
  typeof chatMessageValidation.sendMessageSchema
>;
export type ListMessageQuery = z.infer<
  typeof chatMessageValidation.listMessageQuerySchema
>;
export type SocketSendInput = z.infer<
  typeof chatMessageValidation.socketSendSchema
>;
export type SocketConversationInput = z.infer<
  typeof chatMessageValidation.socketConversationSchema
>;
export type SocketTypingInput = z.infer<
  typeof chatMessageValidation.socketTypingSchema
>;
