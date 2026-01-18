"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SyncControls } from "./SyncControls";
import { PulsePointConfig } from "./PulsePointConfig";

export default function SettingsPage() {
  const params = useParams();
  const slug = params.slug as string;

  const tenant = useQuery(api.tenants.getBySlug, { slug });

  if (!tenant) {
    return <SettingsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage tenant configuration and data synchronization
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sync Controls */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Data Synchronization</CardTitle>
            <CardDescription>
              Force sync data from external sources. Automatic syncs run periodically,
              but you can trigger manual syncs here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SyncControls
              tenantId={tenant._id}
              hasWeatherEnabled={tenant.features?.weatherAlerts ?? false}
              unitLegendStatus={{
                available: tenant.unitLegendAvailable,
                updatedAt: tenant.unitLegendUpdatedAt,
                unitCount: tenant.unitLegend?.length ?? 0,
              }}
            />
          </CardContent>
        </Card>

        {/* Tenant Info */}
        <Card>
          <CardHeader>
            <CardTitle>Tenant Information</CardTitle>
            <CardDescription>
              Basic information about this tenant
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{tenant.displayName || tenant.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-sm">{tenant.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{tenant.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tier</span>
              <span className="font-medium capitalize">{tenant.tier}</span>
            </div>
            {tenant.lastIncidentSync && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Incident Sync</span>
                <span className="text-sm">
                  {new Date(tenant.lastIncidentSync).toLocaleString()}
                </span>
              </div>
            )}
            {tenant.lastWeatherSync && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Weather Sync</span>
                <span className="text-sm">
                  {new Date(tenant.lastWeatherSync).toLocaleString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PulsePoint Config */}
        <Card>
          <CardHeader>
            <CardTitle>PulsePoint Configuration</CardTitle>
            <CardDescription>
              Emergency incident data source settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PulsePointConfig
              tenantId={tenant._id}
              initialConfig={tenant.pulsepointConfig}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
