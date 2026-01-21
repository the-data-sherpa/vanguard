"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Activity,
  XCircle,
} from "lucide-react";
import { SyncHistoryChart } from "@/components/admin/SyncHistoryChart";
import { PlatformIncidentChart } from "@/components/admin/PlatformIncidentChart";
import { TenantHealthTable } from "@/components/admin/TenantHealthTable";
import { ErrorLogTable } from "@/components/admin/ErrorLogTable";
import { ExternalServiceStatus } from "@/components/admin/ExternalServiceStatus";

function formatTimeAgo(timestamp: number | null) {
  if (!timestamp) return "Never";

  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "< 1m ago";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export default function SystemHealthPage() {
  const healthSummary = useQuery(api.adminHealth.getHealthSummary);
  const syncHistory = useQuery(api.adminHealth.getSyncHistory, { days: 7 });
  const platformIncidents = useQuery(api.adminHealth.getPlatformIncidentTrends, {
    days: 30,
  });
  const tenantHealth = useQuery(api.adminHealth.getTenantHealthDetails);
  const recentErrors = useQuery(api.adminHealth.getRecentErrors, { limit: 20 });

  const isLoading =
    healthSummary === undefined ||
    syncHistory === undefined ||
    platformIncidents === undefined ||
    tenantHealth === undefined ||
    recentErrors === undefined;

  if (isLoading) {
    return <HealthPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health</h1>
          <p className="text-muted-foreground mt-1">
            Platform-wide monitoring and diagnostics
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Sync Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
            {healthSummary?.allOperational ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthSummary?.allOperational ? (
                <span className="text-green-600">OK</span>
              ) : (
                <span className="text-yellow-600">
                  {healthSummary?.staleSyncsCount} Stale
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Last sync: {formatTimeAgo(healthSummary?.lastSuccessfulSync ?? null)}
            </p>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            {(healthSummary?.errorRate ?? 0) > 5 ? (
              <XCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthSummary?.errorRate ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {healthSummary?.errors24h ?? 0} errors in last 24h
            </p>
          </CardContent>
        </Card>

        {/* Active Tenants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthSummary?.activeTenants ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {healthSummary?.staleSyncsCount ?? 0} with stale syncs
            </p>
          </CardContent>
        </Card>

        {/* External Services */}
        <ExternalServiceStatus />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        <SyncHistoryChart data={syncHistory || []} />
        <PlatformIncidentChart data={platformIncidents || []} />
      </div>

      {/* Tenant Health Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Tenant Health
            {tenantHealth && (
              <Badge
                variant={
                  tenantHealth.allOperational ? "outline" : "destructive"
                }
                className={
                  tenantHealth.allOperational ? "text-green-600" : ""
                }
              >
                {tenantHealth.allOperational ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    All Healthy
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {tenantHealth.staleSyncsCount +
                      tenantHealth.tenantsWithErrorsCount}{" "}
                    Issues
                  </>
                )}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TenantHealthTable data={tenantHealth?.healthByTenant || []} />
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recent Errors
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              Last 24h
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ErrorLogTable errors={recentErrors || []} />
        </CardContent>
      </Card>
    </div>
  );
}

function HealthPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
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
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[250px] w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
