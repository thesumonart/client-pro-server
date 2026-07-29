import type { z } from "zod";
import type { analyticsValidation } from "../validations/analytics.validation.ts";

/** One bucket in a month series, e.g. `{ key: "2026-6", label: "Jul" }`. */
export interface MonthBucket {
  key: string;
  label: string;
  year: number;
  month: number;
}

export interface RevenuePoint {
  month: string;
  year: number;
  revenue: number;
  target: number;
}

export interface MonthlySalesPoint {
  month: string;
  year: number;
  deals: number;
  revenue: number;
}

export interface CustomerGrowthPoint {
  month: string;
  year: number;
  customers: number;
  new: number;
}

export interface LeadSourcePoint {
  source: string;
  name: string;
  value: number;
}

export interface PipelineStagePoint {
  stage: string;
  key: string;
  value: number;
  count: number;
}

export interface TeamPerformancePoint {
  id: string;
  name: string;
  fullName: string;
  revenue: number;
  quota: number;
  attainment: number;
  dealsClosed: number;
}

export interface DashboardKpis {
  totalCustomers: number;
  activeDeals: number;
  revenue: number;
  newLeads: number;
  conversionRate: number;
  pendingTasks: number;
}

export interface AnalyticsOverview {
  kpis: DashboardKpis;
  revenue: RevenuePoint[];
  monthlySales: MonthlySalesPoint[];
  customerGrowth: CustomerGrowthPoint[];
  leadSources: LeadSourcePoint[];
  pipeline: PipelineStagePoint[];
  teamPerformance: TeamPerformancePoint[];
}

export type MonthsQuery = z.infer<typeof analyticsValidation.monthsQuerySchema>;
export type SalesQuery = z.infer<typeof analyticsValidation.salesQuerySchema>;
