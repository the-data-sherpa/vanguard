"use client";

import { Clock } from "lucide-react";
import { AnalyticsCard } from "./AnalyticsCard";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeatmapData {
  dayOfWeek: number;
  hour: number;
  count: number;
}

interface BusyTimesHeatmapProps {
  data: HeatmapData[];
}

const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hourLabels = ["12a", "3a", "6a", "9a", "12p", "3p", "6p", "9p"];

function getHeatColor(count: number, maxCount: number): string {
  if (count === 0) return "bg-muted/30";
  const intensity = Math.min(count / maxCount, 1);
  if (intensity < 0.25) return "bg-blue-200 dark:bg-blue-900/50";
  if (intensity < 0.5) return "bg-blue-300 dark:bg-blue-800/60";
  if (intensity < 0.75) return "bg-blue-400 dark:bg-blue-700/70";
  return "bg-blue-500 dark:bg-blue-600";
}

export function BusyTimesHeatmap({ data }: BusyTimesHeatmapProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const totalCalls = data.reduce((a, b) => a + b.count, 0);

  if (totalCalls === 0) {
    return (
      <AnalyticsCard title="Busy Times" icon={<Clock className="h-4 w-4" />}>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground">
          No incident data available
        </div>
      </AnalyticsCard>
    );
  }

  // Create 7x24 grid
  const grid: number[][] = [];
  for (let day = 0; day < 7; day++) {
    grid[day] = [];
    for (let hour = 0; hour < 24; hour++) {
      const item = data.find((d) => d.dayOfWeek === day && d.hour === hour);
      grid[day][hour] = item?.count || 0;
    }
  }

  return (
    <AnalyticsCard title="Busy Times" icon={<Clock className="h-4 w-4" />}>
      <TooltipProvider>
        <div className="space-y-2">
          {/* Hour labels */}
          <div className="flex ml-10 text-xs text-muted-foreground">
            {hourLabels.map((label, idx) => (
              <div key={idx} className="flex-1 text-center" style={{ width: `${100 / 8}%` }}>
                {label}
              </div>
            ))}
          </div>

          {/* Grid */}
          {grid.map((row, dayIdx) => (
            <div key={dayIdx} className="flex items-center gap-1">
              <div className="w-8 text-xs text-muted-foreground text-right pr-2">
                {dayLabels[dayIdx]}
              </div>
              <div className="flex-1 flex gap-0.5">
                {row.map((count, hourIdx) => (
                  <Tooltip key={hourIdx}>
                    <TooltipTrigger asChild>
                      <div
                        className={`flex-1 h-4 rounded-sm ${getHeatColor(count, maxCount)} cursor-default`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {dayLabels[dayIdx]} {hourIdx}:00 - {hourIdx + 1}:00
                      </p>
                      <p className="font-medium">{count} incidents</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 pt-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-3 rounded-sm bg-muted/30" />
              <div className="w-3 h-3 rounded-sm bg-blue-200 dark:bg-blue-900/50" />
              <div className="w-3 h-3 rounded-sm bg-blue-300 dark:bg-blue-800/60" />
              <div className="w-3 h-3 rounded-sm bg-blue-400 dark:bg-blue-700/70" />
              <div className="w-3 h-3 rounded-sm bg-blue-500 dark:bg-blue-600" />
            </div>
            <span>More</span>
          </div>
        </div>
      </TooltipProvider>
    </AnalyticsCard>
  );
}
