import mongoose from "mongoose";
import { CustomerModel } from "../models/customer.model.ts";
import { LeadModel, leadQueries } from "../models/lead.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type { CustomerDocument } from "../types/customer.types.ts";
import type {
  BulkArchiveLeadInput,
  ConvertLeadInput,
  CreateLeadInput,
  LeadDocument,
  LeadSource,
  LeadStage,
  ListLeadQuery,
  MoveStageInput,
  UpdateLeadInput,
} from "../types/lead.types.ts";
import { accessControl } from "../utils/access.utils.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { queryParser } from "../utils/query.utils.ts";
import { activityService } from "./activity.service.ts";
import { customerService, type PublicCustomer } from "./customer.service.ts";

/** Response projection — mirrors the frontend's `Lead` interface. */
export interface PublicLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: LeadStage;
  source: LeadSource;
  value: number;
  assignedTo: string | null;
  tags: string[];
  avatarColor: number;
  notes: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/**
 * A standalone mongod rejects transactions outright. Surface that as an
 * actionable message instead of a bare 500 — the fix is a replica set, not a
 * retry, and silently falling back to non-atomic writes is not acceptable here.
 *
 * The deployment reports this several different ways depending on where it
 * trips: server error 20 (IllegalOperation), or a driver-side complaint about
 * retryable writes that misleadingly suggests setting `retryWrites=false` —
 * which would only move the failure, not fix it.
 */
const isTransactionUnsupported = (error: unknown): boolean => {
  if (!isRecord(error)) return false;

  const message = typeof error.message === "string" ? error.message : "";

  return (
    error.code === 20 ||
    message.includes("Transaction numbers are only allowed") ||
    message.includes("Transactions are not supported") ||
    message.includes("does not support retryable writes") ||
    message.includes("does not support transactions")
  );
};

