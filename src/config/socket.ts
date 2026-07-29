import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socket.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import { env } from "./env.ts";

export type AppSocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

let io: AppSocketServer | null = null;

/** Personal room every authenticated socket joins, used for direct pushes. */
const userRoom = (userId: string): string => `user:${userId}`;
/** Room shared by all participants of a conversation. */
const conversationRoom = (conversationId: string): string =>
  `conversation:${conversationId}`;

/**
 * Socket.io lifecycle. Handshake authentication and event handlers are
 * registered by socketService, which owns the chat/notification behaviour.
 */
export const socketConfig = {
  userRoom,
  conversationRoom,

  init: (httpServer: HttpServer): AppSocketServer => {
    io = new SocketIOServer<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(httpServer, {
      path: "/socket.io",
      cors: {
        origin: env.corsOrigins,
        credentials: true,
      },
    });

    return io;
  },

  getIO: (): AppSocketServer => {
    if (!io) {
      throw ApiError.internal("Socket.io has not been initialised");
    }
    return io;
  },

  /** Push an event to a single user across all of their open sockets. */
  emitToUser: <E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void => {
    io?.to(userRoom(userId)).emit(event, ...args);
  },

  /** Push an event to everyone currently in a conversation room. */
  emitToConversation: <E extends keyof ServerToClientEvents>(
    conversationId: string,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): void => {
    io?.to(conversationRoom(conversationId)).emit(event, ...args);
  },

  close: async (): Promise<void> => {
    if (!io) return;
    await io.close();
    io = null;
  },
};
