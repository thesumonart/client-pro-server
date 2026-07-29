import { Router } from "express";
import { teamMemberController } from "../controllers/team-member.controller.ts";
import { authMiddleware } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { routeUtils, type RouteDefinition } from "../utils/route.utils.ts";
import { teamMemberValidation } from "../validations/team-member.validation.ts";

const teamMemberRouteMap = {
  // Every authenticated role can read the roster — assignee pickers need it.
  list: {
    method: "get",
    path: "/",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(
        teamMemberValidation.listTeamQuerySchema,
        "query",
      ),
    ],
    handler: teamMemberController.getTeamMembers,
  },
  getById: {
    method: "get",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(teamMemberValidation.idParamSchema, "params"),
    ],
    handler: teamMemberController.getTeamMemberById,
  },
  // Owners/admins may edit anyone; other roles may edit only themselves, which
  // the service enforces against req.user.
  update: {
    method: "patch",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      validateMiddleware.validate(teamMemberValidation.idParamSchema, "params"),
      validateMiddleware.validate(
        teamMemberValidation.updateTeamMemberSchema,
        "body",
      ),
    ],
    handler: teamMemberController.updateTeamMember,
  },
  updateRole: {
    method: "patch",
    path: "/:id/role",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize("owner", "admin"),
      validateMiddleware.validate(teamMemberValidation.idParamSchema, "params"),
      validateMiddleware.validate(
        teamMemberValidation.updateRoleSchema,
        "body",
      ),
    ],
    handler: teamMemberController.updateRole,
  },
  updateStatus: {
    method: "patch",
    path: "/:id/status",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize("owner", "admin"),
      validateMiddleware.validate(teamMemberValidation.idParamSchema, "params"),
      validateMiddleware.validate(
        teamMemberValidation.updateStatusSchema,
        "body",
      ),
    ],
    handler: teamMemberController.updateStatus,
  },
  remove: {
    method: "delete",
    path: "/:id",
    middlewares: [
      authMiddleware.protect,
      authMiddleware.authorize("owner", "admin"),
      validateMiddleware.validate(teamMemberValidation.idParamSchema, "params"),
    ],
    handler: teamMemberController.deleteTeamMember,
  },
} satisfies Record<string, RouteDefinition>;

export const teamMemberRoutes = routeUtils.register(
  Router(),
  teamMemberRouteMap,
);
