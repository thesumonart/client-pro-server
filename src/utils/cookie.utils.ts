import type { CookieOptions, Request, Response } from "express";
import { env } from "../config/env.ts";
import type { AuthTokens } from "../types/auth.types.ts";
import { tokenUtils } from "./token.utils.ts";

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

/** Refresh cookie is scoped to the auth routes that actually need it. */
const REFRESH_PATH = "/api/v1/auth";

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  // Cross-site cookies require SameSite=None in production; localhost:3000 and
  // localhost:5000 are same-site in development, where Lax is enough.
  sameSite: env.isProduction ? "none" : "lax",
};

export const cookieUtils = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,

  setAuthCookies: (res: Response, tokens: AuthTokens): void => {
    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...baseOptions,
      path: "/",
      maxAge: tokenUtils.durationToMs(env.JWT_ACCESS_EXPIRES),
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...baseOptions,
      path: REFRESH_PATH,
      maxAge: tokenUtils.durationToMs(env.JWT_REFRESH_EXPIRES),
    });
  },

  clearAuthCookies: (res: Response): void => {
    res.clearCookie(ACCESS_COOKIE, { ...baseOptions, path: "/" });
    res.clearCookie(REFRESH_COOKIE, { ...baseOptions, path: REFRESH_PATH });
  },

  /**
   * Typed cookie read. `req.cookies` is `Record<string, any>` in the
   * cookie-parser types, so it is narrowed here rather than at each call site.
   */
  read: (req: Request, name: string): string | undefined => {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    const value = cookies?.[name];

    return typeof value === "string" && value.length > 0 ? value : undefined;
  },
};
