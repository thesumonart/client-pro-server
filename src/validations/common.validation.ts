import { Types } from "mongoose";
import { z } from "zod";
import { PAGINATION } from "../utils/constants.ts";

/** A 24-character hex Mongo ObjectId. */
const objectId = z
  .string()
  .refine((value) => Types.ObjectId.isValid(value), "must be a valid id");

export const commonValidation = {
  objectId,

  /** `/:id` route parameter. */
  idParamSchema: z.object({ id: objectId }),

  /** Page/limit/sort query parameters shared by every list endpoint. */
  paginationQuerySchema: z.object({
    page: z.coerce.number().int().min(1).default(PAGINATION.defaultPage),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(PAGINATION.maxLimit)
      .default(PAGINATION.defaultLimit),
    sortBy: z.string().min(1).optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),

  /** Trimmed, non-empty search term. */
  searchSchema: z.string().trim().min(1).max(200).optional(),
};
