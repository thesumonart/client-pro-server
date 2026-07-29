import { Router } from "express";
import { activityController } from "../controllers/activity.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { activityValidation } from "../validations/activity.validation.ts";

/**
 * Read-only by design. Activities are written exclusively by
 * `activityService.log(...)` as a side-effect of other operations, so there is
 * deliberately no POST/PATCH/DELETE here.
 */
const activityRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        activityValidation.listActivityQuerySchema,
        "query",
      ),
    ],
    handler: activityController.getActivities,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(activityValidation.idParamSchema, "params"),
    ],
    handler: activityController.getActivityById,
  },
} satisfies Record<string, RouteDefinition>;

export const activityRoutes = routeUtils.register(Router(), activityRouteMap);
