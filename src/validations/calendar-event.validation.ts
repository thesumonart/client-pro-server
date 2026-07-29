import { z } from "zod";
import { EVENT_COLOR_COUNT, EVENT_TYPES } from "../utils/constants.ts";
import { commonValidation } from "./common.validation.ts";

export const calendarEventValidation = {
  idParamSchema: commonValidation.idParamSchema,

  createEventSchema: z
    .object({
      title: z.string().trim().min(1, "is required").max(200),
      type: z.enum(EVENT_TYPES).default("meeting"),
      start: z.coerce.date(),
      end: z.coerce.date(),
      allDay: z.coerce.boolean().default(false),
      location: z.string().trim().max(200).nullish(),
      description: z.string().trim().max(2000).nullish(),
      attendees: z.array(commonValidation.objectId).max(50).default([]),
      color: z.coerce
        .number()
        .int()
        .min(0)
        .max(EVENT_COLOR_COUNT - 1)
        .default(0),
    })
    .refine((value) => value.end >= value.start, {
      message: "must be on or after start",
      path: ["end"],
    }),

  // No cross-field refine here: a PATCH may send only one side of the range,
  // so the ordering check runs in the service against the merged values.
  updateEventSchema: z
    .object({
      title: z.string().trim().min(1).max(200),
      type: z.enum(EVENT_TYPES),
      start: z.coerce.date(),
      end: z.coerce.date(),
      allDay: z.coerce.boolean(),
      location: z.string().trim().max(200).nullable(),
      description: z.string().trim().max(2000).nullable(),
      attendees: z.array(commonValidation.objectId).max(50),
      color: z.coerce
        .number()
        .int()
        .min(0)
        .max(EVENT_COLOR_COUNT - 1),
    })
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "at least one field must be provided",
    }),

  listEventQuerySchema: commonValidation.paginationQuerySchema.extend({
    search: commonValidation.searchSchema,
    type: z.enum(EVENT_TYPES).optional(),
    /** Any event overlapping [from, to] is returned, not just those starting in it. */
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    attendee: commonValidation.objectId.optional(),
    createdBy: commonValidation.objectId.optional(),
    /** Shorthand for "events I am involved in", as attendee or creator. */
    mine: z.enum(["true", "false"]).optional(),
    sortBy: z.enum(["start", "end", "title", "createdAt"]).default("start"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  }),
};
