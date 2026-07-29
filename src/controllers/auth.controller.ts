import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { authService } from "../services/auth.service.ts";
import type {
  LoginInput,
  LogoutInput,
  RefreshInput,
  RegisterInput,
} from "../types/auth.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { cookieUtils } from "../utils/cookie.utils.ts";

export const authController = {
  register: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<RegisterInput>(req, "body");
    const member = await authService.register(payload, req.user ?? null);

    ApiResponse.created(res, member, "Team member registered");
  }),

  login: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<LoginInput>(req, "body");
    const session = await authService.login(payload);

    cookieUtils.setAuthCookies(res, session);

    // Tokens are also returned in the body: the Socket.io handshake needs the
    // access token, which an httpOnly cookie cannot expose to client JS.
    ApiResponse.ok(res, session, "Logged in");
  }),

  refresh: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<RefreshInput>(req, "body");
    const token =
      payload.refreshToken ?? cookieUtils.read(req, cookieUtils.REFRESH_COOKIE);

    if (!token) {
      throw ApiError.unauthorized("Refresh token is required");
    }

    const session = await authService.refresh(token);
    cookieUtils.setAuthCookies(res, session);

    ApiResponse.ok(res, session, "Session refreshed");
  }),

  logout: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<LogoutInput>(req, "body");
    const token =
      payload.refreshToken ?? cookieUtils.read(req, cookieUtils.REFRESH_COOKIE);

    await authService.logout(token, payload.allDevices, req.user ?? null);
    cookieUtils.clearAuthCookies(res);

    ApiResponse.ok(res, null, "Logged out");
  }),

  getMe: asyncHandler(async (req, res) => {
    const user = requireUser(req.user);
    const member = await authService.getMe(user.id);

    ApiResponse.ok(res, member, "Current user");
  }),
};
