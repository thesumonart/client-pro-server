import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { settingsService } from "../services/settings.service.ts";
import type { UpdateSettingsInput } from "../types/settings.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const settingsController = {
  getSettings: asyncHandler(async (_req, res) => {
    const settings = await settingsService.getOrCreateSettings();

    ApiResponse.ok(res, settings, "Settings retrieved");
  }),

  updateSettings: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<UpdateSettingsInput>(req, "body");
    const settings = await settingsService.updateSettings(payload);

    ApiResponse.ok(res, settings, "Settings updated");
  }),
};