const findOrFail = async (id: string): Promise<LeadDocument> => {
  const lead = await LeadModel.findById(id);

  if (!lead) {
    throw ApiError.notFound("Lead not found");
  }

  return lead;
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

export const leadService = {
  serialize: (lead: LeadDocument): PublicLead => ({
    id: lead._id.toString(),
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    stage: lead.stage,
    source: lead.source,
    value: lead.value,
    assignedTo: lead.assignedTo ? lead.assignedTo.toString() : null,
    tags: lead.tags,
    avatarColor: lead.avatarColor,
    notes: lead.notes,
    archived: lead.archived,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  }),

  listLeads: async (
    query: ListLeadQuery,
  ): Promise<{ items: PublicLead[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    const filter: Record<string, unknown> = {};

    if (query.archived !== "all") {
      filter.archived = query.archived === "true";
    }

    if (query.stage) filter.stage = query.stage;
    if (query.source) filter.source = query.source;

    if (query.assignedTo) {
      filter.assignedTo =
        query.assignedTo === "unassigned" ? null : query.assignedTo;
    }

    if (query.tags) {
      const tags = query.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      if (tags.length > 0) filter.tags = { $in: tags };
    }

    const search = queryParser.buildSearchFilter(query.search, [
      "name",
      "company",
      "email",
      "phone",
      "tags",
    ]);
    if (search) Object.assign(filter, search);

    const [leads, total] = await Promise.all([
      LeadModel.find(filter).sort(sort).skip(skip).limit(limit),
      LeadModel.countDocuments(filter),
    ]);

    return {
      items: leads.map(leadService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getLeadById: async (id: string): Promise<PublicLead> =>
    leadService.serialize(await findOrFail(id)),

  createLead: async (
    payload: CreateLeadInput,
    actor: AuthUser,
  ): Promise<PublicLead> => {
    const assignedTo = accessControl.resolveAssignee(actor, payload.assignedTo);
    await assertAssigneeExists(assignedTo);

    const lead = await LeadModel.create({ ...payload, assignedTo });

    await activityService.log({
      type: "lead.created",
      actorId: actor.id,
      title: `${lead.name} was added as a lead`,
      description: `${lead.company} · ${lead.source}`,
      entity: { type: "lead", id: lead._id, name: lead.name },
    });

    return leadService.serialize(lead);
  },

  updateLead: async (
    id: string,
    payload: UpdateLeadInput,
    actor: AuthUser,
  ): Promise<PublicLead> => {
    const lead = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, lead.assignedTo, "lead");
    accessControl.assertCanAssignTo(actor, payload.assignedTo);
    await assertAssigneeExists(payload.assignedTo);

    lead.set(payload);
    await lead.save();

    return leadService.serialize(lead);
  },

  /**
   * Kanban column drop. The frontend's ActivityType union has no lead-stage
   * entry, so this deliberately logs no activity.
   */
  moveStage: async (
    id: string,
    { stage }: MoveStageInput,
    actor: AuthUser,
  ): Promise<PublicLead> => {
    const lead = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, lead.assignedTo, "lead");

    lead.stage = stage;
    await lead.save();

    return leadService.serialize(lead);
  },

  /**
   * Converts a lead into a customer atomically: insert the customer, delete the
   * lead, and log `lead.converted` inside one transaction. Any failure rolls the
   * whole thing back, so a lead can never vanish without its customer existing.
   *
   * Requires a replica set or mongos — transactions are unavailable on a
   * standalone mongod.
   */
  convertToCustomer: async (
    id: string,
    payload: ConvertLeadInput,
    actor: AuthUser,
  ): Promise<PublicCustomer> => {
    const lead = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, lead.assignedTo, "lead");

    const session = await mongoose.startSession();
    let created: CustomerDocument | undefined;

    try {
      await session.withTransaction(async () => {
        const [customer] = await CustomerModel.create(
          [
            {
              name: lead.name,
              company: lead.company,
              email: lead.email,
              phone: lead.phone,
              status: payload.status,
              tags: lead.tags,
              assignedTo: lead.assignedTo,
              avatarColor: lead.avatarColor,
              jobTitle: payload.jobTitle ?? "",
              website: payload.website ?? null,
              value: lead.value,
              lastActivityAt: new Date(),
              archived: false,
            },
          ],
          { session },
        );

        if (!customer) {
          throw ApiError.internal("Customer could not be created");
        }

        await LeadModel.deleteOne({ _id: lead._id }, { session });

        // Passing the session makes a logging failure roll back the conversion.
        await activityService.log(
          {
            type: "lead.converted",
            actorId: actor.id,
            title: `${lead.name} was converted to a customer`,
            description: `${lead.company} · ${lead.stage} · ${lead.source}`,
            entity: { type: "customer", id: customer._id, name: customer.name },
          },
          session,
        );

        created = customer;
      });
    } catch (error) {
      if (isTransactionUnsupported(error)) {
        throw ApiError.internal(
          "Lead conversion requires a MongoDB replica set — transactions are not available on a standalone server",
        );
      }

      throw error;
    } finally {
      await session.endSession();
    }

    if (!created) {
      throw ApiError.internal("Lead conversion did not produce a customer");
    }

    return customerService.serialize(created);
  },

  deleteLead: async (id: string, actor: AuthUser): Promise<void> => {
    const lead = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, lead.assignedTo, "lead");

    await lead.deleteOne();
  },

  bulkSetArchived: async (
    { ids, archived }: BulkArchiveLeadInput,
    actor: AuthUser,
  ): Promise<{ matched: number; modified: number }> => {
    let targetIds = ids;

    if (accessControl.isOwnershipScoped(actor)) {
      const owned = await LeadModel.find({
        _id: { $in: ids },
        assignedTo: actor.id,
      }).select("_id");

      targetIds = owned.map((lead) => lead._id.toString());

      if (targetIds.length === 0) {
        throw ApiError.forbidden("You can only modify leads assigned to you");
      }
    }

    const result = await leadQueries.setArchivedMany(targetIds, archived);

    return { matched: result.matchedCount, modified: result.modifiedCount };
  },
};
