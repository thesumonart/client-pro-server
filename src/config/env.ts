import "dotenv/config";
import { z } from "zod";

/** Accepts "15m", "7d", "3600s" or a raw seconds value such as "900". */
const durationSchema = z
  .string()
  .regex(
    /^\d+(ms|s|m|h|d|w|y)?$/,
    'must be a duration such as "15m", "7d" or a number of seconds',
  );

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  MONGODB_URI: z
    .string()
    .min(1, "is required")
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      { message: "must start with mongodb:// or mongodb+srv://" },
    ),

  JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters long"),
  JWT_ACCESS_EXPIRES: durationSchema.default("15m"),
  JWT_REFRESH_SECRET: z.string().min(32, "must be at least 32 characters long"),
  JWT_REFRESH_EXPIRES: durationSchema.default("7d"),

  /** Comma-separated list of allowed browser origins. */
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("\n✖ Invalid environment configuration:\n");
  for (const issue of parsed.error.issues) {
    const key = issue.path.map(String).join(".") || "env";
    console.error(`  • ${key}: ${issue.message}`);
  }
  console.error("\nCheck your .env file against .env.example.\n");
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  corsOrigins: data.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0),
  isProduction: data.NODE_ENV === "production",
  isDevelopment: data.NODE_ENV === "development",
  isTest: data.NODE_ENV === "test",
} as const;

export type Env = typeof env;
