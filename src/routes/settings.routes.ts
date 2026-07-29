import { Router } from "express";
import { settingsController } from "../controllers/settings.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { TEAM_ADMIN_ROLES } from "../utils/constants.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { settingsValidation } from "../validations/settings.validation.ts";

/**
 * A singleton resource, so there is no id in the path and no create/delete.
 * Every authenticated role can read it (currency and date format drive
 * rendering everywhere); only owners and admins can write — manager is
 * explicitly read-only on settings.
 */
const settingsRouteMap = {
  get: {
    method: "get",
    path: "/",
    middlewares: [authMiddleware.protect],
    handler: settingsController.getSettings,
  },
  update: {
    method: "patch",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TEAM_ADMIN_ROLES),
      validateMiddleware.validate(
        settingsValidation.updateSettingsSchema,
        "body",
      ),
    ],
    handler: settingsController.updateSettings,
  },
} satisfies Record<string, RouteDefinition>;

export const settingsRoutes = routeUtils.register(Router(), settingsRouteMap);
