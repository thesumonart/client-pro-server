import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type { LEAD_SOURCES, LEAD_STAGES } from "../utils/constants.ts";
import type { leadValidation } from "../validations/lead.validation.ts";

export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadSource = (typeof LEAD_SOURCES)[number];

export interface ILead {
  name: string;
  company: string;
  email: string;
  phone: string;
  stage: LeadStage;
  source: LeadSource;
  value: number;
  assignedTo: Types.ObjectId | null;
  tags: string[];
  avatarColor: number;
  notes: string | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadDocument = HydratedDocument<ILead>;

export type CreateLeadInput = z.infer<typeof leadValidation.createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof leadValidation.updateLeadSchema>;
export type MoveStageInput = z.infer<typeof leadValidation.moveStageSchema>;
export type ConvertLeadInput = z.infer<typeof leadValidation.convertLeadSchema>;
export type ListLeadQuery = z.infer<typeof leadValidation.listLeadQuerySchema>;
export type BulkArchiveLeadInput = z.infer<
  typeof leadValidation.bulkArchiveSchema
>;
