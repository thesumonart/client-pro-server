import { z } from "zod";
import {
  TASK_PRIORITIES,
  TASK_RELATED_TYPES,
  TASK_STATUSES,
} from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

/** `name` is resolved server-side from the target record, never trusted. */
const relatedToSchema = z.object({
  type: z.enum(TASK_RELATED_TYPES),
  id: commonValidation.objectId,
});

export const taskValidation = {
  idParamSchema: commonValidation.idParamSchema,

  createTaskSchema: z.object({
    title: z.string().trim().min(1, "is required").max(200),
    description: z.string().trim().max(2000).nullish(),
    status: z.enum(TASK_STATUSES).default("todo"),
    priority: z.enum(TASK_PRIORITIES).default("medium"),
    labels: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
    dueDate: z.coerce.date().nullish(),
    assignedTo: commonValidation.objectId.nullish(),
    relatedTo: relatedToSchema.nullish(),
    archived: z.coerce.boolean().default(false),
  }),

  updateTaskSchema: z
    .object({
      title: z.string().trim().min(1).max(200),
      description: z.string().trim().max(2000).nullable(),
      status: z.enum(TASK_STATUSES),
      priority: z.enum(TASK_PRIORITIES),
      labels: z.array(z.string().trim().min(1).max(40)).max(25),
      dueDate: z.coerce.date().nullable(),
      assignedTo: commonValidation.objectId.nullable(),
      relatedTo: relatedToSchema.nullable(),
      archived: z.coerce.boolean(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "at least one field must be provided",
    }),

  /** Kanban column drop. */
  moveStatusSchema: z.object({
    status: z.enum(TASK_STATUSES),
  }),

  listTaskQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    assignedTo: z
      .union([commonValidation.objectId, z.literal("unassigned")])
      .optional(),
    relatedType: z.enum(TASK_RELATED_TYPES).optional(),
    relatedId: commonValidation.objectId.optional(),
    labels: z.string().trim().min(1).max(300).optional(),
    dueFrom: z.coerce.date().optional(),
    dueTo: z.coerce.date().optional(),
    /** Past due and not yet done. */
    overdue: z.enum(["true", "false"]).optional(),
    archived: z.enum(["true", "false", "all"]).default("false"),
    sortBy: z
      .enum([
        "title",
        "status",
        "priority",
        "dueDate",
        "completedAt",
        "createdAt",
      ])
      .default("createdAt"),
  }),

  bulkArchiveSchema: z.object({
    ids: z.array(commonValidation.objectId).min(1).max(100),
    archived: z.coerce.boolean().default(true),
  }),
};
