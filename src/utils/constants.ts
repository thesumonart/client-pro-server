/** Shared domain constants. Mirrors the unions in the frontend's src/lib/types.ts. */

export const TEAM_ROLES = [
  "owner",
  "admin",
  "manager",
  "sales-rep",
  "support",
  "viewer",
] as const;

export const TEAM_STATUSES = ["active", "invited", "suspended"] as const;

/** Roles allowed to manage team members and settings. */
export const TEAM_ADMIN_ROLES = ["owner", "admin"] as const;

/**
 * CRM record access (customers / leads / deals / tasks).
 * `WRITE_ALL` may mutate any record; `WRITE_OWN` only records assigned to them
 * and always create records assigned to themselves. Everyone else is read-only.
 */
export const RECORD_WRITE_ALL_ROLES = ["owner", "admin", "manager"] as const;
export const RECORD_WRITE_OWN_ROLES = ["sales-rep"] as const;

/** Union used by route-level authorize() guards on CRM record mutations. */
export const RECORD_WRITE_ROLES = [
  ...RECORD_WRITE_ALL_ROLES,
  ...RECORD_WRITE_OWN_ROLES,
] as const;

export const CUSTOMER_STATUSES = [
  "active",
  "inactive",
  "lead",
  "churned",
  "prospect",
] as const;

export const LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

export const LEAD_SOURCES = [
  "website",
  "referral",
  "social",
  "email",
  "event",
  "cold-call",
  "ads",
] as const;

export const DEAL_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;

/**
 * Win probability is derived from the stage, server-side, always. It is never
 * read from the request body — a client could otherwise inflate the weighted
 * pipeline figure the dashboard reports.
 */
export const DEAL_STAGE_PROBABILITY: Record<
  (typeof DEAL_STAGES)[number],
  number
> = {
  new: 10,
  contacted: 25,
  qualified: 45,
  proposal: 60,
  negotiation: 80,
  won: 100,
  lost: 0,
};

/** The frontend avatar palette has 5 entries (AVATAR_COLORS in constants.ts). */
export const AVATAR_COLOR_COUNT = 5;

/** Maximum concurrent refresh sessions retained per team member. */
export const MAX_ACTIVE_SESSIONS = 5;

export const BCRYPT_COST = 12;

export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 20,
  maxLimit: 100,
} as const;

export const ACTIVITY_TYPES = [
  "customer.created",
  "customer.updated",
  "customer.note",
  "deal.created",
  "deal.won",
  "deal.stage",
  "lead.created",
  "lead.converted",
  "task.created",
  "task.completed",
  "email.sent",
  "call.logged",
  "meeting.scheduled",
] as const;

/** Entity kinds an activity can point at (polymorphic, resolved in services). */
export const ACTIVITY_ENTITY_TYPES = [
  "customer",
  "deal",
  "lead",
  "task",
] as const;
