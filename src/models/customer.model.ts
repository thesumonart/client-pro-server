import mongoose, { Schema } from "mongoose";
import type {
  CustomerAddress,
  CustomerStatus,
  ICustomer,
} from "../types/customer.types.ts";
import { AVATAR_COLOR_COUNT, CUSTOMER_STATUSES } from "../utils/constants.ts";
import { schemaUtils } from "../utils/schema.utils.ts";

const addressSchema = new Schema<CustomerAddress>(
  {
    street: { type: String, default: null, trim: true },
    city: { type: String, default: null, trim: true },
    state: { type: String, default: null, trim: true },
    zip: { type: String, default: null, trim: true },
    country: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    company: { type: String, required: true, trim: true, maxlength: 150 },
    // Intentionally not unique: CRMs legitimately hold several contacts sharing
    // a shared/company inbox, and a unique index would reject bulk imports.
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true, maxlength: 40 },
    status: {
      type: String,
      enum: CUSTOMER_STATUSES,
      required: true,
      default: "prospect",
      index: true,
    },
    tags: { type: [String], default: [], index: true },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "TeamMember",
      default: null,
      index: true,
    },
    avatarColor: {
      type: Number,
      required: true,
      min: 0,
      max: AVATAR_COLOR_COUNT - 1,
      default: () => Math.floor(Math.random() * AVATAR_COLOR_COUNT),
    },
    jobTitle: { type: String, default: "", trim: true, maxlength: 120 },
    website: { type: String, default: null, trim: true, maxlength: 300 },
    address: { type: addressSchema, default: null },
    value: { type: Number, required: true, default: 0, min: 0 },
    lastActivityAt: { type: Date, required: true, default: () => new Date() },
    archived: { type: Boolean, required: true, default: false, index: true },
  },
  schemaUtils.baseOptions(),
);

customerSchema.index({ email: 1 });
// Default list view: non-archived, newest first.
customerSchema.index({ archived: 1, createdAt: -1 });
customerSchema.index({ assignedTo: 1, archived: 1, createdAt: -1 });

export const CustomerModel = mongoose.model<ICustomer>(
  "Customer",
  customerSchema,
);

export const customerQueries = {
  findActiveByAssignee: (assigneeId: string) =>
    CustomerModel.find({ assignedTo: assigneeId, archived: false }),

  findByIdNotArchived: (id: string) =>
    CustomerModel.findOne({ _id: id, archived: false }),

  countByStatus: (status: CustomerStatus) =>
    CustomerModel.countDocuments({ status, archived: false }),

  /** Bulk archive/restore — a single write instead of N round-trips. */
  setArchivedMany: (ids: string[], archived: boolean) =>
    CustomerModel.updateMany({ _id: { $in: ids } }, { $set: { archived } }),

  /** Keeps the "last touched" column honest when related records change. */
  touchLastActivity: (id: string, when: Date = new Date()) =>
    CustomerModel.updateOne({ _id: id }, { $set: { lastActivityAt: when } }),
};
