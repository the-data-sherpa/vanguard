"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity } from "lucide-react";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";

interface TenantCount {
  tenantId: string;
  tenantName: string;
  count: number;
}

interface PlatformIncidentData {
  date: string;
  count: number;
  byTenant: TenantCount[];
}

interface PlatformIncidentChartProps {
  data: PlatformIncidentData[];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function PlatformIncidentChart({ data }: PlatformIncidentChartProps) {
  if (data.length === 0) {
    return (
      <AnalyticsCard
        title="Platform Incident Trends"
        icon={<Activity className="h-4 w-4" />}
      >
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No incident data available
        </div>
      </AnalyticsCard>
    );
  }

  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <AnalyticsCard
        title="Platform Incident Trends"
        icon={<Activity className="h-4 w-4" />}
      >
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No incidents recorded in this period
        </div>
      </AnalyticsCard>
    );
  }

  // Calculate total for summary
  const totalIncidents = data.reduce((sum, d) => sum + d.count, 0);
  const avgDaily = Math.round(totalIncidents / data.length);

  return (
    <AnalyticsCard
      title="Platform Incident Trends"
      icon={<Activity className="h-4 w-4" />}
    >
      <div className="mb-2 flex gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total: </span>
          <span className="font-medium">{totalIncidents.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Avg/day: </span>
          <span className="font-medium">{avgDaily}</span>
        </div>
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              labelFormatter={formatDate}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
              formatter={(value: number | undefined) => [
                value !== undefined ? value.toLocaleString() : "0",
                "Incidents",
              ]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.3}
              strokeWidth={2}
              name="Incidents"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
