import { Router } from "express";
import { dealController } from "../controllers/deal.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { RECORD_WRITE_ROLES } from "../utils/constants.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { dealValidation } from "../validations/deal.validation.ts";

const dealRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(dealValidation.listDealQuerySchema, "query"),
    ],
    handler: dealController.getDeals,
  },
  create: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(dealValidation.createDealSchema, "body"),
    ],
    handler: dealController.createDeal,
  },
  // Literal path declared before "/:id" so it is not captured as an id.
  bulkArchive: {
    method: "patch",
    path: "/bulk/archive",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(dealValidation.bulkArchiveSchema, "body"),
    ],
    handler: dealController.bulkArchiveDeals,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(dealValidation.idParamSchema, "params"),
    ],
    handler: dealController.getDealById,
  },
  update: {
    method: "patch",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(dealValidation.idParamSchema, "params"),
      validateMiddleware.validate(dealValidation.updateDealSchema, "body"),
    ],
    handler: dealController.updateDeal,
  },
  moveStage: {
    method: "patch",
    path: "/:id/stage",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(dealValidation.idParamSchema, "params"),
      validateMiddleware.validate(dealValidation.moveStageSchema, "body"),
    ],
    handler: dealController.moveStage,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(dealValidation.idParamSchema, "params"),
    ],
    handler: dealController.deleteDeal,
  },
} satisfies Record<string, RouteDefinition>;

export const dealRoutes = routeUtils.register(Router(), dealRouteMap);
