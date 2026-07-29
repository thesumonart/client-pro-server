import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { noteService } from "../services/note.service.ts";
import type { CreateNoteInput, ListNoteQuery } from "../types/note.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const noteController = {
  getNotes: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListNoteQuery>(req, "query");
    const { items, meta } = await noteService.listNotes(query);

    ApiResponse.ok(res, items, "Notes retrieved", meta);
  }),

  getNoteById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const note = await noteService.getNoteById(id);

    ApiResponse.ok(res, note, "Note retrieved");
  }),

  createNote: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<CreateNoteInput>(req, "body");
    const note = await noteService.createNote(payload, requireUser(req.user));

    ApiResponse.created(res, note, "Note added");
  }),

  deleteNote: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await noteService.deleteNote(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Note deleted");
  }),
};
