import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { folderService } from "../services/folder.service.ts";
import type { ListFolderQuery } from "../types/folder.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const folderController = {
  getFolders: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListFolderQuery>(req, "query");
    const { items, meta } = await folderService.listFolders(query);

    ApiResponse.ok(res, items, "Folders retrieved", meta);
  }),

  getFolderById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const folder = await folderService.getFolderById(id);

    ApiResponse.ok(res, folder, "Folder retrieved");
  }),
};
