import mongoose, { Schema } from "mongoose";
import type { INote, NoteEntityType } from "../types/note.types.ts";
import { NOTE_ENTITY_TYPES } from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const noteSchema = new Schema<INote>(
  {
    entityType: {
      type: String,
      enum: NOTE_ENTITY_TYPES,
      required: true,
      index: true,
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    entityName: { type: String, required: true, trim: true, maxlength: 200 },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
      index: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 5000 },
  },
  schemaUtils.baseOptions(),
);

// Detail pages read a single entity's notes, newest first.
noteSchema.index({ entityId: 1, createdAt: -1 });
noteSchema.index({ entityType: 1, createdAt: -1 });

export const NoteModel = mongoose.model<INote>("Note", noteSchema);

export const noteQueries = {
  findByEntity: (entityId: string) =>
    NoteModel.find({ entityId }).sort({ createdAt: -1 }),

  findByEntityType: (entityType: NoteEntityType) =>
    NoteModel.find({ entityType }).sort({ createdAt: -1 }),

  countForEntity: (entityId: string) => NoteModel.countDocuments({ entityId }),

  /** Cleanup hook for when a customer/lead/deal is deleted. */
  deleteForEntity: (entityId: string) => NoteModel.deleteMany({ entityId }),
};
