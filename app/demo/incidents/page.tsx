"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { DemoIncident } from "@/lib/demo-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame, Activity, Car, AlertTriangle, Biohazard, HelpCircle, Clock, MapPin } from "lucide-react";

export default function DemoIncidentsPage() {
  const demoIncidents = useQuery(api.demo.getDemoIncidents);
  const demoUnitLegend = useQuery(api.demo.getDemoUnitLegend);

  if (demoIncidents === undefined) {
    return <IncidentsPageSkeleton />;
  }

  const activeIncidents = demoIncidents.filter((i: DemoIncident) => i.status === "active");
  const closedIncidents = demoIncidents.filter((i: DemoIncident) => i.status === "closed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
        <p className="text-muted-foreground">
          View all incident activity (demo data)
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Active ({activeIncidents.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closedIncidents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          {activeIncidents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {activeIncidents.map((incident: DemoIncident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  unitLegend={demoUnitLegend || []}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No active incidents
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-6">
          {closedIncidents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {closedIncidents.map((incident: DemoIncident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  unitLegend={demoUnitLegend || []}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No closed incidents
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IncidentCard({
  incident,
  unitLegend,
}: {
  incident: {
    id: string;
    callType: string;
    callTypeCategory: string;
    description?: string;
    fullAddress: string;
    units: string[];
    status: string;
    callReceivedTime: number;
    callClosedTime?: number;
  };
  unitLegend: Array<{ UnitKey: string; Description: string }>;
}) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "fire":
        return <Flame className="h-5 w-5 text-red-500" />;
      case "medical":
        return <Activity className="h-5 w-5 text-blue-500" />;
      case "traffic":
        return <Car className="h-5 w-5 text-orange-500" />;
      case "rescue":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "hazmat":
        return <Biohazard className="h-5 w-5 text-purple-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUnitDescription = (unitKey: string) => {
    const entry = unitLegend.find((u) => u.UnitKey === unitKey);
    return entry?.Description || unitKey;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const timeAgo = Math.floor((Date.now() - incident.callReceivedTime) / 60000);
  const timeDisplay = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;

  return (
    <Card className={incident.status === "closed" ? "opacity-75" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {getCategoryIcon(incident.callTypeCategory)}
            <div>
              <CardTitle className="text-base">{incident.callType}</CardTitle>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {incident.fullAddress}
              </p>
            </div>
          </div>
          <Badge variant={incident.status === "active" ? "default" : "secondary"}>
            {incident.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {incident.description && (
          <p className="text-sm text-muted-foreground">{incident.description}</p>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Started {formatTime(incident.callReceivedTime)} ({timeDisplay})</span>
        </div>

        {incident.callClosedTime && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Closed {formatTime(incident.callClosedTime)}</span>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-2">Units Assigned</p>
          <div className="flex flex-wrap gap-1">
            {incident.units.map((unit) => (
              <Badge
                key={unit}
                variant="outline"
                className="text-xs"
                title={getUnitDescription(unit)}
              >
                {unit}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function IncidentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    </div>
  );
}
