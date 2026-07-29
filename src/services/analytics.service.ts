import { CustomerModel } from "../models/customer.model.ts";
import { DealModel } from "../models/deal.model.ts";
import { LeadModel } from "../models/lead.model.ts";
import { TaskModel } from "../models/task.model.ts";
import { TeamMemberModel } from "../models/team-member.model.ts";
import type {
  AnalyticsOverview,
  CustomerGrowthPoint,
  DashboardKpis,
  LeadSourcePoint,
  MonthBucket,
  MonthlySalesPoint,
  PipelineStagePoint,
  RevenuePoint,
  TeamPerformancePoint,
} from "../types/analytics.types.ts";
import {
  LEAD_SOURCE_LABELS,
  MONTH_LABELS,
  PIPELINE_STAGES,
} from "../utils/constants.ts";

/** Shape returned by every `$group` that buckets on year + month. */
interface MonthAggregateRow {
  _id: { year: number; month: number };
  total?: number;
  count?: number;
}

/**
 * The trailing `n` months, oldest first, in UTC.
 *
 * Generated in JS rather than taken from the aggregation so months with no
 * activity still appear as zeroes — a chart series with holes in it would
 * render a misleading line.
 */
const buildMonthBuckets = (months: number): MonthBucket[] => {
  const buckets: MonthBucket[] = [];
  const now = new Date();

  for (let offset = months - 1; offset >= 0; offset--) {
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1),
    );
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    buckets.push({
      key: `${String(year)}-${String(month)}`,
      label: MONTH_LABELS[month] ?? "",
      year,
      month,
    });
  }

  return buckets;
};

/** Mongo's `$month` is 1-based; the buckets above are 0-based. */
const rowKey = (row: MonthAggregateRow): string =>
  `${String(row._id.year)}-${String(row._id.month - 1)}`;

const startOf = (bucket: MonthBucket): Date =>
  new Date(Date.UTC(bucket.year, bucket.month, 1));

