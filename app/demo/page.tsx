"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { CallTypeCategory, Incident, WeatherAlert, UnitLegend } from "@/lib/types";
import type { DemoIncident, DemoWeatherAlert } from "@/lib/demo-types";
import { DashboardHeader, DashboardStats } from "@/components/dashboard";
import { IncidentList } from "@/components/incidents";
import { WeatherAlertList } from "@/components/weather";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Adapt demo incidents to the Incident type expected by shared components
function adaptDemoIncident(demo: DemoIncident): Incident {
  const now = new Date().toISOString();
  return {
    id: demo.id,
    tenantId: "demo",
    source: "pulsepoint",
    callType: demo.callType,
    callTypeCategory: demo.callTypeCategory,
    description: demo.description,
    fullAddress: demo.fullAddress,
    latitude: demo.latitude,
    longitude: demo.longitude,
    units: demo.units,
    status: demo.status,
    callReceivedTime: new Date(demo.callReceivedTime).toISOString(),
    callClosedTime: demo.callClosedTime
      ? new Date(demo.callClosedTime).toISOString()
      : undefined,
    created: now,
    updated: now,
  };
}

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

// Adapt demo unit legend to the UnitLegend type
function adaptDemoUnitLegend(
  legend: Array<{ UnitKey: string; Description: string }> | undefined
): UnitLegend | undefined {
  return legend;
}

export default function DemoPage() {
  const demoTenant = useQuery(api.demo.getDemoTenant);
  const demoStats = useQuery(api.demo.getDemoStats);
  const demoIncidents = useQuery(api.demo.getDemoIncidents);
  const demoWeatherAlerts = useQuery(api.demo.getDemoWeatherAlerts);
  const demoUnitLegend = useQuery(api.demo.getDemoUnitLegend);

  // Adapt data for shared components
  const { activeIncidents, activeAlerts, unitLegend } = useMemo(() => {
    const incidents = demoIncidents
      ? demoIncidents
          .filter((i: DemoIncident) => i.status === "active")
          .map(adaptDemoIncident)
      : [];
    const alerts = demoWeatherAlerts
      ? demoWeatherAlerts
          .filter((a: DemoWeatherAlert) => a.status === "active")
          .map(adaptDemoWeatherAlert)
      : [];
    return {
      activeIncidents: incidents,
      activeAlerts: alerts,
      unitLegend: adaptDemoUnitLegend(demoUnitLegend),
    };
  }, [demoIncidents, demoWeatherAlerts, demoUnitLegend]);

  // Loading state
  if (!demoTenant || !demoStats || demoIncidents === undefined || demoWeatherAlerts === undefined) {
    return <DashboardSkeleton />;
  }

  // Build stats for DashboardStats component
  const byCategory: Record<CallTypeCategory, number> = {
    fire: demoStats.categoryBreakdown.fire || 0,
    medical: demoStats.categoryBreakdown.medical || 0,
    rescue: demoStats.categoryBreakdown.rescue || 0,
    traffic: demoStats.categoryBreakdown.traffic || 0,
    hazmat: demoStats.categoryBreakdown.hazmat || 0,
    other: demoStats.categoryBreakdown.other || 0,
  };

  const dashboardStats = {
    totalActive: demoStats.activeIncidentCount,
    totalToday: demoStats.todaysCallCount,
    byCategory,
    activeUnits: demoStats.activeUnitCount,
  };

  return (
    <div className="space-y-4 md:space-y-6 overflow-hidden">
      {/* Real-time indicator */}
      <div className="flex justify-end">
        <Badge variant="outline" className="text-xs">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          Demo Mode
        </Badge>
      </div>

      {/* Weather Alert Banner */}
      {activeAlerts.length > 0 && (
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-3 md:p-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-amber-900 dark:text-amber-100">
                  {activeAlerts.length} Weather Alert{activeAlerts.length !== 1 ? "s" : ""} Active
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 line-clamp-2">
                  {activeAlerts[0].headline}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" asChild className="shrink-0 self-start sm:self-auto">
              <Link href="/demo/weather">View All</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <DashboardHeader
        tenantName={demoTenant.displayName || demoTenant.name}
        lastSyncTime={new Date().toISOString()}
        isSyncing={false}
        onRefresh={() => {}}
      />

      {/* Stats */}
      <DashboardStats stats={dashboardStats} />

      {/* Main Content Grid */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-3 overflow-hidden">
        {/* Active Incidents */}
        <div className="lg:col-span-2 min-w-0">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Active Incidents</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/demo/incidents">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="overflow-hidden">
              {activeIncidents.length > 0 ? (
                <IncidentList
                  incidents={activeIncidents.slice(0, 6)}
                  unitLegend={unitLegend}
                  showStatusBadge={false}
                />
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No active incidents</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 md:space-y-6 min-w-0">
          {/* Weather Alerts */}
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Weather Alerts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/demo/weather">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <WeatherAlertList
                alerts={activeAlerts.slice(0, 3)}
                compact
              />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 md:pb-6">
              <CardTitle className="text-lg md:text-xl">Status Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{demoStats.activeIncidentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Today&apos;s Calls</span>
                <span className="font-medium">{demoStats.todaysCallCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Units</span>
                <span className="font-medium">{demoStats.activeUnitCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weather Alerts</span>
                <span className="font-medium">{demoStats.activeAlertCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
