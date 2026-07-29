import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type { NOTE_ENTITY_TYPES } from "../utils/constants.ts";
import type { noteValidation } from "../validations/note.validation.ts";

export type NoteEntityType = (typeof NOTE_ENTITY_TYPES)[number];

export interface INote {
  /**
   * Polymorphic target, kept as the flat `entityType`/`entityId` pair the
   * frontend's `Note` interface expects rather than a nested ref object.
   * `entityName` is the denormalised display name, resolved by the same
   * switch-based lookup used for every other polymorphic pointer.
   */
  entityType: NoteEntityType;
  entityId: Types.ObjectId;
  entityName: string;
  authorId: Types.ObjectId | null;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NoteDocument = HydratedDocument<INote>;

export type CreateNoteInput = z.infer<typeof noteValidation.createNoteSchema>;
export type ListNoteQuery = z.infer<typeof noteValidation.listNoteQuerySchema>;
