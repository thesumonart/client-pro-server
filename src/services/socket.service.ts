import type { Socket } from "socket.io";
import type { ZodType } from "zod";
import { socketConfig, type AppSocketServer } from "../config/socket.ts";
import { toAuthUser } from "../middlewares/auth.middleware.ts";
import { conversationQueries } from "../models/conversation.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from "../types/socket.types.ts";
import { tokenUtils } from "../utils/token.utils.ts";
import { chatMessageValidation } from "../validations/chat-message.validation.ts";
import { chatMessageService } from "./chat-message.service.ts";

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** Reads a raw cookie value out of a `Cookie:` header. */
const cookieValue = (
  header: string | undefined,
  name: string,
): string | null => {
  if (!header) return null;

  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }

  return null;
};

/**
 * The handshake carries the access token in `auth.token` (what socket.io
 * clients normally use), an Authorization header, or the access cookie.
 */
const handshakeToken = (socket: AppSocket): string | null => {
  const auth: unknown = socket.handshake.auth;

  if (isRecord(auth) && typeof auth.token === "string" && auth.token) {
    return tokenUtils.extractBearerToken(auth.token) ?? auth.token;
  }

  const header = tokenUtils.extractBearerToken(
    socket.handshake.headers.authorization,
  );
  if (header) return header;

  return cookieValue(socket.handshake.headers.cookie, "accessToken");
};

/** Rejects the connection unless the token resolves to an active member. */
const authenticate = async (socket: AppSocket): Promise<void> => {
  const token = handshakeToken(socket);

  if (!token) {
    throw new Error("Authentication required");
  }

  const payload = tokenUtils.verifyAccessToken(token);
  const member = await TeamMemberModel.findById(payload.sub);

  if (!member) {
    throw new Error("This account no longer exists");
  }

  if (member.status !== "active") {
    throw new Error(`This account is ${member.status}`);
  }

  socket.data.user = toAuthUser(member);
};

/**
 * Binds a validated handler. Socket listeners must return void, so the async
 * work is kicked off explicitly and its failures reported back to the client
 * instead of surfacing as an unhandled rejection.
 */
const on = <E extends keyof ClientToServerEvents, T>(
  socket: AppSocket,
  event: E,
  schema: ZodType<T>,
  handler: (payload: T) => Promise<void>,
): void => {
  const listener = (raw: unknown): void => {
    // Socket payloads are as untrusted as request bodies — validate every one.
    const parsed = schema.safeParse(raw);

    if (!parsed.success) {
      socket.emit("socket:error", {
        event: String(event),
        message: parsed.error.issues[0]?.message ?? "Invalid payload",
      });
      return;
    }

    void handler(parsed.data).catch((error: unknown) => {
      socket.emit("socket:error", {
        event: String(event),
        message: error instanceof Error ? error.message : "Unexpected error",
      });
    });
  };

  // socket.io resolves its listener type per concrete event name, which it
  // cannot do while `E` is still generic. Narrowed to one concrete signature
  // here rather than at all five call sites.
  const bind = socket.on.bind(socket) as (
    event: E,
    listener: (raw: unknown) => void,
  ) => void;

  bind(event, listener);
};

const registerHandlers = (socket: AppSocket): void => {
  const user = socket.data.user;

  on(
    socket,
    "message:send",
    chatMessageValidation.socketSendSchema,
    async ({ conversationId, body }) => {
      // Delegates to the same service the REST route uses, so persistence,
      // membership checks and fan-out stay identical across both transports.
      await chatMessageService.sendMessage(conversationId, { body }, user);
    },
  );

  on(
    socket,
    "message:read",
    chatMessageValidation.socketConversationSchema,
    async ({ conversationId }) => {
      await chatMessageService.markConversationRead(conversationId, user);
    },
  );

  on(
    socket,
    "typing",
    chatMessageValidation.socketTypingSchema,
    async ({ conversationId, isTyping }) => {
      const isParticipant = await conversationQueries.isParticipant(
        conversationId,
        user.id,
      );

      if (!isParticipant) {
        throw new Error("You are not part of this conversation");
      }

      // Broadcast excludes the sender — nobody needs their own typing echo.
      socket
        .to(socketConfig.conversationRoom(conversationId))
        .emit("typing", { conversationId, userId: user.id, isTyping });
    },
  );

  on(
    socket,
    "conversation:join",
    chatMessageValidation.socketConversationSchema,
    async ({ conversationId }) => {
      const isParticipant = await conversationQueries.isParticipant(
        conversationId,
        user.id,
      );

      if (!isParticipant) {
        throw new Error("You are not part of this conversation");
      }

      await socket.join(socketConfig.conversationRoom(conversationId));
    },
  );

  on(
    socket,
    "conversation:leave",
    chatMessageValidation.socketConversationSchema,
    async ({ conversationId }) => {
      await socket.leave(socketConfig.conversationRoom(conversationId));
    },
  );
};

export const socketService = {
  /**
   * Authenticates the handshake, then puts each socket into its personal room
   * and every conversation room it belongs to.
   */
  register: (io: AppSocketServer): void => {
    io.use((socket, next) => {
      void authenticate(socket).then(
        () => {
          next();
        },
        (error: unknown) => {
          next(
            error instanceof Error ? error : new Error("Authentication failed"),
          );
        },
      );
    });

    io.on("connection", (socket) => {
      const user = socket.data.user;

      // Bind handlers synchronously, before any await. A client that emits the
      // instant `connect` fires would otherwise have that event dropped, since
      // the listeners would not exist yet.
      registerHandlers(socket);

      void (async () => {
        await socket.join(socketConfig.userRoom(user.id));

        const conversations = await conversationQueries
          .findForMember(user.id)
          .select("_id");

        // join() takes an array, so this is one call rather than N.
        await socket.join(
          conversations.map((conversation) =>
            socketConfig.conversationRoom(conversation._id.toString()),
          ),
        );
      })().catch((error: unknown) => {
        console.error("Socket room setup failed:", error);
        socket.disconnect(true);
      });
    });
  },
};
