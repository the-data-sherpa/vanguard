"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  StatusHeader,
  OperationalStatus,
  WeatherAlertSummary,
  HistoryTimeline,
  PublicIncidentCard,
  BusiestHours,
  LastHourActivity,
} from "@/components/status";

export default function PublicStatusPage() {
  const params = useParams();
  const slug = params.slug as string;

  const tenantInfo = useQuery(api.status.getPublicTenantInfo, { slug });
  const incidents = useQuery(api.status.getPublicIncidents, { slug });
  const alerts = useQuery(api.status.getPublicWeatherAlerts, { slug });
  const history = useQuery(api.status.getIncidentHistory, { slug, days: 30 });
  const hourlyStats = useQuery(api.status.getHourlyStats, { slug });
  const recentIncidents = useQuery(api.status.getRecentIncidents, { slug });

  // Loading state
  if (tenantInfo === undefined || incidents === undefined || alerts === undefined || history === undefined || hourlyStats === undefined || recentIncidents === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found or feature disabled
  if (tenantInfo === null || incidents === null) {
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

  // Split incidents into medical and non-medical
  const medicalIncidents = incidents.filter(
    (i) => i.callTypeCategory === "medical"
  );
  const nonMedicalIncidents = incidents.filter(
    (i) => i.callTypeCategory !== "medical"
  );

  const totalIncidents = incidents.length;
  const totalAlerts = alerts?.length || 0;

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
            activeIncidentCount={totalIncidents}
            activeAlertCount={totalAlerts}
          />

          {/* Active Incidents with Tabs */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Active Incidents</h2>

            <Tabs defaultValue="non-medical" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="non-medical" className="flex items-center gap-2">
                  Fire / Rescue / Traffic
                  {nonMedicalIncidents.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {nonMedicalIncidents.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="medical" className="flex items-center gap-2">
                  Medical
                  {medicalIncidents.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {medicalIncidents.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="non-medical" className="mt-4">
                {nonMedicalIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active fire, rescue, or traffic incidents
                  </div>
                ) : (
                  <div className="space-y-4">
                    {nonMedicalIncidents.map((incident) => (
                      <PublicIncidentCard
                        key={incident._id}
                        incident={incident}
                        unitLegend={tenantInfo.unitLegend}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="medical" className="mt-4">
                {medicalIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No active medical incidents
                  </div>
                ) : (
                  <div className="space-y-4">
                    {medicalIncidents.map((incident) => (
                      <PublicIncidentCard
                        key={incident._id}
                        incident={incident}
                        unitLegend={tenantInfo.unitLegend}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Weather Alerts */}
          {alerts && alerts.length > 0 && (
            <WeatherAlertSummary alerts={alerts} />
          )}

          {/* Last Hour Activity */}
          {recentIncidents && (
            <LastHourActivity incidents={recentIncidents} />
          )}

          {/* Busiest Hours Heatmap */}
          {hourlyStats && hourlyStats.length > 0 && (
            <BusiestHours hourlyData={hourlyStats} />
          )}

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
