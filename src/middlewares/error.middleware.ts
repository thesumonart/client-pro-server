import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Error as MongooseError } from "mongoose";
import { ZodError } from "zod";
import { env } from "../config/env.ts";
import { ApiError, type ApiErrorDetail } from "../utils/ApiError.ts";
import { toApiErrorDetails } from "./validate.middleware.ts";

// `jsonwebtoken` is CommonJS: its error classes are not exposed as ESM named
// exports at runtime, so they must be pulled off the default export.
const { JsonWebTokenError, TokenExpiredError } = jwt;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** MongoServerError E11000 — a unique index was violated. */
const isDuplicateKeyError = (
  error: unknown,
): error is { code: number; keyValue?: Record<string, unknown> } =>
  isRecord(error) && error.code === 11000;

const duplicateKeyDetails = (
  keyValue?: Record<string, unknown>,
): ApiErrorDetail[] =>
  Object.keys(keyValue ?? {}).map((path) => ({
    path,
    message: `${path} already exists`,
    code: "duplicate_key",
  }));

/** Maps any thrown value onto a single ApiError shape. */
const normalize = (error: unknown): ApiError => {
  if (error instanceof ApiError) return error;

  if (error instanceof ZodError) {
    return ApiError.badRequest("Validation failed", toApiErrorDetails(error));
  }

  if (error instanceof MongooseError.ValidationError) {
    const details: ApiErrorDetail[] = Object.values(error.errors).map(
      (item) => ({
        path: item.path,
        message: item.message,
        code: item.kind,
      }),
    );
    return ApiError.badRequest("Validation failed", details);
  }

  if (error instanceof MongooseError.CastError) {
    // A malformed ObjectId is a bad request from the client, not a missing resource.
    return ApiError.badRequest(`Invalid value for "${error.path}"`, [
      {
        path: error.path,
        message: `Expected a valid ${error.kind}`,
        code: "cast_error",
      },
    ]);
  }

  if (error instanceof MongooseError.DocumentNotFoundError) {
    return ApiError.notFound("Resource not found");
  }

  if (error instanceof TokenExpiredError) {
    return ApiError.unauthorized("Token expired");
  }

  if (error instanceof JsonWebTokenError) {
    return ApiError.unauthorized("Invalid token");
  }

  if (isDuplicateKeyError(error)) {
    return ApiError.conflict(
      "Duplicate value for a unique field",
      duplicateKeyDetails(error.keyValue),
    );
  }

  if (error instanceof Error) {
    return new ApiError(500, error.message, [], {
      isOperational: false,
      cause: error,
      stack: error.stack,
    });
  }

  return new ApiError(500, "Internal server error", [], {
    isOperational: false,
  });
};

export const errorMiddleware = {
  /** Terminal 404 for unmatched routes — must be mounted after all routers. */
  notFound: (req: Request, _res: Response, next: NextFunction): void => {
    next(
      ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`),
    );
  },

  /**
   * Global error handler. Mount last.
   *
   * Delegates to Express when the response has already started, always returns
   * exactly one response, and never leaks internals of a non-operational error
   * in production.
   */
  handle: (
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    // Headers already flushed — Express must destroy the socket itself.
    if (res.headersSent) {
      next(error);
      return;
    }

    const apiError = normalize(error);

    if (!apiError.isOperational) {
      console.error("Unhandled error:", error);
    }

    const exposeMessage = apiError.isOperational || !env.isProduction;

    res.status(apiError.statusCode).json({
      statusCode: apiError.statusCode,
      success: false,
      message: exposeMessage ? apiError.message : "Internal server error",
      errors: apiError.errors,
      ...(env.isProduction ? {} : { stack: apiError.stack }),
    });
  },
};
