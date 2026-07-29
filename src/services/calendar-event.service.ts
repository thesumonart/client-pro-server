import {
  CalendarEventModel,
  calendarEventQueries,
} from "../models/calendar-event.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  CalendarEventDocument,
  CreateEventInput,
  EventType,
  ListEventQuery,
  UpdateEventInput,
} from "../types/calendar-event.types.ts";
import {
  accessControl,
  type RecordAccessPolicy,
} from "../utils/access.utils.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import {
  EVENT_WRITE_ALL_ROLES,
  EVENT_WRITE_OWN_ROLES,
} from "../utils/constants.ts";
import { queryParser } from "../utils/query.utils.ts";

const EVENT_POLICY: RecordAccessPolicy = {
  writeAll: EVENT_WRITE_ALL_ROLES,
  writeOwn: EVENT_WRITE_OWN_ROLES,
};

/** Response projection — mirrors the frontend's `CalendarEvent` interface. */
export interface PublicCalendarEvent {
  id: string;
  title: string;
  type: EventType;
  start: Date;
  end: Date;
  allDay: boolean;
  location: string | null;
  description: string | null;
  attendees: string[];
  color: number;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const findOrFail = async (id: string): Promise<CalendarEventDocument> => {
  const event = await CalendarEventModel.findById(id);

  if (!event) {
    throw ApiError.notFound("Event not found");
  }

  return event;
};

/** Rejects guest lists containing ids that resolve to no team member. */
const assertAttendeesExist = async (
  attendees: string[] | undefined,
): Promise<void> => {
  if (!attendees || attendees.length === 0) return;

  const unique = [...new Set(attendees)];
  const found = await TeamMemberModel.countDocuments({
    _id: { $in: unique },
  });

  if (found !== unique.length) {
    throw ApiError.badRequest("One or more attendees do not exist", [
      { path: "attendees", message: "must reference existing team members" },
    ]);
  }
};

const assertRangeOrdered = (start: Date, end: Date): void => {
  if (end < start) {
    throw ApiError.badRequest("Event end must be on or after its start", [
      { path: "end", message: "must be on or after start" },
    ]);
  }
};

export const calendarEventService = {
  serialize: (event: CalendarEventDocument): PublicCalendarEvent => ({
    id: event._id.toString(),
    title: event.title,
    type: event.type,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    location: event.location,
    description: event.description,
    attendees: event.attendees.map((attendee) => attendee.toString()),
    color: event.color,
    createdBy: event.createdBy ? event.createdBy.toString() : null,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }),

  listEvents: async (
    query: ListEventQuery,
    actor: AuthUser,
  ): Promise<{ items: PublicCalendarEvent[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "start",
    );

    const filter: Record<string, unknown> = {};

    if (query.type) filter.type = query.type;
    if (query.attendee) filter.attendees = query.attendee;
    if (query.createdBy) filter.createdBy = query.createdBy;

    // Overlap test, not a plain `start` range: an event running across the
    // window boundary still belongs in the view.
    if (query.from || query.to) {
      if (query.to) filter.start = { $lte: query.to };
      if (query.from) filter.end = { $gte: query.from };
    }

    const conditions: Record<string, unknown>[] = [];

    if (query.mine === "true") {
      conditions.push({
        $or: [{ attendees: actor.id }, { createdBy: actor.id }],
      });
    }

    const search = queryParser.buildSearchFilter(query.search, [
      "title",
      "description",
      "location",
    ]);
    if (search) conditions.push(search);

    if (conditions.length > 0) filter.$and = conditions;

    const [events, total] = await Promise.all([
      CalendarEventModel.find(filter).sort(sort).skip(skip).limit(limit),
      CalendarEventModel.countDocuments(filter),
    ]);

    return {
      items: events.map(calendarEventService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getEventById: async (id: string): Promise<PublicCalendarEvent> =>
    calendarEventService.serialize(await findOrFail(id)),

  createEvent: async (
    payload: CreateEventInput,
    actor: AuthUser,
  ): Promise<PublicCalendarEvent> => {
    await assertAttendeesExist(payload.attendees);

    // An event always belongs to whoever created it, whatever their role.
    const event = await CalendarEventModel.create({
      ...payload,
      createdBy: actor.id,
    });

    return calendarEventService.serialize(event);
  },

  updateEvent: async (
    id: string,
    payload: UpdateEventInput,
    actor: AuthUser,
  ): Promise<PublicCalendarEvent> => {
    const event = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      event.createdBy,
      "event",
      EVENT_POLICY,
    );
    await assertAttendeesExist(payload.attendees);

    // Validate the range against the merged result — a PATCH may move only one
    // endpoint, which a schema-level refine cannot see.
    assertRangeOrdered(payload.start ?? event.start, payload.end ?? event.end);

    event.set(payload);
    await event.save();

    return calendarEventService.serialize(event);
  },

  deleteEvent: async (id: string, actor: AuthUser): Promise<void> => {
    const event = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      event.createdBy,
      "event",
      EVENT_POLICY,
    );

    await event.deleteOne();
  },

  /** Agenda widget: the next N events starting from now. */
  getUpcoming: async (limit: number): Promise<PublicCalendarEvent[]> => {
    const events = await calendarEventQueries.findUpcoming(limit);

    return events.map(calendarEventService.serialize);
  },
};
