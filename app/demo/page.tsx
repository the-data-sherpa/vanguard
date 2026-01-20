"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { CallTypeCategory } from "@/lib/types";
import type { DemoIncident, DemoWeatherAlert } from "@/lib/demo-types";
import { DashboardHeader, DashboardStats } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ChevronRight, Flame, Activity, Car, AlertTriangle, Biohazard, HelpCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DemoPage() {
  const demoTenant = useQuery(api.demo.getDemoTenant);
  const demoStats = useQuery(api.demo.getDemoStats);
  const demoIncidents = useQuery(api.demo.getDemoIncidents);
  const demoWeatherAlerts = useQuery(api.demo.getDemoWeatherAlerts);
  const demoUnitLegend = useQuery(api.demo.getDemoUnitLegend);

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

  const activeIncidents = demoIncidents.filter((i: DemoIncident) => i.status === "active");
  const activeAlerts = demoWeatherAlerts.filter((a: DemoWeatherAlert) => a.status === "active");

  return (
    <div className="space-y-6">
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
        <div className="rounded-lg border bg-amber-50 dark:bg-amber-950/30 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-amber-900 dark:text-amber-100">
                {activeAlerts.length} Weather Alert{activeAlerts.length !== 1 ? "s" : ""} Active
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {activeAlerts[0].headline}
              </p>
            </div>
            <Button variant="outline" size="sm" asChild>
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
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Active Incidents */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Incidents</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/demo/incidents">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeIncidents.length > 0 ? (
                <div className="space-y-3">
                  {activeIncidents.slice(0, 6).map((incident: DemoIncident) => (
                    <DemoIncidentCard
                      key={incident.id}
                      incident={incident}
                      unitLegend={demoUnitLegend || []}
                    />
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No active incidents</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Weather Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Weather Alerts</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/demo/weather">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeAlerts.length > 0 ? (
                <div className="space-y-3">
                  {activeAlerts.slice(0, 3).map((alert: DemoWeatherAlert) => (
                    <DemoAlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-muted-foreground text-sm">
                  No active weather alerts
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Status Summary</CardTitle>
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

function DemoIncidentCard({
  incident,
  unitLegend,
}: {
  incident: {
    id: string;
    callType: string;
    callTypeCategory: string;
    description?: string;
    fullAddress: string;
    units: string[];
    callReceivedTime: number;
  };
  unitLegend: Array<{ UnitKey: string; Description: string }>;
}) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "fire":
        return <Flame className="h-4 w-4 text-red-500" />;
      case "medical":
        return <Activity className="h-4 w-4 text-blue-500" />;
      case "traffic":
        return <Car className="h-4 w-4 text-orange-500" />;
      case "hazmat":
        return <Biohazard className="h-4 w-4 text-purple-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getUnitDescription = (unitKey: string) => {
    const entry = unitLegend.find((u) => u.UnitKey === unitKey);
    return entry?.Description || unitKey;
  };

  const timeAgo = Math.floor((Date.now() - incident.callReceivedTime) / 60000);
  const timeDisplay = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;

  return (
    <div className="p-4 rounded-lg border hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getCategoryIcon(incident.callTypeCategory)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">{incident.callType}</span>
            <Badge variant="secondary" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {timeDisplay}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{incident.fullAddress}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {incident.units.map((unit) => (
              <Badge key={unit} variant="outline" className="text-xs" title={getUnitDescription(unit)}>
                {unit}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DemoAlertCard({
  alert,
}: {
  alert: {
    id: string;
    event: string;
    headline: string;
    severity: string;
  };
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Extreme":
        return "bg-red-500";
      case "Severe":
        return "bg-orange-500";
      case "Moderate":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  return (
    <div className="p-3 rounded-lg border">
      <div className="flex items-start gap-2">
        <div className={`h-2 w-2 rounded-full mt-2 ${getSeverityColor(alert.severity)}`} />
        <div>
          <p className="font-medium text-sm">{alert.event}</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{alert.headline}</p>
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
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24" />
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
