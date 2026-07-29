import { requireUser } from "../middlewares/auth.middleware.ts";
import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { customerService } from "../services/customer.service.ts";
import type {
  BulkArchiveInput,
  CreateCustomerInput,
  ListCustomerQuery,
  UpdateCustomerInput,
} from "../types/customer.types.ts";
import type { IdParam } from "../types/team-member.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const customerController = {
  getCustomers: asyncHandler(async (req, res) => {
    const query = validateMiddleware.data<ListCustomerQuery>(req, "query");
    const { items, meta } = await customerService.listCustomers(query);

    ApiResponse.ok(res, items, "Customers retrieved", meta);
  }),

  getCustomerById: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const customer = await customerService.getCustomerById(id);

    ApiResponse.ok(res, customer, "Customer retrieved");
  }),

  createCustomer: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<CreateCustomerInput>(req, "body");
    const customer = await customerService.createCustomer(
      payload,
      requireUser(req.user),
    );

    ApiResponse.created(res, customer, "Customer created");
  }),

  updateCustomer: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    const payload = validateMiddleware.data<UpdateCustomerInput>(req, "body");
    const customer = await customerService.updateCustomer(
      id,
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(res, customer, "Customer updated");
  }),

  bulkArchiveCustomers: asyncHandler(async (req, res) => {
    const payload = validateMiddleware.data<BulkArchiveInput>(req, "body");
    const result = await customerService.bulkSetArchived(
      payload,
      requireUser(req.user),
    );

    ApiResponse.ok(
      res,
      result,
      payload.archived ? "Customers archived" : "Customers restored",
    );
  }),

  deleteCustomer: asyncHandler(async (req, res) => {
    const { id } = validateMiddleware.data<IdParam>(req, "params");
    await customerService.deleteCustomer(id, requireUser(req.user));

    ApiResponse.ok(res, null, "Customer deleted");
  }),
};
