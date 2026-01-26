"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Truck, MapPin, Clock, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface UnitDrillDownProps {
  tenantId: Id<"tenants"> | undefined;
  unitId: string | null;
  startTime: number;
  endTime: number;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  fire: "bg-orange-500",
  medical: "bg-red-500",
  traffic: "bg-blue-500",
  rescue: "bg-purple-500",
  hazmat: "bg-yellow-500",
  other: "bg-gray-500",
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function UnitDrillDown({ tenantId, unitId, startTime, endTime, onClose }: UnitDrillDownProps) {
  const incidents = useQuery(
    api.analytics.getUnitIncidents,
    tenantId && unitId
      ? { tenantId, unitId, startTime, endTime, limit: 50 }
      : "skip"
  );

  const isOpen = unitId !== null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Unit: {unitId}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
            <div className="text-center">
              <p className="text-2xl font-bold">{incidents?.length ?? "—"}</p>
              <p className="text-xs text-muted-foreground">Dispatches</p>
            </div>
            <div className="text-xs text-muted-foreground">
              in selected date range
            </div>
          </div>

          {/* Incident list */}
          <div>
            <h4 className="text-sm font-medium mb-2">Recent Incidents</h4>
            <ScrollArea className="h-[300px] pr-4">
              {incidents === undefined ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : incidents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No incidents found for this unit
                </p>
              ) : (
                <div className="space-y-2">
                  {incidents.map((incident) => (
                    <div
                      key={incident._id}
                      className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                categoryColors[incident.callTypeCategory || "other"]
                              }`}
                            />
                            <span className="font-medium text-sm truncate">
                              {incident.callType}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">{incident.fullAddress}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(incident.callReceivedTime)}
                          </div>
                          <Badge
                            variant={incident.status === "active" ? "default" : "secondary"}
                            className="mt-1 text-xs"
                          >
                            {incident.status}
                          </Badge>
                        </div>
                      </div>
                      {incident.units && incident.units.length > 1 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {incident.units.slice(0, 6).map((unit) => (
                            <Badge
                              key={unit}
                              variant={unit === unitId ? "default" : "outline"}
                              className="text-xs"
                            >
                              {unit}
                            </Badge>
                          ))}
                          {incident.units.length > 6 && (
                            <Badge variant="outline" className="text-xs">
                              +{incident.units.length - 6} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
