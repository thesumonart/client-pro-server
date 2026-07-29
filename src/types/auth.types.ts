import type { z } from "zod";
import type { authValidation } from "../validations/auth.validation.ts";
import type { TeamRole, TeamStatus } from "./team-member.types.ts";

export type RegisterInput = z.infer<typeof authValidation.registerSchema>;
export type LoginInput = z.infer<typeof authValidation.loginSchema>;
export type RefreshInput = z.infer<typeof authValidation.refreshSchema>;
export type LogoutInput = z.infer<typeof authValidation.logoutSchema>;

/** Claims carried by the short-lived access token. */
export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: TeamRole;
}

/** Claims carried by the long-lived refresh token. */
export interface RefreshTokenPayload {
  sub: string;
  jti: string;
}

/** The authenticated principal attached to `req.user` by authMiddleware.protect. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  status: TeamStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult extends AuthTokens {
  user: Record<string, unknown>;
}
