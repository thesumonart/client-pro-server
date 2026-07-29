import mongoose, { Schema } from "mongoose";
import type {
  DocumentRelatedRef,
  ICrmDocument,
} from "../types/crm-document.types.ts";
import { DOCUMENT_RELATED_TYPES, DOCUMENT_TYPES } from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const relatedToSchema = new Schema<DocumentRelatedRef>(
  {
    type: { type: String, enum: DOCUMENT_RELATED_TYPES, required: true },
    id: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
  },
  { _id: false },
);

const crmDocumentSchema = new Schema<ICrmDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 255 },
    type: {
      type: String,
      enum: DOCUMENT_TYPES,
      required: true,
      default: "other",
      index: true,
    },
    folderId: {
      type: Schema.Types.ObjectId,
      ref: "Folder",
      default: null,
      index: true,
    },
    size: { type: Number, required: true, default: 0, min: 0 },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
      index: true,
    },
    sharedWith: {
      type: [{ type: Schema.Types.ObjectId, ref: "TeamMember" }],
      default: [],
      index: true,
    },
    relatedTo: { type: relatedToSchema, default: null },
    starred: { type: Boolean, required: true, default: false, index: true },

    // Placeholders for a future S3/object-store swap. Not client-settable.
    storageKey: { type: String, default: null },
    url: { type: String, default: null },
  },
  schemaUtils.baseOptions(),
);

crmDocumentSchema.index({ folderId: 1, updatedAt: -1 });
crmDocumentSchema.index({ starred: 1, updatedAt: -1 });
crmDocumentSchema.index({ "relatedTo.id": 1 });

export const CrmDocumentModel = mongoose.model<ICrmDocument>(
  "CrmDocument",
  crmDocumentSchema,
);

export const crmDocumentQueries = {
  findByFolder: (folderId: string) =>
    CrmDocumentModel.find({ folderId }).sort({ updatedAt: -1 }),

  findStarred: () =>
    CrmDocumentModel.find({ starred: true }).sort({ updatedAt: -1 }),

  findByRelatedEntity: (entityId: string) =>
    CrmDocumentModel.find({ "relatedTo.id": entityId }).sort({ updatedAt: -1 }),

  countInFolder: (folderId: string) =>
    CrmDocumentModel.countDocuments({ folderId }),

  /** Detaches documents from a folder rather than deleting them with it. */
  unfileFolder: (folderId: string) =>
    CrmDocumentModel.updateMany({ folderId }, { $set: { folderId: null } }),
};
