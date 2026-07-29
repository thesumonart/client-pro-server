import { Router } from "express";

interface RouteModule {
  path: string;
  router: Router;
}

/**
 * Every entity router is registered here and mounted by app.ts under /api/v1.
 * Modules append their entry as they are built.
 */
const routeModules: RouteModule[] = [
  // { path: "/auth", router: authRoutes },
];

const router = Router();

routeModules.forEach(({ path, router: entityRouter }) => {
  router.use(path, entityRouter);
});

export const apiRoutes = router;
