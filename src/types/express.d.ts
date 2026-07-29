import type { AuthUser } from "./auth.types.ts";

/**
 * Express type augmentation.
 *
 * `req.query` is a getter-only property in Express 5 — assigning to it throws and
 * `Object.assign`-ing into it is silently discarded. Validated/coerced data is
 * therefore parked on `req.validated` and read back through
 * `validateMiddleware.data<T>(req, source)`.
 */
declare module "express-serve-static-core" {
  interface Request {
    validated?: {
      body?: unknown;
      query?: unknown;
      params?: unknown;
    };

    /** Set by authMiddleware.protect / optionalProtect. */
    user?: AuthUser;
  }
}

export {};
