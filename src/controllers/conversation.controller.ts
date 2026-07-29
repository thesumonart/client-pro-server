import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { conversationService } from "../services/conversation.service.ts";
import type {
  CreateConversationInput,
  ListConversationQuery,
} from "../types/conversation.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const conversationController = {
  getConversations: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListConversationQuery>(req, "query");
    const { items, meta } = await conversationService.listConversations(
      query,
      requireUser(req.user),
    );

    ApiResponse.ok(res, items, "Conversations retrieved", meta);
  }),

  getConversationById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const conversation = await conversationService.getConversationById(
      id,
      requireUser(req.user),
    );

    ApiResponse.ok(res, conversation, "Conversation retrieved");
  }),

  createConversation: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<CreateConversationInput>(
      req,
      "body",
    );
    const { conversation, created } =
      await conversationService.createConversation(
        payload,
        requireUser(req.user),
      );

    // Reopening an existing thread is a 200, not a 201.
    ApiResponse.send(
      res,
      created ? 201 : 200,
      conversation,
      created ? "Conversation created" : "Conversation reopened",
    );
  }),

  toggleArchive: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const conversation = await conversationService.toggleArchive(
      id,
      requireUser(req.user),
    );

    ApiResponse.ok(
      res,
      conversation,
      conversation.archived ? "Conversation archived" : "Conversation restored",
    );
  }),
};
