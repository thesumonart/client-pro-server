import { CrmDocumentModel } from "../models/crm-document.model.ts";
import { folderQueries } from "../models/folder.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type { AuthUser } from "../types/auth.types.ts";
import type {
  CreateDocumentInput,
  CrmDocumentDocument,
  DocumentType,
  ListDocumentQuery,
  MoveDocumentInput,
  RenameDocumentInput,
  UpdateDocumentInput,
} from "../types/crm-document.types.ts";
import {
  accessControl,
  type RecordAccessPolicy,
} from "../utils/access.utils.ts";
import { ApiError } from "../utils/ApiError.ts";
import type { PaginationMeta } from "../utils/ApiResponse.ts";
import {
  DOCUMENT_EXTENSION_MAP,
  TASK_WRITE_ALL_ROLES,
  TASK_WRITE_OWN_ROLES,
} from "../utils/constants.ts";
import { queryParser } from "../utils/query.utils.ts";
import { entityRefService } from "./entity-ref.service.ts";

/** Documents share the task policy: support has full CRUD, sales-rep owns theirs. */
const DOCUMENT_POLICY: RecordAccessPolicy = {
  writeAll: TASK_WRITE_ALL_ROLES,
  writeOwn: TASK_WRITE_OWN_ROLES,
};

/** Response projection — mirrors the frontend's `CrmDocument` interface. */
export interface PublicCrmDocument {
  id: string;
  name: string;
  type: DocumentType;
  folderId: string | null;
  size: number;
  ownerId: string | null;
  sharedWith: string[];
  relatedTo: { type: string; id: string; name: string } | null;
  starred: boolean;
  storageKey: string | null;
  url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Mirrors the frontend's extToType so both sides classify files identically. */
const typeFromFilename = (filename: string): DocumentType => {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";

  return DOCUMENT_EXTENSION_MAP[extension] ?? "other";
};

const findOrFail = async (id: string): Promise<CrmDocumentDocument> => {
  const document = await CrmDocumentModel.findById(id);

  if (!document) {
    throw ApiError.notFound("Document not found");
  }

  return document;
};

const assertFolderExists = async (
  folderId: string | null | undefined,
): Promise<void> => {
  if (!folderId) return;

  const exists = await folderQueries.existsById(folderId);

  if (!exists) {
    throw ApiError.badRequest("Folder does not exist", [
      { path: "folderId", message: "must reference an existing folder" },
    ]);
  }
};

const assertMembersExist = async (
  memberIds: string[] | undefined,
): Promise<void> => {
  if (!memberIds || memberIds.length === 0) return;

  const unique = [...new Set(memberIds)];
  const found = await TeamMemberModel.countDocuments({ _id: { $in: unique } });

  if (found !== unique.length) {
    throw ApiError.badRequest("One or more recipients do not exist", [
      { path: "sharedWith", message: "must reference existing team members" },
    ]);
  }
};

export const crmDocumentService = {
  serialize: (document: CrmDocumentDocument): PublicCrmDocument => ({
    id: document._id.toString(),
    name: document.name,
    type: document.type,
    folderId: document.folderId ? document.folderId.toString() : null,
    size: document.size,
    ownerId: document.ownerId ? document.ownerId.toString() : null,
    sharedWith: document.sharedWith.map((member) => member.toString()),
    relatedTo: document.relatedTo
      ? {
          type: document.relatedTo.type,
          id: document.relatedTo.id.toString(),
          name: document.relatedTo.name,
        }
      : null,
    starred: document.starred,
    storageKey: document.storageKey,
    url: document.url,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  }),

  listDocuments: async (
    query: ListDocumentQuery,
    actor: AuthUser,
  ): Promise<{ items: PublicCrmDocument[]; meta: PaginationMeta }> => {
    const { page, limit, skip, sort } = queryParser.parseListQuery(
      query,
      "updatedAt",
    );

    const filter: Record<string, unknown> = {};

    if (query.type) filter.type = query.type;
    if (query.starred) filter.starred = query.starred === "true";
    if (query.ownerId) filter.ownerId = query.ownerId;
    if (query.relatedType) filter["relatedTo.type"] = query.relatedType;
    if (query.relatedId) filter["relatedTo.id"] = query.relatedId;

    if (query.folderId) {
      filter.folderId = query.folderId === "unfiled" ? null : query.folderId;
    }

    const conditions: Record<string, unknown>[] = [];

    if (query.mine === "true") {
      conditions.push({
        $or: [{ ownerId: actor.id }, { sharedWith: actor.id }],
      });
    }

    const search = queryParser.buildSearchFilter(query.search, [
      "name",
      "relatedTo.name",
    ]);
    if (search) conditions.push(search);

    if (conditions.length > 0) filter.$and = conditions;

    const [documents, total] = await Promise.all([
      CrmDocumentModel.find(filter).sort(sort).skip(skip).limit(limit),
      CrmDocumentModel.countDocuments(filter),
    ]);

    return {
      items: documents.map(crmDocumentService.serialize),
      meta: queryParser.buildPaginationMeta(page, limit, total),
    };
  },

  getDocumentById: async (id: string): Promise<PublicCrmDocument> =>
    crmDocumentService.serialize(await findOrFail(id)),

  /**
   * Metadata-only upload. No file bytes are accepted; `storageKey` and `url`
   * stay null until an object store is wired in.
   */
  createDocument: async (
    payload: CreateDocumentInput,
    actor: AuthUser,
  ): Promise<PublicCrmDocument> => {
    await assertFolderExists(payload.folderId);
    await assertMembersExist(payload.sharedWith);

    const relatedTo = await entityRefService.resolveOptional(payload.relatedTo);

    const document = await CrmDocumentModel.create({
      ...payload,
      type: payload.type ?? typeFromFilename(payload.name),
      relatedTo,
      // Ownership comes from the session, never the payload.
      ownerId: actor.id,
      storageKey: null,
      url: null,
    });

    return crmDocumentService.serialize(document);
  },

  updateDocument: async (
    id: string,
    payload: UpdateDocumentInput,
    actor: AuthUser,
  ): Promise<PublicCrmDocument> => {
    const document = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      document.ownerId,
      "document",
      DOCUMENT_POLICY,
    );
    await assertFolderExists(payload.folderId);
    await assertMembersExist(payload.sharedWith);

    const { relatedTo, ...rest } = payload;
    document.set(rest);

    if (relatedTo !== undefined) {
      document.relatedTo = await entityRefService.resolveOptional(relatedTo);
    }

    await document.save();

    return crmDocumentService.serialize(document);
  },

