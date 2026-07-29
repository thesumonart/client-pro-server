import { z } from "zod";
import { ACTIVITY_ENTITY_TYPES, ACTIVITY_TYPES } from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

export const activityValidation = {
  idParamSchema: commonValidation.idParamSchema,

  listActivityQuerySchema: commonValidation.paginationQuerySchema
    .extend({
      search: commonValidation.searchSchema,
      type: z.enum(ACTIVITY_TYPES).optional(),
      actorId: commonValidation.objectId.optional(),
      entityType: z.enum(ACTIVITY_ENTITY_TYPES).optional(),
      entityId: commonValidation.objectId.optional(),
      /** Inclusive lower/upper bounds on createdAt. */
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      sortBy: z.enum(["createdAt", "type"]).default("createdAt"),
    })
    .refine((value) => !value.from || !value.to || value.from <= value.to, {
      message: "from must be before to",
      path: ["from"],
    }),
};
