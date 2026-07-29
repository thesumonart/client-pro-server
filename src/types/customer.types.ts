import type { HydratedDocument, Types } from "mongoose";
import type { z } from "zod";
import type { CUSTOMER_STATUSES } from "../utils/constants.ts";
import type { customerValidation } from "../validations/customer.validation.ts";

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface CustomerAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
}

export interface ICustomer {
  name: string;
  company: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  tags: string[];
  assignedTo: Types.ObjectId | null;
  avatarColor: number;
  jobTitle: string;
  website: string | null;
  address: CustomerAddress | null;
  /** Lifetime value. */
  value: number;
  lastActivityAt: Date;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CustomerDocument = HydratedDocument<ICustomer>;

export type CreateCustomerInput = z.infer<
  typeof customerValidation.createCustomerSchema
>;
export type UpdateCustomerInput = z.infer<
  typeof customerValidation.updateCustomerSchema
>;
export type ListCustomerQuery = z.infer<
  typeof customerValidation.listCustomerQuerySchema
>;
export type BulkArchiveInput = z.infer<
  typeof customerValidation.bulkArchiveSchema
>;
