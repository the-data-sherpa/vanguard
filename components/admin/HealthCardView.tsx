"use client";

import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Radio,
  CloudRain,
  RefreshCw,
  Facebook,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TenantHealthData {
  tenantId: Id<"tenants">;
  tenantSlug: string;
  tenantName: string;
  displayName?: string;
  incidentSyncAge: number | null;
  weatherSyncAge: number | null;
  incidentSyncStale: boolean | undefined;
  weatherSyncStale: boolean | undefined;
  hasPulsepoint: boolean | undefined;
  hasWeather: boolean | undefined;
  lastIncidentSync?: number;
  lastWeatherSync?: number;
  activeIncidentCount: number;
  errorsLast24h: number;
  lastErrorTime: number | null;
  syncSuccessRate: number;
  hasFacebook: boolean | undefined;
  facebookTokenExpired: boolean | undefined;
}

interface HealthCardViewProps {
  data: TenantHealthData[];
  loadingTenant: string | null;
  onSync: (tenantId: Id<"tenants">, syncType: "incident" | "weather") => void;
}

function formatSyncAge(ageMs: number | null) {
  if (ageMs === null) return "Never";
  const minutes = Math.floor(ageMs / 60000);
  if (minutes < 1) return "< 1m ago";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SyncStatusBadge({
  isStale,
  age,
  type,
}: {
  isStale: boolean | undefined;
  age: number | null;
  type: "incident" | "weather";
}) {
  const Icon = type === "incident" ? Radio : CloudRain;

  if (age === null) {
    return (
      <Badge variant="outline" className="text-muted-foreground gap-1">
        <Icon className="h-3 w-3" />
        Never
      </Badge>
    );
  }

  if (isStale) {
    return (
      <Badge variant="destructive" className="gap-1">
        <Icon className="h-3 w-3" />
        {formatSyncAge(age)}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="text-green-600 gap-1">
      <Icon className="h-3 w-3" />
      {formatSyncAge(age)}
    </Badge>
  );
}

export function HealthCardView({ data, loadingTenant, onSync }: HealthCardViewProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active tenants found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((tenant) => {
        const hasIssues =
          tenant.incidentSyncStale ||
          tenant.weatherSyncStale ||
          tenant.errorsLast24h > 0 ||
          tenant.facebookTokenExpired;

        return (
          <Card
            key={tenant.tenantId}
            className={cn(hasIssues && "border-destructive/50 bg-destructive/5")}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">
                    {tenant.displayName || tenant.tenantName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    /{tenant.tenantSlug}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="touch" className="shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {tenant.hasPulsepoint && (
                      <DropdownMenuItem
                        onClick={() => onSync(tenant.tenantId, "incident")}
                        disabled={loadingTenant === `${tenant.tenantId}-incident`}
                      >
                        <RefreshCw
                          className={cn(
                            "h-4 w-4 mr-2",
                            loadingTenant === `${tenant.tenantId}-incident` &&
                              "animate-spin"
                          )}
                        />
                        Sync Incidents
                      </DropdownMenuItem>
                    )}
                    {tenant.hasWeather && (
                      <DropdownMenuItem
                        onClick={() => onSync(tenant.tenantId, "weather")}
                        disabled={loadingTenant === `${tenant.tenantId}-weather`}
                      >
                        <RefreshCw
                          className={cn(
                            "h-4 w-4 mr-2",
                            loadingTenant === `${tenant.tenantId}-weather` &&
                              "animate-spin"
                          )}
                        />
                        Sync Weather
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Sync Status */}
              <div className="flex flex-wrap gap-1 mt-3">
                {tenant.hasPulsepoint && (
                  <SyncStatusBadge
                    isStale={tenant.incidentSyncStale}
                    age={tenant.incidentSyncAge}
                    type="incident"
                  />
                )}
                {tenant.hasWeather && (
                  <SyncStatusBadge
                    isStale={tenant.weatherSyncStale}
                    age={tenant.weatherSyncAge}
                    type="weather"
                  />
                )}
                {!tenant.hasPulsepoint && !tenant.hasWeather && (
                  <span className="text-xs text-muted-foreground">
                    No syncs configured
                  </span>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Active:</span>
                  <Badge variant="secondary">{tenant.activeIncidentCount}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Success:</span>
                  <span
                    className={cn(
                      "font-medium",
                      tenant.syncSuccessRate >= 95 && "text-green-600",
                      tenant.syncSuccessRate >= 80 &&
                        tenant.syncSuccessRate < 95 &&
                        "text-yellow-600",
                      tenant.syncSuccessRate < 80 && "text-red-600"
                    )}
                  >
                    {tenant.syncSuccessRate}%
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground">Errors:</span>
                  {tenant.errorsLast24h > 0 ? (
                    <Badge variant="destructive">{tenant.errorsLast24h}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </div>
                {tenant.hasFacebook && (
                  <Badge
                    variant={tenant.facebookTokenExpired ? "destructive" : "outline"}
                    className="gap-1"
                  >
                    <Facebook className="h-3 w-3" />
                    {tenant.facebookTokenExpired && <XCircle className="h-3 w-3" />}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
