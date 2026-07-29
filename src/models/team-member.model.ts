import mongoose, { Schema } from "mongoose";
import type { ITeamMember } from "../types/team-member.types.ts";
import {
  AVATAR_COLOR_COUNT,
  TEAM_ROLES,
  TEAM_STATUSES,
} from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const teamMemberSchema = new Schema<ITeamMember>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    role: {
      type: String,
      enum: TEAM_ROLES,
      required: true,
      default: "viewer",
      index: true,
    },
    status: {
      type: String,
      enum: TEAM_STATUSES,
      required: true,
      default: "active",
      index: true,
    },
    avatarColor: {
      type: Number,
      required: true,
      min: 0,
      max: AVATAR_COLOR_COUNT - 1,
      default: () => Math.floor(Math.random() * AVATAR_COLOR_COUNT),
    },
    jobTitle: { type: String, default: "", trim: true, maxlength: 120 },
    phone: { type: String, default: null, trim: true },
    department: { type: String, default: null, trim: true },
    bio: { type: String, default: null, trim: true, maxlength: 600 },
    location: { type: String, default: null, trim: true },
    joinedAt: { type: Date, required: true, default: () => new Date() },

    dealsClosed: { type: Number, required: true, default: 0, min: 0 },
    revenue: { type: Number, required: true, default: 0, min: 0 },
    quota: { type: Number, required: true, default: 0, min: 0 },

    passwordHash: { type: String, required: true, select: false },
    refreshTokenHashes: {
      type: [String],
      required: true,
      default: [],
      select: false,
    },
    lastLoginAt: { type: Date, default: null },
  },
  // Defence in depth: even if a query forgets `.select("-passwordHash")`, the
  // secrets never reach a serialised response.
  schemaUtils.baseOptions("passwordHash", "refreshTokenHashes"),
);

teamMemberSchema.index({ name: 1 });

export const TeamMemberModel = mongoose.model<ITeamMember>(
  "TeamMember",
  teamMemberSchema,
);

/** Reusable query helpers. Services use these instead of ad-hoc inline queries. */
export const teamMemberQueries = {
  /** Secrets are `select: false`, so auth flows must ask for them explicitly. */
  findByEmailWithSecrets: (email: string) =>
    TeamMemberModel.findOne({ email: email.toLowerCase().trim() }).select(
      "+passwordHash +refreshTokenHashes",
    ),

  findByIdWithSecrets: (id: string) =>
    TeamMemberModel.findById(id).select("+passwordHash +refreshTokenHashes"),

  findActiveById: (id: string) =>
    TeamMemberModel.findOne({ _id: id, status: "active" }),

  existsByEmail: (email: string) =>
    TeamMemberModel.exists({ email: email.toLowerCase().trim() }),

  countAll: () => TeamMemberModel.countDocuments({}),

  countActiveOwners: () =>
    TeamMemberModel.countDocuments({ role: "owner", status: "active" }),
};
