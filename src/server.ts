import http from "node:http";
import { app } from "./app.ts";
import { database } from "./config/db.ts";
import { env } from "./config/env.ts";
import { socketConfig } from "./config/socket.ts";
import { socketService } from "./services/socket.service.ts";

const httpServer = http.createServer(app);

// Socket.io shares the same HTTP server as Express; the gateway then attaches
// handshake authentication, room joins and the chat event handlers.
socketService.register(socketConfig.init(httpServer));

let shuttingDown = false;

export const server = {
  httpServer,

  start: (): http.Server =>
    httpServer.listen(env.PORT, () => {
      console.info(
        `✔ Server listening on http://localhost:${String(env.PORT)} [${env.NODE_ENV}]`,
      );
    }),

  /** Drains connections, closes Socket.io, then releases the DB connection. */
  stop: async (reason: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.info(`Shutting down (${reason})…`);

    await socketConfig.close();

    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => {
        if (
          error &&
          (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING"
        ) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    await database.disconnect();
  },
};
