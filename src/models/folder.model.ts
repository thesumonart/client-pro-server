import mongoose, { Schema } from "mongoose";
import type { IFolder } from "../types/folder.types.ts";
import { FOLDER_COLOR_COUNT } from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const folderSchema = new Schema<IFolder>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 120,
    },
    color: {
      type: Number,
      required: true,
      min: 0,
      max: FOLDER_COLOR_COUNT - 1,
      default: 0,
    },
  },
  schemaUtils.baseOptions(),
);

export const FolderModel = mongoose.model<IFolder>("Folder", folderSchema);

export const folderQueries = {
  findAllSorted: () => FolderModel.find({}).sort({ name: 1 }),

  existsById: (id: string) => FolderModel.exists({ _id: id }),
};
