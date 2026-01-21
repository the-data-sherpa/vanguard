"use client";

import { useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PieChartIcon, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalyticsCard } from "./AnalyticsCard";

interface CallTypeDistribution {
  fire: number;
  medical: number;
  rescue: number;
  traffic: number;
  hazmat: number;
  other: number;
}

interface CallTypeChartProps {
  data: CallTypeDistribution;
}

const categoryConfig = [
  { key: "fire", label: "Fire", color: "#f97316" },
  { key: "medical", label: "Medical", color: "#ef4444" },
  { key: "traffic", label: "Traffic", color: "#3b82f6" },
  { key: "rescue", label: "Rescue", color: "#a855f7" },
  { key: "hazmat", label: "Hazmat", color: "#eab308" },
  { key: "other", label: "Other", color: "#6b7280" },
];

export function CallTypeChart({ data }: CallTypeChartProps) {
  const [chartType, setChartType] = useState<"pie" | "bar">("pie");

  const chartData = categoryConfig
    .map(({ key, label, color }) => ({
      name: label,
      value: data[key as keyof CallTypeDistribution],
      color,
    }))
    .filter((item) => item.value > 0);

  const total = Object.values(data).reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <AnalyticsCard title="Call Types" icon={<PieChartIcon className="h-4 w-4" />}>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No incident data available
        </div>
      </AnalyticsCard>
    );
  }

  return (
    <AnalyticsCard
      title="Call Types"
      icon={
        <div className="flex items-center gap-2">
          <PieChartIcon className="h-4 w-4" />
          <div className="flex border rounded-md overflow-hidden ml-auto">
            <Button
              variant={chartType === "pie" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 rounded-none"
              onClick={() => setChartType("pie")}
            >
              <PieChartIcon className="h-3 w-3" />
            </Button>
            <Button
              variant={chartType === "bar" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 rounded-none"
              onClick={() => setChartType("bar")}
            >
              <BarChart3 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      }
    >
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "pie" ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
            </PieChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="value" name="Incidents" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </AnalyticsCard>
  );
}
