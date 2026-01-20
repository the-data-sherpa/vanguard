"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  MoreHorizontal,
  Eye,
  RefreshCw,
  Ban,
  CheckCircle,
  Loader2,
  CloudRain,
  Radio,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface TenantData {
  _id: Id<"tenants">;
  slug: string;
  name: string;
  displayName?: string;
  status: "pending" | "active" | "suspended" | "deactivated" | "pending_deletion";
  subscriptionStatus?: "trialing" | "active" | "past_due" | "canceled" | "expired";
  lastIncidentSync?: number;
  lastWeatherSync?: number;
  userCount: number;
}

interface TenantOverviewTableProps {
  tenants: TenantData[];
  limit?: number;
  showViewAll?: boolean;
}

export function TenantOverviewTable({
  tenants,
  limit,
  showViewAll = false,
}: TenantOverviewTableProps) {
  const [suspendTenant, setSuspendTenant] = useState<TenantData | null>(null);
  const [reactivateTenant, setReactivateTenant] = useState<TenantData | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [syncingTenant, setSyncingTenant] = useState<Id<"tenants"> | null>(null);

  const suspendMutation = useMutation(api.admin.suspendTenant);
  const reactivateMutation = useMutation(api.admin.reactivateTenant);
  const triggerSync = useAction(api.admin.triggerTenantSync);

  const displayTenants = limit ? tenants.slice(0, limit) : tenants;

  const handleSuspend = async () => {
    if (!suspendTenant) return;
    setIsLoading(true);
    try {
      await suspendMutation({
        tenantId: suspendTenant._id,
        reason: suspendReason || undefined,
      });
      setSuspendTenant(null);
      setSuspendReason("");
    } catch (error) {
      console.error("Failed to suspend tenant:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivate = async () => {
    if (!reactivateTenant) return;
    setIsLoading(true);
    try {
      await reactivateMutation({
        tenantId: reactivateTenant._id,
      });
      setReactivateTenant(null);
    } catch (error) {
      console.error("Failed to reactivate tenant:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSync = async (
    tenantId: Id<"tenants">,
    syncType: "incident" | "weather"
  ) => {
    setSyncingTenant(tenantId);
    try {
      await triggerSync({ tenantId, syncType });
    } catch (error) {
      console.error("Failed to trigger sync:", error);
    } finally {
      setSyncingTenant(null);
    }
  };

  const getStatusBadge = (status: TenantData["status"]) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="text-green-600">Active</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "deactivated":
        return <Badge variant="secondary">Deactivated</Badge>;
      case "pending_deletion":
        return <Badge variant="destructive" className="bg-orange-600">Pending Deletion</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSubscriptionBadge = (subscriptionStatus?: TenantData["subscriptionStatus"]) => {
    switch (subscriptionStatus) {
      case "active":
        return <Badge className="bg-green-600">Subscribed</Badge>;
      case "trialing":
        return <Badge variant="secondary">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="outline">Canceled</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const formatSyncTime = (timestamp?: number) => {
    if (!timestamp) return "Never";
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Subscription</TableHead>
              <TableHead className="text-center">Users</TableHead>
              <TableHead>Last Sync</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayTenants.map((tenant) => (
              <TableRow key={tenant._id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {tenant.displayName || tenant.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      /{tenant.slug}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                <TableCell>{getSubscriptionBadge(tenant.subscriptionStatus)}</TableCell>
                <TableCell className="text-center">{tenant.userCount}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    <div className="flex items-center gap-1">
                      <Radio className="h-3 w-3" />
                      {formatSyncTime(tenant.lastIncidentSync)}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <CloudRain className="h-3 w-3" />
                      {formatSyncTime(tenant.lastWeatherSync)}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={syncingTenant === tenant._id}
                      >
                        {syncingTenant === tenant._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/tenants/${tenant._id}`}>
                          <Settings className="mr-2 h-4 w-4" />
                          Manage
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/tenant/${tenant.slug}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View as User
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleTriggerSync(tenant._id, "incident")}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Sync Incidents
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleTriggerSync(tenant._id, "weather")}
                      >
                        <CloudRain className="mr-2 h-4 w-4" />
                        Sync Weather
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {tenant.status === "suspended" ? (
                        <DropdownMenuItem
                          onClick={() => setReactivateTenant(tenant)}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Reactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onClick={() => setSuspendTenant(tenant)}
                          className="text-destructive"
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          Suspend
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {displayTenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No tenants found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {showViewAll && tenants.length > (limit ?? 0) && (
        <div className="flex justify-center mt-4">
          <Button variant="outline" asChild>
            <Link href="/admin/tenants">View All Tenants</Link>
          </Button>
        </div>
      )}

      {/* Suspend Dialog */}
      <Dialog open={!!suspendTenant} onOpenChange={() => setSuspendTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to suspend{" "}
              <strong>{suspendTenant?.displayName || suspendTenant?.name}</strong>?
              All users will lose access immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Enter reason for suspension..."
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendTenant(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reactivate Dialog */}
      <Dialog
        open={!!reactivateTenant}
        onOpenChange={() => setReactivateTenant(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate Tenant</DialogTitle>
            <DialogDescription>
              Are you sure you want to reactivate{" "}
              <strong>
                {reactivateTenant?.displayName || reactivateTenant?.name}
              </strong>
              ? Users will regain access immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReactivateTenant(null)}
            >
              Cancel
            </Button>
            <Button onClick={handleReactivate} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
