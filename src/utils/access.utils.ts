import type { Types } from "mongoose";
import type { AuthUser } from "../types/auth.types.ts";
import { ApiError } from "./ApiError.ts";
import { RECORD_WRITE_ALL_ROLES, RECORD_WRITE_OWN_ROLES } from "./constants.ts";

/**
 * Which roles may write every record of an entity, and which are limited to
 * records assigned to them. Entities differ: support is read-only on
 * customers/leads/deals but has full CRUD on tasks, notes and documents.
 */
export interface RecordAccessPolicy {
  writeAll: readonly string[];
  writeOwn: readonly string[];
}

/** Customers, leads and deals. */
export const DEFAULT_RECORD_POLICY: RecordAccessPolicy = {
  writeAll: RECORD_WRITE_ALL_ROLES,
  writeOwn: RECORD_WRITE_OWN_ROLES,
};

const canWriteAll = (
  actor: AuthUser,
  policy: RecordAccessPolicy = DEFAULT_RECORD_POLICY,
): boolean => policy.writeAll.includes(actor.role);

const canWriteOwn = (
  actor: AuthUser,
  policy: RecordAccessPolicy = DEFAULT_RECORD_POLICY,
): boolean => policy.writeOwn.includes(actor.role);

/**
 * Ownership rules for CRM records.
 *
 * Route-level `authorize(...)` keeps read-only roles out entirely; these helpers
 * apply the per-record half of the policy that a route guard cannot express.
 */
export const accessControl = {
  canWriteAll,
  canWriteOwn,

  /** True when the actor's writes are limited to records assigned to them. */
  isOwnershipScoped: (
    actor: AuthUser,
    policy: RecordAccessPolicy = DEFAULT_RECORD_POLICY,
  ): boolean => !canWriteAll(actor, policy) && canWriteOwn(actor, policy),

  /** Throws unless the actor may mutate a record with this assignee. */
  assertCanMutateRecord: (
    actor: AuthUser,
    assignedTo: Types.ObjectId | null,
    entityLabel = "record",
    policy: RecordAccessPolicy = DEFAULT_RECORD_POLICY,
  ): void => {
    if (canWriteAll(actor, policy)) return;

    if (canWriteOwn(actor, policy)) {
      if (assignedTo && assignedTo.toString() === actor.id) return;

      throw ApiError.forbidden(
        `You can only modify ${entityLabel}s assigned to you`,
      );
    }

    throw ApiError.forbidden(
      `Your role (${actor.role}) cannot modify ${entityLabel}s`,
    );
  },

  /**
   * Resolves the assignee for a new record. Ownership-scoped roles always get
   * themselves, so a sales-rep cannot create work under someone else's name.
   */
  resolveAssignee: (
    actor: AuthUser,
    requested: string | null | undefined,
    policy: RecordAccessPolicy = DEFAULT_RECORD_POLICY,
  ): string | null => {
    if (canWriteAll(actor, policy)) return requested ?? null;
    if (canWriteOwn(actor, policy)) return actor.id;

    throw ApiError.forbidden(`Your role (${actor.role}) cannot create records`);
  },

  /**
   * Guards re-assignment: an ownership-scoped role may not hand a record to
   * someone else, which would otherwise let them write and then lose access.
   */
  assertCanAssignTo: (
    actor: AuthUser,
    requested: string | null | undefined,
    policy: RecordAccessPolicy = DEFAULT_RECORD_POLICY,
  ): void => {
    if (canWriteAll(actor, policy)) return;
    if (requested === undefined) return;

    if (requested !== actor.id) {
      throw ApiError.forbidden("You can only assign records to yourself");
    }
  },
};
