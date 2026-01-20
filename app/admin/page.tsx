"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users, AlertTriangle, CloudRain } from "lucide-react";
import { TenantOverviewTable } from "@/components/admin/TenantOverviewTable";
import { SystemHealthCard } from "@/components/admin/SystemHealthCard";

export default function AdminDashboard() {
  const stats = useQuery(api.admin.getPlatformStats);
  const tenants = useQuery(api.admin.listAllTenants);
  const health = useQuery(api.admin.getSystemHealth);

  if (stats === undefined || tenants === undefined) {
    return <DashboardSkeleton />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Unable to load platform stats
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Platform Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of all tenants and platform health
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeTenants} active, {stats.suspendedTenants} suspended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIncidentsToday}</div>
            <p className="text-xs text-muted-foreground">Platform-wide</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <CloudRain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalActiveAlerts}</div>
            <p className="text-xs text-muted-foreground">Weather alerts</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown + System Health */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tier Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Tier Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Free</Badge>
                <span className="font-medium">{stats.tierBreakdown.free}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Starter</Badge>
                <span className="font-medium">{stats.tierBreakdown.starter}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-600">Professional</Badge>
                <span className="font-medium">{stats.tierBreakdown.professional}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-600">Enterprise</Badge>
                <span className="font-medium">{stats.tierBreakdown.enterprise}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <SystemHealthCard health={health} />
      </div>

      {/* Tenant Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantOverviewTable
            tenants={tenants || []}
            limit={10}
            showViewAll
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-5 w-96 mt-2" />
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
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
