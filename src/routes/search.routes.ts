import { Router } from "express";
import { searchController } from "../controllers/search.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { searchValidation } from "../validations/search.validation.ts";

/**
 * Command-palette lookup. Open to every authenticated role: each collection it
 * spans is already readable by all of them, so search adds no new exposure.
 */
const searchRouteMap = {
  search: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(searchValidation.searchQuerySchema, "query"),
    ],
    handler: searchController.search,
  },
} satisfies Record<string, RouteDefinition>;

export const searchRoutes = routeUtils.register(Router(), searchRouteMap);
