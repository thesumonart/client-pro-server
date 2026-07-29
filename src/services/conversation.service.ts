import { Types } from "mongoose";
import { ChatMessageModel } from "../models/chat-message.model.ts";
import {
  ConversationModel,
  conversationQueries,
} from "../models/conversation.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  ConversationDocument,
  CreateConversationInput,
  ListConversationQuery,
} from "../types/conversation.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { queryParser } from "../utils/query.utils.ts";

/** Response projection — mirrors the frontend's `Conversation` interface. */
export interface PublicConversation {
  id: string;
  participantId: string | null;
  lastMessage: string;
  lastMessageAt: Date;
  unread: number;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** The participant who is not the caller. */
const otherParticipant = (
  conversation: ConversationDocument,
  callerId: string,
): string | null => {
  const other = conversation.participants.find(
    (participant) => participant.toString() !== callerId,
  );

  return other ? other.toString() : null;
};

/** One grouped count for the whole page instead of a query per conversation. */
const unreadByConversation = async (
  conversationIds: Types.ObjectId[],
  memberId: string,
): Promise<Map<string, number>> => {
  if (conversationIds.length === 0) return new Map();

  // Aggregation pipelines bypass Mongoose casting — ids must be ObjectIds here.
  const rows = await ChatMessageModel.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        conversationId: { $in: conversationIds },
        read: false,
        senderId: { $ne: new Types.ObjectId(memberId) },
      },
    },
    { $group: { _id: "$conversationId", count: { $sum: 1 } } },
  ]);

  return new Map(rows.map((row) => [row._id.toString(), row.count]));
};

export const conversationService = {
  serialize: (
    conversation: ConversationDocument,
    callerId: string,
    unread: number,
  ): PublicConversation => ({
    id: conversation._id.toString(),
    participantId: otherParticipant(conversation, callerId),
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    unread,
    archived: conversation.archivedBy.some(
      (member) => member.toString() === callerId,
    ),
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  }),

  /**
   * Loads a conversation the caller belongs to. Membership is the whole access
   * rule for messaging: any authenticated role may chat, but only inside their
   * own threads.
   */
  findForActorOrFail: async (
    conversationId: string,
    actor: AuthUser,
  ): Promise<ConversationDocument> => {
    const conversation = await ConversationModel.findById(conversationId);

    if (!conversation) {
      throw ApiError.notFound("Conversation not found");
    }

    const isParticipant = conversation.participants.some(
      (participant) => participant.toString() === actor.id,
    );

    if (!isParticipant) {
      throw ApiError.forbidden("You are not part of this conversation");
    }

    return conversation;
  },

  listConversations: async (
    query: ListConversationQuery,
    actor: AuthUser,
  ): Promise<{ items: PublicConversation[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "lastMessageAt",
    );

    const filter: Record<string, unknown> = { participants: actor.id };

    if (query.archived === "true") {
      filter.archivedBy = actor.id;
    } else if (query.archived === "false") {
      filter.archivedBy = { $ne: new Types.ObjectId(actor.id) };
    }

    const search = queryParser.buildSearchFilter(query.search, ["lastMessage"]);
    if (search) Object.assign(filter, search);

    const [conversations, total] = await Promise.all([
      ConversationModel.find(filter).sort(sort).skip(skip).limit(limit),
      ConversationModel.countDocuments(filter),
    ]);

    const unread = await unreadByConversation(
      conversations.map((conversation) => conversation._id),
      actor.id,
    );

    let items = conversations.map((conversation) =>
      conversationService.serialize(
        conversation,
        actor.id,
        unread.get(conversation._id.toString()) ?? 0,
      ),
    );

    if (query.unreadOnly === "true") {
      items = items.filter((conversation) => conversation.unread > 0);
    }

    return {
      items,
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getConversationById: async (
    id: string,
    actor: AuthUser,
  ): Promise<PublicConversation> => {
    const conversation = await conversationService.findForActorOrFail(
      id,
      actor,
    );

    const unread = await ChatMessageModel.countDocuments({
      conversationId: conversation._id,
      read: false,
      senderId: { $ne: new Types.ObjectId(actor.id) },
    });

    return conversationService.serialize(conversation, actor.id, unread);
  },

  /** Opens a direct thread, reusing the existing one if there is one. */
  createConversation: async (
    { participantId }: CreateConversationInput,
    actor: AuthUser,
  ): Promise<{ conversation: PublicConversation; created: boolean }> => {
    if (participantId === actor.id) {
      throw ApiError.badRequest(
        "You cannot start a conversation with yourself",
        [{ path: "participantId", message: "must be another team member" }],
      );
    }

    const participant = await TeamMemberModel.exists({ _id: participantId });

    if (!participant) {
      throw ApiError.badRequest("Team member does not exist", [
        {
          path: "participantId",
          message: "must reference an existing team member",
        },
      ]);
    }

    const existing = await conversationQueries.findBetween(
      actor.id,
      participantId,
    );

    if (existing) {
      const unread = await ChatMessageModel.countDocuments({
        conversationId: existing._id,
        read: false,
        senderId: { $ne: new Types.ObjectId(actor.id) },
      });

      return {
        conversation: conversationService.serialize(existing, actor.id, unread),
        created: false,
      };
    }

    const conversation = await ConversationModel.create({
      participants: [actor.id, participantId],
      lastMessage: "",
      lastMessageAt: new Date(),
      archivedBy: [],
    });

    return {
      conversation: conversationService.serialize(conversation, actor.id, 0),
      created: true,
    };
  },

  /** Archiving is per-participant, so this only affects the caller's inbox. */
  toggleArchive: async (
    id: string,
    actor: AuthUser,
  ): Promise<PublicConversation> => {
    const conversation = await conversationService.findForActorOrFail(
      id,
      actor,
    );

    const isArchived = conversation.archivedBy.some(
      (member) => member.toString() === actor.id,
    );

    await ConversationModel.updateOne(
      { _id: conversation._id },
      isArchived
        ? { $pull: { archivedBy: actor.id } }
        : { $addToSet: { archivedBy: actor.id } },
    );

    return conversationService.getConversationById(id, actor);
  },
};
