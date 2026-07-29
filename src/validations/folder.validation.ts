import { z } from "zod";
import { commonValidation } from "./common.validation.ts";

/** Folders are read-only over the API — they are provisioned by the seed script. */
export const folderValidation = {
  idParamSchema: commonValidation.idParamSchema,

  listFolderQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    sortBy: z.enum(["name", "createdAt"]).default("name"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
};
