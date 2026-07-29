import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { dealService } from "../services/deal.service.ts";
import type {
  BulkArchiveDealInput,
  CreateDealInput,
  ListDealQuery,
  MoveDealStageInput,
  UpdateDealInput,
} from "../types/deal.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const dealController = {
  getDeals: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListDealQuery>(req, "query");
    const { items, meta } = await dealService.listDeals(query);

    ApiResponse.ok(res, items, "Deals retrieved", meta);
  }),

  getDealById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const deal = await dealService.getDealById(id);

    ApiResponse.ok(res, deal, "Deal retrieved");
  }),

  createDeal: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<CreateDealInput>(req, "body");
    const deal = await dealService.createDeal(payload, requireUser(req.user));

    ApiResponse.created(res, deal, "Deal created");
  }),

  updateDeal: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateDealInput>(req, "body");
    const deal = await dealService.updateDeal(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, deal, "Deal updated");
  }),

  moveStage: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<MoveDealStageInput>(req, "body");
    const deal = await dealService.moveStage(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, deal, "Deal stage updated");
  }),

  bulkArchiveDeals: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<BulkArchiveDealInput>(req, "body");
    const result = await dealService.bulkSetArchived(
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(
      res,
      result,
      payload.archived ? "Deals archived" : "Deals restored",
    );
  }),

  deleteDeal: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await dealService.deleteDeal(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Deal deleted");
  }),
};
