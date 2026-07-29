import { Router } from "express";
import { calendarEventController } from "../controllers/calendar-event.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { EVENT_WRITE_ROLES } from "../utils/constants.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { calendarEventValidation } from "../validations/calendar-event.validation.ts";

// The calendar is shared: every authenticated role can read it. Writes are open
// to all roles except viewer, with non-privileged roles scoped by the service
// to the events they created.
const calendarEventRouteMap = {
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        calendarEventValidation.listEventQuerySchema,
        "query",
      ),
    ],
    handler: calendarEventController.getEvents,
  },
  create: {
    method: "post",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...EVENT_WRITE_ROLES),
      validateMiddleware.validate(
        calendarEventValidation.createEventSchema,
        "body",
      ),
    ],
    handler: calendarEventController.createEvent,
  },
  // Literal path declared before "/:id" so it is not captured as an id.
  upcoming: {
    method: "get",
    path: "/upcoming",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        calendarEventValidation.listEventQuerySchema,
        "query",
      ),
    ],
    handler: calendarEventController.getUpcoming,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        calendarEventValidation.idParamSchema,
        "params",
      ),
    ],
    handler: calendarEventController.getEventById,
  },
  update: {
    method: "patch",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...EVENT_WRITE_ROLES),
      validateMiddleware.validate(
        calendarEventValidation.idParamSchema,
        "params",
      ),
      validateMiddleware.validate(
        calendarEventValidation.updateEventSchema,
        "body",
      ),
    ],
    handler: calendarEventController.updateEvent,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize(...EVENT_WRITE_ROLES),
      validateMiddleware.validate(
        calendarEventValidation.idParamSchema,
        "params",
      ),
    ],
    handler: calendarEventController.deleteEvent,
  },
} satisfies Record<string, RouteDefinition>;

export const calendarEventRoutes = routeUtils.register(
  Router(),
  calendarEventRouteMap,
);
