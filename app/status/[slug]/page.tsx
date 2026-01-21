"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, AlertTriangle } from "lucide-react";
import {
  StatusHeader,
  OperationalStatus,
  IncidentSummary,
  WeatherAlertSummary,
  HistoryTimeline,
} from "@/components/status";

export default function PublicStatusPage() {
  const params = useParams();
  const slug = params.slug as string;

  const tenantInfo = useQuery(api.status.getPublicTenantInfo, { slug });
  const stats = useQuery(api.status.getPublicStats, { slug });
  const alerts = useQuery(api.status.getPublicWeatherAlerts, { slug });
  const history = useQuery(api.status.getIncidentHistory, { slug, days: 30 });

  // Loading state
  if (tenantInfo === undefined || stats === undefined || alerts === undefined || history === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found or feature disabled
  if (tenantInfo === null || stats === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-2">Status Page Not Available</h1>
        <p className="text-muted-foreground text-center max-w-md">
          This status page is not available. The organization may not exist or the public status page feature may be disabled.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StatusHeader
        name={tenantInfo.name}
        logoUrl={tenantInfo.logoUrl}
        primaryColor={tenantInfo.primaryColor}
      />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Overall Status */}
          <OperationalStatus
            activeIncidentCount={stats.activeIncidentCount}
            activeAlertCount={stats.activeAlertCount}
          />

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            <IncidentSummary
              categoryBreakdown={stats.categoryBreakdown}
              totalCount={stats.activeIncidentCount}
            />
            <WeatherAlertSummary alerts={alerts || []} />
          </div>

          {/* History Timeline */}
          {history && history.length > 0 && (
            <HistoryTimeline history={history} />
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground pt-6 border-t">
            <p>
              Last updated: {new Date().toLocaleString()}
            </p>
            <p className="mt-1">
              Powered by <a href="/" className="hover:underline">Vanguard</a>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
