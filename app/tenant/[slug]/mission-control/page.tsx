"use client";

import { use, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Radio,
  CheckCircle,
  Clock,
  AlertCircle,
  Facebook,
  Settings,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { IncidentPostCard } from "@/components/mission-control/IncidentPostCard";
import Link from "next/link";

interface MissionControlPageProps {
  params: Promise<{ slug: string }>;
}

export default function MissionControlPage({ params }: MissionControlPageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const currentUser = useQuery(api.users.getCurrentUser);

  // Only fetch data once we have the tenant
  const stats = useQuery(
    api.missionControl.getDashboardStats,
    tenant ? { tenantId: tenant._id } : "skip"
  );
  const pendingPosts = useQuery(
    api.missionControl.getPendingPosts,
    tenant ? { tenantId: tenant._id } : "skip"
  );
  const postedIncidents = useQuery(
    api.missionControl.getPostedIncidents,
    tenant ? { tenantId: tenant._id } : "skip"
  );
  const failedPosts = useQuery(
    api.missionControl.getFailedPosts,
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
          <Link href={`/tenant/${slug}/settings/social`}>
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Social Settings
            </Button>
          </Link>
        )}
      </div>

      {/* Facebook Connection Status */}
      {!stats?.facebookConnected && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Facebook className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium">Facebook Not Connected</p>
                  <p className="text-sm text-muted-foreground">
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
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Facebook className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium">Connected to {stats.facebookPageName}</p>
                  <p className="text-sm text-muted-foreground">
                    Posts will be published to your Facebook page
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-green-600 border-green-300">
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
            <div className="text-2xl font-bold">
              {stats?.activeIncidents ?? <Skeleton className="h-8 w-12" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Posts</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingPosts ?? <Skeleton className="h-8 w-12" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Posted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.postedIncidents ?? <Skeleton className="h-8 w-12" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.failedPosts ?? <Skeleton className="h-8 w-12" />}
            </div>
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

        <TabsContent value="pending" className="space-y-4">
          {pendingPosts === undefined ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : pendingPosts.length === 0 ? (
            <Card>
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
              <IncidentPostCard
                key={incident._id}
                incident={incident}
                tenantId={tenant._id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="posted" className="space-y-4">
          {postedIncidents === undefined ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : postedIncidents.length === 0 ? (
            <Card>
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
              <IncidentPostCard
                key={incident._id}
                incident={incident}
                tenantId={tenant._id}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="failed" className="space-y-4">
          {failedPosts === undefined ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : failedPosts.length === 0 ? (
            <Card>
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
              <IncidentPostCard
                key={incident._id}
                incident={incident}
                tenantId={tenant._id}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
