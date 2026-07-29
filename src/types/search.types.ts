import type { z } from "zod";
import type { SEARCH_TYPES } from "../utils/constants.ts";
import type { searchValidation } from "../validations/search.validation.ts";

export type SearchType = (typeof SEARCH_TYPES)[number];

/**
 * One palette row. Mirrors the `Result` shape the command palette already
 * builds client-side, minus `icon` — that stays a client concern, chosen from
 * `type`.
 */
export interface SearchResult {
  id: string;
  type: SearchType;
  /** Section heading, e.g. "Customers". */
  group: string;
  label: string;
  sub: string | null;
  href: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  /** Flat and ordered by type, the way the palette renders its sections. */
  results: SearchResult[];
  counts: Record<SearchType, number>;
}

export type SearchQuery = z.infer<typeof searchValidation.searchQuerySchema>;
