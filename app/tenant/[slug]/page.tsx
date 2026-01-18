"use client";

import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { useState } from "react";
import { adaptIncidents, adaptWeatherAlerts } from "@/lib/convex-adapters";
import type { CallTypeCategory } from "@/lib/types";
import { DashboardHeader, DashboardStats } from "@/components/dashboard";
import { IncidentList } from "@/components/incidents";
import { WeatherAlertBanner, WeatherAlertList } from "@/components/weather";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function TenantDashboard() {
  const params = useParams();
  const slug = params.slug as string;
  const [isSyncing, setIsSyncing] = useState(false);

  // All queries are REACTIVE - they auto-update when data changes
  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const tenantId = tenant?._id;

  const stats = useQuery(
    api.tenants.getStats,
    tenantId ? { tenantId } : "skip"
  );

  const activeIncidentsRaw = useQuery(
    api.incidents.listActive,
    tenantId ? { tenantId } : "skip"
  );

  const weatherAlertsRaw = useQuery(
    api.weather.listActive,
    tenantId ? { tenantId } : "skip"
  );

  // Actions for manual sync
  const triggerIncidentSync = useAction(api.sync.triggerIncidentSync);
  const triggerWeatherSync = useAction(api.sync.triggerWeatherSync);

  // Loading state
  if (!tenant || !stats || activeIncidentsRaw === undefined || weatherAlertsRaw === undefined) {
    return <DashboardSkeleton />;
  }

  // Adapt data for existing components
  const activeIncidents = adaptIncidents(activeIncidentsRaw);
  const weatherAlerts = adaptWeatherAlerts(weatherAlertsRaw);

  // Build stats for DashboardStats component
  const byCategory: Record<CallTypeCategory, number> = {
    fire: stats.categoryBreakdown.fire || 0,
    medical: stats.categoryBreakdown.medical || 0,
    rescue: stats.categoryBreakdown.rescue || 0,
    traffic: stats.categoryBreakdown.traffic || 0,
    hazmat: stats.categoryBreakdown.hazmat || 0,
    other: stats.categoryBreakdown.other || 0,
  };

  const dashboardStats = {
    totalActive: stats.activeIncidentCount,
    totalToday: stats.todaysCallCount,
    byCategory,
    activeUnits: stats.activeUnitCount,
  };

  const handleRefresh = async () => {
    if (!tenantId) return;
    setIsSyncing(true);
    try {
      await Promise.all([
        triggerIncidentSync({ tenantId }),
        triggerWeatherSync({ tenantId }),
      ]);
    } catch (error) {
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const lastSyncTime = tenant.lastIncidentSync
    ? new Date(tenant.lastIncidentSync).toISOString()
    : null;

  return (
    <div className="space-y-6">
      {/* Real-time indicator */}
      <div className="flex justify-end">
        <Badge variant="outline" className="text-xs">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Real-time
        </Badge>
      </div>

      {/* Weather Alert Banner */}
      {tenant.features?.weatherAlerts && weatherAlerts.length > 0 && (
        <WeatherAlertBanner alerts={weatherAlerts} tenantSlug={slug} />
      )}

      {/* Header */}
      <DashboardHeader
        tenantName={tenant.displayName || tenant.name}
        lastSyncTime={lastSyncTime}
        isSyncing={isSyncing}
        onRefresh={handleRefresh}
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
                <Link href={`/tenant/${slug}/incidents`}>
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {activeIncidents.length > 0 ? (
                <IncidentList
                  incidents={activeIncidents.slice(0, 6)}
                  unitLegend={tenant.unitLegend}
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
        <div className="space-y-6">
          {/* Weather Alerts */}
          {tenant.features?.weatherAlerts && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Weather Alerts</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/tenant/${slug}/weather`}>
                    View All
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <WeatherAlertList
                  alerts={weatherAlerts.slice(0, 3)}
                  compact
                />
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Status Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">{stats.activeIncidentCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Today's Calls</span>
                <span className="font-medium">{stats.todaysCallCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Units</span>
                <span className="font-medium">{stats.activeUnitCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Weather Alerts</span>
                <span className="font-medium">{stats.activeAlertCount}</span>
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
              <div className="grid gap-4 md:grid-cols-2">
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
