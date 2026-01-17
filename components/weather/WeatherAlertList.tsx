'use client';

import type { WeatherAlert } from '@/lib/types';
import { WeatherAlertCard } from './WeatherAlertCard';
import { Skeleton } from '@/components/ui/skeleton';

interface WeatherAlertListProps {
  alerts: WeatherAlert[];
  onAlertClick?: (alert: WeatherAlert) => void;
  isLoading?: boolean;
  compact?: boolean;
}

export function WeatherAlertList({
  alerts,
  onAlertClick,
  isLoading,
  compact = false,
}: WeatherAlertListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <WeatherAlertSkeleton key={i} compact={compact} />
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No active weather alerts</p>
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-2' : 'space-y-4'}>
      {alerts.map((alert) => (
        <WeatherAlertCard
          key={alert.id}
          alert={alert}
          onClick={onAlertClick ? () => onAlertClick(alert) : undefined}
          compact={compact}
        />
      ))}
    </div>
  );
}

function WeatherAlertSkeleton({ compact }: { compact: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-md border p-3">
        <Skeleton className="h-5 w-5" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-5 w-16" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
