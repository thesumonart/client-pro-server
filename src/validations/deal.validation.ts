import { z } from "zod";
import { DEAL_STAGES } from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

/**
 * Note the absence of `probability` in every write schema — it is derived from
 * `stage` in the service and would be silently ignored if sent.
 */
export const dealValidation = {
  idParamSchema: commonValidation.idParamSchema,

  createDealSchema: z.object({
    title: z.string().trim().min(1, "is required").max(200),
    customerId: commonValidation.objectId.nullish(),
    /** Used only when no customerId is given; otherwise resolved server-side. */
    customerName: z.string().trim().max(150).default(""),
    company: z.string().trim().max(150).default(""),
    value: z.coerce.number().min(0),
    stage: z.enum(DEAL_STAGES).default("new"),
    closingDate: z.coerce.date(),
    assignedTo: commonValidation.objectId.nullish(),
    archived: z.coerce.boolean().default(false),
  }),

  updateDealSchema: z
    .object({
      title: z.string().trim().min(1).max(200),
      customerId: commonValidation.objectId.nullable(),
      customerName: z.string().trim().max(150),
      company: z.string().trim().max(150),
      value: z.coerce.number().min(0),
      stage: z.enum(DEAL_STAGES),
      closingDate: z.coerce.date(),
      assignedTo: commonValidation.objectId.nullable(),
      archived: z.coerce.boolean(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "at least one field must be provided",
    }),

  moveStageSchema: z.object({
    stage: z.enum(DEAL_STAGES),
  }),

  listDealQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    stage: z.enum(DEAL_STAGES).optional(),
    customerId: commonValidation.objectId.optional(),
    assignedTo: z
      .union([commonValidation.objectId, z.literal("unassigned")])
      .optional(),
    archived: z.enum(["true", "false", "all"]).default("false"),
    /** Inclusive bounds on closingDate. */
    closingFrom: z.coerce.date().optional(),
    closingTo: z.coerce.date().optional(),
    minValue: z.coerce.number().min(0).optional(),
    maxValue: z.coerce.number().min(0).optional(),
    sortBy: z
      .enum([
        "title",
        "value",
        "stage",
        "probability",
        "closingDate",
        "createdAt",
        "updatedAt",
      ])
      .default("createdAt"),
  }),

  bulkArchiveSchema: z.object({
    ids: z.array(commonValidation.objectId).min(1).max(100),
    archived: z.coerce.boolean().default(true),
  }),
};
