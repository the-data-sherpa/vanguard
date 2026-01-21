"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { DemoIncident } from "@/lib/demo-types";
import type { Incident, IncidentStatus } from "@/lib/types";
import { IncidentTable } from "@/components/incidents";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Adapt demo incidents to the Incident type expected by shared components
function adaptDemoIncident(demo: DemoIncident): Incident {
  const now = new Date().toISOString();
  return {
    id: demo.id,
    tenantId: "demo",
    source: "pulsepoint",
    callType: demo.callType,
    callTypeCategory: demo.callTypeCategory,
    description: demo.description,
    fullAddress: demo.fullAddress,
    latitude: demo.latitude,
    longitude: demo.longitude,
    units: demo.units,
    status: demo.status as IncidentStatus,
    callReceivedTime: new Date(demo.callReceivedTime).toISOString(),
    callClosedTime: demo.callClosedTime
      ? new Date(demo.callClosedTime).toISOString()
      : undefined,
    created: now,
    updated: now,
  };
}

export default function DemoIncidentsPage() {
  const demoIncidents = useQuery(api.demo.getDemoIncidents);

  // Adapt and filter incidents
  const { activeIncidents, closedIncidents } = useMemo(() => {
    if (!demoIncidents) return { activeIncidents: [], closedIncidents: [] };

    const adapted = demoIncidents.map(adaptDemoIncident);
    return {
      activeIncidents: adapted.filter((i: Incident) => i.status === "active"),
      closedIncidents: adapted.filter((i: Incident) => i.status === "closed"),
    };
  }, [demoIncidents]);

  if (demoIncidents === undefined) {
    return <IncidentsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground">
            View all incident activity
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          Demo Mode
        </Badge>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeIncidents.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closedIncidents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <IncidentTable incidents={activeIncidents} />
        </TabsContent>

        <TabsContent value="closed">
          <IncidentTable incidents={closedIncidents} />
        </TabsContent>
      </Tabs>

      {/* Count Info */}
      <div className="text-sm text-muted-foreground">
        <p>
          Showing {activeIncidents.length + closedIncidents.length} demo incidents
        </p>
      </div>
    </div>
  );
}

function IncidentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-10 w-48" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
