import { z } from "zod";
import { DOCUMENT_RELATED_TYPES, DOCUMENT_TYPES } from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

/** `name` is resolved server-side from the target record. */
const relatedToSchema = z.object({
  type: z.enum(DOCUMENT_RELATED_TYPES),
  id: commonValidation.objectId,
});

export const crmDocumentValidation = {
  idParamSchema: commonValidation.idParamSchema,

  /**
   * v1 "upload" records metadata only — no bytes are accepted or stored.
   * `ownerId` comes from the session; `storageKey`/`url` are reserved for a
   * later object-store swap and are not client-settable.
   */
  createDocumentSchema: z.object({
    name: z.string().trim().min(1, "is required").max(255),
    /** Derived from the file extension when omitted. */
    type: z.enum(DOCUMENT_TYPES).optional(),
    folderId: commonValidation.objectId.nullish(),
    size: z.coerce.number().int().min(0).default(0),
    sharedWith: z.array(commonValidation.objectId).max(50).default([]),
    relatedTo: relatedToSchema.nullish(),
    starred: z.coerce.boolean().default(false),
  }),

  updateDocumentSchema: z
    .object({
      name: z.string().trim().min(1).max(255),
      type: z.enum(DOCUMENT_TYPES),
      folderId: commonValidation.objectId.nullable(),
      size: z.coerce.number().int().min(0),
      sharedWith: z.array(commonValidation.objectId).max(50),
      relatedTo: relatedToSchema.nullable(),
      starred: z.coerce.boolean(),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "at least one field must be provided",
    }),

  renameSchema: z.object({
    name: z.string().trim().min(1, "is required").max(255),
  }),

  moveSchema: z.object({
    folderId: commonValidation.objectId.nullable(),
  }),

  listDocumentQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    type: z.enum(DOCUMENT_TYPES).optional(),
    /** `unfiled` matches documents sitting outside any folder. */
    folderId: z
      .union([commonValidation.objectId, z.literal("unfiled")])
      .optional(),
    starred: z.enum(["true", "false"]).optional(),
    ownerId: commonValidation.objectId.optional(),
    relatedType: z.enum(DOCUMENT_RELATED_TYPES).optional(),
    relatedId: commonValidation.objectId.optional(),
    /** Documents owned by, or shared with, the caller. */
    mine: z.enum(["true", "false"]).optional(),
    sortBy: z
      .enum(["name", "type", "size", "createdAt", "updatedAt"])
      .default("updatedAt"),
  }),
};
