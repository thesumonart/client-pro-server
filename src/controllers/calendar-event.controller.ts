import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { calendarEventService } from "../services/calendar-event.service.ts";
import type {
  CreateEventInput,
  ListEventQuery,
  UpdateEventInput,
} from "../types/calendar-event.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const calendarEventController = {
  getEvents: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListEventQuery>(req, "query");
    const { items, meta } = await calendarEventService.listEvents(
      query,
      requireUser(req.user),
    );

    ApiResponse.ok(res, items, "Events retrieved", meta);
  }),

  getUpcoming: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListEventQuery>(req, "query");
    const events = await calendarEventService.getUpcoming(query.limit);

    ApiResponse.ok(res, events, "Upcoming events retrieved");
  }),

  getEventById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const event = await calendarEventService.getEventById(id);

    ApiResponse.ok(res, event, "Event retrieved");
  }),

  createEvent: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<CreateEventInput>(req, "body");
    const event = await calendarEventService.createEvent(
      payload,
      requireUser(req.user),
    );

    ApiResponse.created(res, event, "Event created");
  }),

  updateEvent: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateEventInput>(req, "body");
    const event = await calendarEventService.updateEvent(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, event, "Event updated");
  }),

  deleteEvent: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await calendarEventService.deleteEvent(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Event deleted");
  }),
};
