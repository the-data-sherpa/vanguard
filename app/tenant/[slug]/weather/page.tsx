"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { adaptWeatherAlerts } from "@/lib/convex-adapters";
import { WeatherAlertList } from "@/components/weather";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function WeatherPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Get tenant
  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const tenantId = tenant?._id;

  // Get weather alerts - REACTIVE, auto-updates
  const alertsRaw = useQuery(
    api.weather.list,
    tenantId ? { tenantId, includeExpired: true, limit: 100 } : "skip"
  );

  // Redirect if weather alerts are not enabled - must be in useEffect, not during render
  const shouldRedirect = tenant && !tenant.features?.weatherAlerts;
  useEffect(() => {
    if (shouldRedirect) {
      router.push(`/tenant/${slug}`);
    }
  }, [shouldRedirect, router, slug]);

  // Memoize alerts to maintain consistent hook order
  const { alerts, activeAlerts, expiredAlerts } = useMemo(() => {
    if (!alertsRaw) return { alerts: [], activeAlerts: [], expiredAlerts: [] };
    const adapted = adaptWeatherAlerts(alertsRaw);
    return {
      alerts: adapted,
      activeAlerts: adapted.filter((a) => a.status === "active"),
      expiredAlerts: adapted.filter((a) => a.status === "expired" || a.status === "cancelled"),
    };
  }, [alertsRaw]);

  // Loading state or redirecting
  if (!tenant || alertsRaw === undefined || shouldRedirect) {
    return <WeatherPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Weather Alerts</h1>
          <p className="text-muted-foreground">
            Active weather alerts for your area
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Real-time
        </Badge>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeAlerts.length})
          </TabsTrigger>
          <TabsTrigger value="expired">
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

      {/* Info about weather zones */}
      {tenant.weatherZones && tenant.weatherZones.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-1">Monitored Weather Zones</p>
          <p className="text-muted-foreground">{tenant.weatherZones.join(", ")}</p>
        </div>
      )}
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
