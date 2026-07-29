import { z } from "zod";
import { NOTE_ENTITY_TYPES } from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

export const noteValidation = {
  idParamSchema: commonValidation.idParamSchema,

  /** `authorId` is taken from the session, never the payload. */
  createNoteSchema: z.object({
    entityType: z.enum(NOTE_ENTITY_TYPES),
    entityId: commonValidation.objectId,
    body: z.string().trim().min(1, "is required").max(5000),
  }),

  listNoteQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    entityType: z.enum(NOTE_ENTITY_TYPES).optional(),
    entityId: commonValidation.objectId.optional(),
    authorId: commonValidation.objectId.optional(),
    sortBy: z.enum(["createdAt"]).default("createdAt"),
  }),
};
