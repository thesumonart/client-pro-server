import type { Types } from "mongoose";
import { CustomerModel } from "../models/customer.model.ts";
import { DealModel } from "../models/deal.model.ts";
import { LeadModel } from "../models/lead.model.ts";
import { TaskModel } from "../models/task.model.ts";
import { ApiError } from "../utils/ApiError.ts";

export type ResolvableEntityType = "customer" | "lead" | "deal" | "task";

export interface EntityRefInput<T extends ResolvableEntityType> {
  type: T;
  id: string;
}

/** The resolved pointer keeps the caller's narrow `type`, not the full union. */
export interface ResolvedEntityRef<T extends ResolvableEntityType> {
  type: T;
  id: Types.ObjectId;
  name: string;
}

const notFound = (type: string): never => {
  throw ApiError.badRequest(`Related ${type} does not exist`, [
    { path: "relatedTo.id", message: `must reference an existing ${type}` },
  ]);
};

/** Dispatches on the pointer's type and reads the target's display name. */
const lookup = async (
  type: ResolvableEntityType,
  id: string,
): Promise<{ id: Types.ObjectId; name: string }> => {
  switch (type) {
    case "customer": {
      const customer = await CustomerModel.findById(id).select("name");
      if (!customer) return notFound("customer");

      return { id: customer._id, name: customer.name };
    }

    case "lead": {
      const lead = await LeadModel.findById(id).select("name");
      if (!lead) return notFound("lead");

      return { id: lead._id, name: lead.name };
    }

    case "deal": {
      const deal = await DealModel.findById(id).select("title");
      if (!deal) return notFound("deal");

      return { id: deal._id, name: deal.title };
    }

    case "task": {
      const task = await TaskModel.findById(id).select("title");
      if (!task) return notFound("task");

      return { id: task._id, name: task.title };
    }
  }
};

/**
 * Resolves a polymorphic `{ type, id }` pointer to a concrete record and its
 * display name.
 *
 * Per the data model these references are deliberately NOT Mongoose `refPath`
 * populates — they are dispatched with an explicit switch, and the name is
 * denormalised onto the referring document at write time.
 */
export const entityRefService = {
  resolve: async <T extends ResolvableEntityType>({
    type,
    id,
  }: EntityRefInput<T>): Promise<ResolvedEntityRef<T>> => {
    const target = await lookup(type, id);

    return { type, id: target.id, name: target.name };
  },

  /** Convenience wrapper for optional/nullable pointers. */
  resolveOptional: async <T extends ResolvableEntityType>(
    ref: EntityRefInput<T> | null | undefined,
  ): Promise<ResolvedEntityRef<T> | null> =>
    ref ? entityRefService.resolve(ref) : null,
};
