import mongoose, { Schema } from "mongoose";
import type { DealStage, IDeal } from "../types/deal.types.ts";
import { DEAL_STAGES } from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const dealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    customerName: { type: String, default: "", trim: true, maxlength: 150 },
    company: { type: String, default: "", trim: true, maxlength: 150 },
    value: { type: Number, required: true, default: 0, min: 0 },
    stage: {
      type: String,
      enum: DEAL_STAGES,
      required: true,
      default: "new",
      index: true,
    },
    probability: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 10,
    },
    closingDate: { type: Date, required: true },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
      index: true,
    },
    archived: { type: Boolean, required: true, default: false, index: true },
  },
  schemaUtils.baseOptions(),
);

dealSchema.index({ archived: 1, createdAt: -1 });
// Kanban board: one query per stage column.
dealSchema.index({ archived: 1, stage: 1, createdAt: -1 });
dealSchema.index({ assignedTo: 1, stage: 1, archived: 1 });
dealSchema.index({ closingDate: 1 });

export const DealModel = mongoose.model<IDeal>("Deal", dealSchema);

export interface MemberDealMetrics {
  dealsClosed: number;
  revenue: number;
}

export const dealQueries = {
  findActiveByAssignee: (assigneeId: string) =>
    DealModel.find({ assignedTo: assigneeId, archived: false }),

  findByStage: (stage: DealStage) =>
    DealModel.find({ stage, archived: false }).sort({ createdAt: -1 }),

  findByCustomer: (customerId: string) =>
    DealModel.find({ customerId, archived: false }).sort({ createdAt: -1 }),

  setArchivedMany: (ids: string[], archived: boolean) =>
    DealModel.updateMany({ _id: { $in: ids } }, { $set: { archived } }),

  /**
   * Recomputes a member's closed-deal totals from the deals themselves rather
   * than incrementing counters, so the stored roll-up can never drift out of
   * step with reality after deletes, archives or re-assignments.
   */
  aggregateMemberMetrics: async (
    memberId: string,
  ): Promise<MemberDealMetrics> => {
    const [result] = await DealModel.aggregate<MemberDealMetrics>([
      {
        $match: {
          assignedTo: new mongoose.Types.ObjectId(memberId),
          stage: "won",
          archived: false,
        },
      },
      {
        $group: {
          _id: null,
          dealsClosed: { $sum: 1 },
          revenue: { $sum: "$value" },
        },
      },
    ]);

    return {
      dealsClosed: result?.dealsClosed ?? 0,
      revenue: result?.revenue ?? 0,
    };
  },
};
