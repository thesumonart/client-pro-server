import { z } from "zod";
import { AVATAR_COLOR_COUNT, CUSTOMER_STATUSES } from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

const addressSchema = z.object({
  street: z.string().trim().max(200).nullish(),
  city: z.string().trim().max(120).nullish(),
  state: z.string().trim().max(120).nullish(),
  zip: z.string().trim().max(20).nullish(),
  country: z.string().trim().max(120).nullish(),
});

export const customerValidation = {
  idParamSchema: commonValidation.idParamSchema,

  createCustomerSchema: z.object({
    name: z.string().trim().min(1, "is required").max(150),
    company: z.string().trim().min(1, "is required").max(150),
    email: z.string().trim().toLowerCase().email("must be a valid email"),
    phone: z.string().trim().max(40).default(""),
    status: z.enum(CUSTOMER_STATUSES).default("prospect"),
    tags: z.array(z.string().trim().min(1).max(40)).max(25).default([]),
    assignedTo: commonValidation.objectId.nullish(),
    avatarColor: z.coerce
      .number()
      .int()
      .min(0)
      .max(AVATAR_COLOR_COUNT - 1)
      .optional(),
    jobTitle: z.string().trim().max(120).default(""),
    website: z.string().trim().max(300).nullish(),
    address: addressSchema.nullish(),
    value: z.coerce.number().min(0).default(0),
    archived: z.coerce.boolean().default(false),
  }),

  updateCustomerSchema: z
    .object({
      name: z.string().trim().min(1).max(150),
      company: z.string().trim().min(1).max(150),
      email: z.string().trim().toLowerCase().email("must be a valid email"),
      phone: z.string().trim().max(40),
      status: z.enum(CUSTOMER_STATUSES),
      tags: z.array(z.string().trim().min(1).max(40)).max(25),
      assignedTo: commonValidation.objectId.nullable(),
      avatarColor: z.coerce
        .number()
        .int()
        .min(0)
        .max(AVATAR_COLOR_COUNT - 1),
      jobTitle: z.string().trim().max(120),
      website: z.string().trim().max(300).nullable(),
      address: addressSchema.nullable(),
      value: z.coerce.number().min(0),
      archived: z.coerce.boolean(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "at least one field must be provided",
    }),

  listCustomerQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    status: z.enum(CUSTOMER_STATUSES).optional(),
    assignedTo: z
      .union([commonValidation.objectId, z.literal("unassigned")])
      .optional(),
    /** Comma-separated; a customer matches when it carries any of them. */
    tags: z.string().trim().min(1).max(300).optional(),
    /** The UI hides archived records by default, so the API does too. */
    archived: z.enum(["true", "false", "all"]).default("false"),
    sortBy: z
      .enum([
        "name",
        "company",
        "status",
        "value",
        "lastActivityAt",
        "createdAt",
      ])
      .default("createdAt"),
  }),

  bulkArchiveSchema: z.object({
    ids: z.array(commonValidation.objectId).min(1).max(100),
    archived: z.coerce.boolean().default(true),
  }),
};
