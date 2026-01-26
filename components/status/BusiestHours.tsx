"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface HourlyData {
  hour: number;
  count: number;
}

interface BusiestHoursProps {
  hourlyData: HourlyData[];
}

function getHeatColor(intensity: number): string {
  // intensity is 0-1
  if (intensity === 0) return "bg-slate-100 dark:bg-slate-800";
  if (intensity < 0.25) return "bg-green-200 dark:bg-green-900";
  if (intensity < 0.5) return "bg-yellow-300 dark:bg-yellow-700";
  if (intensity < 0.75) return "bg-orange-400 dark:bg-orange-600";
  return "bg-red-500 dark:bg-red-500";
}

function formatHour(hour: number): string {
  if (hour === 0) return "12a";
  if (hour === 12) return "12p";
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

export function BusiestHours({ hourlyData }: BusiestHoursProps) {
  const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
  
  // Find peak hours (top 3)
  const sortedHours = [...hourlyData].sort((a, b) => b.count - a.count);
  const peakHours = sortedHours.slice(0, 3).filter(h => h.count > 0);
  
  // Split into two rows: 12am-11am, 12pm-11pm
  const morningHours = hourlyData.filter(h => h.hour < 12);
  const eveningHours = hourlyData.filter(h => h.hour >= 12);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span>Busiest Hours</span>
          </CardTitle>
          {peakHours.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Peak: {peakHours.map(h => formatHour(h.hour)).join(", ")}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* AM Row */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">AM</div>
            <div className="grid grid-cols-12 gap-1">
              {morningHours.map((h) => {
                const intensity = h.count / maxCount;
                const isPeak = peakHours.some(p => p.hour === h.hour);
                return (
                  <div
                    key={h.hour}
                    className={`aspect-square rounded-sm ${getHeatColor(intensity)} ${isPeak ? "ring-2 ring-purple-500 ring-offset-1" : ""} transition-all hover:scale-110 cursor-default`}
                    title={`${formatHour(h.hour)}: ${h.count} incidents`}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-12 gap-1">
              {morningHours.map((h) => (
                <div key={h.hour} className="text-[10px] text-center text-muted-foreground">
                  {h.hour % 3 === 0 ? formatHour(h.hour) : ""}
                </div>
              ))}
            </div>
          </div>

          {/* PM Row */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-medium">PM</div>
            <div className="grid grid-cols-12 gap-1">
              {eveningHours.map((h) => {
                const intensity = h.count / maxCount;
                const isPeak = peakHours.some(p => p.hour === h.hour);
                return (
                  <div
                    key={h.hour}
                    className={`aspect-square rounded-sm ${getHeatColor(intensity)} ${isPeak ? "ring-2 ring-purple-500 ring-offset-1" : ""} transition-all hover:scale-110 cursor-default`}
                    title={`${formatHour(h.hour)}: ${h.count} incidents`}
                  />
                );
              })}
            </div>
            <div className="grid grid-cols-12 gap-1">
              {eveningHours.map((h) => (
                <div key={h.hour} className="text-[10px] text-center text-muted-foreground">
                  {h.hour % 3 === 0 ? formatHour(h.hour) : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs pt-2 border-t">
            <span className="text-muted-foreground">Activity:</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
              <span className="text-muted-foreground">Low</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-yellow-300 dark:bg-yellow-700" />
              <span className="text-muted-foreground">Med</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-muted-foreground">High</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
