import { getTenantBySlug } from '@/services/tenant';
import { getActiveIncidents, countIncidentsByStatus } from '@/services/incident';
import { getActiveAlerts } from '@/services/weather';
import { notFound } from 'next/navigation';
import type { TenantContext, CallTypeCategory } from '@/lib/types';
import { DashboardHeader, DashboardStats } from '@/components/dashboard';
import { IncidentList } from '@/components/incidents';
import { WeatherAlertBanner, WeatherAlertList } from '@/components/weather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface TenantPageProps {
  params: Promise<{ slug: string }>;
}

export default async function TenantPage({ params }: TenantPageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  // Build tenant context
  const ctx: TenantContext = {
    id: tenant.id,
    slug: tenant.slug,
    status: tenant.status,
    tier: tenant.tier,
    features: tenant.features ?? {},
  };

  // Fetch data in parallel
  const [activeIncidents, incidentCounts, weatherAlerts] = await Promise.all([
    getActiveIncidents(ctx),
    countIncidentsByStatus(ctx),
    ctx.features.weatherAlerts ? getActiveAlerts(ctx) : Promise.resolve([]),
  ]);

  // Calculate stats
  const byCategory: Record<CallTypeCategory, number> = {
    fire: 0,
    medical: 0,
    rescue: 0,
    traffic: 0,
    hazmat: 0,
    other: 0,
  };

  let activeUnits = 0;
  for (const incident of activeIncidents) {
    const category = incident.callTypeCategory ?? 'other';
    byCategory[category]++;
    activeUnits += incident.units?.length ?? 0;
  }

  const stats = {
    totalActive: activeIncidents.length, // Use collapsed count, not raw DB count
    totalToday: activeIncidents.length,
    byCategory,
    activeUnits,
  };

  // Get last sync time from most recent incident
  const lastSyncTime = activeIncidents.length > 0 ? activeIncidents[0].updated : null;

  return (
    <div className="space-y-6">
      {/* Weather Alert Banner */}
      {ctx.features.weatherAlerts && weatherAlerts.length > 0 && (
        <WeatherAlertBanner alerts={weatherAlerts} tenantSlug={slug} />
      )}

      {/* Header */}
      <DashboardHeader
        tenantName={tenant.name}
        lastSyncTime={lastSyncTime}
      />

      {/* Stats */}
      <DashboardStats stats={stats} />

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
          {ctx.features.weatherAlerts && (
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
                <span className="font-medium">{incidentCounts.active}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closed (today)</span>
                <span className="font-medium">{incidentCounts.closed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Archived</span>
                <span className="font-medium">{incidentCounts.archived}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
