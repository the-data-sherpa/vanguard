"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Clock,
  Truck,
  MessageSquarePlus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Loader2,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { SyncStatusBadge, SyncStatus } from "./SyncStatusBadge";
import { UpdatesList } from "./UpdatesList";
import { cn } from "@/lib/utils";

// Call type category colors (with dark mode support)
const categoryColors: Record<string, string> = {
  fire: "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
  medical: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  rescue: "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  traffic: "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  hazmat: "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  other: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

interface EnrichedIncident extends Doc<"incidents"> {
  syncStatus: SyncStatus;
  updateCount: number;
  pendingUpdateCount: number;
}

interface IncidentPostCardProps {
  incident: EnrichedIncident;
  tenantId: Id<"tenants">;
  isOwner?: boolean;
}

export function IncidentPostCard({ incident, tenantId, isOwner = false }: IncidentPostCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newUpdate, setNewUpdate] = useState("");
  const [isAddingUpdate, setIsAddingUpdate] = useState(false);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const createUpdate = useMutation(api.incidentUpdates.create);
  const updateStatus = useMutation(api.incidents.updateStatus);
  const updates = useQuery(
    api.incidentUpdates.listByIncident,
    isExpanded ? { tenantId, incidentId: incident._id } : "skip"
  );

  const categoryClass =
    categoryColors[incident.callTypeCategory || "other"] || categoryColors.other;

  // Get sync status for badge
  const getSyncStatus = (): SyncStatus => {
    if (incident.syncError) return "failed";
    if (incident.needsFacebookUpdate) return "needs_update";
    if (incident.isSyncedToFacebook) return "posted";
    return "pending";
  };

  // Get unit count
  const unitCount = incident.units?.length || 0;

  // Handle adding an update
  const handleAddUpdate = async () => {
    if (!newUpdate.trim()) return;

    setIsAddingUpdate(true);
    try {
      await createUpdate({
        tenantId,
        incidentId: incident._id,
        content: newUpdate.trim(),
      });
      setNewUpdate("");
      setShowUpdateForm(false);
    } catch (error) {
      console.error("Failed to add update:", error);
    } finally {
      setIsAddingUpdate(false);
    }
  };

  // Handle closing a manual incident
  const handleCloseIncident = async () => {
    setIsClosing(true);
    try {
      await updateStatus({
        id: incident._id,
        status: "closed",
      });
    } catch (error) {
      console.error("Failed to close incident:", error);
    } finally {
      setIsClosing(false);
    }
  };

  // Check if this incident can be closed (manual incidents only)
  const canClose = incident.status === "active" && incident.source === "manual" && isOwner;

  return (
    <Card className="h-full hover:shadow-md transition-shadow flex flex-col">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="flex flex-col flex-1">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="outline" className={cn("font-medium", categoryClass)}>
                  {incident.callType}
                </Badge>
                <SyncStatusBadge status={getSyncStatus()} />
                {incident.status === "closed" && (
                  <Badge variant="secondary">Closed</Badge>
                )}
              </div>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{incident.fullAddress}</span>
              </CardTitle>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CardContent className="pb-3">
          {/* Summary row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDistanceToNow(incident.callReceivedTime, { addSuffix: true })}
            </span>
            {unitCount > 0 && (
              <span className="flex items-center gap-1">
                <Truck className="h-3.5 w-3.5" />
                {unitCount} unit{unitCount !== 1 ? "s" : ""}
              </span>
            )}
            {incident.updateCount > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquarePlus className="h-3.5 w-3.5" />
                {incident.updateCount} update{incident.updateCount !== 1 ? "s" : ""}
                {incident.pendingUpdateCount > 0 && (
                  <span className="text-yellow-600 dark:text-yellow-400 ml-1">
                    ({incident.pendingUpdateCount} pending)
                  </span>
                )}
              </span>
            )}
            {incident.facebookPostId && (
              <a
                href={`https://facebook.com/${incident.facebookPostId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View Post
              </a>
            )}
          </div>

          {/* Expanded content */}
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t space-y-4">
              {/* Units */}
              {incident.units && incident.units.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Units</h4>
                  <div className="flex flex-wrap gap-1">
                    {incident.units.map((unit, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {unit}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Sync error */}
              {incident.syncError && (
                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    <strong>Sync Error:</strong> {incident.syncError}
                  </p>
                </div>
              )}

              {/* Updates list */}
              {updates && updates.length > 0 && (
                <UpdatesList updates={updates} tenantId={tenantId} />
              )}

              {/* Add update form */}
              {showUpdateForm ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Add an update about this incident..."
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowUpdateForm(false);
                        setNewUpdate("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddUpdate}
                      disabled={!newUpdate.trim() || isAddingUpdate}
                    >
                      {isAddingUpdate && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Update
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUpdateForm(true)}
                  >
                    <MessageSquarePlus className="mr-2 h-4 w-4" />
                    Add Update
                  </Button>

                  {canClose && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" disabled={isClosing}>
                          {isClosing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="mr-2 h-4 w-4" />
                          )}
                          Close Incident
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Close this incident?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will mark the incident at {incident.fullAddress} as closed.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCloseIncident}>
                            Close Incident
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}
