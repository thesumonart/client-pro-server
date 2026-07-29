import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { taskService } from "../services/task.service.ts";
import type {
  BulkArchiveTaskInput,
  CreateTaskInput,
  ListTaskQuery,
  MoveTaskStatusInput,
  UpdateTaskInput,
} from "../types/task.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const taskController = {
  getTasks: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListTaskQuery>(req, "query");
    const { items, meta } = await taskService.listTasks(query);

    ApiResponse.ok(res, items, "Tasks retrieved", meta);
  }),

  getTaskById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const task = await taskService.getTaskById(id);

    ApiResponse.ok(res, task, "Task retrieved");
  }),

  createTask: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<CreateTaskInput>(req, "body");
    const task = await taskService.createTask(payload, requireUser(req.user));

    ApiResponse.created(res, task, "Task created");
  }),

  updateTask: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateTaskInput>(req, "body");
    const task = await taskService.updateTask(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, task, "Task updated");
  }),

  moveStatus: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<MoveTaskStatusInput>(req, "body");
    const task = await taskService.moveStatus(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, task, "Task status updated");
  }),

  toggleComplete: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const task = await taskService.toggleComplete(id, requireUser(req.user));

    ApiResponse.ok(
      res,
      task,
      task.status === "done" ? "Task completed" : "Task reopened",
    );
  }),

  bulkArchiveTasks: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<BulkArchiveTaskInput>(req, "body");
    const result = await taskService.bulkSetArchived(
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(
      res,
      result,
      payload.archived ? "Tasks archived" : "Tasks restored",
    );
  }),

  deleteTask: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await taskService.deleteTask(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Task deleted");
  }),
};
