import { PAGINATION } from "./constants.ts";
import type { PaginationMeta } from "./ApiResponse.ts";

export type SortDirection = 1 | -1;

export interface ListQueryLike {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ParsedListQuery {
  page: number;
  limit: number;
  skip: number;
  sort: Record<string, SortDirection>;
}

export const queryParser = {
  /** Normalises page/limit/sort into values safe to hand to Mongoose. */
  parseListQuery: (
    query: ListQueryLike,
    defaultSortBy = "createdAt",
  ): ParsedListQuery => {
    const page = Math.max(1, query.page ?? PAGINATION.defaultPage);
    const limit = Math.min(
      PAGINATION.maxLimit,
      Math.max(1, query.limit ?? PAGINATION.defaultLimit),
    );

    return {
      page,
      limit,
      skip: (page - 1) * limit,
      sort: {
        [query.sortBy ?? defaultSortBy]: query.sortOrder === "asc" ? 1 : -1,
      },
    };
  },

  buildPaginationMeta: (
    page: number,
    limit: number,
    total: number,
  ): PaginationMeta => {
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

    return {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  },

  /** Escapes user input before embedding it in a RegExp search filter. */
  escapeRegex: (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),

  /** Case-insensitive "contains" filter across the given fields. */
  buildSearchFilter: (
    search: string | undefined,
    fields: readonly string[],
  ): Record<string, unknown> | null => {
    const term = search?.trim();
    if (!term) return null;

    const pattern = new RegExp(queryParser.escapeRegex(term), "i");
    return { $or: fields.map((field) => ({ [field]: pattern })) };
  },
};
