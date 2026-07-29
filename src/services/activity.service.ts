import type { ClientSession } from "mongoose";
import { ActivityModel } from "../models/activity.model.ts";
import type {
  ActivityDocument,
  ActivityEntityType,
  ActivityType,
  ListActivityQuery,
  LogActivityInput,
} from "../types/activity.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { queryParser } from "../utils/query.utils.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

/** Response projection — mirrors the frontend's `Activity` interface. */
export interface PublicActivity {
  id: string;
  type: ActivityType;
  actorId: string | null;
  title: string;
  description: string | null;
  entity: { type: ActivityEntityType; id: string; name: string } | null;
  createdAt: Date;
}

const toDocument = (input: LogActivityInput) => ({
  type: input.type,
  actorId: input.actorId ? schemaUtils.toObjectId(input.actorId) : null,
  title: input.title,
  description: input.description ?? null,
  entity: input.entity
    ? {
        type: input.entity.type,
        id: schemaUtils.toObjectId(input.entity.id),
        name: input.entity.name,
      }
    : null,
});

export const activityService = {
  serialize: (activity: ActivityDocument): PublicActivity => ({
    id: activity._id.toString(),
    type: activity.type,
    actorId: activity.actorId ? activity.actorId.toString() : null,
    title: activity.title,
    description: activity.description,
    entity: activity.entity
      ? {
          type: activity.entity.type,
          id: activity.entity.id.toString(),
          name: activity.entity.name,
        }
      : null,
    createdAt: activity.createdAt,
  }),

  /**
   * Records an activity as a side-effect of a business operation. There is no
   * public create route — services call this directly.
   *
   * Pass `session` when the activity is part of a transaction (e.g. lead
   * conversion): failures then propagate so the whole transaction rolls back.
   * Without a session, a logging failure is swallowed and reported — an audit
   * write must never fail the user's actual operation.
   */
  log: async (
    input: LogActivityInput,
    session?: ClientSession,
  ): Promise<ActivityDocument | null> => {
    if (session) {
      const [created] = await ActivityModel.create([toDocument(input)], {
        session,
      });

      return created ?? null;
    }

    try {
      return await ActivityModel.create(toDocument(input));
    } catch (error) {
      console.error(`Failed to log activity "${input.type}":`, error);
      return null;
    }
  },

  /** Bulk variant, same failure semantics as `log`. */
  logMany: async (
    inputs: LogActivityInput[],
    session?: ClientSession,
  ): Promise<number> => {
    if (inputs.length === 0) return 0;

    const documents = inputs.map(toDocument);

    if (session) {
      const created = await ActivityModel.insertMany(documents, { session });
      return created.length;
    }

    try {
      const created = await ActivityModel.insertMany(documents, {
        ordered: false,
      });
      return created.length;
    } catch (error) {
      console.error("Failed to log activities:", error);
      return 0;
    }
  },

  listActivities: async (
    query: ListActivityQuery,
  ): Promise<{ items: PublicActivity[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    const filter: Record<string, unknown> = {};

    if (query.type) filter.type = query.type;
    if (query.actorId) filter.actorId = query.actorId;
    if (query.entityType) filter["entity.type"] = query.entityType;
    if (query.entityId) filter["entity.id"] = query.entityId;

    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }

    const search = queryParser.buildSearchFilter(query.search, [
      "title",
      "description",
      "entity.name",
    ]);
    if (search) Object.assign(filter, search);

    const [activities, total] = await Promise.all([
      ActivityModel.find(filter).sort(sort).skip(skip).limit(limit),
      ActivityModel.countDocuments(filter),
    ]);

    return {
      items: activities.map(activityService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getActivityById: async (id: string): Promise<PublicActivity> => {
    const activity = await ActivityModel.findById(id);

    if (!activity) {
      throw ApiError.notFound("Activity not found");
    }

    return activityService.serialize(activity);
  },
};
