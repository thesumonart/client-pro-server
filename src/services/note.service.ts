import { customerQueries } from "../models/customer.model.ts";
import { NoteModel } from "../models/note.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  CreateNoteInput,
  ListNoteQuery,
  NoteDocument,
  NoteEntityType,
} from "../types/note.types.ts";
import {
  accessControl,
  type RecordAccessPolicy,
} from "../utils/access.utils.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import {
  TASK_WRITE_ALL_ROLES,
  TASK_WRITE_OWN_ROLES,
} from "../utils/constants.ts";
import { queryParser } from "../utils/query.utils.ts";
import { activityService } from "./activity.service.ts";
import { entityRefService } from "./entity-ref.service.ts";

/** Notes share the task policy: support has full CRUD, sales-rep owns theirs. */
const NOTE_POLICY: RecordAccessPolicy = {
  writeAll: TASK_WRITE_ALL_ROLES,
  writeOwn: TASK_WRITE_OWN_ROLES,
};

/** Response projection — mirrors the frontend's `Note` interface. */
export interface PublicNote {
  id: string;
  entityType: NoteEntityType;
  entityId: string;
  entityName: string;
  authorId: string | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const findOrFail = async (id: string): Promise<NoteDocument> => {
  const note = await NoteModel.findById(id);

  if (!note) {
    throw ApiError.notFound("Note not found");
  }

  return note;
};

export const noteService = {
  serialize: (note: NoteDocument): PublicNote => ({
    id: note._id.toString(),
    entityType: note.entityType,
    entityId: note.entityId.toString(),
    entityName: note.entityName,
    authorId: note.authorId ? note.authorId.toString() : null,
    body: note.body,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }),

  listNotes: async (
    query: ListNoteQuery,
  ): Promise<{ items: PublicNote[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "createdAt",
    );

    const filter: Record<string, unknown> = {};

    if (query.entityType) filter.entityType = query.entityType;
    if (query.entityId) filter.entityId = query.entityId;
    if (query.authorId) filter.authorId = query.authorId;

    const search = queryParser.buildSearchFilter(query.search, [
      "body",
      "entityName",
    ]);
    if (search) Object.assign(filter, search);

    const [notes, total] = await Promise.all([
      NoteModel.find(filter).sort(sort).skip(skip).limit(limit),
      NoteModel.countDocuments(filter),
    ]);

    return {
      items: notes.map(noteService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getNoteById: async (id: string): Promise<PublicNote> =>
    noteService.serialize(await findOrFail(id)),

  createNote: async (
    payload: CreateNoteInput,
    actor: AuthUser,
  ): Promise<PublicNote> => {
    // Switch-based lookup: proves the target exists and captures its name.
    const entity = await entityRefService.resolve({
      type: payload.entityType,
      id: payload.entityId,
    });

    const note = await NoteModel.create({
      entityType: payload.entityType,
      entityId: entity.id,
      entityName: entity.name,
      body: payload.body,
      // Authorship comes from the session, so a note can never be attributed
      // to someone else.
      authorId: actor.id,
    });

    // `customer.note` is the only note-related type in the frontend's
    // ActivityType union — lead and deal notes have no equivalent to log.
    if (payload.entityType === "customer") {
      await activityService.log({
        type: "customer.note",
        actorId: actor.id,
        title: `Note added to ${entity.name}`,
        description: note.body.slice(0, 140),
        entity: { type: "customer", id: entity.id, name: entity.name },
      });

      // Mirrors the frontend, which bumps the customer's last-touched stamp
      // whenever a note is filed against it.
      await customerQueries.touchLastActivity(entity.id.toString());
    }

    return noteService.serialize(note);
  },

  deleteNote: async (id: string, actor: AuthUser): Promise<void> => {
    const note = await findOrFail(id);

    // Ownership for a note is authorship.
    accessControl.assertCanMutateRecord(
      actor,
      note.authorId,
      "note",
      NOTE_POLICY,
    );

    await note.deleteOne();
  },
};
