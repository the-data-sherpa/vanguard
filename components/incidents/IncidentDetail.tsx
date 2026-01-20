'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CallTypeBadge } from './CallTypeBadge';
import { UnitStatusDetail } from './UnitStatusBadge';
import { IncidentTimeline } from './IncidentTimeline';
import type { Incident, UnitLegend } from '@/lib/types';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Truck,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { getCallTypeDescription } from '@/lib/callTypeMapping';

interface IncidentDetailProps {
  incident: Incident;
  unitLegend?: UnitLegend;
  onBack?: () => void;
  children?: React.ReactNode; // For notes section
}

export function IncidentDetail({
  incident,
  unitLegend,
  onBack,
  children,
}: IncidentDetailProps) {
  const statusColor = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    archived: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }[incident.status];

  const sourceLabel = {
    pulsepoint: 'PulsePoint',
    manual: 'Manual Entry',
    user_submitted: 'User Submitted',
    merged: 'Merged',
  }[incident.source];

  // Format timestamps
  const callReceivedTime = new Date(incident.callReceivedTime);
  const callClosedTime = incident.callClosedTime
    ? new Date(incident.callClosedTime)
    : null;

  const formatDateTime = (date: Date) => {
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (start: Date, end: Date | null) => {
    if (!end) return null;
    const diff = end.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Build Google Maps URL
  const mapsUrl = incident.latitude && incident.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${incident.latitude},${incident.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(incident.fullAddress)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="shrink-0 -ml-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <CallTypeBadge
                category={incident.callTypeCategory ?? 'other'}
                callType={incident.callType}
              />
              <Badge variant="outline" className={statusColor}>
                {incident.status}
              </Badge>
              {sourceLabel && (
                <Badge variant="secondary" className="text-xs">
                  {sourceLabel}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">
              {getCallTypeDescription(incident.callType)}
            </h1>
            <p className="text-muted-foreground">{incident.fullAddress}</p>
          </div>
        </div>

        {/* Timeline status indicator */}
        <div className="sm:text-right">
          <IncidentTimeline
            status={incident.status}
            unitStatuses={incident.unitStatuses}
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column: Location & Timing */}
        <div className="space-y-6">
          {/* Location Card */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Location</h2>
            </div>
            <div className="space-y-3">
              <p className="text-sm">{incident.fullAddress}</p>
              {incident.latitude && incident.longitude && (
                <p className="text-xs text-muted-foreground font-mono">
                  {incident.latitude.toFixed(6)}, {incident.longitude.toFixed(6)}
                </p>
              )}
              <Button variant="outline" size="sm" asChild>
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Open in Maps
                </a>
              </Button>
            </div>
          </div>

          {/* Timing Card */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Timeline</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Call Received</span>
                <span className="font-medium">{formatDateTime(callReceivedTime)}</span>
              </div>
              {callClosedTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Call Closed</span>
                  <span className="font-medium">{formatDateTime(callClosedTime)}</span>
                </div>
              )}
              {callClosedTime && (
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {formatDuration(callReceivedTime, callClosedTime)}
                  </span>
                </div>
              )}
              {!callClosedTime && incident.status === 'active' && (
                <div className="flex justify-between text-sm border-t pt-3">
                  <span className="text-muted-foreground">Active for</span>
                  <span className="font-medium text-green-600">
                    {formatDuration(callReceivedTime, new Date())}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description Card (if present) */}
          {incident.description && (
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Description</h2>
              </div>
              <p className="text-sm whitespace-pre-wrap">{incident.description}</p>
            </div>
          )}
        </div>

        {/* Right Column: Units */}
        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">
                Responding Units ({incident.units?.length ?? 0})
              </h2>
            </div>
            <UnitStatusDetail
              units={incident.units || []}
              unitStatuses={incident.unitStatuses}
              unitLegend={unitLegend}
            />
          </div>
        </div>
      </div>

      {/* Notes Section (passed as children) */}
      {children}
    </div>
  );
}

export function IncidentDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </div>
  );
}
