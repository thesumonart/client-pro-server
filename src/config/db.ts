import mongoose from "mongoose";
import { env } from "./env.ts";

/** MongoDB connection lifecycle. */
export const database = {
  connect: async (): Promise<typeof mongoose> => {
    mongoose.set("strictQuery", true);

    const connection = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      autoIndex: !env.isProduction,
    });

    console.info(
      `✔ MongoDB connected → ${connection.connection.host}/${connection.connection.name}`,
    );

    mongoose.connection.on("error", (error: unknown) => {
      console.error("MongoDB connection error:", error);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
    });

    return connection;
  },

  disconnect: async (): Promise<void> => {
    await mongoose.disconnect();
    console.info("MongoDB connection closed");
  },
};
