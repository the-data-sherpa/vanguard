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
import { Timer } from "lucide-react";
import { AnalyticsCard } from "./AnalyticsCard";

interface ResponseTimeData {
  avg: number;
  median: number;
  p90: number;
  trend: { date: string; avgTime: number }[];
  totalDataPoints: number;
}

interface ResponseTimeChartProps {
  data: ResponseTimeData | null;
}

function formatTime(ms: number): string {
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function ResponseTimeChart({ data }: ResponseTimeChartProps) {
  if (!data) {
    return null; // Don't render if no response time data available
  }

  const chartData = data.trend.map((d) => ({
    date: d.date,
    avgTime: d.avgTime / 60000, // Convert to minutes for display
  }));

  return (
    <AnalyticsCard title="Response Times" icon={<Timer className="h-4 w-4" />}>
      <div className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{formatTime(data.avg)}</p>
            <p className="text-xs text-muted-foreground">Average</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatTime(data.median)}</p>
            <p className="text-xs text-muted-foreground">Median</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{formatTime(data.p90)}</p>
            <p className="text-xs text-muted-foreground">90th percentile</p>
          </div>
        </div>

        {/* Trend chart */}
        {chartData.length > 0 && (
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
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
                  tickFormatter={(value) => `${Math.round(value)}m`}
                />
                <Tooltip
                  labelFormatter={formatDate}
                  formatter={(value) => [`${Math.round(value as number)} min`, "Avg Response"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="avgTime"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.2}
                  strokeWidth={2}
                  name="Avg Response"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Based on {data.totalDataPoints} response time records (dispatch to on-scene)
        </p>
      </div>
    </AnalyticsCard>
  );
}
