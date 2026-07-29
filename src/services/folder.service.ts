import { Types } from "mongoose";
import { CrmDocumentModel } from "../models/crm-document.model.ts";
import { FolderModel } from "../models/folder.model.ts";
import type { FolderDocument, ListFolderQuery } from "../types/folder.types.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import { queryParser } from "../utils/query.utils.ts";

/** Response projection — mirrors the frontend's `Folder` interface. */
export interface PublicFolder {
  id: string;
  name: string;
  color: number;
  /** Convenience count for the sidebar; not part of the frontend interface. */
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const serialize = (
  folder: FolderDocument,
  documentCount: number,
): PublicFolder => ({
  id: folder._id.toString(),
  name: folder.name,
  color: folder.color,
  documentCount,
  createdAt: folder.createdAt,
  updatedAt: folder.updatedAt,
});

/** One grouped count for the whole page instead of a query per folder. */
const countDocumentsByFolder = async (
  folderIds: string[],
): Promise<Map<string, number>> => {
  if (folderIds.length === 0) return new Map();

  // Aggregation pipelines bypass Mongoose casting, so ids must be converted
  // explicitly — a string `folderId` here would match nothing at all.
  const counts = await CrmDocumentModel.aggregate<{
    _id: Types.ObjectId;
    count: number;
  }>([
    {
      $match: {
        folderId: { $in: folderIds.map((id) => new Types.ObjectId(id)) },
      },
    },
    { $group: { _id: "$folderId", count: { $sum: 1 } } },
  ]);

  return new Map(counts.map((row) => [String(row._id), row.count]));
};

/** Read-only: folders are provisioned by the seed script, not the API. */
export const folderService = {
  listFolders: async (
    query: ListFolderQuery,
  ): Promise<{ items: PublicFolder[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "name",
    );

    const filter: Record<string, unknown> = {};

    const search = queryParser.buildSearchFilter(query.search, ["name"]);
    if (search) Object.assign(filter, search);

    const [folders, total] = await Promise.all([
      FolderModel.find(filter).sort(sort).skip(skip).limit(limit),
      FolderModel.countDocuments(filter),
    ]);

    const counts = await countDocumentsByFolder(
      folders.map((folder) => folder._id.toString()),
    );

    return {
      items: folders.map((folder) =>
        serialize(folder, counts.get(folder._id.toString()) ?? 0),
      ),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getFolderById: async (id: string): Promise<PublicFolder> => {
    const folder = await FolderModel.findById(id);

    if (!folder) {
      throw ApiError.notFound("Folder not found");
    }

    const documentCount = await CrmDocumentModel.countDocuments({
      folderId: folder._id,
    });

    return serialize(folder, documentCount);
  },
};
