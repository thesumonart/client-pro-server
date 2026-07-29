import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ParamsDictionary, Query } from "express-serve-static-core";

/**
 * Signature of a controller written as an async function. Generic so route-level
 * types (validated params/body/query) survive all the way into the controller.
 */
export type AsyncRequestHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Query,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction,
) => Promise<void>;

/**
 * Wraps an async controller so that BOTH synchronous throws and promise
 * rejections are forwarded to the global error handler instead of surfacing as
 * an unhandled rejection.
 */
export const asyncHandler = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Query,
>(
  fn: AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => {
  return (req, res, next): void => {
    try {
      void Promise.resolve(fn(req, res, next)).catch((error: unknown) => {
        next(error);
      });
    } catch (error) {
      next(error);
    }
  };
};