  renameDocument: async (
    id: string,
    { name }: RenameDocumentInput,
    actor: AuthUser,
  ): Promise<PublicCrmDocument> => {
    const document = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      document.ownerId,
      "document",
      DOCUMENT_POLICY,
    );

    document.name = name;
    await document.save();

    return crmDocumentService.serialize(document);
  },

  moveDocument: async (
    id: string,
    { folderId }: MoveDocumentInput,
    actor: AuthUser,
  ): Promise<PublicCrmDocument> => {
    const document = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      document.ownerId,
      "document",
      DOCUMENT_POLICY,
    );
    await assertFolderExists(folderId);

    // `set` so Mongoose casts the incoming string id to an ObjectId.
    document.set("folderId", folderId);
    await document.save();

    return crmDocumentService.serialize(document);
  },

  /** Star toggle, mirroring the documents page's star/unstar action. */
  toggleStar: async (
    id: string,
    actor: AuthUser,
  ): Promise<PublicCrmDocument> => {
    const document = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      document.ownerId,
      "document",
      DOCUMENT_POLICY,
    );

    document.starred = !document.starred;
    await document.save();

    return crmDocumentService.serialize(document);
  },

  deleteDocument: async (id: string, actor: AuthUser): Promise<void> => {
    const document = await findOrFail(id);

    accessControl.assertCanMutateRecord(
      actor,
      document.ownerId,
      "document",
      DOCUMENT_POLICY,
    );

    await document.deleteOne();
  },
};
