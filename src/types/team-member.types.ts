import type { HydratedDocument } from "mongoose";
import type { z } from "zod";
import type { TEAM_ROLES, TEAM_STATUSES } from "../utils/constants.ts";
import type { teamMemberValidation } from "../validations/team-member.validation.ts";

export type TeamRole = (typeof TEAM_ROLES)[number];
export type TeamStatus = (typeof TEAM_STATUSES)[number];

/**
 * TeamMember doubles as the auth user — there is no separate User or Profile
 * collection. `passwordHash` and `refreshTokenHashes` are `select: false` and
 * stripped from every serialised response.
 */
export interface ITeamMember {
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
  avatarColor: number;
  jobTitle: string;
  phone: string | null;
  department: string | null;
  bio: string | null;
  location: string | null;
  joinedAt: Date;

  // Rolled-up performance metrics, maintained by the deal service.
  dealsClosed: number;
  revenue: number;
  quota: number;

  // Auth
  passwordHash: string;
  refreshTokenHashes: string[];
  lastLoginAt: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export type TeamMemberDocument = HydratedDocument<ITeamMember>;

export type ListTeamQuery = z.infer<
  typeof teamMemberValidation.listTeamQuerySchema
>;
export type UpdateTeamMemberInput = z.infer<
  typeof teamMemberValidation.updateTeamMemberSchema
>;
export type UpdateRoleInput = z.infer<
  typeof teamMemberValidation.updateRoleSchema
>;
export type UpdateStatusInput = z.infer<
  typeof teamMemberValidation.updateStatusSchema
>;
export type IdParam = z.infer<typeof teamMemberValidation.idParamSchema>;
