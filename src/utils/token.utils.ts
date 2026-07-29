import crypto from "node:crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env.ts";
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
} from "../types/auth.types.ts";
import type { TeamRole } from "../types/team-member.types.ts";
import { ApiError } from "./ApiError.ts";
import { TEAM_ROLES } from "./constants.ts";

const DURATION_UNITS: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
  w: 604_800_000,
  y: 31_536_000_000,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isTeamRole = (value: unknown): value is TeamRole =>
  typeof value === "string" &&
  (TEAM_ROLES as readonly string[]).includes(value);

export const tokenUtils = {
  signAccessToken: (payload: AccessTokenPayload): string =>
    jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions["expiresIn"],
    }),

  signRefreshToken: (payload: RefreshTokenPayload): string =>
    jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES as SignOptions["expiresIn"],
    }),

  verifyAccessToken: (token: string): AccessTokenPayload => {
    const decoded: unknown = jwt.verify(token, env.JWT_ACCESS_SECRET);

    if (
      !isRecord(decoded) ||
      typeof decoded.sub !== "string" ||
      typeof decoded.email !== "string" ||
      !isTeamRole(decoded.role)
    ) {
      throw ApiError.unauthorized("Malformed access token");
    }

    return { sub: decoded.sub, email: decoded.email, role: decoded.role };
  },

  verifyRefreshToken: (token: string): RefreshTokenPayload => {
    const decoded: unknown = jwt.verify(token, env.JWT_REFRESH_SECRET);

    if (
      !isRecord(decoded) ||
      typeof decoded.sub !== "string" ||
      typeof decoded.jti !== "string"
    ) {
      throw ApiError.unauthorized("Malformed refresh token");
    }

    return { sub: decoded.sub, jti: decoded.jti };
  },

  /**
   * Refresh tokens are stored as SHA-256 digests: the list is scanned on every
   * refresh, so a per-entry bcrypt comparison would be needlessly expensive.
   * The token itself is high-entropy, so a fast digest is sufficient here.
   */
  hashToken: (token: string): string =>
    crypto.createHash("sha256").update(token).digest("hex"),

  newTokenId: (): string => crypto.randomUUID(),

  /** Reads a token out of an `Authorization: Bearer <token>` header. */
  extractBearerToken: (header: string | undefined): string | null => {
    if (!header) return null;

    const [scheme, value] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !value) return null;

    return value.trim() || null;
  },

  /** Converts a "15m" / "7d" / "900" duration into milliseconds. */
  durationToMs: (value: string): number => {
    const match = /^(\d+)(ms|s|m|h|d|w|y)?$/.exec(value);

    if (!match) {
      throw ApiError.internal(`Invalid duration string: ${value}`);
    }

    return Number(match[1]) * DURATION_UNITS[match[2] ?? "s"];
  },
};
