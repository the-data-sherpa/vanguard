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
import { TrendingUp } from "lucide-react";
import { AnalyticsCard } from "./AnalyticsCard";

interface TrendData {
  date: string;
  count: number;
  fire: number;
  medical: number;
  traffic: number;
  hazmat: number;
  rescue: number;
  other: number;
}

interface IncidentTrendChartProps {
  data: TrendData[];
  showCategories?: boolean;
}

const categoryColors = {
  count: "#6366f1",
  fire: "#f97316",
  medical: "#ef4444",
  traffic: "#3b82f6",
  hazmat: "#eab308",
  rescue: "#a855f7",
  other: "#6b7280",
};

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function IncidentTrendChart({ data, showCategories = false }: IncidentTrendChartProps) {
  if (data.length === 0) {
    return (
      <AnalyticsCard title="Incident Trends" icon={<TrendingUp className="h-4 w-4" />}>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No incident data available
        </div>
      </AnalyticsCard>
    );
  }

  return (
    <AnalyticsCard title="Incident Trends" icon={<TrendingUp className="h-4 w-4" />}>
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
            {showCategories ? (
              <>
                <Legend />
                <Line
                  type="monotone"
                  dataKey="fire"
                  stroke={categoryColors.fire}
                  strokeWidth={2}
                  dot={false}
                  name="Fire"
                />
                <Line
                  type="monotone"
                  dataKey="medical"
                  stroke={categoryColors.medical}
                  strokeWidth={2}
                  dot={false}
                  name="Medical"
                />
                <Line
                  type="monotone"
                  dataKey="traffic"
                  stroke={categoryColors.traffic}
                  strokeWidth={2}
                  dot={false}
                  name="Traffic"
                />
                <Line
                  type="monotone"
                  dataKey="rescue"
                  stroke={categoryColors.rescue}
                  strokeWidth={2}
                  dot={false}
                  name="Rescue"
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="count"
                stroke={categoryColors.count}
                strokeWidth={2}
                dot={false}
                name="Incidents"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
