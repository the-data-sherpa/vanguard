'use client';

import type { Incident, UnitLegend } from '@/lib/types';
import { IncidentCard } from './IncidentCard';
import { Skeleton } from '@/components/ui/skeleton';

interface IncidentListProps {
  incidents: Incident[];
  onIncidentClick?: (incident: Incident) => void;
  isLoading?: boolean;
  unitLegend?: UnitLegend;
  showStatusBadge?: boolean;
}

export function IncidentList({
  incidents,
  onIncidentClick,
  isLoading,
  unitLegend,
  showStatusBadge = true,
}: IncidentListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <IncidentCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <p>No incidents found</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 overflow-hidden">
      {incidents.map((incident) => (
        <IncidentCard
          key={incident.id}
          incident={incident}
          onClick={onIncidentClick ? () => onIncidentClick(incident) : undefined}
          unitLegend={unitLegend}
          showStatusBadge={showStatusBadge}
        />
      ))}
    </div>
  );
}

function IncidentCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-24" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-12" />
      </div>
    </div>
  );
}
