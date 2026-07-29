import { z } from "zod";
import { SEARCH_TYPES } from "../utils/constants.ts";

export const searchValidation = {
  searchQuerySchema: z.object({
    q: z.string().trim().min(1, "is required").max(200),
    /** Comma-separated subset of SEARCH_TYPES; defaults to all of them. */
    types: z.string().trim().min(1).max(200).optional(),
    /** Overrides the per-type default caps uniformly. */
    limit: z.coerce.number().int().min(1).max(25).optional(),
    /** Archived records are hidden unless explicitly asked for. */
    includeArchived: z.enum(["true", "false"]).default("false"),
  }),

  typeEnum: z.enum(SEARCH_TYPES),
};
