'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  AlertTriangle,
  CloudRain,
  BookOpen,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface SyncControlsProps {
  tenantSlug: string;
  tenantId: string;
  hasWeatherEnabled: boolean;
  unitLegendStatus: {
    available?: boolean;
    updatedAt?: string;
    unitCount: number;
  };
}

interface SyncResult {
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export function SyncControls({
  tenantSlug,
  tenantId,
  hasWeatherEnabled,
  unitLegendStatus,
}: SyncControlsProps) {
  const router = useRouter();

  const [incidentSyncing, setIncidentSyncing] = useState(false);
  const [incidentResult, setIncidentResult] = useState<SyncResult | null>(null);

  const [weatherSyncing, setWeatherSyncing] = useState(false);
  const [weatherResult, setWeatherResult] = useState<SyncResult | null>(null);

  const [legendSyncing, setLegendSyncing] = useState(false);
  const [legendResult, setLegendResult] = useState<SyncResult | null>(null);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleIncidentSync = async () => {
    setIncidentSyncing(true);
    setIncidentResult(null);

    try {
      const response = await fetch(`/api/tenant/${tenantSlug}/incidents/sync`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        setIncidentResult({
          success: true,
          message: `Synced: ${data.created} created, ${data.updated} updated, ${data.closed} closed`,
          details: data,
        });
      } else {
        setIncidentResult({
          success: false,
          message: data.error || 'Sync failed',
        });
      }
    } catch (error) {
      setIncidentResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setIncidentSyncing(false);
    }
  };

  const handleWeatherSync = async () => {
    setWeatherSyncing(true);
    setWeatherResult(null);

    try {
      const response = await fetch(`/api/tenant/${tenantSlug}/weather/sync`, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        setWeatherResult({
          success: true,
          message: `Synced: ${data.created} created, ${data.updated} updated, ${data.expired} expired`,
          details: data,
        });
      } else {
        setWeatherResult({
          success: false,
          message: data.error || 'Sync failed',
        });
      }
    } catch (error) {
      setWeatherResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setWeatherSyncing(false);
    }
  };

  const handleLegendSync = async (force = false) => {
    setLegendSyncing(true);
    setLegendResult(null);

    try {
      const url = force
        ? `/api/tenant/${tenantSlug}/units/legend?force=true`
        : `/api/tenant/${tenantSlug}/units/legend`;
      const response = await fetch(url, {
        method: 'POST',
      });
      const data = await response.json();

      if (response.ok) {
        setLegendResult({
          success: true,
          message: data.skipped
            ? data.message
            : `Synced ${data.unitCount} units`,
          details: data,
        });
        // Refresh the page to update the status badge
        router.refresh();
      } else {
        setLegendResult({
          success: false,
          message: data.error || 'Sync failed',
        });
      }
    } catch (error) {
      setLegendResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setLegendSyncing(false);
    }
  };

  const getLegendStatusBadge = () => {
    if (unitLegendStatus.available === false) {
      return (
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          <XCircle className="h-3 w-3 mr-1" />
          Not Available
        </Badge>
      );
    }
    if (unitLegendStatus.available === true) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700">
          <CheckCircle className="h-3 w-3 mr-1" />
          {unitLegendStatus.unitCount} Units
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
        <Clock className="h-3 w-3 mr-1" />
        Unknown
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Incidents Sync */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Incidents</h3>
            <p className="text-sm text-muted-foreground">
              Sync incident data from PulsePoint
            </p>
            {incidentResult && (
              <p
                className={`text-sm mt-2 ${
                  incidentResult.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {incidentResult.message}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleIncidentSync}
          disabled={incidentSyncing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${incidentSyncing ? 'animate-spin' : ''}`} />
          {incidentSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Weather Sync */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
        <div className="flex items-start gap-3">
          <CloudRain className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium">Weather Alerts</h3>
            <p className="text-sm text-muted-foreground">
              {hasWeatherEnabled
                ? 'Sync weather alerts from NWS'
                : 'Weather alerts not enabled for this tenant'}
            </p>
            {weatherResult && (
              <p
                className={`text-sm mt-2 ${
                  weatherResult.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {weatherResult.message}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleWeatherSync}
          disabled={weatherSyncing || !hasWeatherEnabled}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${weatherSyncing ? 'animate-spin' : ''}`} />
          {weatherSyncing ? 'Syncing...' : 'Sync Now'}
        </Button>
      </div>

      {/* Unit Legend Sync */}
      <div className="flex items-start justify-between gap-4 p-4 rounded-lg border">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div>
            <h3 className="font-medium flex items-center gap-2">
              Unit Legend
              {getLegendStatusBadge()}
            </h3>
            <p className="text-sm text-muted-foreground">
              Maps unit codes to department names
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Last updated: {formatDate(unitLegendStatus.updatedAt)}
            </p>
            {legendResult && (
              <p
                className={`text-sm mt-2 ${
                  legendResult.success ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {legendResult.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => handleLegendSync(false)}
            disabled={legendSyncing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${legendSyncing ? 'animate-spin' : ''}`} />
            {legendSyncing ? 'Syncing...' : 'Sync'}
          </Button>
          {unitLegendStatus.available === false && (
            <Button
              onClick={() => handleLegendSync(true)}
              disabled={legendSyncing}
              variant="secondary"
              size="sm"
              title="Force sync even if previously marked unavailable"
            >
              Force
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
