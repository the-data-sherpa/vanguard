import { getTenantBySlug } from '@/services/tenant';
import { notFound } from 'next/navigation';
import type { TenantContext } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SyncControls } from './SyncControls';
import { PulsePointConfig } from './PulsePointConfig';

interface SettingsPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug);

  if (!tenant) {
    notFound();
  }

  // Debug: Log unit legend status (only when DEBUG=true)
  if (process.env.DEBUG === 'true') {
    console.log('[settings] Tenant unit legend data:', {
      id: tenant.id,
      unitLegendAvailable: tenant.unitLegendAvailable,
      unitLegendUpdatedAt: tenant.unitLegendUpdatedAt,
      unitLegendCount: tenant.unitLegend?.length ?? 0,
    });
  }

  // Build tenant context
  const ctx: TenantContext = {
    id: tenant.id,
    slug: tenant.slug,
    status: tenant.status,
    tier: tenant.tier,
    features: tenant.features ?? {},
  };

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
              tenantSlug={slug}
              tenantId={tenant.id}
              hasWeatherEnabled={ctx.features.weatherAlerts ?? false}
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
              <span className="font-medium">{tenant.name}</span>
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
              tenantSlug={slug}
              initialAgencyId={tenant.pulsepointAgencyId}
            />
            {tenant.pulsepointConfig?.agencyIds && tenant.pulsepointConfig.agencyIds.length > 0 && (
              <div className="flex justify-between pt-3 border-t">
                <span className="text-muted-foreground">Additional Agencies</span>
                <span className="font-mono text-sm">
                  {tenant.pulsepointConfig.agencyIds.length}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
