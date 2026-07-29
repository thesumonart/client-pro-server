import { Router } from "express";
import { chatMessageController } from "../controllers/chat-message.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { chatMessageValidation } from "../validations/chat-message.validation.ts";
import { conversationValidation } from "../validations/conversation.validation.ts";

/**
 * Mounted under /conversations/:conversationId/messages, so the router needs
 * mergeParams to see the parent's id.
 */
const chatMessageRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        conversationValidation.conversationIdParamSchema,
        "params",
      ),
      validateMiddleware.validate(
        chatMessageValidation.listMessageQuerySchema,
        "query",
      ),
    ],
    handler: chatMessageController.getMessages,
  },
  send: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        conversationValidation.conversationIdParamSchema,
        "params",
      ),
      validateMiddleware.validate(
        chatMessageValidation.sendMessageSchema,
        "body",
      ),
    ],
    handler: chatMessageController.sendMessage,
  },
  markRead: {
    method: "patch",
    path: "/read",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        conversationValidation.conversationIdParamSchema,
        "params",
      ),
    ],
    handler: chatMessageController.markRead,
  },
} satisfies Record<string, RouteDefinition>;

export const chatMessageRoutes = routeUtils.register(
  Router({ mergeParams: true }),
  chatMessageRouteMap,
);
