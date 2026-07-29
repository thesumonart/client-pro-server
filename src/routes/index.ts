import { Router } from "express";
import { activityRoutes } from "./activity.routes.ts";
import { authRoutes } from "./auth.routes.ts";
import { calendarEventRoutes } from "./calendar-event.routes.ts";
import { crmDocumentRoutes } from "./crm-document.routes.ts";
import { customerRoutes } from "./customer.routes.ts";
import { dealRoutes } from "./deal.routes.ts";
import { folderRoutes } from "./folder.routes.ts";
import { leadRoutes } from "./lead.routes.ts";
import { noteRoutes } from "./note.routes.ts";
import { taskRoutes } from "./task.routes.ts";
import { teamMemberRoutes } from "./team-member.routes.ts";

interface RouteModule {
  path: string;
  router: Router;
}

/**
 * Every entity router is registered here and mounted by app.ts under /api/v1.
 * Modules append their entry as they are built.
 */
const routeModules: RouteModule[] = [
  { path: "/auth", router: authRoutes },
  { path: "/team", router: teamMemberRoutes },
  { path: "/activities", router: activityRoutes },
  { path: "/customers", router: customerRoutes },
  { path: "/leads", router: leadRoutes },
  { path: "/deals", router: dealRoutes },
  { path: "/tasks", router: taskRoutes },
  { path: "/events", router: calendarEventRoutes },
  { path: "/notes", router: noteRoutes },
  { path: "/folders", router: folderRoutes },
  { path: "/documents", router: crmDocumentRoutes },
];

const router = Router();

routeModules.forEach(({ path, router: entityRouter }) => {
  router.use(path, entityRouter);
});

export const apiRoutes = router;
