import { CrmDocumentModel } from "../models/crm-document.model.ts";
import { CustomerModel } from "../models/customer.model.ts";
import { DealModel } from "../models/deal.model.ts";
import { LeadModel } from "../models/lead.model.ts";
import { TaskModel } from "../models/task.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type {
  SearchQuery,
  SearchResponse,
  SearchResult,
  SearchType,
} from "../types/search.types.ts";
import {
  SEARCH_DEFAULT_LIMITS,
  SEARCH_GROUP_LABELS,
  SEARCH_TYPES,
} from "../utils/constants.ts";
import { queryParser } from "../utils/query.utils.ts";

const group = (type: SearchType): string => SEARCH_GROUP_LABELS[type];

/** Parses `?types=customer,deal` into a validated subset. */
const resolveTypes = (types: string | undefined): SearchType[] => {
  if (!types) return [...SEARCH_TYPES];

  const requested = new Set(
    types
      .split(",")
      .map((type) => type.trim().toLowerCase())
      .filter((type) => type.length > 0),
  );

  const selected = SEARCH_TYPES.filter((type) => requested.has(type));

  return selected.length > 0 ? [...selected] : [...SEARCH_TYPES];
};

/**
 * Cross-collection lookup for the command palette.
 *
 * Every branch runs one indexed find with an escaped, case-insensitive regex,
 * capped per type, and they all run concurrently — a palette keystroke should
 * cost one round trip, not six sequential ones.
 */
export const searchService = {
  search: async (query: SearchQuery): Promise<SearchResponse> => {
    const term = query.q.trim();
    const pattern = new RegExp(queryParser.escapeRegex(term), "i");
    const types = resolveTypes(query.types);
    const includeArchived = query.includeArchived === "true";

    // Archived records stay out of search unless asked for: they are hidden
    // everywhere else in the UI, so surfacing them here would be surprising.
    const notArchived = includeArchived ? {} : { archived: false };

    const limitFor = (type: SearchType): number =>
      query.limit ?? SEARCH_DEFAULT_LIMITS[type];

    const wanted = (type: SearchType): boolean => types.includes(type);

    const [customers, leads, deals, tasks, documents, team] = await Promise.all(
      [
        wanted("customer")
          ? CustomerModel.find({
              ...notArchived,
              $or: [
                { name: pattern },
                { company: pattern },
                { email: pattern },
              ],
            })
              .select("name company")
              .limit(limitFor("customer"))
          : [],
        wanted("lead")
          ? LeadModel.find({
              ...notArchived,
              $or: [
                { name: pattern },
                { company: pattern },
                { email: pattern },
              ],
            })
              .select("name company")
              .limit(limitFor("lead"))
          : [],
        wanted("deal")
          ? DealModel.find({
              ...notArchived,
              $or: [
                { title: pattern },
                { customerName: pattern },
                { company: pattern },
              ],
            })
              .select("title company")
              .limit(limitFor("deal"))
          : [],
        wanted("task")
          ? TaskModel.find({ ...notArchived, title: pattern })
              .select("title status")
              .limit(limitFor("task"))
          : [],
        wanted("document")
          ? CrmDocumentModel.find({ name: pattern })
              .select("name type")
              .limit(limitFor("document"))
          : [],
        wanted("team")
          ? TeamMemberModel.find({
              $or: [
                { name: pattern },
                { email: pattern },
                { jobTitle: pattern },
              ],
            })
              .select("name jobTitle")
              .limit(limitFor("team"))
          : [],
      ],
    );

    // Ordered to match the sections the palette renders.
    const results: SearchResult[] = [
      ...customers.map((customer) => ({
        id: customer._id.toString(),
        type: "customer" as const,
        group: group("customer"),
        label: customer.name,
        sub: customer.company,
        href: `/customers/${customer._id.toString()}`,
      })),
      ...leads.map((lead) => ({
        id: lead._id.toString(),
        type: "lead" as const,
        group: group("lead"),
        label: lead.name,
        sub: lead.company,
        href: "/leads",
      })),
      ...deals.map((deal) => ({
        id: deal._id.toString(),
        type: "deal" as const,
        group: group("deal"),
        label: deal.title,
        sub: deal.company || null,
        href: "/deals",
      })),
      ...tasks.map((task) => ({
        id: task._id.toString(),
        type: "task" as const,
        group: group("task"),
        label: task.title,
        sub: task.status,
        href: "/tasks",
      })),
      ...documents.map((document) => ({
        id: document._id.toString(),
        type: "document" as const,
        group: group("document"),
        label: document.name,
        sub: document.type,
        href: "/documents",
      })),
      ...team.map((member) => ({
        id: member._id.toString(),
        type: "team" as const,
        group: group("team"),
        label: member.name,
        sub: member.jobTitle || null,
        href: `/team/${member._id.toString()}`,
      })),
    ];

    const counts = SEARCH_TYPES.reduce<Record<SearchType, number>>(
      (accumulator, type) => {
        accumulator[type] = results.filter(
          (result) => result.type === type,
        ).length;
        return accumulator;
      },
      { customer: 0, lead: 0, deal: 0, task: 0, document: 0, team: 0 },
    );

    return { query: term, total: results.length, results, counts };
  },
};
