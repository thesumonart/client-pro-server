import {
  TeamMemberModel,
  teamMemberQueries,
} from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  ListTeamQuery,
  TeamMemberDocument,
  UpdateRoleInput,
  UpdateStatusInput,
  UpdateTeamMemberInput,
} from "../types/team-member.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { TEAM_ADMIN_ROLES } from "../utils/constants.ts";
import { queryParser } from "../utils/query.utils.ts";

/** The public projection of a TeamMember — never includes auth secrets. */
export interface PublicTeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatarColor: number;
  jobTitle: string;
  phone: string | null;
  department: string | null;
  bio: string | null;
  location: string | null;
  joinedAt: Date;
  dealsClosed: number;
  revenue: number;
  quota: number;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const isTeamAdmin = (actor: AuthUser): boolean =>
  (TEAM_ADMIN_ROLES as readonly string[]).includes(actor.role);

const findOrFail = async (id: string): Promise<TeamMemberDocument> => {
  const member = await TeamMemberModel.findById(id);

  if (!member) {
    throw ApiError.notFound("Team member not found");
  }

  return member;
};

export const teamMemberService = {
  /** Explicit whitelist — secrets can never leak through this projection. */
  serialize: (member: TeamMemberDocument): PublicTeamMember => ({
    id: member._id.toString(),
    name: member.name,
    email: member.email,
    role: member.role,
    status: member.status,
    avatarColor: member.avatarColor,
    jobTitle: member.jobTitle,
    phone: member.phone,
    department: member.department,
    bio: member.bio,
    location: member.location,
    joinedAt: member.joinedAt,
    dealsClosed: member.dealsClosed,
    revenue: member.revenue,
    quota: member.quota,
    lastLoginAt: member.lastLoginAt,
    createdAt: member.createdAt,
    updatedAt: member.updatedAt,
  }),

  listTeamMembers: async (
    query: ListTeamQuery,
  ): Promise<{ items: PublicTeamMember[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;

    const search = queryParser.buildSearchFilter(query.search, [
      "name",
      "email",
      "jobTitle",
      "department",
    ]);
    if (search) Object.assign(filter, search);

    const [members, total] = await Promise.all([
      TeamMemberModel.find(filter).sort(sort).skip(skip).limit(limit),
      TeamMemberModel.countDocuments(filter),
    ]);

    return {
      items: members.map(teamMemberService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getTeamMemberById: async (id: string): Promise<PublicTeamMember> =>
    teamMemberService.serialize(await findOrFail(id)),

  /** Owners/admins may edit anyone; everyone else may edit only themselves. */
  updateTeamMember: async (
    id: string,
    payload: UpdateTeamMemberInput,
    actor: AuthUser,
  ): Promise<PublicTeamMember> => {
    if (!isTeamAdmin(actor) && actor.id !== id) {
      throw ApiError.forbidden("You can only edit your own profile");
    }

    const member = await findOrFail(id);
    member.set(payload);
    await member.save();

    return teamMemberService.serialize(member);
  },

  updateRole: async (
    id: string,
    { role }: UpdateRoleInput,
    actor: AuthUser,
  ): Promise<PublicTeamMember> => {
    if (actor.id === id) {
      throw ApiError.forbidden("You cannot change your own role");
    }

    if (role === "owner" && actor.role !== "owner") {
      throw ApiError.forbidden("Only an owner can grant the owner role");
    }

    const member = await findOrFail(id);

    // Never let the last active owner be demoted — it would lock everyone out
    // of team and settings management.
    if (member.role === "owner" && role !== "owner") {
      const owners = await teamMemberQueries.countActiveOwners();
      if (owners <= 1) {
        throw ApiError.conflict("The last owner's role cannot be changed");
      }
    }

    member.role = role;
    await member.save();

    return teamMemberService.serialize(member);
  },

  updateStatus: async (
    id: string,
    { status }: UpdateStatusInput,
    actor: AuthUser,
  ): Promise<PublicTeamMember> => {
    if (actor.id === id) {
      throw ApiError.forbidden("You cannot change your own status");
    }

    const member = await findOrFail(id);

    if (member.role === "owner" && status !== "active") {
      const owners = await teamMemberQueries.countActiveOwners();
      if (owners <= 1) {
        throw ApiError.conflict("The last active owner cannot be deactivated");
      }
    }

    member.status = status;

    // Deactivating must also terminate every live session.
    if (status !== "active") {
      member.set("refreshTokenHashes", []);
    }

    await member.save();

    return teamMemberService.serialize(member);
  },

  deleteTeamMember: async (id: string, actor: AuthUser): Promise<void> => {
    if (actor.id === id) {
      throw ApiError.forbidden("You cannot delete your own account");
    }

    const member = await findOrFail(id);

    if (member.role === "owner") {
      const owners = await teamMemberQueries.countActiveOwners();
      if (owners <= 1) {
        throw ApiError.conflict("The last owner cannot be deleted");
      }
    }

    await member.deleteOne();
  },
};
