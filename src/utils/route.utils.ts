import type { RequestHandler, Router } from "express";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  middlewares?: RequestHandler[];
  handler: RequestHandler;
}

export const routeUtils = {
  /**
   * Registers a named route map onto a Router, preserving declaration order so
   * literal paths can be declared before their `/:id` counterparts.
   *
   * `router[method]` resolves to a union of heavily overloaded matchers that
   * cannot be spread-called directly, so it is narrowed to a single concrete
   * signature here — once, instead of in every routes file.
   */
  register: (
    router: Router,
    routeMap: Record<string, RouteDefinition>,
  ): Router => {
    Object.values(routeMap).forEach(
      ({ method, path, middlewares = [], handler }) => {
        const attach = router[method] as (
          path: string,
          ...handlers: RequestHandler[]
        ) => Router;

        attach.call(router, path, ...middlewares, handler);
      },
    );

    return router;
  },
};
