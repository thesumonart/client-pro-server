import { database } from "./config/db.ts";
import { env } from "./config/env.ts";
import { server } from "./server.ts";

const shutdown = (reason: string, exitCode: number): void => {
  server
    .stop(reason)
    .then(() => process.exit(exitCode))
    .catch((error: unknown) => {
      console.error("Error during shutdown:", error);
      process.exit(1);
    });
};

process.on("unhandledRejection", (reason: unknown) => {
  console.error("Unhandled promise rejection:", reason);
  shutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error: unknown) => {
  console.error("Uncaught exception:", error);
  shutdown("uncaughtException", 1);
});

process.on("SIGINT", () => shutdown("SIGINT", 0));
process.on("SIGTERM", () => shutdown("SIGTERM", 0));

const bootstrap = async (): Promise<void> => {
  // `env` is validated at import time and exits the process if invalid.
  console.info(`Booting client-pro-server in ${env.NODE_ENV} mode…`);

  await database.connect();
  server.start();
};

void bootstrap().catch((error: unknown) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
