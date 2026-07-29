import type { AuthUser } from "./auth.types.ts";

export interface SocketMessagePayload {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  read: boolean;
  createdAt: Date;
}

export interface SocketTypingPayload {
  conversationId: string;
  userId: string;
  isTyping: boolean;
}

export interface SocketReadPayload {
  conversationId: string;
  readerId: string;
  count: number;
}

export interface SocketNotificationPayload {
  id: string;
  category: string;
  title: string;
  body: string;
  read: boolean;
  actorId: string | null;
  href: string | null;
  createdAt: Date;
}

/** Events the server pushes to clients. */
export interface ServerToClientEvents {
  "message:new": (payload: SocketMessagePayload) => void;
  "message:read": (payload: SocketReadPayload) => void;
  typing: (payload: SocketTypingPayload) => void;
  "notification:new": (payload: SocketNotificationPayload) => void;
  "socket:error": (payload: { event: string; message: string }) => void;
}

/** Events clients emit to the server. */
export interface ClientToServerEvents {
  "message:send": (payload: { conversationId: string; body: string }) => void;
  "message:read": (payload: { conversationId: string }) => void;
  typing: (payload: { conversationId: string; isTyping: boolean }) => void;
  "conversation:join": (payload: { conversationId: string }) => void;
  "conversation:leave": (payload: { conversationId: string }) => void;
}

export type InterServerEvents = Record<string, never>;

/** Populated by the handshake auth middleware. */
export interface SocketData {
  user: AuthUser;
}
