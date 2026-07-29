import { TaskModel, taskQueries } from "../models/task.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  BulkArchiveTaskInput,
  CreateTaskInput,
  ListTaskQuery,
  MoveTaskStatusInput,
  TaskDocument,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from "../types/task.types.ts";
import {
  accessControl,
  type RecordAccessPolicy,
} from "../utils/access.utils.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import {
  TASK_WRITE_ALL_ROLES,
  TASK_WRITE_OWN_ROLES,
} from "../utils/constants.ts";
import { queryParser } from "../utils/query.utils.ts";
import { activityService } from "./activity.service.ts";
import { entityRefService } from "./entity-ref.service.ts";

/** Support has full CRUD on tasks, unlike on the sales pipeline. */
const TASK_POLICY: RecordAccessPolicy = {
  writeAll: TASK_WRITE_ALL_ROLES,
  writeOwn: TASK_WRITE_OWN_ROLES,
};

/** Response projection — mirrors the frontend's `Task` interface. */
export interface PublicTask {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  dueDate: Date | null;
  assignedTo: string | null;
  relatedTo: { type: string; id: string; name: string } | null;
  completedAt: Date | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const findOrFail = async (id: string): Promise<TaskDocument> => {
  const task = await TaskModel.findById(id);

  if (!task) {
    throw ApiError.notFound("Task not found");
  }

  return task;
};

const assertAssigneeExists = async (
  assignedTo: string | null | undefined,
): Promise<void> => {
  if (!assignedTo) return;

  const exists = await TeamMemberModel.exists({ _id: assignedTo });

  if (!exists) {
    throw ApiError.badRequest("Assigned team member does not exist", [
      { path: "assignedTo", message: "must reference an existing team member" },
    ]);
  }
};

/**
 * The single place the completedAt rule lives: "done" stamps it, every other
 * status clears it. Applied on create, update, status move and toggle so the
 * two fields can never disagree.
 */
const applyStatus = (task: TaskDocument, status: TaskStatus): void => {
  task.status = status;
  task.completedAt = status === "done" ? new Date() : null;
};

export const taskService = {
  serialize: (task: TaskDocument): PublicTask => ({
    id: task._id.toString(),
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    labels: task.labels,
    dueDate: task.dueDate,
    assignedTo: task.assignedTo ? task.assignedTo.toString() : null,
    relatedTo: task.relatedTo
      ? {
          type: task.relatedTo.type,
          id: task.relatedTo.id.toString(),
          name: task.relatedTo.name,
        }
      : null,
    completedAt: task.completedAt,
    archived: task.archived,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }),

  listTasks: async (
    query: ListTaskQuery,
  ): Promise<{ items: PublicTask[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    const filter: Record<string, unknown> = {};

    if (query.archived !== "all") {
      filter.archived = query.archived === "true";
    }

    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;

    if (query.assignedTo) {
      filter.assignedTo =
        query.assignedTo === "unassigned" ? null : query.assignedTo;
    }

    if (query.relatedType) filter["relatedTo.type"] = query.relatedType;
    if (query.relatedId) filter["relatedTo.id"] = query.relatedId;

    if (query.labels) {
      const labels = query.labels
        .split(",")
        .map((label) => label.trim())
        .filter((label) => label.length > 0);

      if (labels.length > 0) filter.labels = { $in: labels };
    }

    if (query.overdue === "true") {
      filter.status = { $ne: "done" };
      filter.dueDate = { $ne: null, $lt: new Date() };
    } else if (query.dueFrom || query.dueTo) {
      filter.dueDate = {
        ...(query.dueFrom ? { $gte: query.dueFrom } : {}),
        ...(query.dueTo ? { $lte: query.dueTo } : {}),
      };
    }

    const search = queryParser.buildSearchFilter(query.search, [
      "title",
      "description",
      "labels",
      "relatedTo.name",
    ]);
    if (search) Object.assign(filter, search);

    const [tasks, total] = await Promise.all([
      TaskModel.find(filter).sort(sort).skip(skip).limit(limit),
      TaskModel.countDocuments(filter),
    ]);

    return {
      items: tasks.map(taskService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getTaskById: async (id: string): Promise<PublicTask> =>
    taskService.serialize(await findOrFail(id)),

  createTask: async (
    payload: CreateTaskInput,
    actor: AuthUser,
  ): Promise<PublicTask> => {
    const assignedTo = accessControl.resolveAssignee(
      actor,
      payload.assignedTo,
      TASK_POLICY,
    );
    await assertAssigneeExists(assignedTo);

    // Polymorphic pointer resolved by switch — verifies the target exists and
    // captures its current display name.
    const relatedTo = await entityRefService.resolveOptional(payload.relatedTo);

    const task = new TaskModel({ ...payload, assignedTo, relatedTo });
    applyStatus(task, payload.status);
    await task.save();

    await activityService.log({
      type: "task.created",
      actorId: actor.id,
      title: `${task.title} was created`,
      description: task.relatedTo ? task.relatedTo.name : null,
      entity: { type: "task", id: task._id, name: task.title },
    });

    if (task.status === "done") {
      await taskService.logCompleted(task, actor);
    }

    return taskService.serialize(task);
  },

  logCompleted: async (task: TaskDocument, actor: AuthUser): Promise<void> => {
    await activityService.log({
      type: "task.completed",
      actorId: actor.id,
      title: `${task.title} was completed`,
      description: task.relatedTo ? task.relatedTo.name : null,
      entity: { type: "task", id: task._id, name: task.title },
    });
  },

  updateTask: async (
    id: string,
    payload: UpdateTaskInput,
    actor: AuthUser,
  ): Promise<PublicTask> => {
    const task = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      task.assignedTo,
      "task",
      TASK_POLICY,
    );
    accessControl.assertCanAssignTo(actor, payload.assignedTo, TASK_POLICY);
    await assertAssigneeExists(payload.assignedTo);

    const previousStatus = task.status;

    const { status, relatedTo, ...rest } = payload;
    task.set(rest);

    if (relatedTo !== undefined) {
      task.relatedTo = await entityRefService.resolveOptional(relatedTo);
    }

    if (status) {
      applyStatus(task, status);
    }

    await task.save();

    if (status === "done" && previousStatus !== "done") {
      await taskService.logCompleted(task, actor);
    }

    return taskService.serialize(task);
  },

  /** Kanban column drop. */
  moveStatus: async (
    id: string,
    { status }: MoveTaskStatusInput,
    actor: AuthUser,
  ): Promise<PublicTask> => {
    const task = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      task.assignedTo,
      "task",
      TASK_POLICY,
    );

    const previousStatus = task.status;

    applyStatus(task, status);
    await task.save();

    if (status === "done" && previousStatus !== "done") {
      await taskService.logCompleted(task, actor);
    }

    return taskService.serialize(task);
  },

  /** Checkbox toggle: done <-> todo, mirroring the tasks page. */
  toggleComplete: async (id: string, actor: AuthUser): Promise<PublicTask> => {
    const task = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      task.assignedTo,
      "task",
      TASK_POLICY,
    );

    const wasDone = task.status === "done";

    applyStatus(task, wasDone ? "todo" : "done");
    await task.save();

    if (!wasDone) {
      await taskService.logCompleted(task, actor);
    }

    return taskService.serialize(task);
  },

  deleteTask: async (id: string, actor: AuthUser): Promise<void> => {
    const task = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      task.assignedTo,
      "task",
      TASK_POLICY,
    );

    await task.deleteOne();
  },

  bulkSetArchived: async (
    { ids, archived }: BulkArchiveTaskInput,
    actor: AuthUser,
  ): Promise<{ matched: number; modified: number }> => {
    let targetIds = ids;

    if (accessControl.isOwnershipScoped(actor, TASK_POLICY)) {
      const owned = await TaskModel.find({
        _id: { $in: ids },
        assignedTo: actor.id,
      }).select("_id");

      targetIds = owned.map((task) => task._id.toString());

      if (targetIds.length === 0) {
        throw ApiError.forbidden("You can only modify tasks assigned to you");
      }
    }

    const result = await taskQueries.setArchivedMany(targetIds, archived);

    return { matched: result.matchedCount, modified: result.modifiedCount };
  },
};
