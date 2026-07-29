import { Router } from "express";
import { crmDocumentController } from "../controllers/crm-document.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { TASK_WRITE_ROLES } from "../utils/constants.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { crmDocumentValidation } from "../validations/crm-document.validation.ts";

// Documents share the task write policy (support included, viewer excluded);
// sales-reps are narrowed to documents they own inside the service.
const crmDocumentRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        crmDocumentValidation.listDocumentQuerySchema,
        "query",
      ),
    ],
    handler: crmDocumentController.getDocuments,
  },
  create: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(
        crmDocumentValidation.createDocumentSchema,
        "body",
      ),
    ],
    handler: crmDocumentController.createDocument,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        crmDocumentValidation.idParamSchema,
        "params",
      ),
    ],
    handler: crmDocumentController.getDocumentById,
  },
  update: {
    method: "patch",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(
        crmDocumentValidation.idParamSchema,
        "params",
      ),
      validateMiddleware.validate(
        crmDocumentValidation.updateDocumentSchema,
        "body",
      ),
    ],
    handler: crmDocumentController.updateDocument,
  },
  rename: {
    method: "patch",
    path: "/:id/rename",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(
        crmDocumentValidation.idParamSchema,
        "params",
      ),
      validateMiddleware.validate(crmDocumentValidation.renameSchema, "body"),
    ],
    handler: crmDocumentController.renameDocument,
  },
  move: {
    method: "patch",
    path: "/:id/move",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(
        crmDocumentValidation.idParamSchema,
        "params",
      ),
      validateMiddleware.validate(crmDocumentValidation.moveSchema, "body"),
    ],
    handler: crmDocumentController.moveDocument,
  },
  star: {
    method: "patch",
    path: "/:id/star",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(
        crmDocumentValidation.idParamSchema,
        "params",
      ),
    ],
    handler: crmDocumentController.toggleStar,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(
        crmDocumentValidation.idParamSchema,
        "params",
      ),
    ],
    handler: crmDocumentController.deleteDocument,
  },
} satisfies Record<string, RouteDefinition>;

export const crmDocumentRoutes = routeUtils.register(
  Router(),
  crmDocumentRouteMap,
);
