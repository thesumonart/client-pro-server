import type { Types } from "mongoose";
import { CustomerModel } from "../models/customer.model.ts";
import { DealModel, dealQueries } from "../models/deal.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  BulkArchiveDealInput,
  CreateDealInput,
  DealDocument,
  DealStage,
  ListDealQuery,
  MoveDealStageInput,
  UpdateDealInput,
} from "../types/deal.types.ts";
import { accessControl } from "../utils/access.utils.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { DEAL_STAGE_PROBABILITY } from "../utils/constants.ts";
import { queryParser } from "../utils/query.utils.ts";
import { activityService } from "./activity.service.ts";

/** Response projection — mirrors the frontend's `Deal` interface. */
export interface PublicDeal {
  id: string;
  title: string;
  customerId: string | null;
  customerName: string;
  company: string;
  value: number;
  stage: DealStage;
  probability: number;
  closingDate: Date;
  assignedTo: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const findOrFail = async (id: string): Promise<DealDocument> => {
  const deal = await DealModel.findById(id);

  if (!deal) {
    throw ApiError.notFound("Deal not found");
  }

  return deal;
};

const assertAssigneeExists = async (
  assignedTo: string | null | undefined,
): Promise<void> => {
  if (!assignedTo) return;

  const exists = await TeamMemberModel.exists({ _id: assignedTo });

  if (!exists) {
    throw ApiError.badRequest("Assigned team member does not exist", [
      { path: "assignedTo", message: "must reference an existing team member" },
    ]);
  }
};

/**
 * Resolves the denormalised customer columns. When a customerId is supplied the
 * record is the source of truth, so any client-sent name/company is discarded.
 */
const resolveCustomerFields = async (
  customerId: string | null | undefined,
  fallback: { customerName?: string; company?: string },
): Promise<{ customerName: string; company: string } | null> => {
  if (customerId === undefined) return null;

  if (customerId === null) {
    return {
      customerName: fallback.customerName ?? "",
      company: fallback.company ?? "",
    };
  }

  const customer = await CustomerModel.findById(customerId);

  if (!customer) {
    throw ApiError.badRequest("Customer does not exist", [
      { path: "customerId", message: "must reference an existing customer" },
    ]);
  }

  return { customerName: customer.name, company: customer.company };
};

/**
 * Rewrites a member's `dealsClosed` / `revenue` roll-up from their won deals.
 * Called whenever a deal enters or leaves the won state.
 */
const syncMemberMetrics = async (
  memberIds: (Types.ObjectId | string | null | undefined)[],
): Promise<void> => {
  const unique = [
    ...new Set(
      memberIds
        .filter((id): id is Types.ObjectId | string => Boolean(id))
        .map((id) => id.toString()),
    ),
  ];

  await Promise.all(
    unique.map(async (memberId) => {
      const metrics = await dealQueries.aggregateMemberMetrics(memberId);

      await TeamMemberModel.updateOne({ _id: memberId }, { $set: metrics });
    }),
  );
};

export const dealService = {
  serialize: (deal: DealDocument): PublicDeal => ({
    id: deal._id.toString(),
    title: deal.title,
    customerId: deal.customerId ? deal.customerId.toString() : null,
    customerName: deal.customerName,
    company: deal.company,
    value: deal.value,
    stage: deal.stage,
    probability: deal.probability,
    closingDate: deal.closingDate,
    assignedTo: deal.assignedTo ? deal.assignedTo.toString() : null,
    archived: deal.archived,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  }),

  listDeals: async (
    query: ListDealQuery,
  ): Promise<{ items: PublicDeal[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    const filter: Record<string, unknown> = {};

    if (query.archived !== "all") {
      filter.archived = query.archived === "true";
    }

    if (query.stage) filter.stage = query.stage;
    if (query.customerId) filter.customerId = query.customerId;

    if (query.assignedTo) {
      filter.assignedTo =
        query.assignedTo === "unassigned" ? null : query.assignedTo;
    }

    if (query.closingFrom || query.closingTo) {
      filter.closingDate = {
        ...(query.closingFrom ? { $gte: query.closingFrom } : {}),
        ...(query.closingTo ? { $lte: query.closingTo } : {}),
      };
    }

    if (query.minValue !== undefined || query.maxValue !== undefined) {
      filter.value = {
        ...(query.minValue !== undefined ? { $gte: query.minValue } : {}),
        ...(query.maxValue !== undefined ? { $lte: query.maxValue } : {}),
      };
    }

    const search = queryParser.buildSearchFilter(query.search, [
      "title",
      "customerName",
      "company",
    ]);
    if (search) Object.assign(filter, search);

    const [deals, total] = await Promise.all([
      DealModel.find(filter).sort(sort).skip(skip).limit(limit),
      DealModel.countDocuments(filter),
    ]);

    return {
      items: deals.map(dealService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getDealById: async (id: string): Promise<PublicDeal> =>
    dealService.serialize(await findOrFail(id)),

  createDeal: async (
    payload: CreateDealInput,
    actor: AuthUser,
  ): Promise<PublicDeal> => {
    const assignedTo = accessControl.resolveAssignee(actor, payload.assignedTo);
    await assertAssigneeExists(assignedTo);

    const customerFields = await resolveCustomerFields(payload.customerId, {
      customerName: payload.customerName,
      company: payload.company,
    });

    const deal = await DealModel.create({
      ...payload,
      ...(customerFields ?? {}),
      assignedTo,
      // Derived, never taken from the request.
      probability: DEAL_STAGE_PROBABILITY[payload.stage],
    });

    await activityService.log({
      type: "deal.created",
      actorId: actor.id,
      title: `${deal.title} was created`,
      description: `${deal.company || deal.customerName} · ${String(deal.value)}`,
      entity: { type: "deal", id: deal._id, name: deal.title },
    });

    if (deal.stage === "won") {
      await activityService.log({
        type: "deal.won",
        actorId: actor.id,
        title: `${deal.title} was won`,
        description: `${deal.company || deal.customerName} · ${String(deal.value)}`,
        entity: { type: "deal", id: deal._id, name: deal.title },
      });

      await syncMemberMetrics([deal.assignedTo]);
    }

    return dealService.serialize(deal);
  },

  updateDeal: async (
    id: string,
    payload: UpdateDealInput,
    actor: AuthUser,
  ): Promise<PublicDeal> => {
    const deal = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, deal.assignedTo, "deal");
    accessControl.assertCanAssignTo(actor, payload.assignedTo);
    await assertAssigneeExists(payload.assignedTo);

    const previousStage = deal.stage;
    const previousAssignee = deal.assignedTo;

    const customerFields = await resolveCustomerFields(payload.customerId, {
      customerName: payload.customerName ?? deal.customerName,
      company: payload.company ?? deal.company,
    });

    deal.set(payload);
    if (customerFields) deal.set(customerFields);

    // Keep probability locked to the stage even on a plain update.
    if (payload.stage) {
      deal.probability = DEAL_STAGE_PROBABILITY[payload.stage];
    }

    await deal.save();

    if (payload.stage && payload.stage !== previousStage) {
      await dealService.logStageChange(deal, previousStage, actor);
    }

    if (previousStage === "won" || deal.stage === "won") {
      await syncMemberMetrics([previousAssignee, deal.assignedTo]);
    }

    return dealService.serialize(deal);
  },

  /** Shared by update and the kanban move so both log identically. */
  logStageChange: async (
    deal: DealDocument,
    previousStage: DealStage,
    actor: AuthUser,
  ): Promise<void> => {
    await activityService.log({
      type: "deal.stage",
      actorId: actor.id,
      title: `${deal.title} moved from ${previousStage} to ${deal.stage}`,
      description: `${deal.probability}% probability`,
      entity: { type: "deal", id: deal._id, name: deal.title },
    });

    if (deal.stage === "won") {
      await activityService.log({
        type: "deal.won",
        actorId: actor.id,
        title: `${deal.title} was won`,
        description: `${deal.company || deal.customerName} · ${String(deal.value)}`,
        entity: { type: "deal", id: deal._id, name: deal.title },
      });
    }
  },

  /** Kanban column drop — recalculates probability from the new stage. */
  moveStage: async (
    id: string,
    { stage }: MoveDealStageInput,
    actor: AuthUser,
  ): Promise<PublicDeal> => {
    const deal = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, deal.assignedTo, "deal");

    const previousStage = deal.stage;

    deal.stage = stage;
    deal.probability = DEAL_STAGE_PROBABILITY[stage];
    await deal.save();

    if (previousStage !== stage) {
      await dealService.logStageChange(deal, previousStage, actor);

      if (previousStage === "won" || stage === "won") {
        await syncMemberMetrics([deal.assignedTo]);
      }
    }

    return dealService.serialize(deal);
  },

  deleteDeal: async (id: string, actor: AuthUser): Promise<void> => {
    const deal = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, deal.assignedTo, "deal");

    const wasWon = deal.stage === "won";
    const assignee = deal.assignedTo;

    await deal.deleteOne();

    if (wasWon) {
      await syncMemberMetrics([assignee]);
    }
  },

  bulkSetArchived: async (
    { ids, archived }: BulkArchiveDealInput,
    actor: AuthUser,
  ): Promise<{ matched: number; modified: number }> => {
    let targetIds = ids;

    if (accessControl.isOwnershipScoped(actor)) {
      const owned = await DealModel.find({
        _id: { $in: ids },
        assignedTo: actor.id,
      }).select("_id");

      targetIds = owned.map((deal) => deal._id.toString());

      if (targetIds.length === 0) {
        throw ApiError.forbidden("You can only modify deals assigned to you");
      }
    }

    // Archiving removes a deal from the won totals, so capture the affected
    // assignees before the write.
    const wonDeals = await DealModel.find({
      _id: { $in: targetIds },
      stage: "won",
    }).select("assignedTo");

    const result = await dealQueries.setArchivedMany(targetIds, archived);

    await syncMemberMetrics(wonDeals.map((deal) => deal.assignedTo));

    return { matched: result.matchedCount, modified: result.modifiedCount };
  },
};
