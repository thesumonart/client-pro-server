import { CustomerModel, customerQueries } from "../models/customer.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  BulkArchiveInput,
  CreateCustomerInput,
  CustomerAddress,
  CustomerDocument,
  CustomerStatus,
  ListCustomerQuery,
  UpdateCustomerInput,
} from "../types/customer.types.ts";
import { accessControl } from "../utils/access.utils.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { queryParser } from "../utils/query.utils.ts";
import { activityService } from "./activity.service.ts";

/** Response projection — mirrors the frontend's `Customer` interface. */
export interface PublicCustomer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  tags: string[];
  assignedTo: string | null;
  avatarColor: number;
  jobTitle: string;
  website: string | null;
  address: CustomerAddress | null;
  value: number;
  lastActivityAt: Date;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const findOrFail = async (id: string): Promise<CustomerDocument> => {
  const customer = await CustomerModel.findById(id);

  if (!customer) {
    throw ApiError.notFound("Customer not found");
  }

  return customer;
};

/** Rejects a dangling assignee rather than storing an id that resolves to nothing. */
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

export const customerService = {
  serialize: (customer: CustomerDocument): PublicCustomer => ({
    id: customer._id.toString(),
    name: customer.name,
    company: customer.company,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
    tags: customer.tags,
    assignedTo: customer.assignedTo ? customer.assignedTo.toString() : null,
    avatarColor: customer.avatarColor,
    jobTitle: customer.jobTitle,
    website: customer.website,
    address: customer.address,
    value: customer.value,
    lastActivityAt: customer.lastActivityAt,
    archived: customer.archived,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }),

  listCustomers: async (
    query: ListCustomerQuery,
  ): Promise<{ items: PublicCustomer[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    const filter: Record<string, unknown> = {};

    if (query.archived !== "all") {
      filter.archived = query.archived === "true";
    }

    if (query.status) filter.status = query.status;

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

    const [customers, total] = await Promise.all([
      CustomerModel.find(filter).sort(sort).skip(skip).limit(limit),
      CustomerModel.countDocuments(filter),
    ]);

    return {
      items: customers.map(customerService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getCustomerById: async (id: string): Promise<PublicCustomer> =>
    customerService.serialize(await findOrFail(id)),

  createCustomer: async (
    payload: CreateCustomerInput,
    actor: AuthUser,
  ): Promise<PublicCustomer> => {
    // Ownership-scoped roles always create records assigned to themselves.
    const assignedTo = accessControl.resolveAssignee(actor, payload.assignedTo);
    await assertAssigneeExists(assignedTo);

    const customer = await CustomerModel.create({
      ...payload,
      assignedTo,
      lastActivityAt: new Date(),
    });

    await activityService.log({
      type: "customer.created",
      actorId: actor.id,
      title: `${customer.name} was added as a customer`,
      description: customer.company,
      entity: { type: "customer", id: customer._id, name: customer.name },
    });

    return customerService.serialize(customer);
  },

  updateCustomer: async (
    id: string,
    payload: UpdateCustomerInput,
    actor: AuthUser,
  ): Promise<PublicCustomer> => {
    const customer = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, customer.assignedTo, "customer");
    accessControl.assertCanAssignTo(actor, payload.assignedTo);
    await assertAssigneeExists(payload.assignedTo);

    customer.set(payload);
    customer.lastActivityAt = new Date();
    await customer.save();

    await activityService.log({
      type: "customer.updated",
      actorId: actor.id,
      title: `${customer.name} was updated`,
      description: Object.keys(payload).join(", "),
      entity: { type: "customer", id: customer._id, name: customer.name },
    });

    return customerService.serialize(customer);
  },

  deleteCustomer: async (id: string, actor: AuthUser): Promise<void> => {
    const customer = await findOrFail(id);

    accessControl.assertCanMutateRecord(actor, customer.assignedTo, "customer");

    await customer.deleteOne();
  },

  /**
   * Bulk archive/restore in one write. Ownership-scoped roles may only act on
   * their own records, so the id set is narrowed before the update runs.
   */
  bulkSetArchived: async (
    { ids, archived }: BulkArchiveInput,
    actor: AuthUser,
  ): Promise<{ matched: number; modified: number }> => {
    let targetIds = ids;

    if (accessControl.isOwnershipScoped(actor)) {
      const owned = await CustomerModel.find({
        _id: { $in: ids },
        assignedTo: actor.id,
      }).select("_id");

      targetIds = owned.map((customer) => customer._id.toString());

      if (targetIds.length === 0) {
        throw ApiError.forbidden(
          "You can only modify customers assigned to you",
        );
      }
    }

    const result = await customerQueries.setArchivedMany(targetIds, archived);

    return { matched: result.matchedCount, modified: result.modifiedCount };
  },
};
