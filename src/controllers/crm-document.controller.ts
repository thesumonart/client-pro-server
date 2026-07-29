import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { crmDocumentService } from "../services/crm-document.service.ts";
import type {
  CreateDocumentInput,
  ListDocumentQuery,
  MoveDocumentInput,
  RenameDocumentInput,
  UpdateDocumentInput,
} from "../types/crm-document.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const crmDocumentController = {
  getDocuments: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListDocumentQuery>(req, "query");
    const { items, meta } = await crmDocumentService.listDocuments(
      query,
      requireUser(req.user),
    );

    ApiResponse.ok(res, items, "Documents retrieved", meta);
  }),

  getDocumentById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const document = await crmDocumentService.getDocumentById(id);

    ApiResponse.ok(res, document, "Document retrieved");
  }),

  createDocument: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<CreateDocumentInput>(req, "body");
    const document = await crmDocumentService.createDocument(
      payload,
      requireUser(req.user),
    );

    ApiResponse.created(res, document, "Document uploaded");
  }),

  updateDocument: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateDocumentInput>(req, "body");
    const document = await crmDocumentService.updateDocument(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, document, "Document updated");
  }),

  renameDocument: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<RenameDocumentInput>(req, "body");
    const document = await crmDocumentService.renameDocument(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, document, "Document renamed");
  }),

  moveDocument: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<MoveDocumentInput>(req, "body");
    const document = await crmDocumentService.moveDocument(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, document, "Document moved");
  }),

  toggleStar: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const document = await crmDocumentService.toggleStar(
      id,
      requireUser(req.user),
    );

    ApiResponse.ok(
      res,
      document,
      document.starred ? "Document starred" : "Document unstarred",
    );
  }),

  deleteDocument: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await crmDocumentService.deleteDocument(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Document deleted");
  }),
};
