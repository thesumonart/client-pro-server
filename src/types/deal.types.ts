import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type { DEAL_STAGES } from "../utils/constants.ts";
import type { dealValidation } from "../validations/deal.validation.ts";

export type DealStage = (typeof DEAL_STAGES)[number];

export interface IDeal {
  title: string;
  customerId: Types.ObjectId | null;
  /** Denormalised from the customer so the board renders without a join. */
  customerName: string;
  company: string;
  value: number;
  stage: DealStage;
  /** 0-100, always derived from `stage`. Never client-supplied. */
  probability: number;
  closingDate: Date;
  assignedTo: Types.ObjectId | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type DealDocument = HydratedDocument<IDeal>;

export type CreateDealInput = z.infer<typeof dealValidation.createDealSchema>;
export type UpdateDealInput = z.infer<typeof dealValidation.updateDealSchema>;
export type MoveDealStageInput = z.infer<typeof dealValidation.moveStageSchema>;
export type ListDealQuery = z.infer<typeof dealValidation.listDealQuerySchema>;
export type BulkArchiveDealInput = z.infer<
  typeof dealValidation.bulkArchiveSchema
>;
