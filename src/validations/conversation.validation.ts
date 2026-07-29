import { z } from "zod";
import { commonValidation } from "./common.validation.ts";

export const conversationValidation = {
  idParamSchema: commonValidation.idParamSchema,

  conversationIdParamSchema: z.object({
    conversationId: commonValidation.objectId,
  }),

  /** Opens (or reuses) a direct conversation with another team member. */
  createConversationSchema: z.object({
    participantId: commonValidation.objectId,
  }),

  listConversationQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    archived: z.enum(["true", "false", "all"]).default("false"),
    /** Only conversations holding messages the caller has not read. */
    unreadOnly: z.enum(["true", "false"]).optional(),
    sortBy: z.enum(["lastMessageAt", "createdAt"]).default("lastMessageAt"),
  }),
};
