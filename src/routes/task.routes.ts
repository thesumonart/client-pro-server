import { Router } from "express";
import { taskController } from "../controllers/task.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { TASK_WRITE_ROLES } from "../utils/constants.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { taskValidation } from "../validations/task.validation.ts";

// Support has full CRUD here (unlike customers/leads/deals); sales-reps are
// narrowed to their own tasks inside the service.
const taskRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(taskValidation.listTaskQuerySchema, "query"),
    ],
    handler: taskController.getTasks,
  },
  create: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(taskValidation.createTaskSchema, "body"),
    ],
    handler: taskController.createTask,
  },
  // Literal path declared before "/:id" so it is not captured as an id.
  bulkArchive: {
    method: "patch",
    path: "/bulk/archive",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(taskValidation.bulkArchiveSchema, "body"),
    ],
    handler: taskController.bulkArchiveTasks,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(taskValidation.idParamSchema, "params"),
    ],
    handler: taskController.getTaskById,
  },
  update: {
    method: "patch",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(taskValidation.idParamSchema, "params"),
      validateMiddleware.validate(taskValidation.updateTaskSchema, "body"),
    ],
    handler: taskController.updateTask,
  },
  moveStatus: {
    method: "patch",
    path: "/:id/status",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(taskValidation.idParamSchema, "params"),
      validateMiddleware.validate(taskValidation.moveStatusSchema, "body"),
    ],
    handler: taskController.moveStatus,
  },
  toggleComplete: {
    method: "patch",
    path: "/:id/complete",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(taskValidation.idParamSchema, "params"),
    ],
    handler: taskController.toggleComplete,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...TASK_WRITE_ROLES),
      validateMiddleware.validate(taskValidation.idParamSchema, "params"),
    ],
    handler: taskController.deleteTask,
  },
} satisfies Record<string, RouteDefinition>;

export const taskRoutes = routeUtils.register(Router(), taskRouteMap);
