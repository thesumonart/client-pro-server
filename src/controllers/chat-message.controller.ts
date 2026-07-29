import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { chatMessageService } from "../services/chat-message.service.ts";
import type {
  ListMessageQuery,
  SendMessageInput,
} from "../types/chat-message.types.ts";
import type { ConversationIdParam } from "../types/conversation.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const chatMessageController = {
  getMessages: asyncHandler(async (req, res) => {
    const { conversationId } = validateMiddleware.data<ConversationIdParam>(
      req,
      "params",
    );
    const query = validateMiddleware.data<ListMessageQuery>(req, "query");
    const { items, meta } = await chatMessageService.listMessages(
      conversationId,
      query,
      requireUser(req.user),
    );

    ApiResponse.ok(res, items, "Messages retrieved", meta);
  }),

  sendMessage: asyncHandler(async (req, res) => {
    const { conversationId } = validateMiddleware.data<ConversationIdParam>(
      req,
      "params",
    );
    const payload = validateMiddleware.data<SendMessageInput>(req, "body");
    const message = await chatMessageService.sendMessage(
      conversationId,
      payload,
      requireUser(req.user),
    );

    ApiResponse.created(res, message, "Message sent");
  }),

  markRead: asyncHandler(async (req, res) => {
    const { conversationId } = validateMiddleware.data<ConversationIdParam>(
      req,
      "params",
    );
    const result = await chatMessageService.markConversationRead(
      conversationId,
      requireUser(req.user),
    );

    ApiResponse.ok(res, result, "Messages marked as read");
  }),

  getUnreadCount: asyncHandler(async (req, res) => {
    const user = requireUser(req.user);
    const unread = await chatMessageService.countUnreadForMember(user.id);

    ApiResponse.ok(res, { unread }, "Unread count retrieved");
  }),
};
