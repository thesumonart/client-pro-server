import { Types } from "mongoose";
import { socketConfig } from "../config/socket.ts";
import {
  ChatMessageModel,
  chatMessageQueries,
} from "../models/chat-message.model.ts";
import { conversationQueries } from "../models/conversation.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  ChatMessageDocument,
  ListMessageQuery,
  SendMessageInput,
} from "../types/chat-message.types.ts";
import type { SocketMessagePayload } from "../types/socket.types.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { queryParser } from "../utils/query.utils.ts";
import { notificationService } from "./app-notification.service.ts";
import { conversationService } from "./conversation.service.ts";

/** Response projection — mirrors the frontend's `ChatMessage` interface. */
export type PublicChatMessage = SocketMessagePayload;

export const chatMessageService = {
  serialize: (message: ChatMessageDocument): PublicChatMessage => ({
    id: message._id.toString(),
    conversationId: message.conversationId.toString(),
    // A real member id — the frontend's "me" literal is a client-side concern.
    senderId: message.senderId.toString(),
    body: message.body,
    read: message.read,
    createdAt: message.createdAt,
  }),

  listMessages: async (
    conversationId: string,
    query: ListMessageQuery,
    actor: AuthUser,
  ): Promise<{ items: PublicChatMessage[]; meta: PaginationMeta }> => {
    await conversationService.findForActorOrFail(conversationId, actor);

    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    const filter: Record<string, unknown> = { conversationId };

    const search = queryParser.buildSearchFilter(query.search, ["body"]);
    if (search) Object.assign(filter, search);

    const [messages, total] = await Promise.all([
      ChatMessageModel.find(filter).sort(sort).skip(skip).limit(limit),
      ChatMessageModel.countDocuments(filter),
    ]);

    return {
      items: messages.map(chatMessageService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  /**
   * Persists a message and pushes it in real time. Shared by the REST route and
   * the `message:send` socket event so both paths behave identically — a
   * message sent over HTTP still reaches the other party's open sockets.
   */
  sendMessage: async (
    conversationId: string,
    { body }: SendMessageInput,
    actor: AuthUser,
  ): Promise<PublicChatMessage> => {
    const conversation = await conversationService.findForActorOrFail(
      conversationId,
      actor,
    );

    const message = await ChatMessageModel.create({
      conversationId: conversation._id,
      senderId: actor.id,
      body,
      read: false,
    });

    await conversationQueries.touchLastMessage(
      conversation._id.toString(),
      body,
      message.createdAt,
    );

    const payload = chatMessageService.serialize(message);

    // Conversation room reaches anyone with the thread open; the personal rooms
    // reach participants who are connected but looking elsewhere.
    socketConfig.emitToConversation(
      conversation._id.toString(),
      "message:new",
      payload,
    );

    const recipients = conversation.participants
      .map((participant) => participant.toString())
      .filter((participantId) => participantId !== actor.id);

    recipients.forEach((participantId) => {
      socketConfig.emitToUser(participantId, "message:new", payload);
    });

    // Raise a notification alongside the live push, so the message is still
    // surfaced to a recipient who had no socket open at the time.
    await notificationService.notifyMany(
      recipients.map((recipientId) => ({
        recipientId,
        category: "message" as const,
        title: `New message from ${actor.name}`,
        body: body.length > 140 ? `${body.slice(0, 140)}…` : body,
        actorId: actor.id,
        href: `/messages?conversation=${conversation._id.toString()}`,
      })),
    );

    return payload;
  },

  /**
   * Batch mark-as-read for a whole thread: one updateMany over the unread
   * messages the caller did not send.
   */
  markConversationRead: async (
    conversationId: string,
    actor: AuthUser,
  ): Promise<{ modified: number }> => {
    await conversationService.findForActorOrFail(conversationId, actor);

    const result = await chatMessageQueries.markConversationRead(
      conversationId,
      actor.id,
    );

    if (result.modifiedCount > 0) {
      socketConfig.emitToConversation(conversationId, "message:read", {
        conversationId,
        readerId: actor.id,
        count: result.modifiedCount,
      });
    }

    return { modified: result.modifiedCount };
  },

  /** Total unread across every thread the member belongs to. */
  countUnreadForMember: async (memberId: string): Promise<number> => {
    const conversations = await conversationQueries
      .findForMember(memberId)
      .select("_id");

    if (conversations.length === 0) return 0;

    return ChatMessageModel.countDocuments({
      conversationId: {
        $in: conversations.map((conversation) => conversation._id),
      },
      read: false,
      senderId: { $ne: new Types.ObjectId(memberId) },
    });
  },
};
