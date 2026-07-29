import { Router } from "express";
import { analyticsController } from "../controllers/analytics.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { analyticsValidation } from "../validations/analytics.validation.ts";

/**
 * Read-only reporting. Open to every authenticated role — the reports page is
 * part of the shared workspace view, and each figure aggregates data those
 * roles can already read record-by-record.
 */
const analyticsRouteMap = {
  overview: {
    method: "get",
    path: "/overview",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        analyticsValidation.monthsQuerySchema,
        "query",
      ),
    ],
    handler: analyticsController.getOverview,
  },
  dashboard: {
    method: "get",
    path: "/dashboard",
    middlewares: [authMiddleware.protect],
    handler: analyticsController.getDashboard,
  },
  revenue: {
    method: "get",
    path: "/revenue",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        analyticsValidation.monthsQuerySchema,
        "query",
      ),
    ],
    handler: analyticsController.getRevenue,
  },
  sales: {
    method: "get",
    path: "/sales",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        analyticsValidation.salesQuerySchema,
        "query",
      ),
    ],
    handler: analyticsController.getMonthlySales,
  },
  customerGrowth: {
    method: "get",
    path: "/customer-growth",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        analyticsValidation.monthsQuerySchema,
        "query",
      ),
    ],
    handler: analyticsController.getCustomerGrowth,
  },
  leadSources: {
    method: "get",
    path: "/lead-sources",
    middlewares: [authMiddleware.protect],
    handler: analyticsController.getLeadSources,
  },
  pipeline: {
    method: "get",
    path: "/pipeline",
    middlewares: [authMiddleware.protect],
    handler: analyticsController.getPipeline,
  },
  teamPerformance: {
    method: "get",
    path: "/team-performance",
    middlewares: [authMiddleware.protect],
    handler: analyticsController.getTeamPerformance,
  },
} satisfies Record<string, RouteDefinition>;

export const analyticsRoutes = routeUtils.register(Router(), analyticsRouteMap);
