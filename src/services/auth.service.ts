import {
  TeamMemberModel,
  teamMemberQueries,
} from "../models/team-member.model.ts";
import type {
  AuthTokens,
  AuthUser,
  LoginInput,
  RegisterInput,
} from "../types/auth.types.ts";
import type { TeamMemberDocument } from "../types/team-member.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import { MAX_ACTIVE_SESSIONS, TEAM_ADMIN_ROLES } from "../utils/constants.ts";
import { passwordUtils } from "../utils/password.utils.ts";
import { tokenUtils } from "../utils/token.utils.ts";
import {
  teamMemberService,
  type PublicTeamMember,
} from "./team-member.service.ts";

export interface AuthSession extends AuthTokens {
  user: PublicTeamMember;
}

const issueTokens = (
  member: TeamMemberDocument,
): AuthTokens & { refreshTokenHash: string } => {
  const accessToken = tokenUtils.signAccessToken({
    sub: member._id.toString(),
    email: member.email,
    role: member.role,
  });

  const refreshToken = tokenUtils.signRefreshToken({
    sub: member._id.toString(),
    jti: tokenUtils.newTokenId(),
  });

  return {
    accessToken,
    refreshToken,
    refreshTokenHash: tokenUtils.hashToken(refreshToken),
  };
};

/** Keeps the newest N sessions so an old device cannot pin an entry forever. */
const retainSessions = (hashes: string[], next: string): string[] =>
  [...hashes, next].slice(-MAX_ACTIVE_SESSIONS);

export const authService = {
  /**
   * Creates a team member.
   *
   * Bootstrap rule: while the collection is empty the endpoint is public and
   * the account is forced to `owner`, so a fresh deployment can be initialised.
   * Once any member exists, only owners/admins may register new ones.
   */
  register: async (
    input: RegisterInput,
    actor: AuthUser | null,
  ): Promise<PublicTeamMember> => {
    const isBootstrap = (await teamMemberQueries.countAll()) === 0;

    if (!isBootstrap) {
      if (!actor) {
        throw ApiError.unauthorized("Authentication required");
      }

      if (!(TEAM_ADMIN_ROLES as readonly string[]).includes(actor.role)) {
        throw ApiError.forbidden("Only owners and admins can add team members");
      }

      if (input.role === "owner" && actor.role !== "owner") {
        throw ApiError.forbidden("Only an owner can grant the owner role");
      }
    }

    if (await teamMemberQueries.existsByEmail(input.email)) {
      throw ApiError.conflict("A team member with this email already exists", [
        { path: "email", message: "already in use", code: "duplicate_key" },
      ]);
    }

    const { password, ...profile } = input;

    const member = await TeamMemberModel.create({
      ...profile,
      role: isBootstrap ? "owner" : input.role,
      status: "active",
      passwordHash: await passwordUtils.hash(password),
      joinedAt: new Date(),
      refreshTokenHashes: [],
    });

    return teamMemberService.serialize(member);
  },

  login: async ({ email, password }: LoginInput): Promise<AuthSession> => {
    const member = await teamMemberQueries.findByEmailWithSecrets(email);

    // Same message for unknown email and wrong password — no account enumeration.
    if (!member) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    const passwordMatches = await passwordUtils.compare(
      password,
      member.passwordHash,
    );

    if (!passwordMatches) {
      throw ApiError.unauthorized("Invalid email or password");
    }

    if (member.status !== "active") {
      throw ApiError.forbidden(`This account is ${member.status}`);
    }

    const { accessToken, refreshToken, refreshTokenHash } = issueTokens(member);

    member.refreshTokenHashes = retainSessions(
      member.refreshTokenHashes,
      refreshTokenHash,
    );
    member.lastLoginAt = new Date();
    await member.save();

    return {
      accessToken,
      refreshToken,
      user: teamMemberService.serialize(member),
    };
  },

  /**
   * Rotates a refresh token. A signature-valid token whose hash is no longer
   * stored means it was already rotated or revoked — treated as replay, and
   * every session for that member is terminated.
   */
  refresh: async (token: string): Promise<AuthSession> => {
    const payload = tokenUtils.verifyRefreshToken(token);

    const member = await teamMemberQueries.findByIdWithSecrets(payload.sub);
    if (!member) {
      throw ApiError.unauthorized("This account no longer exists");
    }

    const presentedHash = tokenUtils.hashToken(token);

    if (!member.refreshTokenHashes.includes(presentedHash)) {
      member.set("refreshTokenHashes", []);
      await member.save();

      throw ApiError.unauthorized(
        "Refresh token has already been used — all sessions have been revoked",
      );
    }

    if (member.status !== "active") {
      member.set("refreshTokenHashes", []);
      await member.save();

      throw ApiError.forbidden(`This account is ${member.status}`);
    }

    const { accessToken, refreshToken, refreshTokenHash } = issueTokens(member);

    member.refreshTokenHashes = retainSessions(
      member.refreshTokenHashes.filter((hash) => hash !== presentedHash),
      refreshTokenHash,
    );
    await member.save();

    return {
      accessToken,
      refreshToken,
      user: teamMemberService.serialize(member),
    };
  },

  /**
   * Revokes the presented refresh token, or every session when `allDevices`.
   * Always resolves: logging out with an expired token is not an error.
   */
  logout: async (
    token: string | undefined,
    allDevices: boolean,
    actor: AuthUser | null,
  ): Promise<void> => {
    const memberId = (() => {
      if (!token) return actor?.id ?? null;

      try {
        return tokenUtils.verifyRefreshToken(token).sub;
      } catch {
        return actor?.id ?? null;
      }
    })();

    if (!memberId) return;

    const member = await teamMemberQueries.findByIdWithSecrets(memberId);
    if (!member) return;

    if (allDevices || !token) {
      member.set("refreshTokenHashes", []);
    } else {
      const presentedHash = tokenUtils.hashToken(token);
      member.set(
        "refreshTokenHashes",
        member.refreshTokenHashes.filter((hash) => hash !== presentedHash),
      );
    }

    await member.save();
  },

  getMe: async (userId: string): Promise<PublicTeamMember> => {
    const member = await TeamMemberModel.findById(userId);

    if (!member) {
      throw ApiError.notFound("Team member not found");
    }

    return teamMemberService.serialize(member);
  },
};
