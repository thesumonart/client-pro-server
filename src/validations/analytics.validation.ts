import { z } from "zod";

export const analyticsValidation = {
  /** Window length for the month-series reports. */
  monthsQuerySchema: z.object({
    months: z.coerce.number().int().min(1).max(36).default(12),
  }),

  salesQuerySchema: z.object({
    months: z.coerce.number().int().min(1).max(36).default(8),
  }),
};
