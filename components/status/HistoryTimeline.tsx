"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, TrendingUp, Crown } from "lucide-react";

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

function getBarColor(count: number, isPeak: boolean): string {
  if (isPeak) return "bg-purple-500 dark:bg-purple-500";
  if (count === 0) return "bg-green-200 dark:bg-green-900";
  if (count <= 3) return "bg-amber-300 dark:bg-amber-700";
  if (count <= 6) return "bg-orange-400 dark:bg-orange-600";
  return "bg-red-500 dark:bg-red-600";
}

function generateSparklinePath(data: DailyCount[], maxCount: number, width: number, height: number): string {
  if (data.length < 2) return "";
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (d.count / maxCount) * height;
    return `${x},${y}`;
  });
  
  return `M ${points.join(" L ")}`;
}

export function HistoryTimeline({ history }: HistoryTimelineProps) {
  const recentHistory = history.slice(-14);
  const maxCount = Math.max(...recentHistory.map((d) => d.count), 1);
  
  // Find peak day
  const peakDay = recentHistory.reduce((max, day) => 
    day.count > max.count ? day : max, recentHistory[0]
  );
  const peakIndex = recentHistory.findIndex(d => d.date === peakDay.date);

  // Calculate sparkline path
  const sparklinePath = generateSparklinePath(recentHistory, maxCount, 100, 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            <span>14-Day Incident History</span>
          </CardTitle>
          {peakDay && (
            <Badge variant="secondary" className="flex items-center gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              <Crown className="h-3 w-3" />
              Peak: {formatDate(peakDay.date)} ({peakDay.count})
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Bar chart with sparkline overlay */}
          <div className="relative">
            <div className="flex items-end gap-1 h-24">
              {recentHistory.map((day, idx) => {
                const height = day.count === 0 ? 4 : Math.max((day.count / maxCount) * 100, 10);
                const isPeak = idx === peakIndex;
                return (
                  <div
                    key={day.date}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className={`text-xs ${isPeak ? "font-bold text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}>
                      {day.count > 0 ? day.count : ""}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all ${getBarColor(day.count, isPeak)} ${isPeak ? "ring-2 ring-purple-400 ring-offset-1" : ""}`}
                      style={{ height: `${height}%` }}
                      title={`${formatDate(day.date)}: ${day.count} incidents${isPeak ? " (Peak)" : ""}`}
                    />
                  </div>
                );
              })}
            </div>
            
            {/* Sparkline overlay */}
            <svg
              className="absolute inset-0 w-full h-24 pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <path
                d={sparklinePath}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-blue-500 dark:text-blue-400 opacity-60"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          {/* X-axis labels (show every 3rd day) */}
          <div className="flex gap-1">
            {recentHistory.map((day, idx) => (
              <div key={day.date} className="flex-1 text-center">
                {idx % 3 === 0 && (
                  <span className={`text-xs ${idx === peakIndex ? "font-semibold text-purple-600 dark:text-purple-400" : "text-muted-foreground"}`}>
                    {formatDate(day.date)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs pt-2 border-t">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-muted-foreground">Peak day</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-green-200 dark:bg-green-900" />
              <span className="text-muted-foreground">0</span>
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
            <div className="flex items-center gap-1.5 ml-auto">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="text-muted-foreground">Trend line</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
