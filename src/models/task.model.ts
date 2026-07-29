import mongoose, { Schema } from "mongoose";
import type { ITask, TaskRelatedRef, TaskStatus } from "../types/task.types.ts";
import {
  TASK_PRIORITIES,
  TASK_RELATED_TYPES,
  TASK_STATUSES,
} from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const relatedToSchema = new Schema<TaskRelatedRef>(
  {
    type: { type: String, enum: TASK_RELATED_TYPES, required: true },
    id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const taskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: null, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: TASK_STATUSES,
      required: true,
      default: "todo",
      index: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      required: true,
      default: "medium",
      index: true,
    },
    labels: { type: [String], default: [], index: true },
    dueDate: { type: Date, default: null, index: true },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
      index: true,
    },
    relatedTo: { type: relatedToSchema, default: null },
    completedAt: { type: Date, default: null },
    archived: { type: Boolean, required: true, default: false, index: true },
  },
  schemaUtils.baseOptions(),
);

taskSchema.index({ archived: 1, createdAt: -1 });
// Kanban board: one query per status column.
taskSchema.index({ archived: 1, status: 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1, archived: 1, status: 1 });
// Per-entity task lists on customer/lead/deal detail pages.
taskSchema.index({ "relatedTo.id": 1, archived: 1 });

export const TaskModel = mongoose.model<ITask>("Task", taskSchema);

export const taskQueries = {
  findActiveByAssignee: (assigneeId: string) =>
    TaskModel.find({ assignedTo: assigneeId, archived: false }),

  findByStatus: (status: TaskStatus) =>
    TaskModel.find({ status, archived: false }).sort({ createdAt: -1 }),

  findByRelatedEntity: (entityId: string) =>
    TaskModel.find({ "relatedTo.id": entityId, archived: false }).sort({
      createdAt: -1,
    }),

  /** Open tasks past their due date — drives the sidebar badge. */
  findOverdue: (now: Date = new Date()) =>
    TaskModel.find({
      archived: false,
      status: { $ne: "done" },
      dueDate: { $ne: null, $lt: now },
    }),

  countOpen: () =>
    TaskModel.countDocuments({ archived: false, status: { $ne: "done" } }),

  setArchivedMany: (ids: string[], archived: boolean) =>
    TaskModel.updateMany({ _id: { $in: ids } }, { $set: { archived } }),
};
