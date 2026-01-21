"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { AnalyticsCard } from "@/components/analytics/AnalyticsCard";

interface SyncHistoryData {
  date: string;
  incidentSyncs: number;
  weatherSyncs: number;
  failures: number;
}

interface SyncHistoryChartProps {
  data: SyncHistoryData[];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function SyncHistoryChart({ data }: SyncHistoryChartProps) {
  if (data.length === 0) {
    return (
      <AnalyticsCard title="Sync History (7 days)" icon={<RefreshCw className="h-4 w-4" />}>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No sync data available
        </div>
      </AnalyticsCard>
    );
  }

  const hasData = data.some(
    (d) => d.incidentSyncs > 0 || d.weatherSyncs > 0 || d.failures > 0
  );

  if (!hasData) {
    return (
      <AnalyticsCard title="Sync History (7 days)" icon={<RefreshCw className="h-4 w-4" />}>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No sync activity recorded in the last 7 days
        </div>
      </AnalyticsCard>
    );
  }

  return (
    <AnalyticsCard title="Sync History (7 days)" icon={<RefreshCw className="h-4 w-4" />}>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="incidentSyncs"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
              name="Incident Syncs"
            />
            <Line
              type="monotone"
              dataKey="weatherSyncs"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Weather Syncs"
            />
            <Line
              type="monotone"
              dataKey="failures"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Failures"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
