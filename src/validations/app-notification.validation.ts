import { z } from "zod";
import { NOTIFICATION_CATEGORIES } from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

export const appNotificationValidation = {
  idParamSchema: commonValidation.idParamSchema,

  listNotificationQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    category: z.enum(NOTIFICATION_CATEGORIES).optional(),
    read: z.enum(["true", "false"]).optional(),
    sortBy: z.enum(["createdAt", "category"]).default("createdAt"),
  }),
};
