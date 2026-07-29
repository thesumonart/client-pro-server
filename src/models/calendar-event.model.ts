import mongoose, { Schema } from "mongoose";
import type { ICalendarEvent } from "../types/calendar-event.types.ts";
import { EVENT_COLOR_COUNT, EVENT_TYPES } from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const calendarEventSchema = new Schema<ICalendarEvent>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    type: {
      type: String,
      enum: EVENT_TYPES,
      required: true,
      default: "meeting",
      index: true,
    },
    start: { type: Date, required: true, index: true },
    end: { type: Date, required: true },
    allDay: { type: Boolean, required: true, default: false },
    location: { type: String, default: null, trim: true, maxlength: 200 },
    description: { type: String, default: null, trim: true, maxlength: 2000 },
    attendees: {
      type: [{ type: Schema.Types.ObjectId, ref: "TeamMember" }],
      default: [],
      index: true,
    },
    color: {
      type: Number,
      required: true,
      min: 0,
      max: EVENT_COLOR_COUNT - 1,
      default: 0,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
      index: true,
    },
  },
  schemaUtils.baseOptions(),
);

// Month/week view: find everything overlapping a window.
calendarEventSchema.index({ start: 1, end: 1 });

export const CalendarEventModel = mongoose.model<ICalendarEvent>(
  "CalendarEvent",
  calendarEventSchema,
);

export const calendarEventQueries = {
  /**
   * Every event overlapping [from, to]. An event that starts before the window
   * and ends inside it still belongs on the calendar, so this is an overlap
   * test rather than a simple `start` range.
   */
  findInRange: (from: Date, to: Date) =>
    CalendarEventModel.find({ start: { $lte: to }, end: { $gte: from } }).sort({
      start: 1,
    }),

  findForMember: (memberId: string, from: Date, to: Date) =>
    CalendarEventModel.find({
      start: { $lte: to },
      end: { $gte: from },
      $or: [{ attendees: memberId }, { createdBy: memberId }],
    }).sort({ start: 1 }),

  findUpcoming: (limit: number, now: Date = new Date()) =>
    CalendarEventModel.find({ start: { $gte: now } })
      .sort({ start: 1 })
      .limit(limit),

  /** Drops a departing member from every guest list. */
  removeAttendeeEverywhere: (memberId: string) =>
    CalendarEventModel.updateMany(
      { attendees: memberId },
      { $pull: { attendees: memberId } },
    ),
};
