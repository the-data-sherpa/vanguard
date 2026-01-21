"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Truck } from "lucide-react";
import { AnalyticsCard } from "./AnalyticsCard";

interface UnitData {
  unitId: string;
  dispatchCount: number;
  avgOnSceneTime: number | null;
}

interface UnitUtilizationChartProps {
  data: UnitData[];
  limit?: number;
}

function formatTime(ms: number | null): string {
  if (ms === null) return "N/A";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function UnitUtilizationChart({ data, limit = 10 }: UnitUtilizationChartProps) {
  const chartData = data.slice(0, limit).map((d) => ({
    unit: d.unitId,
    dispatches: d.dispatchCount,
    avgTime: d.avgOnSceneTime,
  }));

  if (chartData.length === 0) {
    return (
      <AnalyticsCard title="Unit Activity" icon={<Truck className="h-4 w-4" />}>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No unit data available
        </div>
      </AnalyticsCard>
    );
  }

  return (
    <AnalyticsCard title="Unit Activity (Top 10)" icon={<Truck className="h-4 w-4" />}>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, left: 50, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="unit"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              width={45}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as { unit: string; dispatches: number; avgTime: number | null };
                return (
                  <div className="bg-background border rounded-md p-2 shadow-md">
                    <p className="font-medium">{data.unit}</p>
                    <p className="text-sm">Dispatches: {data.dispatches}</p>
                    {data.avgTime !== null && (
                      <p className="text-sm text-muted-foreground">
                        Avg time on scene: {formatTime(data.avgTime)}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Bar
              dataKey="dispatches"
              fill="#6366f1"
              radius={[0, 4, 4, 0]}
              name="Dispatches"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
