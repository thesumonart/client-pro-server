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
