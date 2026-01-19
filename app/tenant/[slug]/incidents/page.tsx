"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { adaptIncidents } from "@/lib/convex-adapters";
import type { IncidentStatus, CallTypeCategory, Incident } from "@/lib/types";
import { IncidentTable, IncidentFilters, CreateIncidentDialog } from "@/components/incidents";
import type { FilterState } from "@/components/incidents";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function IncidentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Parse query params
  const statusParam = searchParams.get("status");
  const status: IncidentStatus =
    statusParam === "closed" || statusParam === "archived" ? statusParam : "active";

  // Get current user for permission check
  const currentUser = useQuery(api.users.getCurrentUser);

  // Check if user can create incidents (admin/moderator)
  const canCreateIncident =
    currentUser?.tenantRole === "admin" ||
    currentUser?.tenantRole === "owner" ||
    currentUser?.tenantRole === "moderator";

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    status: [status],
    categories: [],
    startDate: undefined,
    endDate: undefined,
    unitSearch: "",
  });

  // Get tenant
  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const tenantId = tenant?._id;

  // Build query args based on filters
  const hasDateFilter = filters.startDate || filters.endDate;

  // Get incidents - use listWithDateRange if date filters are set
  const incidentsWithDateRange = useQuery(
    api.incidents.listWithDateRange,
    tenantId && hasDateFilter
      ? {
          tenantId,
          status: filters.status.length === 1 ? filters.status[0] : undefined,
          startTime: filters.startDate
            ? new Date(filters.startDate).setHours(0, 0, 0, 0)
            : undefined,
          endTime: filters.endDate
            ? new Date(filters.endDate).setHours(23, 59, 59, 999)
            : undefined,
          limit: 500,
        }
      : "skip"
  );

  const incidentsBasic = useQuery(
    api.incidents.list,
    tenantId && !hasDateFilter ? { tenantId, status, limit: 500 } : "skip"
  );

  const incidentsRaw = hasDateFilter ? incidentsWithDateRange : incidentsBasic;

  // Apply client-side filters (categories, search, unit search)
  // This must be called before any conditional returns to maintain hook order
  const filteredIncidents = useMemo(() => {
    if (!incidentsRaw) return [];

    const allIncidents = adaptIncidents(incidentsRaw);
    let result = allIncidents;

    // Filter by status (client-side when multiple statuses selected)
    if (filters.status.length > 0 && filters.status.length < 3) {
      result = result.filter((i) => filters.status.includes(i.status));
    }

    // Filter by categories
    if (filters.categories.length > 0) {
      result = result.filter((i) =>
        filters.categories.includes((i.callTypeCategory || "other") as CallTypeCategory)
      );
    }

    // Filter by search term (address, call type)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (i) =>
          i.fullAddress.toLowerCase().includes(searchLower) ||
          i.callType.toLowerCase().includes(searchLower) ||
          i.description?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by unit search
    if (filters.unitSearch) {
      const unitSearchLower = filters.unitSearch.toLowerCase();
      result = result.filter(
        (i) =>
          i.units?.some((u) => u.toLowerCase().includes(unitSearchLower))
      );
    }

    return result;
  }, [incidentsRaw, filters]);

  // Also compute allIncidents for the count display
  const allIncidents = useMemo(() => {
    if (!incidentsRaw) return [];
    return adaptIncidents(incidentsRaw);
  }, [incidentsRaw]);

  // Loading state - now after all hooks
  if (!tenant || incidentsRaw === undefined) {
    return <IncidentsPageSkeleton />;
  }

  const incidents = filteredIncidents;

  // Build URL for status tabs
  const buildTabUrl = (newStatus: IncidentStatus) => {
    const params = new URLSearchParams();
    if (newStatus !== "active") params.set("status", newStatus);
    const queryString = params.toString();
    return `/tenant/${slug}/incidents${queryString ? `?${queryString}` : ""}`;
  };

  const tabs: { value: IncidentStatus; label: string }[] = [
    { value: "active", label: "Active" },
    { value: "closed", label: "Closed" },
    { value: "archived", label: "Archived" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
          <p className="text-muted-foreground">
            View and manage all incident reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Real-time
          </Badge>
          {canCreateIncident && tenantId && (
            <CreateIncidentDialog
              tenantId={tenantId}
              onCreated={(id) => router.push(`/tenant/${slug}/incidents/${id}`)}
            />
          )}
        </div>
      </div>

      {/* Filters */}
      <IncidentFilters
        onFilterChange={setFilters}
        initialFilters={filters}
      />

      {/* Status Tabs */}
      <div className="border-b">
        <nav className="flex gap-4" aria-label="Incident status tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                router.push(buildTabUrl(tab.value));
                setFilters((prev) => ({ ...prev, status: [tab.value] }));
              }}
              className={cn(
                "pb-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                filters.status.includes(tab.value) && filters.status.length === 1
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Incidents Table */}
      <IncidentTable
        incidents={incidents}
        onRowClick={(incident) => router.push(`/tenant/${slug}/incidents/${incident.id}`)}
      />

      {/* Count Info */}
      <div className="text-sm text-muted-foreground">
        <p>
          Showing {incidents.length} incident{incidents.length !== 1 ? "s" : ""}
          {allIncidents.length !== incidents.length && (
            <span> (filtered from {allIncidents.length})</span>
          )}
        </p>
      </div>
    </div>
  );
}

function IncidentsPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="border-b pb-2">
        <div className="flex gap-4">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
