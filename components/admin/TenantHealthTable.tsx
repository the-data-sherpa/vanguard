"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  Radio,
  CloudRain,
  MoreHorizontal,
  RefreshCw,
  Facebook,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HealthCardView } from "./HealthCardView";

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

interface TenantHealthTableProps {
  data: TenantHealthData[];
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

function formatTimestamp(ts: number | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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

export function TenantHealthTable({ data }: TenantHealthTableProps) {
  const [loadingTenant, setLoadingTenant] = useState<string | null>(null);
  const triggerSync = useAction(api.admin.triggerTenantSync);

  const handleSync = async (
    tenantId: Id<"tenants">,
    syncType: "incident" | "weather"
  ) => {
    setLoadingTenant(`${tenantId}-${syncType}`);
    try {
      await triggerSync({ tenantId, syncType });
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setLoadingTenant(null);
    }
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active tenants found
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card View */}
      <div className="md:hidden">
        <HealthCardView
          data={data}
          loadingTenant={loadingTenant}
          onSync={handleSync}
        />
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tenant</TableHead>
            <TableHead>Sync Status</TableHead>
            <TableHead className="text-center">Active</TableHead>
            <TableHead className="text-center">Success Rate</TableHead>
            <TableHead className="text-center">Errors (24h)</TableHead>
            <TableHead className="text-center">Integrations</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((tenant) => {
            const hasIssues =
              tenant.incidentSyncStale ||
              tenant.weatherSyncStale ||
              tenant.errorsLast24h > 0 ||
              tenant.facebookTokenExpired;

            return (
              <TableRow
                key={tenant.tenantId}
                className={cn(hasIssues && "bg-destructive/5")}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {tenant.displayName || tenant.tenantName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      /{tenant.tenantSlug}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
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
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary">{tenant.activeIncidentCount}</Badge>
                </TableCell>
                <TableCell className="text-center">
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
                </TableCell>
                <TableCell className="text-center">
                  {tenant.errorsLast24h > 0 ? (
                    <Badge variant="destructive">{tenant.errorsLast24h}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center gap-1">
                    {tenant.hasFacebook && (
                      <Badge
                        variant={
                          tenant.facebookTokenExpired ? "destructive" : "outline"
                        }
                        className="gap-1"
                      >
                        <Facebook className="h-3 w-3" />
                        {tenant.facebookTokenExpired && (
                          <XCircle className="h-3 w-3" />
                        )}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {tenant.hasPulsepoint && (
                        <DropdownMenuItem
                          onClick={() => handleSync(tenant.tenantId, "incident")}
                          disabled={
                            loadingTenant === `${tenant.tenantId}-incident`
                          }
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
                          onClick={() => handleSync(tenant.tenantId, "weather")}
                          disabled={
                            loadingTenant === `${tenant.tenantId}-weather`
                          }
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </>
  );
}
