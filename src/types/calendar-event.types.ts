import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type { EVENT_TYPES } from "../utils/constants.ts";
import type { calendarEventValidation } from "../validations/calendar-event.validation.ts";

export type EventType = (typeof EVENT_TYPES)[number];

export interface ICalendarEvent {
  title: string;
  type: EventType;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string | null;
  description: string | null;
  attendees: Types.ObjectId[];
  color: number;
  /**
   * Server-side owner of the entry. Not part of the frontend's CalendarEvent
   * interface — it exists so non-privileged roles can be scoped to their own
   * events, which `attendees` alone cannot express.
   */
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CalendarEventDocument = HydratedDocument<ICalendarEvent>;

export type CreateEventInput = z.infer<
  typeof calendarEventValidation.createEventSchema
>;
export type UpdateEventInput = z.infer<
  typeof calendarEventValidation.updateEventSchema
>;
export type ListEventQuery = z.infer<
  typeof calendarEventValidation.listEventQuerySchema
>;
