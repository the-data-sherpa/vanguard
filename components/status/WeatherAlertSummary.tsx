"use client";

import { CloudRain, AlertTriangle, AlertOctagon, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WeatherAlert {
  _id: string;
  event: string;
  headline: string;
  severity: string;
  urgency?: string;
  onset?: number;
  expires: number;
}

interface WeatherAlertSummaryProps {
  alerts: WeatherAlert[];
}

const severityConfig: Record<string, { color: string; icon: typeof AlertTriangle }> = {
  Extreme: {
    color: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
    icon: AlertOctagon,
  },
  Severe: {
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    icon: AlertTriangle,
  },
  Moderate: {
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
    icon: AlertTriangle,
  },
  Minor: {
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    icon: Info,
  },
  Unknown: {
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300",
    icon: Info,
  },
};

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WeatherAlertSummary({ alerts }: WeatherAlertSummaryProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain className="h-5 w-5" />
            <span>Weather Alerts</span>
          </div>
          <span className="text-2xl font-bold">{alerts.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="text-muted-foreground text-sm">No active weather alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const config = severityConfig[alert.severity] || severityConfig.Unknown;
              return (
                <div
                  key={alert._id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm">{alert.event}</span>
                    <Badge className={config.color} variant="secondary">
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {alert.headline}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires: {formatTime(alert.expires)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
