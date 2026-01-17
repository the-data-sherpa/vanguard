'use client';

import { cn } from '@/lib/utils';
import type { UnitStatus } from '@/lib/types';

interface IncidentTimelineProps {
  status: 'active' | 'closed' | 'archived';
  unitStatuses?: Record<string, UnitStatus>;
}

type TimelineStage = 'received' | 'dispatched' | 'enroute' | 'on_scene' | 'transporting' | 'cleared';

export function IncidentTimeline({ status, unitStatuses }: IncidentTimelineProps) {
  // Determine current stage based on unit statuses
  const getStage = (): TimelineStage => {
    if (status === 'closed' || status === 'archived') return 'cleared';

    if (!unitStatuses) return 'received';

    // Check unit statuses
    const statuses = Object.values(unitStatuses).map((u) => u.status?.toUpperCase() || '');

    if (statuses.some((s) => s.includes('TRANSPORT') || s === 'TR' || s === 'TA')) return 'transporting';
    if (statuses.some((s) => s.includes('SCENE') || s === 'OS' || s === 'AE' || s === 'ONSCENE' || s === 'ON SCENE')) return 'on_scene';
    if (statuses.some((s) => s.includes('ENROUTE') || s === 'ER')) return 'enroute';
    if (statuses.some((s) => s.includes('DISPATCH') || s === 'DP')) return 'dispatched';

    return 'received';
  };

  const currentStage = getStage();

  const formatStageName = (stage: string) => {
    return stage.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <div className="flex items-center justify-between text-xs uppercase tracking-wider font-semibold">
      <span className="text-muted-foreground">Incident Progress</span>
      <span
        className={cn(
          'font-bold',
          currentStage === 'on_scene' && 'text-red-600 animate-pulse',
          currentStage === 'transporting' && 'text-orange-600 animate-pulse',
          currentStage === 'cleared' && 'text-green-600',
          currentStage === 'enroute' && 'text-blue-600',
          currentStage === 'dispatched' && 'text-yellow-600',
          currentStage === 'received' && 'text-muted-foreground'
        )}
      >
        {formatStageName(currentStage)}
      </span>
    </div>
  );
}
