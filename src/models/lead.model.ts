import mongoose, { Schema } from "mongoose";
import type { ILead, LeadStage } from "../types/lead.types.ts";
import {
  AVATAR_COLOR_COUNT,
  LEAD_SOURCES,
  LEAD_STAGES,
} from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const leadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    company: { type: String, required: true, trim: true, maxlength: 150 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    stage: {
      type: String,
      enum: LEAD_STAGES,
      required: true,
      default: "new",
      index: true,
    },
    source: {
      type: String,
      enum: LEAD_SOURCES,
      required: true,
      default: "website",
      index: true,
    },
    value: { type: Number, required: true, default: 0, min: 0 },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    avatarColor: {
      type: Number,
      required: true,
      min: 0,
      max: AVATAR_COLOR_COUNT - 1,
      default: () => Math.floor(Math.random() * AVATAR_COLOR_COUNT),
    },
    notes: { type: String, default: null, trim: true, maxlength: 2000 },
    archived: { type: Boolean, required: true, default: false, index: true },
  },
  schemaUtils.baseOptions(),
);

leadSchema.index({ archived: 1, createdAt: -1 });
// Kanban board: one query per stage column.
leadSchema.index({ archived: 1, stage: 1, createdAt: -1 });
leadSchema.index({ assignedTo: 1, archived: 1, createdAt: -1 });

export const LeadModel = mongoose.model<ILead>("Lead", leadSchema);

export const leadQueries = {
  findActiveByAssignee: (assigneeId: string) =>
    LeadModel.find({ assignedTo: assigneeId, archived: false }),

  findByStage: (stage: LeadStage) =>
    LeadModel.find({ stage, archived: false }).sort({ createdAt: -1 }),

  countByStage: (stage: LeadStage) =>
    LeadModel.countDocuments({ stage, archived: false }),

  setArchivedMany: (ids: string[], archived: boolean) =>
    LeadModel.updateMany({ _id: { $in: ids } }, { $set: { archived } }),
};
