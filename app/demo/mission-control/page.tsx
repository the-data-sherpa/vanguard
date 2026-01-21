"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { formatDistanceToNow } from "date-fns";
import {
  Radio,
  CheckCircle,
  Clock,
  AlertCircle,
  Facebook,
  MapPin,
  Truck,
  MessageSquarePlus,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useState } from "react";

// Call type category colors (with dark mode support)
const categoryColors: Record<string, string> = {
  fire: "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800",
  medical: "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  rescue: "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  traffic: "bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800",
  hazmat: "bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  other: "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
};

// Sync status badge component
function DemoSyncStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "posted":
      return (
        <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950">
          <CheckCircle className="mr-1 h-3 w-3" />
          Posted
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="text-yellow-600 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-950">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    case "needs_update":
      return (
        <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950">
          <RefreshCw className="mr-1 h-3 w-3" />
          Needs Update
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="outline" className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
}

// Demo incident card component
interface DemoIncident {
  _id: string;
  id: string;
  callType: string;
  callTypeCategory: string;
  description: string;
  fullAddress: string;
  units: string[];
  status: string;
  callReceivedTime: number;
  syncStatus: string;
  updateCount: number;
  pendingUpdateCount: number;
  facebookPostId?: string;
  syncError?: string;
  source: string;
}

function DemoIncidentPostCard({ incident }: { incident: DemoIncident }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const categoryClass =
    categoryColors[incident.callTypeCategory || "other"] || categoryColors.other;
  const unitCount = incident.units?.length || 0;

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
                <DemoSyncStatusBadge status={incident.syncStatus} />
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
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                <ExternalLink className="h-3.5 w-3.5" />
                View Post
              </span>
            )}
          </div>

          {/* Expanded content */}
          <CollapsibleContent>
            <div className="mt-4 pt-4 border-t space-y-4">
              {/* Description */}
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{incident.description}</p>
              </div>

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

              {/* Demo action buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Add Update
                </Button>
                {incident.syncStatus === "failed" && (
                  <Button variant="outline" size="sm" disabled>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry Post
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground italic">
                Actions are disabled in demo mode
              </p>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

export default function DemoMissionControlPage() {
  const stats = useQuery(api.demo.getDemoMissionControlStats);
  const pendingPosts = useQuery(api.demo.getDemoPendingPosts);
  const postedIncidents = useQuery(api.demo.getDemoPostedIncidents);
  const failedPosts = useQuery(api.demo.getDemoFailedPosts);

  // Loading state
  if (stats === undefined) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Radio className="h-8 w-8" />
            Mission Control
          </h1>
          <p className="text-muted-foreground">
            Manage incident updates and social media posts
          </p>
        </div>
        <Button variant="outline" disabled>
          Create Incident
        </Button>
      </div>

      {/* Facebook Connection Status */}
      {stats?.facebookConnected && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Facebook className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100">Connected to {stats.facebookPageName}</p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Posts will be published to your Facebook page
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                <CheckCircle className="mr-1 h-3 w-3" />
                Connected
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <Radio className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeIncidents ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Posts</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingPosts ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.postedIncidents ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.failedPosts ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending updates indicator */}
      {stats && stats.pendingUpdates > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4" />
          {stats.pendingUpdates} update{stats.pendingUpdates !== 1 ? "s" : ""} pending sync
        </div>
      )}

      {/* Incident Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pendingPosts && pendingPosts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pendingPosts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="posted" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Posted
          </TabsTrigger>
          <TabsTrigger value="failed" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Failed
            {failedPosts && failedPosts.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {failedPosts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pendingPosts === undefined ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </>
          ) : pendingPosts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending posts</p>
                <p className="text-sm text-muted-foreground mt-1">
                  New incidents will appear here when they&apos;re ready to post
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingPosts.map((incident) => (
              <DemoIncidentPostCard key={incident._id} incident={incident} />
            ))
          )}
        </TabsContent>

        <TabsContent value="posted" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {postedIncidents === undefined ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </>
          ) : postedIncidents.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No posted incidents yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Incidents will appear here after they&apos;ve been posted to Facebook
                </p>
              </CardContent>
            </Card>
          ) : (
            postedIncidents.map((incident) => (
              <DemoIncidentPostCard key={incident._id} incident={incident} />
            ))
          )}
        </TabsContent>

        <TabsContent value="failed" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {failedPosts === undefined ? (
            <>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </>
          ) : failedPosts.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No failed posts</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All posts have been synced successfully
                </p>
              </CardContent>
            </Card>
          ) : (
            failedPosts.map((incident) => (
              <DemoIncidentPostCard key={incident._id} incident={incident} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Demo feature callout */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Radio className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">Mission Control Features</p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                <li>• <strong>Pending:</strong> Active incidents awaiting initial Facebook post</li>
                <li>• <strong>Posted:</strong> Incidents synced to Facebook (with update tracking)</li>
                <li>• <strong>Failed:</strong> Posts that encountered errors (with retry options)</li>
                <li>• <strong>Updates:</strong> Add real-time updates that sync to existing posts</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
