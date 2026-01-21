"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History } from "lucide-react";

interface DailyCount {
  date: string;
  count: number;
}

interface HistoryTimelineProps {
  history: DailyCount[];
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function getBarColor(count: number): string {
  if (count === 0) return "bg-green-200 dark:bg-green-900";
  if (count <= 3) return "bg-amber-300 dark:bg-amber-700";
  if (count <= 6) return "bg-orange-400 dark:bg-orange-600";
  return "bg-red-500 dark:bg-red-600";
}

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  const maxCount = Math.max(...history.map((d) => d.count), 1);

  // Show last 14 days for cleaner display
  const recentHistory = history.slice(-14);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          <span>14-Day Incident History</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Bar chart */}
          <div className="flex items-end gap-1 h-24">
            {recentHistory.map((day) => {
              const height = day.count === 0 ? 4 : Math.max((day.count / maxCount) * 100, 10);
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-xs text-muted-foreground">
                    {day.count > 0 ? day.count : ""}
                  </span>
                  <div
                    className={`w-full rounded-t ${getBarColor(day.count)}`}
                    style={{ height: `${height}%` }}
                    title={`${formatDate(day.date)}: ${day.count} incidents`}
                  />
                </div>
              );
            })}
          </div>

          {/* X-axis labels (show every 3rd day) */}
          <div className="flex gap-1">
            {recentHistory.map((day, idx) => (
              <div key={day.date} className="flex-1 text-center">
                {idx % 3 === 0 && (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(day.date)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs pt-2 border-t">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
              <span className="text-muted-foreground">0 incidents</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-300 dark:bg-amber-700" />
              <span className="text-muted-foreground">1-3</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-400 dark:bg-orange-600" />
              <span className="text-muted-foreground">4-6</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500 dark:bg-red-600" />
              <span className="text-muted-foreground">7+</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
