"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import Link from "next/link";
import { TenantOverviewTable } from "@/components/admin/TenantOverviewTable";
import { TenantFilters, TenantStatus, TenantTier } from "@/components/admin/TenantFilters";

export default function TenantsListPage() {
  const tenants = useQuery(api.admin.listAllTenants);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TenantStatus>("all");
  const [tierFilter, setTierFilter] = useState<TenantTier>("all");

  // Filter tenants based on search and filters
  const filteredTenants = useMemo(() => {
    if (!tenants) return [];

    return tenants.filter((tenant: typeof tenants[number]) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const nameMatch = tenant.name.toLowerCase().includes(searchLower);
        const displayNameMatch = tenant.displayName?.toLowerCase().includes(searchLower);
        const slugMatch = tenant.slug.toLowerCase().includes(searchLower);
        if (!nameMatch && !displayNameMatch && !slugMatch) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all" && tenant.status !== statusFilter) {
        return false;
      }

      // Tier filter
      if (tierFilter !== "all" && tenant.tier !== tierFilter) {
        return false;
      }

      return true;
    });
  }, [tenants, search, statusFilter, tierFilter]);

  if (tenants === undefined) {
    return <TenantsListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenants</h1>
          <p className="text-muted-foreground mt-1">
            Manage all tenants on the platform
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/tenants/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Tenant
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <TenantFilters
            search={search}
            onSearchChange={setSearch}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            tier={tierFilter}
            onTierChange={setTierFilter}
          />
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredTenants.length} of {tenants.length} tenants
      </div>

      {/* Tenants Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <TenantOverviewTable tenants={filteredTenants} />
        </CardContent>
      </Card>
    </div>
  );
}

function TenantsListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </CardContent>
      </Card>

      <Skeleton className="h-5 w-48" />

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
