"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

type TenantStatus = "pending" | "active" | "suspended" | "deactivated" | "pending_deletion";
type TenantTier = "free" | "starter" | "professional" | "enterprise";

interface TenantDetailHeaderProps {
  tenant: {
    name: string;
    displayName?: string;
    slug: string;
    status: TenantStatus;
    tier: TenantTier;
    deletionScheduledAt?: number;
  };
}

export function TenantDetailHeader({ tenant }: TenantDetailHeaderProps) {
  const getStatusBadge = (status: TenantStatus) => {
    switch (status) {
      case "active":
        return <Badge variant="outline" className="text-green-600 border-green-600">Active</Badge>;
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

  const getTierBadge = (tier: TenantTier) => {
    switch (tier) {
      case "enterprise":
        return <Badge className="bg-purple-600">Enterprise</Badge>;
      case "professional":
        return <Badge className="bg-blue-600">Professional</Badge>;
      case "starter":
        return <Badge variant="secondary">Starter</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  const formatDeletionDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/tenants">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold">
              {tenant.displayName || tenant.name}
            </h1>
            {getStatusBadge(tenant.status)}
            {getTierBadge(tenant.tier)}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-muted-foreground">
              /{tenant.slug}
            </p>
            <Button variant="link" size="sm" className="p-0 h-auto" asChild>
              <Link href={`/tenant/${tenant.slug}`} target="_blank">
                View as user
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
          {tenant.status === "pending_deletion" && tenant.deletionScheduledAt && (
            <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                This tenant is scheduled for permanent deletion on{" "}
                <strong>{formatDeletionDate(tenant.deletionScheduledAt)}</strong>.
                All data will be permanently removed after this date.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
