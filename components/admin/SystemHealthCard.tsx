"use client";

import { CheckCircle, AlertTriangle, Radio, CloudRain } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StaleSyncInfo {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  incidentSyncAge: number | null;
  weatherSyncAge: number | null;
  incidentSyncStale: boolean | undefined;
  weatherSyncStale: boolean | undefined;
  hasPulsepoint: boolean | undefined;
  hasWeather: boolean | undefined;
}

interface SystemHealthData {
  allOperational: boolean;
  totalActive: number;
  staleSyncs: StaleSyncInfo[];
}

interface SystemHealthCardProps {
  health: SystemHealthData | null | undefined;
}

export function SystemHealthCard({ health }: SystemHealthCardProps) {
  if (!health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Loading health data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatSyncAge = (ageMs: number | null) => {
    if (ageMs === null) return "Never";
    const minutes = Math.floor(ageMs / 60000);
    if (minutes < 1) return "< 1m";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          System Health
          {health.allOperational ? (
            <Badge variant="outline" className="text-green-600 ml-auto">
              <CheckCircle className="h-3 w-3 mr-1" />
              Operational
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-auto">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {health.staleSyncs.length} Issue{health.staleSyncs.length !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {health.allOperational ? (
          <div className="flex items-center justify-center py-4 text-green-600">
            <CheckCircle className="h-8 w-8 mr-3" />
            <div>
              <div className="font-medium">All Systems Operational</div>
              <div className="text-sm text-muted-foreground">
                {health.totalActive} active tenant{health.totalActive !== 1 ? "s" : ""} syncing normally
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              The following tenants have stale syncs (&gt;10 min):
            </p>
            <div className="space-y-2">
              {health.staleSyncs.map((tenant) => (
                <div
                  key={tenant.tenantId}
                  className="flex items-center justify-between p-2 rounded-md bg-destructive/10 border border-destructive/20"
                >
                  <div>
                    <div className="font-medium text-sm">{tenant.tenantName}</div>
                    <div className="text-xs text-muted-foreground">
                      /{tenant.tenantSlug}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {tenant.incidentSyncStale && (
                      <Badge variant="outline" className="text-amber-600">
                        <Radio className="h-3 w-3 mr-1" />
                        {formatSyncAge(tenant.incidentSyncAge)}
                      </Badge>
                    )}
                    {tenant.weatherSyncStale && (
                      <Badge variant="outline" className="text-amber-600">
                        <CloudRain className="h-3 w-3 mr-1" />
                        {formatSyncAge(tenant.weatherSyncAge)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
