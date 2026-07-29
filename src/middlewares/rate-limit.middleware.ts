import rateLimit from "express-rate-limit";
import { env } from "../config/env.ts";

const jsonMessage = (message: string) => ({
  statusCode: 429,
  success: false,
  message,
  errors: [],
});

export const rateLimitMiddleware = {
  /** Brute-force protection for credential endpoints. */
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.isProduction ? 10 : 100,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: jsonMessage(
      "Too many authentication attempts, please try again later",
    ),
  }),
};
