import { Router } from "express";
import { chatMessageController } from "../controllers/chat-message.controller.ts";
import { conversationController } from "../controllers/conversation.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { conversationValidation } from "../validations/conversation.validation.ts";
import { chatMessageRoutes } from "./chat-message.routes.ts";

// Messaging is open to every authenticated role, scoped by participation:
// the service refuses any conversation the caller is not part of.
const conversationRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        conversationValidation.listConversationQuerySchema,
        "query",
      ),
    ],
    handler: conversationController.getConversations,
  },
  create: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        conversationValidation.createConversationSchema,
        "body",
      ),
    ],
    handler: conversationController.createConversation,
  },
  // Literal path declared before "/:id" so it is not captured as an id.
  unreadCount: {
    method: "get",
    path: "/unread-count",
    middlewares: [authMiddleware.protect],
    handler: chatMessageController.getUnreadCount,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        conversationValidation.idParamSchema,
        "params",
      ),
    ],
    handler: conversationController.getConversationById,
  },
  archive: {
    method: "patch",
    path: "/:id/archive",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        conversationValidation.idParamSchema,
        "params",
      ),
    ],
    handler: conversationController.toggleArchive,
  },
} satisfies Record<string, RouteDefinition>;

const router = routeUtils.register(Router(), conversationRouteMap);

router.use("/:conversationId/messages", chatMessageRoutes);

export const conversationRoutes = router;
