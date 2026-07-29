import type { HydratedDocument } from "mongoose";
import type { z } from "zod";
import type { folderValidation } from "../validations/folder.validation.ts";

export interface IFolder {
  name: string;
  color: number;
  createdAt: Date;
  updatedAt: Date;
}

export type FolderDocument = HydratedDocument<IFolder>;

export type ListFolderQuery = z.infer<
  typeof folderValidation.listFolderQuerySchema
>;
