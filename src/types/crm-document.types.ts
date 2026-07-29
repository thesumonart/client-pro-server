import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type {
  DOCUMENT_RELATED_TYPES,
  DOCUMENT_TYPES,
} from "../utils/constants.ts";
import type { crmDocumentValidation } from "../validations/crm-document.validation.ts";

export type DocumentType = (typeof DOCUMENT_TYPES)[number];
export type DocumentRelatedType = (typeof DOCUMENT_RELATED_TYPES)[number];

/** Polymorphic pointer, resolved via a switch in the service layer. */
export interface DocumentRelatedRef {
  type: DocumentRelatedType;
  id: Types.ObjectId;
  name: string;
}

export interface ICrmDocument {
  name: string;
  type: DocumentType;
  folderId: Types.ObjectId | null;
  /** Bytes. Reported by the client in v1; authoritative once bytes are stored. */
  size: number;
  ownerId: Types.ObjectId | null;
  sharedWith: Types.ObjectId[];
  relatedTo: DocumentRelatedRef | null;
  starred: boolean;
  /**
   * Reserved for a future object-store swap. v1 records metadata only, so both
   * stay null — no route accepts them from a client.
   */
  storageKey: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type CrmDocumentDocument = HydratedDocument<ICrmDocument>;

export type CreateDocumentInput = z.infer<
  typeof crmDocumentValidation.createDocumentSchema
>;
export type UpdateDocumentInput = z.infer<
  typeof crmDocumentValidation.updateDocumentSchema
>;
export type RenameDocumentInput = z.infer<
  typeof crmDocumentValidation.renameSchema
>;
export type MoveDocumentInput = z.infer<
  typeof crmDocumentValidation.moveSchema
>;
export type ListDocumentQuery = z.infer<
  typeof crmDocumentValidation.listDocumentQuerySchema
>;
