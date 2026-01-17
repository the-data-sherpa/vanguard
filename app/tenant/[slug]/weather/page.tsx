import { getTenantBySlug } from '@/services/tenant';
import { listAlerts, getActiveAlerts } from '@/services/weather';
import { notFound, redirect } from 'next/navigation';
import type { TenantContext, AlertStatus } from '@/lib/types';
import { WeatherAlertList } from '@/components/weather';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WeatherPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function WeatherPage({ params, searchParams }: WeatherPageProps) {
  const { slug } = await params;
  const search = await searchParams;
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

  // Check if weather alerts are enabled
  if (!ctx.features.weatherAlerts) {
    redirect(`/tenant/${slug}`);
  }

  // Parse query params
  const status = (search.status as AlertStatus) || 'active';

  // Fetch alerts based on status
  const result = status === 'active'
    ? { items: await getActiveAlerts(ctx), totalItems: 0, totalPages: 1 }
    : await listAlerts(ctx, { status });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Weather Alerts</h1>
        <p className="text-muted-foreground">
          Active weather alerts for your area
        </p>
      </div>

      <Tabs defaultValue={status} className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="expired">Expired</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <WeatherAlertList alerts={result.items.filter(a => a.status === 'active')} />
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          <WeatherAlertList alerts={result.items.filter(a => a.status === 'expired')} />
        </TabsContent>
      </Tabs>

      {/* Info about weather zones */}
      {tenant.weatherZones && tenant.weatherZones.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4 text-sm">
          <p className="font-medium mb-1">Monitored Weather Zones</p>
          <p className="text-muted-foreground">
            {tenant.weatherZones.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
