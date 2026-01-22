"use client";

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
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

interface TenantData {
  _id: Id<"tenants">;
  slug: string;
  name: string;
  displayName?: string;
  status: "pending_approval" | "pending" | "active" | "suspended" | "deactivated" | "pending_deletion";
  subscriptionStatus?: "trialing" | "active" | "past_due" | "canceled" | "expired" | "pro_bono";
  lastIncidentSync?: number;
  lastWeatherSync?: number;
  userCount: number;
}

interface TenantCardViewProps {
  tenants: TenantData[];
  syncingTenant: Id<"tenants"> | null;
  onTriggerSync: (tenantId: Id<"tenants">, syncType: "incident" | "weather") => void;
  onSuspend: (tenant: TenantData) => void;
  onReactivate: (tenant: TenantData) => void;
}

function getStatusBadge(status: TenantData["status"]) {
  switch (status) {
    case "active":
      return <Badge variant="outline" className="text-green-600">Active</Badge>;
    case "suspended":
      return <Badge variant="destructive">Suspended</Badge>;
    case "pending":
      return <Badge variant="secondary">Pending</Badge>;
    case "pending_approval":
      return <Badge variant="outline" className="text-amber-600">Pending Approval</Badge>;
    case "deactivated":
      return <Badge variant="secondary">Deactivated</Badge>;
    case "pending_deletion":
      return <Badge variant="destructive" className="bg-orange-600">Pending Deletion</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function getSubscriptionBadge(subscriptionStatus?: TenantData["subscriptionStatus"]) {
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
    case "pro_bono":
      return <Badge className="bg-purple-600">Pro Bono</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function formatSyncTime(timestamp?: number) {
  if (!timestamp) return "Never";
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function TenantCardView({
  tenants,
  syncingTenant,
  onTriggerSync,
  onSuspend,
  onReactivate,
}: TenantCardViewProps) {
  if (tenants.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No tenants found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tenants.map((tenant) => (
        <Card key={tenant._id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{tenant.displayName || tenant.name}</div>
                <div className="text-sm text-muted-foreground">/{tenant.slug}</div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="touch"
                    disabled={syncingTenant === tenant._id}
                    className="shrink-0"
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
                  <DropdownMenuItem onClick={() => onTriggerSync(tenant._id, "incident")}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Incidents
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onTriggerSync(tenant._id, "weather")}>
                    <CloudRain className="mr-2 h-4 w-4" />
                    Sync Weather
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {tenant.status === "suspended" ? (
                    <DropdownMenuItem onClick={() => onReactivate(tenant)}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Reactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => onSuspend(tenant)}
                      className="text-destructive"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Suspend
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {getStatusBadge(tenant.status)}
              {getSubscriptionBadge(tenant.subscriptionStatus)}
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {tenant.userCount}
              </Badge>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Radio className="h-3 w-3" />
                {formatSyncTime(tenant.lastIncidentSync)}
              </div>
              <div className="flex items-center gap-1">
                <CloudRain className="h-3 w-3" />
                {formatSyncTime(tenant.lastWeatherSync)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
