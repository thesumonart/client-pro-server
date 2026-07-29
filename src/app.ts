import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.ts";
import { errorMiddleware } from "./middlewares/error.middleware.ts";
import { apiRoutes } from "./routes/index.ts";
import { ApiResponse } from "./utils/ApiResponse.ts";

const app: Express = express();

// Behind a single reverse proxy in production — needed for correct client IPs
// (rate limiting) and secure cookies.
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigins,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(cookieParser());

if (!env.isTest) {
  app.use(morgan(env.isProduction ? "combined" : "dev"));
}

app.use(
  "/api",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.isProduction ? 300 : 2000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {
      statusCode: 429,
      success: false,
      message: "Too many requests, please try again later",
      errors: [],
    },
  }),
);

app.get("/health", (_req, res) => {
  ApiResponse.ok(
    res,
    { status: "ok", uptime: process.uptime(), env: env.NODE_ENV },
    "Healthy",
  );
});

app.use("/api/v1", apiRoutes);

app.use(errorMiddleware.notFound);
app.use(errorMiddleware.handle);

export { app };
