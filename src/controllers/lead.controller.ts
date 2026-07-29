import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { leadService } from "../services/lead.service.ts";
import type {
  BulkArchiveLeadInput,
  ConvertLeadInput,
  CreateLeadInput,
  ListLeadQuery,
  MoveStageInput,
  UpdateLeadInput,
} from "../types/lead.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const leadController = {
  getLeads: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListLeadQuery>(req, "query");
    const { items, meta } = await leadService.listLeads(query);

    ApiResponse.ok(res, items, "Leads retrieved", meta);
  }),

  getLeadById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const lead = await leadService.getLeadById(id);

    ApiResponse.ok(res, lead, "Lead retrieved");
  }),

  createLead: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<CreateLeadInput>(req, "body");
    const lead = await leadService.createLead(payload, requireUser(req.user));

    ApiResponse.created(res, lead, "Lead created");
  }),

  updateLead: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateLeadInput>(req, "body");
    const lead = await leadService.updateLead(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, lead, "Lead updated");
  }),

  moveStage: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<MoveStageInput>(req, "body");
    const lead = await leadService.moveStage(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, lead, "Lead stage updated");
  }),

  convertLead: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<ConvertLeadInput>(req, "body");
    const customer = await leadService.convertToCustomer(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.created(res, customer, "Lead converted to customer");
  }),

  bulkArchiveLeads: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<BulkArchiveLeadInput>(req, "body");
    const result = await leadService.bulkSetArchived(
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(
      res,
      result,
      payload.archived ? "Leads archived" : "Leads restored",
    );
  }),

  deleteLead: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await leadService.deleteLead(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Lead deleted");
  }),
};
