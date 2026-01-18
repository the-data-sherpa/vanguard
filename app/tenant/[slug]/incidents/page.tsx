"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { adaptIncidents } from "@/lib/convex-adapters";
import type { IncidentStatus } from "@/lib/types";
import { IncidentTable } from "@/components/incidents";
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

  // Get tenant
  const tenant = useQuery(api.tenants.getBySlug, { slug });
  const tenantId = tenant?._id;

  // Get incidents - REACTIVE, auto-updates
  const incidentsRaw = useQuery(
    api.incidents.list,
    tenantId ? { tenantId, status, limit: 100 } : "skip"
  );

  // Loading state
  if (!tenant || incidentsRaw === undefined) {
    return <IncidentsPageSkeleton />;
  }

  const incidents = adaptIncidents(incidentsRaw);

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
        <Badge variant="outline" className="text-xs">
          <span className="relative flex h-2 w-2 mr-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          Real-time
        </Badge>
      </div>

      {/* Status Tabs */}
      <div className="border-b">
        <nav className="flex gap-4" aria-label="Incident status tabs">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => router.push(buildTabUrl(tab.value))}
              className={cn(
                "pb-2 text-sm font-medium transition-colors border-b-2 -mb-px",
                status === tab.value
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
      <IncidentTable incidents={incidents} />

      {/* Count Info */}
      <div className="text-sm text-muted-foreground">
        <p>
          Showing {incidents.length} {status} incidents
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
