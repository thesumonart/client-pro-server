import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { teamMemberService } from "../services/team-member.service.ts";
import type {
  IdParam,
  ListTeamQuery,
  UpdateRoleInput,
  UpdateStatusInput,
  UpdateTeamMemberInput,
} from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const teamMemberController = {
  getTeamMembers: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListTeamQuery>(req, "query");
    const { items, meta } = await teamMemberService.listTeamMembers(query);

    ApiResponse.ok(res, items, "Team members retrieved", meta);
  }),

  getTeamMemberById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const member = await teamMemberService.getTeamMemberById(id);

    ApiResponse.ok(res, member, "Team member retrieved");
  }),

  updateTeamMember: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateTeamMemberInput>(req, "body");
    const member = await teamMemberService.updateTeamMember(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, member, "Team member updated");
  }),

  updateRole: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateRoleInput>(req, "body");
    const member = await teamMemberService.updateRole(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, member, "Role updated");
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateStatusInput>(req, "body");
    const member = await teamMemberService.updateStatus(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, member, "Status updated");
  }),

  deleteTeamMember: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await teamMemberService.deleteTeamMember(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Team member deleted");
  }),
};
