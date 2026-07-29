import { z } from "zod";
import { commonValidation } from "./common.validation.ts";

export const chatMessageValidation = {
  idParamSchema: commonValidation.idParamSchema,

  /** `senderId` always comes from the session — never the payload. */
  sendMessageSchema: z.object({
    body: z.string().trim().min(1, "is required").max(5000),
  }),

  listMessageQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    sortBy: z.enum(["createdAt"]).default("createdAt"),
  }),

  /** Socket payload for `message:send`, which carries its own conversation id. */
  socketSendSchema: z.object({
    conversationId: commonValidation.objectId,
    body: z.string().trim().min(1).max(5000),
  }),

  socketConversationSchema: z.object({
    conversationId: commonValidation.objectId,
  }),

  socketTypingSchema: z.object({
    conversationId: commonValidation.objectId,
    isTyping: z.coerce.boolean(),
  }),
};
