import { Router } from "express";
import { authController } from "../controllers/auth.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { rateLimitMiddleware } from "../middlewares/rate-limit.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { authValidation } from "../validations/auth.validation.ts";

const authRouteMap = {
  // Public only while zero team members exist (first-owner bootstrap);
  // afterwards the service requires an authenticated owner/admin.
  register: {
    method: "post",
    path: "/register",
    middlewares: [
      rateLimitMiddleware.auth,
      authMiddleware.optionalProtect,
      validateMiddleware.validate(authValidation.registerSchema, "body"),
    ],
    handler: authController.register,
  },
  login: {
    method: "post",
    path: "/login",
    middlewares: [
      rateLimitMiddleware.auth,
      validateMiddleware.validate(authValidation.loginSchema, "body"),
    ],
    handler: authController.login,
  },
  refresh: {
    method: "post",
    path: "/refresh",
    middlewares: [
      validateMiddleware.validate(authValidation.refreshSchema, "body"),
    ],
    handler: authController.refresh,
  },
  logout: {
    method: "post",
    path: "/logout",
    middlewares: [
      authMiddleware.optionalProtect,
      validateMiddleware.validate(authValidation.logoutSchema, "body"),
    ],
    handler: authController.logout,
  },
  me: {
    method: "get",
    path: "/me",
    middlewares: [authMiddleware.protect],
    handler: authController.getMe,
  },
} satisfies Record<string, RouteDefinition>;

export const authRoutes = routeUtils.register(Router(), authRouteMap);
