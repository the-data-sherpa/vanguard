'use client';

import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { SyncStatusIndicator } from './SyncStatusIndicator';

interface DashboardHeaderProps {
  tenantName: string;
  lastSyncTime?: string | null;
  isSyncing?: boolean;
  onRefresh?: () => void;
}

export function DashboardHeader({
  tenantName,
  lastSyncTime,
  isSyncing,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{tenantName}</h1>
        <p className="text-muted-foreground">
          Real-time incident monitoring dashboard
        </p>
      </div>

      <div className="flex items-center gap-4">
        <SyncStatusIndicator lastSyncTime={lastSyncTime} isSyncing={isSyncing} />

        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
    </div>
  );
}
