import { Router } from "express";
import { customerController } from "../controllers/customer.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { RECORD_WRITE_ROLES } from "../utils/constants.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { customerValidation } from "../validations/customer.validation.ts";

// Read is open to every authenticated role; writes are gated to record-write
// roles here, and narrowed to owned records inside the service for sales-reps.
const customerRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        customerValidation.listCustomerQuerySchema,
        "query",
      ),
    ],
    handler: customerController.getCustomers,
  },
  create: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(
        customerValidation.createCustomerSchema,
        "body",
      ),
    ],
    handler: customerController.createCustomer,
  },
  // Declared before "/:id" so the literal path is not captured as an id.
  bulkArchive: {
    method: "patch",
    path: "/bulk/archive",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(customerValidation.bulkArchiveSchema, "body"),
    ],
    handler: customerController.bulkArchiveCustomers,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(customerValidation.idParamSchema, "params"),
    ],
    handler: customerController.getCustomerById,
  },
  update: {
    method: "patch",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(customerValidation.idParamSchema, "params"),
      validateMiddleware.validate(
        customerValidation.updateCustomerSchema,
        "body",
      ),
    ],
    handler: customerController.updateCustomer,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...RECORD_WRITE_ROLES),
      validateMiddleware.validate(customerValidation.idParamSchema, "params"),
    ],
    handler: customerController.deleteCustomer,
  },
} satisfies Record<string, RouteDefinition>;

export const customerRoutes = routeUtils.register(Router(), customerRouteMap);
