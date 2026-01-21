"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { BarChart3, AlertTriangle, Truck, Activity, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DateRangePicker,
  getDefaultDateRange,
  DateRange,
  IncidentTrendChart,
  CallTypeChart,
  BusyTimesHeatmap,
  UnitUtilizationChart,
  ResponseTimeChart,
  AnalyticsCardSkeleton,
} from "@/components/analytics";

export default function AnalyticsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);

  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const tenantId = tenant?._id;

  // Check if analytics feature is enabled
  const hasAnalytics = tenant?.features?.advancedAnalytics ?? false;

  // Analytics queries - only run if feature is enabled
  const summaryStats = useQuery(
    api.analytics.getSummaryStats,
    tenantId && hasAnalytics
      ? { tenantId, startTime: dateRange.startTime, endTime: dateRange.endTime }
      : "skip"
  );

  const trendData = useQuery(
    api.analytics.getIncidentTrends,
    tenantId && hasAnalytics
      ? { tenantId, startTime: dateRange.startTime, endTime: dateRange.endTime }
      : "skip"
  );

  const callTypeData = useQuery(
    api.analytics.getCallTypeDistribution,
    tenantId && hasAnalytics
      ? { tenantId, startTime: dateRange.startTime, endTime: dateRange.endTime }
      : "skip"
  );

  const heatmapData = useQuery(
    api.analytics.getHourlyHeatmap,
    tenantId && hasAnalytics
      ? { tenantId, startTime: dateRange.startTime, endTime: dateRange.endTime }
      : "skip"
  );

  const unitData = useQuery(
    api.analytics.getUnitUtilization,
    tenantId && hasAnalytics
      ? { tenantId, startTime: dateRange.startTime, endTime: dateRange.endTime }
      : "skip"
  );

  const responseTimeData = useQuery(
    api.analytics.getResponseTimeStats,
    tenantId && hasAnalytics
      ? { tenantId, startTime: dateRange.startTime, endTime: dateRange.endTime }
      : "skip"
  );

  // Loading state
  if (!tenant) {
    return <AnalyticsPageSkeleton />;
  }

  // Feature not enabled
  if (!hasAnalytics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Detailed analytics and reporting for your incidents
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Advanced Analytics Not Enabled</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-4">
              Enable the Advanced Analytics feature in your settings to access detailed
              incident trends, call type distribution, busy times analysis, and more.
            </p>
            <a
              href={`/tenant/${slug}/settings`}
              className="text-primary hover:underline"
            >
              Go to Settings
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading =
    summaryStats === undefined ||
    trendData === undefined ||
    callTypeData === undefined ||
    heatmapData === undefined ||
    unitData === undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Detailed analytics and reporting for your incidents
          </p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    summaryStats?.totalIncidents ?? 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Total Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    summaryStats?.uniqueUnits ?? 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Unique Units</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    summaryStats?.avgDailyIncidents ?? 0
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Avg Daily Incidents</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <AnalyticsCardSkeleton className="lg:col-span-2" />
          <AnalyticsCardSkeleton />
          <AnalyticsCardSkeleton />
          <AnalyticsCardSkeleton />
          <AnalyticsCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Trend Chart - Full Width */}
          <div className="lg:col-span-2">
            <IncidentTrendChart data={trendData || []} />
          </div>

          {/* Call Type Distribution */}
          <CallTypeChart data={callTypeData || { fire: 0, medical: 0, rescue: 0, traffic: 0, hazmat: 0, other: 0 }} />

          {/* Busy Times Heatmap */}
          <BusyTimesHeatmap data={heatmapData || []} />

          {/* Unit Utilization */}
          <UnitUtilizationChart data={unitData || []} />

          {/* Response Time - Only show if data available */}
          {responseTimeData !== undefined && responseTimeData !== null && (
            <ResponseTimeChart data={responseTimeData} />
          )}
        </div>
      )}
    </div>
  );
}

function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-[180px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[300px] lg:col-span-2" />
        <Skeleton className="h-[300px]" />
        <Skeleton className="h-[300px]" />
      </div>
    </div>
  );
}
