import type { Request } from "express";
import type { ZodError, ZodType } from "zod";
import { ApiError, type ApiErrorDetail } from "../utils/ApiError.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export type ValidationSource = "body" | "query" | "params";

/** Flattens Zod issues into the structured detail shape carried by ApiError. */
export const toApiErrorDetails = (error: ZodError): ApiErrorDetail[] =>
  error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "request",
    message: issue.message,
    code: issue.code,
  }));

export const validateMiddleware = {
  /**
   * Parses `req[source]` with the given schema.
   *
   * The parsed result is stored on `req.validated[source]` rather than written
   * back onto the request: in Express 5 `req.query` is getter-only, so both
   * `req.query = parsed` (throws) and `Object.assign(req.query, parsed)`
   * (silently discarded) lose every coerced value and schema default.
   * `req.body` is writable and is kept in sync as a convenience.
   */
  validate: <T>(schema: ZodType<T>, source: ValidationSource = "body") =>
    asyncHandler(async (req, _res, next) => {
      const input =
        source === "body"
          ? req.body
          : source === "query"
            ? req.query
            : req.params;

      const result = await schema.safeParseAsync(input);

      if (!result.success) {
        next(
          ApiError.badRequest(
            `Invalid request ${source}`,
            toApiErrorDetails(result.error),
          ),
        );
        return;
      }

      req.validated = { ...req.validated, [source]: result.data };
      if (source === "body") {
        req.body = result.data;
      }

      next();
    }),

  /**
   * Reads validated data back out of the request. Throws if the matching
   * `validate(schema, source)` middleware was not mounted on the route.
   */
  data: <T>(req: Request, source: ValidationSource = "body"): T => {
    const value = req.validated?.[source];

    if (value === undefined) {
      throw ApiError.internal(
        `No validated ${source} on this request — mount validateMiddleware.validate(schema, "${source}") on the route.`,
      );
    }

    return value as T;
  },
};
