import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./env.ts";
import { ApiError } from "../utils/ApiError.ts";

let io: SocketIOServer | null = null;

/** Personal room every authenticated socket joins, used for direct pushes. */
const userRoom = (userId: string): string => `user:${userId}`;
/** Room shared by all participants of a conversation. */
const conversationRoom = (conversationId: string): string =>
  `conversation:${conversationId}`;

/**
 * Socket.io lifecycle. Handshake authentication and event handlers are
 * registered by the messaging/notification modules via `getIO()`.
 */
export const socketConfig = {
  userRoom,
  conversationRoom,

  init: (httpServer: HttpServer): SocketIOServer => {
    io = new SocketIOServer(httpServer, {
      path: "/socket.io",
      cors: {
        origin: env.corsOrigins,
        credentials: true,
      },
    });

    return io;
  },

  getIO: (): SocketIOServer => {
    if (!io) {
      throw ApiError.internal("Socket.io has not been initialised");
    }
    return io;
  },

  /** Push an event to a single user across all of their open sockets. */
  emitToUser: (userId: string, event: string, payload: unknown): void => {
    io?.to(userRoom(userId)).emit(event, payload);
  },

  /** Push an event to everyone currently in a conversation room. */
  emitToConversation: (
    conversationId: string,
    event: string,
    payload: unknown,
  ): void => {
    io?.to(conversationRoom(conversationId)).emit(event, payload);
  },

  close: async (): Promise<void> => {
    if (!io) return;
    await io.close();
    io = null;
  },
};
