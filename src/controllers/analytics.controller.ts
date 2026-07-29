import { validateMiddleware } from "../middlewares/validate.middleware.ts";
import { analyticsService } from "../services/analytics.service.ts";
import type { MonthsQuery, SalesQuery } from "../types/analytics.types.ts";
import { ApiResponse } from "../utils/ApiResponse.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";

export const analyticsController = {
  getDashboard: asyncHandler(async (_req, res) => {
    const kpis = await analyticsService.getDashboardKpis();

    ApiResponse.ok(res, kpis, "Dashboard KPIs retrieved");
  }),

  getRevenue: asyncHandler(async (req, res) => {
    const { months } = validateMiddleware.data<MonthsQuery>(req, "query");
    const revenue = await analyticsService.getRevenueByMonth(months);

    ApiResponse.ok(res, revenue, "Revenue by month retrieved");
  }),

  getMonthlySales: asyncHandler(async (req, res) => {
    const { months } = validateMiddleware.data<SalesQuery>(req, "query");
    const sales = await analyticsService.getMonthlySales(months);

    ApiResponse.ok(res, sales, "Monthly sales retrieved");
  }),

  getCustomerGrowth: asyncHandler(async (req, res) => {
    const { months } = validateMiddleware.data<MonthsQuery>(req, "query");
    const growth = await analyticsService.getCustomerGrowth(months);

    ApiResponse.ok(res, growth, "Customer growth retrieved");
  }),

  getLeadSources: asyncHandler(async (_req, res) => {
    const sources = await analyticsService.getLeadSources();

    ApiResponse.ok(res, sources, "Lead sources retrieved");
  }),

  getPipeline: asyncHandler(async (_req, res) => {
    const pipeline = await analyticsService.getPipelineByStage();

    ApiResponse.ok(res, pipeline, "Pipeline by stage retrieved");
  }),

  getTeamPerformance: asyncHandler(async (_req, res) => {
    const performance = await analyticsService.getTeamPerformance();

    ApiResponse.ok(res, performance, "Team performance retrieved");
  }),

  getOverview: asyncHandler(async (req, res) => {
    const { months } = validateMiddleware.data<MonthsQuery>(req, "query");
    const overview = await analyticsService.getOverview(months, 8);

    ApiResponse.ok(res, overview, "Analytics overview retrieved");
  }),
};
