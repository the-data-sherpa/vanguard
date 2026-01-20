"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { DemoWeatherAlert } from "@/lib/demo-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CloudRain, AlertTriangle, Clock, Info } from "lucide-react";

export default function DemoWeatherPage() {
  const demoWeatherAlerts = useQuery(api.demo.getDemoWeatherAlerts);

  if (demoWeatherAlerts === undefined) {
    return <WeatherPageSkeleton />;
  }

  const activeAlerts = demoWeatherAlerts.filter((a: DemoWeatherAlert) => a.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weather Alerts</h1>
        <p className="text-muted-foreground">
          Active weather alerts and warnings (demo data)
        </p>
      </div>

      {activeAlerts.length > 0 ? (
        <div className="grid gap-4">
          {activeAlerts.map((alert: DemoWeatherAlert) => (
            <WeatherAlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <CloudRain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No active weather alerts</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WeatherAlertCard({
  alert,
}: {
  alert: {
    id: string;
    event: string;
    headline: string;
    description: string;
    instruction?: string;
    severity: string;
    urgency: string;
    certainty: string;
    onset?: number;
    expires: number;
  };
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Extreme":
        return "bg-red-500 text-white";
      case "Severe":
        return "bg-orange-500 text-white";
      case "Moderate":
        return "bg-yellow-500 text-black";
      default:
        return "bg-blue-500 text-white";
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case "Extreme":
        return "border-l-red-500";
      case "Severe":
        return "border-l-orange-500";
      case "Moderate":
        return "border-l-yellow-500";
      default:
        return "border-l-blue-500";
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <Card className={`border-l-4 ${getSeverityBorder(alert.severity)}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <div>
              <CardTitle>{alert.event}</CardTitle>
              <CardDescription className="mt-1">{alert.headline}</CardDescription>
            </div>
          </div>
          <Badge className={getSeverityColor(alert.severity)}>
            {alert.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timing */}
        <div className="flex flex-wrap gap-4 text-sm">
          {alert.onset && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Starts: {formatTime(alert.onset)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Expires: {formatTime(alert.expires)}</span>
          </div>
        </div>

        {/* Properties */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Urgency: {alert.urgency}</Badge>
          <Badge variant="outline">Certainty: {alert.certainty}</Badge>
        </div>

        {/* Description */}
        <div>
          <p className="text-sm font-medium mb-1">Description</p>
          <p className="text-sm text-muted-foreground">{alert.description}</p>
        </div>

        {/* Instructions */}
        {alert.instruction && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 mt-0.5 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Recommended Actions</p>
                <p className="text-sm text-muted-foreground">{alert.instruction}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeatherPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    </div>
  );
}
