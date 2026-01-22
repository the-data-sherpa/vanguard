"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { DemoWeatherAlert } from "@/lib/demo-types";
import type { WeatherAlert } from "@/lib/types";
import { WeatherAlertList } from "@/components/weather";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Adapt demo weather alerts to the WeatherAlert type expected by shared components
function adaptDemoWeatherAlert(demo: DemoWeatherAlert): WeatherAlert {
  const now = new Date().toISOString();
  return {
    id: demo.id,
    tenantId: "demo",
    nwsId: demo.id,
    event: demo.event,
    headline: demo.headline,
    description: demo.description,
    instruction: demo.instruction,
    severity: demo.severity,
    urgency: demo.urgency,
    certainty: demo.certainty,
    onset: demo.onset ? new Date(demo.onset).toISOString() : undefined,
    expires: new Date(demo.expires).toISOString(),
    status: demo.status,
    created: now,
    updated: now,
  };
}

export default function DemoWeatherPage() {
  const demoWeatherAlerts = useQuery(api.demo.getDemoWeatherAlerts);

  // Adapt and filter alerts
  const { activeAlerts, expiredAlerts } = useMemo(() => {
    if (!demoWeatherAlerts) return { activeAlerts: [], expiredAlerts: [] };

    const adapted = demoWeatherAlerts.map(adaptDemoWeatherAlert);
    return {
      activeAlerts: adapted.filter((a: WeatherAlert) => a.status === "active"),
      expiredAlerts: adapted.filter((a: WeatherAlert) => a.status === "expired"),
    };
  }, [demoWeatherAlerts]);

  if (demoWeatherAlerts === undefined) {
    return <WeatherPageSkeleton />;
  }

  return (
    <div className="space-y-4 md:space-y-6 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Weather Alerts</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Active weather alerts for your area
          </p>
        </div>
        <Badge variant="outline" className="text-xs self-start sm:self-auto">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          Demo Mode
        </Badge>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="active" className="flex-1 sm:flex-none">
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="expired" className="flex-1 sm:flex-none">
            Expired ({expiredAlerts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <WeatherAlertList alerts={activeAlerts} />
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <WeatherAlertList alerts={expiredAlerts} />
        </TabsContent>
      </Tabs>

      {/* Info about weather zones (demo) */}
      <div className="rounded-lg border bg-muted/50 p-3 md:p-4 text-sm">
        <p className="font-medium mb-1">Monitored Weather Zones</p>
        <p className="text-muted-foreground">TXC439, TXC085, TXC453 (Demo)</p>
      </div>
    </div>
  );
}

function WeatherPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
