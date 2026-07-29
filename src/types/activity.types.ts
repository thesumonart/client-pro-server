import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type {
  ACTIVITY_ENTITY_TYPES,
  ACTIVITY_TYPES,
} from "../utils/constants.ts";
import type { activityValidation } from "../validations/activity.validation.ts";

export type ActivityType = (typeof ACTIVITY_TYPES)[number];
export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];

/**
 * Polymorphic pointer. Stored denormalised — `name` is captured at write time
 * so a feed never needs a lookup per row, and history stays accurate even if
 * the target is later renamed or deleted.
 */
export interface ActivityEntityRef {
  type: ActivityEntityType;
  id: Types.ObjectId;
  name: string;
}

export interface IActivity {
  type: ActivityType;
  actorId: Types.ObjectId | null;
  title: string;
  description: string | null;
  entity: ActivityEntityRef | null;
  createdAt: Date;
  updatedAt: Date;
}

export type ActivityDocument = HydratedDocument<IActivity>;

/**
 * Input for `activityService.log`. Hand-written rather than z.infer'd: activities
 * are never created from client input, so there is no request schema to mirror.
 */
export interface LogActivityInput {
  type: ActivityType;
  actorId: Types.ObjectId | string | null;
  title: string;
  description?: string | null;
  entity?: {
    type: ActivityEntityType;
    id: Types.ObjectId | string;
    name: string;
  } | null;
}

export type ListActivityQuery = z.infer<
  typeof activityValidation.listActivityQuerySchema
>;
