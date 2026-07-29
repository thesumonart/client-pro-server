import { Router } from "express";
import { leadController } from "../controllers/lead.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { RECORD_WRITE_ROLES } from "../utils/constants.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { leadValidation } from "../validations/lead.validation.ts";

const leadRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(leadValidation.listLeadQuerySchema, "query"),
    ],
    handler: leadController.getLeads,
  },
  create: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(leadValidation.createLeadSchema, "body"),
    ],
    handler: leadController.createLead,
  },
  // Literal path declared before "/:id" so it is not captured as an id.
  bulkArchive: {
    method: "patch",
    path: "/bulk/archive",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(leadValidation.bulkArchiveSchema, "body"),
    ],
    handler: leadController.bulkArchiveLeads,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(leadValidation.idParamSchema, "params"),
    ],
    handler: leadController.getLeadById,
  },
  update: {
    method: "patch",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(leadValidation.idParamSchema, "params"),
      validateMiddleware.validate(leadValidation.updateLeadSchema, "body"),
    ],
    handler: leadController.updateLead,
  },
  moveStage: {
    method: "patch",
    path: "/:id/stage",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(leadValidation.idParamSchema, "params"),
      validateMiddleware.validate(leadValidation.moveStageSchema, "body"),
    ],
    handler: leadController.moveStage,
  },
  convert: {
    method: "post",
    path: "/:id/convert",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(leadValidation.idParamSchema, "params"),
      validateMiddleware.validate(leadValidation.convertLeadSchema, "body"),
    ],
    handler: leadController.convertLead,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(leadValidation.idParamSchema, "params"),
    ],
    handler: leadController.deleteLead,
  },
} satisfies Record<string, RouteDefinition>;

export const leadRoutes = routeUtils.register(Router(), leadRouteMap);
