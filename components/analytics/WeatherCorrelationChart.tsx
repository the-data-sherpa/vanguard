"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { CloudRain, Sun } from "lucide-react";
import { AnalyticsCard } from "./AnalyticsCard";

interface WeatherCorrelationData {
  normalDays: number;
  normalIncidents: number;
  normalAvgPerDay: number;
  alertDays: number;
  alertIncidents: number;
  alertAvgPerDay: number;
  byAlertType: {
    event: string;
    days: number;
    incidents: number;
    avgPerDay: number;
  }[];
}

interface WeatherCorrelationChartProps {
  data: WeatherCorrelationData | null;
}

export function WeatherCorrelationChart({ data }: WeatherCorrelationChartProps) {
  if (!data || (data.normalDays === 0 && data.alertDays === 0)) {
    return (
      <AnalyticsCard title="Weather Impact" icon={<CloudRain className="h-4 w-4" />}>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          No weather correlation data available
        </div>
      </AnalyticsCard>
    );
  }

  const percentChange = data.normalAvgPerDay > 0 
    ? ((data.alertAvgPerDay - data.normalAvgPerDay) / data.normalAvgPerDay * 100).toFixed(0)
    : "0";
  
  const isHigher = data.alertAvgPerDay > data.normalAvgPerDay;

  // Main comparison data
  const comparisonData = [
    {
      name: "Normal Days",
      avgIncidents: Number(data.normalAvgPerDay.toFixed(1)),
      days: data.normalDays,
      total: data.normalIncidents,
      color: "#22c55e",
    },
    {
      name: "During Alerts",
      avgIncidents: Number(data.alertAvgPerDay.toFixed(1)),
      days: data.alertDays,
      total: data.alertIncidents,
      color: "#f97316",
    },
  ];

  // Top alert types by avg incidents
  const topAlertTypes = data.byAlertType
    .filter(a => a.days >= 1)
    .sort((a, b) => b.avgPerDay - a.avgPerDay)
    .slice(0, 5)
    .map(a => ({
      name: a.event.length > 20 ? a.event.substring(0, 20) + "..." : a.event,
      fullName: a.event,
      avgIncidents: Number(a.avgPerDay.toFixed(1)),
      days: a.days,
    }));

  return (
    <AnalyticsCard title="Weather Impact" icon={<CloudRain className="h-4 w-4" />}>
      <div className="space-y-4">
        {/* Summary stat */}
        <div className="flex items-center justify-center gap-4 py-2">
          <div className="flex items-center gap-2">
            <Sun className="h-5 w-5 text-green-500" />
            <div className="text-center">
              <p className="text-xl font-bold">{data.normalAvgPerDay.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">avg/day normal</p>
            </div>
          </div>
          <div className="text-2xl text-muted-foreground">→</div>
          <div className="flex items-center gap-2">
            <CloudRain className="h-5 w-5 text-orange-500" />
            <div className="text-center">
              <p className="text-xl font-bold">{data.alertAvgPerDay.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">avg/day alerts</p>
            </div>
          </div>
          <div className={`px-2 py-1 rounded text-sm font-medium ${isHigher ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
            {isHigher ? "+" : ""}{percentChange}%
          </div>
        </div>

        {/* Bar chart comparison */}
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis 
                type="category" 
                dataKey="name" 
                tick={{ fontSize: 12 }} 
                className="text-muted-foreground"
                width={75}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-md p-2 shadow-md text-sm">
                      <p className="font-medium">{d.name}</p>
                      <p>{d.avgIncidents} avg incidents/day</p>
                      <p className="text-muted-foreground">{d.total} total over {d.days} days</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avgIncidents" radius={[0, 4, 4, 0]}>
                {comparisonData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top alert types */}
        {topAlertTypes.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">By Alert Type (avg incidents/day)</p>
            <div className="space-y-1">
              {topAlertTypes.map((alert, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground truncate" title={alert.fullName}>
                    {alert.name}
                  </span>
                  <span className="font-medium">{alert.avgIncidents}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AnalyticsCard>
  );
}
