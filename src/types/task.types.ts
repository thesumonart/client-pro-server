import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type {
  TASK_PRIORITIES,
  TASK_RELATED_TYPES,
  TASK_STATUSES,
} from "../utils/constants.ts";
import type { taskValidation } from "../validations/task.validation.ts";

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskRelatedType = (typeof TASK_RELATED_TYPES)[number];

/** Polymorphic pointer, resolved via a switch in the service layer. */
export interface TaskRelatedRef {
  type: TaskRelatedType;
  id: Types.ObjectId;
  name: string;
}

export interface ITask {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  labels: string[];
  dueDate: Date | null;
  assignedTo: Types.ObjectId | null;
  relatedTo: TaskRelatedRef | null;
  /** Set when status is "done", cleared for every other status. */
  completedAt: Date | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type TaskDocument = HydratedDocument<ITask>;

export type CreateTaskInput = z.infer<typeof taskValidation.createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof taskValidation.updateTaskSchema>;
export type MoveTaskStatusInput = z.infer<
  typeof taskValidation.moveStatusSchema
>;
export type ListTaskQuery = z.infer<typeof taskValidation.listTaskQuerySchema>;
export type BulkArchiveTaskInput = z.infer<
  typeof taskValidation.bulkArchiveSchema
>;
