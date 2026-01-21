"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  AlertTriangle,
  CloudRain,
  RefreshCw,
  Ban,
  CheckCircle,
  Loader2,
  Calendar,
  Clock,
  Gift,
} from "lucide-react";
import { TenantDetailHeader } from "@/components/admin/TenantDetailHeader";
import { TenantConfigSection } from "@/components/admin/TenantConfigSection";
import { DeleteTenantDialog } from "@/components/admin/DeleteTenantDialog";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const tenant = useQuery(api.admin.getTenantDetails, {
    tenantId: tenantId as Id<"tenants">,
  });
  const users = useQuery(api.admin.getTenantUsers, {
    tenantId: tenantId as Id<"tenants">,
  });
  const auditLogs = useQuery(api.admin.getTenantAuditLogs, {
    tenantId: tenantId as Id<"tenants">,
    limit: 50,
  });

  const [isSuspending, setIsSuspending] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [syncingType, setSyncingType] = useState<string | null>(null);
  const [isTogglingProBono, setIsTogglingProBono] = useState(false);

  const suspendTenant = useMutation(api.admin.suspendTenant);
  const reactivateTenant = useMutation(api.admin.reactivateTenant);
  const setProBono = useMutation(api.admin.setProBono);
  const triggerSync = useAction(api.admin.triggerTenantSync);

  if (tenant === undefined) {
    return <TenantDetailSkeleton />;
  }

  if (tenant === null) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Tenant Not Found</h1>
        <p className="text-muted-foreground mb-4">
          The tenant you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button onClick={() => router.push("/admin/tenants")}>
          Back to Tenants
        </Button>
      </div>
    );
  }

  const handleSuspend = async () => {
    setIsSuspending(true);
    try {
      await suspendTenant({ tenantId: tenant._id });
    } catch (error) {
      console.error("Failed to suspend tenant:", error);
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivate = async () => {
    setIsReactivating(true);
    try {
      await reactivateTenant({ tenantId: tenant._id });
    } catch (error) {
      console.error("Failed to reactivate tenant:", error);
    } finally {
      setIsReactivating(false);
    }
  };

  const handleTriggerSync = async (syncType: "incident" | "weather" | "unitLegend") => {
    setSyncingType(syncType);
    try {
      await triggerSync({ tenantId: tenant._id, syncType });
    } catch (error) {
      console.error("Failed to trigger sync:", error);
    } finally {
      setSyncingType(null);
    }
  };

  const handleToggleProBono = async () => {
    setIsTogglingProBono(true);
    try {
      const isCurrentlyProBono = tenant.subscriptionStatus === "pro_bono";
      await setProBono({ tenantId: tenant._id, enabled: !isCurrentlyProBono });
    } catch (error) {
      console.error("Failed to toggle pro bono status:", error);
    } finally {
      setIsTogglingProBono(false);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleString();
  };

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "owner":
        return <Badge className="bg-purple-600">Owner</Badge>;
      case "user":
      default:
        return <Badge variant="outline">User</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <TenantDetailHeader tenant={tenant} />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.userCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.activeIncidentCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <CloudRain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenant.activeAlertCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {formatRelativeTime(
                Math.max(tenant.lastIncidentSync || 0, tenant.lastWeatherSync || 0)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Tabs */}
        <div>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="configuration">Configuration</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{tenant.name}</span>
                  </div>
                  {tenant.displayName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Display Name</span>
                      <span className="font-medium">{tenant.displayName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slug</span>
                    <span className="font-mono text-sm">{tenant.slug}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span className="text-sm">{formatTimestamp(tenant._creationTime)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sync Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Last Incident Sync</span>
                    <span className="text-sm">{formatTimestamp(tenant.lastIncidentSync)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Last Weather Sync</span>
                    <span className="text-sm">{formatTimestamp(tenant.lastWeatherSync)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Unit Legend</span>
                    <span className="text-sm">
                      {tenant.unitLegendAvailable === false
                        ? "Not available"
                        : tenant.unitLegend
                        ? `${tenant.unitLegend.length} entries`
                        : "Not synced"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="configuration" className="mt-4">
              <TenantConfigSection
                tenantId={tenant._id}
                pulsepointConfig={tenant.pulsepointConfig}
                weatherZones={tenant.weatherZones}
                features={tenant.features}
              />
            </TabsContent>

            <TabsContent value="users" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Users ({users?.length || 0})</CardTitle>
                  <CardDescription>Users associated with this tenant</CardDescription>
                </CardHeader>
                <CardContent>
                  {users && users.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Login</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((user: typeof users[number]) => (
                          <TableRow key={user._id}>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>{user.name || "-"}</TableCell>
                            <TableCell>{getRoleBadge(user.tenantRole)}</TableCell>
                            <TableCell>
                              {user.isBanned ? (
                                <Badge variant="destructive">Banned</Badge>
                              ) : user.isActive === false ? (
                                <Badge variant="secondary">Inactive</Badge>
                              ) : (
                                <Badge variant="outline" className="text-green-600">Active</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatRelativeTime(user.lastLoginAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No users associated with this tenant
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Audit log entries for this tenant</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditLogs && auditLogs.length > 0 ? (
                    <div className="space-y-3">
                      {auditLogs.map((log: typeof auditLogs[number]) => (
                        <div
                          key={log._id}
                          className="flex items-start gap-3 p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-sm">{log.action}</p>
                            {log.details && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {JSON.stringify(log.details)}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(log._creationTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity recorded
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Suspend/Reactivate */}
              {tenant.status === "suspended" ? (
                <Button
                  className="w-full"
                  onClick={handleReactivate}
                  disabled={isReactivating}
                >
                  {isReactivating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  Reactivate Tenant
                </Button>
              ) : tenant.status !== "pending_deletion" ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleSuspend}
                  disabled={isSuspending}
                >
                  {isSuspending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Ban className="mr-2 h-4 w-4" />
                  )}
                  Suspend Tenant
                </Button>
              ) : null}

              {/* Pro Bono Toggle */}
              <Button
                variant={tenant.subscriptionStatus === "pro_bono" ? "default" : "outline"}
                className="w-full"
                onClick={handleToggleProBono}
                disabled={isTogglingProBono}
              >
                {isTogglingProBono ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Gift className="mr-2 h-4 w-4" />
                )}
                {tenant.subscriptionStatus === "pro_bono" ? "Remove Pro Bono" : "Grant Pro Bono"}
              </Button>

              {/* Trigger Syncs */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleTriggerSync("incident")}
                  disabled={syncingType !== null}
                >
                  {syncingType === "incident" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync Incidents
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleTriggerSync("weather")}
                  disabled={syncingType !== null}
                >
                  {syncingType === "weather" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CloudRain className="mr-2 h-4 w-4" />
                  )}
                  Sync Weather
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleTriggerSync("unitLegend")}
                  disabled={syncingType !== null}
                >
                  {syncingType === "unitLegend" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Sync Unit Legend
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <DeleteTenantDialog
                tenantId={tenant._id}
                tenantName={tenant.displayName || tenant.name}
                tenantSlug={tenant.slug}
                isPendingDeletion={tenant.status === "pending_deletion"}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function TenantDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-32 mt-2" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
