import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { searchService } from "../services/search.service.ts";
import type { SearchQuery } from "../types/search.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const searchController = {
  search: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<SearchQuery>(req, "query");
    const result = await searchService.search(query);

    ApiResponse.ok(res, result, "Search completed");
  }),
};
