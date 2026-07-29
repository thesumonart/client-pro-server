import { Router } from "express";
import { folderController } from "../controllers/folder.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { folderValidation } from "../validations/folder.validation.ts";

/**
 * Read-only by design: folders are a fixed taxonomy provisioned by the seed
 * script, so there is deliberately no POST/PATCH/DELETE here.
 */
const folderRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        folderValidation.listFolderQuerySchema,
        "query",
      ),
    ],
    handler: folderController.getFolders,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(folderValidation.idParamSchema, "params"),
    ],
    handler: folderController.getFolderById,
  },
} satisfies Record<string, RouteDefinition>;

export const folderRoutes = routeUtils.register(Router(), folderRouteMap);
