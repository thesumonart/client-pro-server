import type { Types } from "mongoose";
import type { AuthUser } from "../types/auth.types.ts";
import { ApiError } from "./ApiError.ts";
import { RECORD_WRITE_ALL_ROLES, RECORD_WRITE_OWN_ROLES } from "./constants.ts";

const canWriteAll = (actor: AuthUser): boolean =>
  (RECORD_WRITE_ALL_ROLES as readonly string[]).includes(actor.role);

const canWriteOwn = (actor: AuthUser): boolean =>
  (RECORD_WRITE_OWN_ROLES as readonly string[]).includes(actor.role);

/**
 * Ownership rules for CRM records (customers, leads, deals, tasks).
 *
 * Route-level `authorize(...)` keeps read-only roles out entirely; these helpers
 * apply the per-record half of the policy that a route guard cannot express.
 */
export const accessControl = {
  canWriteAll,
  canWriteOwn,

  /** True when the actor's writes are limited to records assigned to them. */
  isOwnershipScoped: (actor: AuthUser): boolean =>
    !canWriteAll(actor) && canWriteOwn(actor),

  /** Throws unless the actor may mutate a record with this assignee. */
  assertCanMutateRecord: (
    actor: AuthUser,
    assignedTo: Types.ObjectId | null,
    entityLabel = "record",
  ): void => {
    if (canWriteAll(actor)) return;

    if (canWriteOwn(actor)) {
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
  ): string | null => {
    if (canWriteAll(actor)) return requested ?? null;
    if (canWriteOwn(actor)) return actor.id;

    throw ApiError.forbidden(`Your role (${actor.role}) cannot create records`);
  },

  /**
   * Guards re-assignment: an ownership-scoped role may not hand a record to
   * someone else, which would otherwise let them write and then lose access.
   */
  assertCanAssignTo: (
    actor: AuthUser,
    requested: string | null | undefined,
  ): void => {
    if (canWriteAll(actor)) return;
    if (requested === undefined) return;

    if (requested !== actor.id) {
      throw ApiError.forbidden("You can only assign records to yourself");
    }
  },
};
