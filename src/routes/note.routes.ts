import { Router } from "express";
import { noteController } from "../controllers/note.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { TASK_WRITE_ROLES } from "../utils/constants.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { noteValidation } from "../validations/note.validation.ts";

/**
 * Create / read / delete only — notes are an append-only audit trail against a
 * customer, lead or deal, so there is deliberately no update route.
 * Notes share the task write policy (support included, viewer excluded).
 */
const noteRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(noteValidation.listNoteQuerySchema, "query"),
    ],
    handler: noteController.getNotes,
  },
  create: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(noteValidation.createNoteSchema, "body"),
    ],
    handler: noteController.createNote,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(noteValidation.idParamSchema, "params"),
    ],
    handler: noteController.getNoteById,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(noteValidation.idParamSchema, "params"),
    ],
    handler: noteController.deleteNote,
  },
} satisfies Record<string, RouteDefinition>;

export const noteRoutes = routeUtils.register(Router(), noteRouteMap);