const capitalise = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const analyticsService = {
  /**
   * Won-deal revenue per month, bucketed on `closingDate` — the deal's business
   * close date. Replaces the seeded PRNG the frontend used for this series.
   *
   * `target` is derived from real data too: the summed quota of active team
   * members, spread evenly across twelve months. Quota is stored as a
   * whole-year figure, so adjust the divisor if you treat it differently.
   */
  getRevenueByMonth: async (months: number): Promise<RevenuePoint[]> => {
    const buckets = buildMonthBuckets(months);
    const from = startOf(
      buckets[0] ?? { year: 1970, month: 0, key: "", label: "" },
    );

    const [rows, quotaRows] = await Promise.all([
      DealModel.aggregate<MonthAggregateRow>([
        {
          $match: {
            stage: "won",
            archived: false,
            closingDate: { $gte: from },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$closingDate" },
              month: { $month: "$closingDate" },
            },
            total: { $sum: "$value" },
          },
        },
      ]),
      TeamMemberModel.aggregate<{ _id: null; total: number }>([
        { $match: { status: "active" } },
        { $group: { _id: null, total: { $sum: "$quota" } } },
      ]),
    ]);

    const revenueByKey = new Map(
      rows.map((row) => [rowKey(row), row.total ?? 0]),
    );
    const monthlyTarget = Math.round((quotaRows[0]?.total ?? 0) / 12);

    return buckets.map((bucket) => ({
      month: bucket.label,
      year: bucket.year,
      revenue: revenueByKey.get(bucket.key) ?? 0,
      target: monthlyTarget,
    }));
  },

  /** Count and value of deals won per month. */
  getMonthlySales: async (months: number): Promise<MonthlySalesPoint[]> => {
    const buckets = buildMonthBuckets(months);
    const from = startOf(
      buckets[0] ?? { year: 1970, month: 0, key: "", label: "" },
    );

    const rows = await DealModel.aggregate<MonthAggregateRow>([
      {
        $match: { stage: "won", archived: false, closingDate: { $gte: from } },
      },
      {
        $group: {
          _id: {
            year: { $year: "$closingDate" },
            month: { $month: "$closingDate" },
          },
          total: { $sum: "$value" },
          count: { $sum: 1 },
        },
      },
    ]);

    const byKey = new Map(rows.map((row) => [rowKey(row), row]));

    return buckets.map((bucket) => {
      const row = byKey.get(bucket.key);

      return {
        month: bucket.label,
        year: bucket.year,
        deals: row?.count ?? 0,
        revenue: row?.total ?? 0,
      };
    });
  },

  /**
   * New customers per month plus a running total. The cumulative figure counts
   * every customer created before the window too, so the line starts from the
   * real total rather than zero.
   */
  getCustomerGrowth: async (months: number): Promise<CustomerGrowthPoint[]> => {
    const buckets = buildMonthBuckets(months);
    const from = startOf(
      buckets[0] ?? { year: 1970, month: 0, key: "", label: "" },
    );

    const [rows, priorTotal] = await Promise.all([
      CustomerModel.aggregate<MonthAggregateRow>([
        { $match: { archived: false, createdAt: { $gte: from } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ]),
      CustomerModel.countDocuments({
        archived: false,
        createdAt: { $lt: from },
      }),
    ]);

    const byKey = new Map(rows.map((row) => [rowKey(row), row.count ?? 0]));
    let cumulative = priorTotal;

    return buckets.map((bucket) => {
      const added = byKey.get(bucket.key) ?? 0;
      cumulative += added;

      return {
        month: bucket.label,
        year: bucket.year,
        customers: cumulative,
        new: added,
      };
    });
  },

  /** Lead distribution by source, busiest first. */
  getLeadSources: async (): Promise<LeadSourcePoint[]> => {
    const rows = await LeadModel.aggregate<{ _id: string; count: number }>([
      { $match: { archived: false } },
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return rows.map((row) => ({
      source: row._id,
      name: LEAD_SOURCE_LABELS[row._id] ?? row._id,
      value: row.count,
    }));
  },

  /** Open pipeline value and deal count per stage. */
  getPipelineByStage: async (): Promise<PipelineStagePoint[]> => {
    const rows = await DealModel.aggregate<{
      _id: string;
      total: number;
      count: number;
    }>([
      { $match: { archived: false } },
      {
        $group: {
          _id: "$stage",
          total: { $sum: "$value" },
          count: { $sum: 1 },
        },
      },
    ]);

    const byStage = new Map(rows.map((row) => [row._id, row]));

    // Driven by the stage list, not the results, so empty stages still appear.
    return PIPELINE_STAGES.map((stage) => {
      const row = byStage.get(stage);

      return {
        stage: capitalise(stage),
        key: stage,
        value: row?.total ?? 0,
        count: row?.count ?? 0,
      };
    });
  },

  /**
   * Revenue against quota per active member. Read from the roll-up the deal
   * service maintains, so it stays consistent with the team page.
   */
  getTeamPerformance: async (): Promise<TeamPerformancePoint[]> => {
    const members = await TeamMemberModel.find({ status: "active" })
      .select("name revenue quota dealsClosed")
      .sort({ revenue: -1 });

    return members.map((member) => ({
      id: member._id.toString(),
      name: member.name.split(" ")[0] ?? member.name,
      fullName: member.name,
      revenue: member.revenue,
      quota: member.quota,
      // Guard the divide: an unset quota must not yield Infinity or NaN.
      attainment:
        member.quota > 0
          ? Math.round((member.revenue / member.quota) * 100)
          : 0,
      dealsClosed: member.dealsClosed,
    }));
  },

  getDashboardKpis: async (): Promise<DashboardKpis> => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);

    const [
      totalCustomers,
      activeDeals,
      revenueRows,
      newLeads,
      wonLeads,
      closedLeads,
      pendingTasks,
    ] = await Promise.all([
      CustomerModel.countDocuments({ archived: false }),
      DealModel.countDocuments({
        archived: false,
        stage: { $nin: ["won", "lost"] },
      }),
      DealModel.aggregate<{ _id: null; total: number }>([
        { $match: { stage: "won", archived: false } },
        { $group: { _id: null, total: { $sum: "$value" } } },
      ]),
      LeadModel.countDocuments({
        archived: false,
        createdAt: { $gt: thirtyDaysAgo },
      }),
      LeadModel.countDocuments({ archived: false, stage: "won" }),
      LeadModel.countDocuments({
        archived: false,
        stage: { $in: ["won", "lost"] },
      }),
      TaskModel.countDocuments({ archived: false, status: { $ne: "done" } }),
    ]);

    return {
      totalCustomers,
      activeDeals,
      revenue: revenueRows[0]?.total ?? 0,
      newLeads,
      conversionRate: closedLeads > 0 ? (wonLeads / closedLeads) * 100 : 0,
      pendingTasks,
    };
  },

  /** Everything the reports page needs, in one round trip. */
  getOverview: async (
    revenueMonths: number,
    salesMonths: number,
  ): Promise<AnalyticsOverview> => {
    const [
      kpis,
      revenue,
      monthlySales,
      customerGrowth,
      leadSources,
      pipeline,
      teamPerformance,
    ] = await Promise.all([
      analyticsService.getDashboardKpis(),
      analyticsService.getRevenueByMonth(revenueMonths),
      analyticsService.getMonthlySales(salesMonths),
      analyticsService.getCustomerGrowth(revenueMonths),
      analyticsService.getLeadSources(),
      analyticsService.getPipelineByStage(),
      analyticsService.getTeamPerformance(),
    ]);

    return {
      kpis,
      revenue,
      monthlySales,
      customerGrowth,
      leadSources,
      pipeline,
      teamPerformance,
    };
  },
};
