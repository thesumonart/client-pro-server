import { z } from "zod";
import {
  AVATAR_COLOR_COUNT,
  CUSTOMER_STATUSES,
  LEAD_SOURCES,
  LEAD_STAGES,
} from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

export const leadValidation = {
  idParamSchema: commonValidation.idParamSchema,

  createLeadSchema: z.object({
    name: z.string().trim().min(1, "is required").max(150),
    company: z.string().trim().min(1, "is required").max(150),
    email: z.string().trim().toLowerCase().email("must be a valid email"),
    phone: z.string().trim().max(40).default(""),
    stage: z.enum(LEAD_STAGES).default("new"),
    source: z.enum(LEAD_SOURCES).default("website"),
    value: z.coerce.number().min(0).default(0),
    assignedTo: commonValidation.objectId.nullish(),
    tags: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
    avatarColor: z.coerce
      .number()
      .int()
      .min(0)
      .max(AVATAR_COLOR_COUNT - 1)
      .optional(),
    notes: z.string().trim().max(2000).nullish(),
    archived: z.coerce.boolean().default(false),
  }),

  updateLeadSchema: z
    .object({
      name: z.string().trim().min(1).max(150),
      company: z.string().trim().min(1).max(150),
      email: z.string().trim().toLowerCase().email("must be a valid email"),
      phone: z.string().trim().max(40),
      stage: z.enum(LEAD_STAGES),
      source: z.enum(LEAD_SOURCES),
      value: z.coerce.number().min(0),
      assignedTo: commonValidation.objectId.nullable(),
      tags: z.array(z.string().trim().min(1).max(40)).max(25),
      avatarColor: z.coerce
        .number()
        .int()
        .min(0)
        .max(AVATAR_COLOR_COUNT - 1),
      notes: z.string().trim().max(2000).nullable(),
      archived: z.coerce.boolean(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "at least one field must be provided",
    }),

  /** Kanban column drop. */
  moveStageSchema: z.object({
    stage: z.enum(LEAD_STAGES),
  }),

  /** Optional overrides applied to the customer created by a conversion. */
  convertLeadSchema: z.object({
    status: z.enum(CUSTOMER_STATUSES).default("active"),
    jobTitle: z.string().trim().max(120).optional(),
    website: z.string().trim().max(300).nullish(),
  }),

  listLeadQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    stage: z.enum(LEAD_STAGES).optional(),
    source: z.enum(LEAD_SOURCES).optional(),
    assignedTo: z
      .union([commonValidation.objectId, z.literal("unassigned")])
      .optional(),
    tags: z.string().trim().min(1).max(300).optional(),
    archived: z.enum(["true", "false", "all"]).default("false"),
    sortBy: z
      .enum(["name", "company", "stage", "value", "createdAt", "updatedAt"])
      .default("createdAt"),
  }),

  bulkArchiveSchema: z.object({
    ids: z.array(commonValidation.objectId).min(1).max(100),
    archived: z.coerce.boolean().default(true),
  }),
};
