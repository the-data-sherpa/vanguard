"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PublicIncidentCard } from "@/components/status";

type StatusLevel = "operational" | "degraded" | "major";

function getStatusLevel(incidentCount: number, alertCount: number): StatusLevel {
  if (incidentCount >= 5) return "major";
  if (incidentCount > 0 || alertCount > 0) return "degraded";
  return "operational";
}

const statusConfig = {
  operational: {
    icon: CheckCircle,
    label: "All Clear",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-700 dark:text-green-400",
    iconColor: "text-green-500",
  },
  degraded: {
    icon: AlertTriangle,
    label: "Active Incidents",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    textColor: "text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  major: {
    icon: XCircle,
    label: "Multiple Incidents",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
  },
};

export default function EmbedStatusPage() {
  const params = useParams();
  const slug = params.slug as string;

  const tenantInfo = useQuery(api.status.getPublicTenantInfo, { slug });
  const incidents = useQuery(api.status.getPublicIncidents, { slug });
  const alerts = useQuery(api.status.getPublicWeatherAlerts, { slug });

  // Loading state
  if (tenantInfo === undefined || incidents === undefined || alerts === undefined) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found or feature disabled
  if (tenantInfo === null || incidents === null) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Status page not available
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
  const status = getStatusLevel(totalIncidents, totalAlerts);
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <div className="p-4 space-y-4 min-h-[200px]">
      {/* Status Banner */}
      <div className={`p-3 rounded-lg ${config.bgColor} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
          <span className={`font-medium ${config.textColor}`}>
            {config.label}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {totalIncidents} {totalIncidents === 1 ? "incident" : "incidents"}
          </span>
          {totalAlerts > 0 && (
            <span className="text-muted-foreground">
              {totalAlerts} {totalAlerts === 1 ? "alert" : "alerts"}
            </span>
          )}
        </div>
      </div>

      {/* Tabbed Incidents */}
      {totalIncidents > 0 ? (
        <Tabs defaultValue="non-medical" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="non-medical" className="flex items-center gap-2 text-xs">
              Fire / Rescue / Traffic
              {nonMedicalIncidents.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {nonMedicalIncidents.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex items-center gap-2 text-xs">
              Medical
              {medicalIncidents.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {medicalIncidents.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="non-medical" className="mt-3">
            {nonMedicalIncidents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No active fire, rescue, or traffic incidents
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {nonMedicalIncidents.map((incident) => (
                  <PublicIncidentCard key={incident._id} incident={incident} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="medical" className="mt-3">
            {medicalIncidents.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No active medical incidents
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {medicalIncidents.map((incident) => (
                  <PublicIncidentCard key={incident._id} incident={incident} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No active incidents
        </div>
      )}

      {/* Footer link */}
      <div className="text-center pt-2 border-t">
        <a
          href={`/status/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:underline"
        >
          View Full Status Page
        </a>
      </div>
    </div>
  );
}
