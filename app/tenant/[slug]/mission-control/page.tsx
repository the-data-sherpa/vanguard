"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Radio,
  CheckCircle,
  Facebook,
  Settings,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IncidentPostCard } from "@/components/mission-control/IncidentPostCard";
import { CreateIncidentDialog } from "@/components/incidents";
import Link from "next/link";

interface MissionControlPageProps {
  params: Promise<{ slug: string }>;
}

export default function MissionControlPage({ params }: MissionControlPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const currentUser = useQuery(api.users.getCurrentUser);

  // Get all incidents for Mission Control
  const incidents = useQuery(
    api.missionControl.getAllMissionControlIncidents,
    tenant ? { tenantId: tenant._id } : "skip"
  );

  // Get stats for summary cards
  const stats = useQuery(
    api.missionControl.getDashboardStats,
    tenant ? { tenantId: tenant._id } : "skip"
  );

  // Loading state
  if (tenant === undefined || currentUser === undefined) {
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

  if (!tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Tenant not found</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please sign in to continue</p>
      </div>
    );
  }

  const isOwner = currentUser.tenantRole === "owner";

  // Count incidents by status
  type MissionControlIncident = NonNullable<typeof incidents>[number];
  const pendingCount = incidents?.filter((i: MissionControlIncident) => i.syncStatus === "pending").length ?? 0;
  const postedCount = incidents?.filter((i: MissionControlIncident) => i.syncStatus === "posted").length ?? 0;
  const pendingUpdateCount = incidents?.filter((i: MissionControlIncident) => i.syncStatus === "pending_update").length ?? 0;
  const pendingCloseCount = incidents?.filter((i: MissionControlIncident) => i.syncStatus === "pending_close").length ?? 0;

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
        {isOwner && (
          <div className="flex items-center gap-2">
            <CreateIncidentDialog tenantId={tenant._id} />
            <Link href={`/tenant/${slug}/settings/social`}>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />
                Social Settings
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Facebook Connection Status */}
      {!stats?.facebookConnected && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Facebook className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="font-medium text-yellow-900 dark:text-yellow-100">Facebook Not Connected</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Connect your Facebook page to enable automatic posting
                  </p>
                </div>
              </div>
              {isOwner && (
                <Link href={`/tenant/${slug}/settings/social`}>
                  <Button>Connect Facebook</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            <CardTitle className="text-sm font-medium">Pending Post</CardTitle>
            <Radio className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents === undefined ? <Skeleton className="h-8 w-12" /> : pendingCount}
            </div>
            <p className="text-xs text-muted-foreground">Waiting to be posted</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents === undefined ? <Skeleton className="h-8 w-12" /> : postedCount}
            </div>
            <p className="text-xs text-muted-foreground">Active & synced</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Update</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents === undefined ? <Skeleton className="h-8 w-12" /> : pendingUpdateCount}
            </div>
            <p className="text-xs text-muted-foreground">Has new updates to sync</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Close</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {incidents === undefined ? <Skeleton className="h-8 w-12" /> : pendingCloseCount}
            </div>
            <p className="text-xs text-muted-foreground">Closed, awaiting sync</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync status indicator */}
      {stats && stats.totalPendingSync > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {stats.totalPendingSync} item{stats.totalPendingSync !== 1 ? "s" : ""} pending sync (syncs every 2 minutes)
        </div>
      )}

      {/* All Incidents Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Radio className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-semibold">All Incidents</h2>
          {incidents && incidents.length > 0 && (
            <Badge variant="secondary">{incidents.length}</Badge>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {incidents === undefined ? (
            <>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </>
          ) : incidents.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-8 text-center">
                <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active incidents</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Incidents will appear here as they come in
                </p>
              </CardContent>
            </Card>
          ) : (
            incidents.map((incident: MissionControlIncident) => (
              <IncidentPostCard
                key={incident._id}
                incident={incident}
                tenantId={tenant._id}
                isOwner={isOwner}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
