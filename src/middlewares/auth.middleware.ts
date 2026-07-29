import type { RequestHandler } from "express";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  TeamMemberDocument,
  TeamRole,
} from "../types/team-member.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { cookieUtils } from "../utils/cookie.utils.ts";
import { tokenUtils } from "../utils/token.utils.ts";

export const toAuthUser = (member: TeamMemberDocument): AuthUser => ({
  id: member._id.toString(),
  name: member.name,
  email: member.email,
  role: member.role,
  status: member.status,
});

/**
 * Resolves the bearer/cookie token to a live TeamMember.
 * Returns null when no token was supplied; throws when one was supplied but is
 * unusable, so a bad token is never silently treated as anonymous.
 */
const resolveUser = async (
  authorization: string | undefined,
  cookieToken: string | undefined,
): Promise<AuthUser | null> => {
  const token = tokenUtils.extractBearerToken(authorization) ?? cookieToken;
  if (!token) return null;

  // JsonWebTokenError / TokenExpiredError are mapped to 401 by errorMiddleware.
  const payload = tokenUtils.verifyAccessToken(token);

  const member = await TeamMemberModel.findById(payload.sub);
  if (!member) {
    throw ApiError.unauthorized("This account no longer exists");
  }

  if (member.status !== "active") {
    throw ApiError.forbidden(`This account is ${member.status}`);
  }

  return toAuthUser(member);
};

export const authMiddleware = {
  /** Requires a valid access token; populates `req.user`. */
  protect: asyncHandler(async (req, _res, next) => {
    const user = await resolveUser(
      req.headers.authorization,
      cookieUtils.read(req, cookieUtils.ACCESS_COOKIE),
    );

    if (!user) {
      throw ApiError.unauthorized("Authentication required");
    }

    req.user = user;
    next();
  }),

  /**
   * Populates `req.user` when a token is present but allows anonymous requests
   * through. Used by POST /auth/register, which is public only while the
   * database holds zero team members (first-owner bootstrap).
   */
  optionalProtect: asyncHandler(async (req, _res, next) => {
    const user = await resolveUser(
      req.headers.authorization,
      cookieUtils.read(req, cookieUtils.ACCESS_COOKIE),
    );

    if (user) req.user = user;
    next();
  }),

  /** Restricts a route to the given roles. Must run after `protect`. */
  authorize:
    (...roles: TeamRole[]): RequestHandler =>
    (req, _res, next) => {
      if (!req.user) {
        next(ApiError.unauthorized("Authentication required"));
        return;
      }

      if (!roles.includes(req.user.role)) {
        next(
          ApiError.forbidden(
            `Your role (${req.user.role}) is not allowed to perform this action`,
          ),
        );
        return;
      }

      next();
    },
};

/** Narrows `req.user` for controllers mounted behind `authMiddleware.protect`. */
export const requireUser = (user: AuthUser | undefined): AuthUser => {
  if (!user) {
    throw ApiError.unauthorized("Authentication required");
  }
  return user;
};
