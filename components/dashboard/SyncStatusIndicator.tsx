'use client';

import { RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  lastSyncTime?: string | null;
  isSyncing?: boolean;
  hasError?: boolean;
  className?: string;
}

export function SyncStatusIndicator({
  lastSyncTime,
  isSyncing = false,
  hasError = false,
  className,
}: SyncStatusIndicatorProps) {
  if (isSyncing) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-destructive', className)}>
        <AlertCircle className="h-4 w-4" />
        <span>Sync error</span>
      </div>
    );
  }

  if (!lastSyncTime) {
    return (
      <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <span>Not synced yet</span>
      </div>
    );
  }

  const syncDate = new Date(lastSyncTime);
  const now = new Date();
  const diffMs = now.getTime() - syncDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  let timeAgo: string;
  if (diffMins < 1) {
    timeAgo = 'Just now';
  } else if (diffMins < 60) {
    timeAgo = `${diffMins}m ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    timeAgo = `${diffHours}h ago`;
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <Check className="h-4 w-4 text-green-500" />
      <span>Updated {timeAgo}</span>
    </div>
  );
}
