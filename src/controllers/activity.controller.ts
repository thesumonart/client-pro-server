import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { activityService } from "../services/activity.service.ts";
import type { ListActivityQuery } from "../types/activity.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const activityController = {
  getActivities: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListActivityQuery>(req, "query");
    const { items, meta } = await activityService.listActivities(query);

    ApiResponse.ok(res, items, "Activities retrieved", meta);
  }),

  getActivityById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const activity = await activityService.getActivityById(id);

    ApiResponse.ok(res, activity, "Activity retrieved");
  }),
};
