import mongoose, { Schema } from "mongoose";
import type { ActivityEntityRef, IActivity } from "../types/activity.types.ts";
import { ACTIVITY_ENTITY_TYPES, ACTIVITY_TYPES } from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

/**
 * Polymorphic target. Deliberately not a `refPath` — per the data model,
 * polymorphic references are resolved in the service layer via a switch on
 * `type`, and `name` is denormalised so feeds render without a join.
 */
const activityEntitySchema = new Schema<ActivityEntityRef>(
  {
    type: { type: String, enum: ACTIVITY_ENTITY_TYPES, required: true },
    id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const activitySchema = new Schema<IActivity>(
  {
    type: { type: String, enum: ACTIVITY_TYPES, required: true, index: true },
    actorId: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: null, trim: true, maxlength: 1000 },
    entity: { type: activityEntitySchema, default: null },
  },
  schemaUtils.baseOptions(),
);

// Global feed, per-entity feed, and per-actor feed.
activitySchema.index({ createdAt: -1 });
activitySchema.index({ "entity.id": 1, createdAt: -1 });
activitySchema.index({ actorId: 1, createdAt: -1 });

export const ActivityModel = mongoose.model<IActivity>(
  "Activity",
  activitySchema,
);

export const activityQueries = {
  findRecent: (limit: number) =>
    ActivityModel.find({}).sort({ createdAt: -1 }).limit(limit),

  findByEntity: (entityId: string, limit: number) =>
    ActivityModel.find({ "entity.id": entityId })
      .sort({ createdAt: -1 })
      .limit(limit),

  findByActor: (actorId: string, limit: number) =>
    ActivityModel.find({ actorId }).sort({ createdAt: -1 }).limit(limit),

  /** Used by the lead -> customer conversion to re-point history at the new record. */
  repointEntity: (fromId: string, toId: string, toType: string, name: string) =>
    ActivityModel.updateMany(
      { "entity.id": fromId },
      {
        $set: { "entity.id": toId, "entity.type": toType, "entity.name": name },
      },
    ),
};
