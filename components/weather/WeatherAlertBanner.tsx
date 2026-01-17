'use client';

import { AlertTriangle, X, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { WeatherAlert } from '@/lib/types';
import Link from 'next/link';

interface WeatherAlertBannerProps {
  alerts: WeatherAlert[];
  tenantSlug: string;
  dismissible?: boolean;
}

export function WeatherAlertBanner({
  alerts,
  tenantSlug,
  dismissible = true,
}: WeatherAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Only show alerts that are Severe or Extreme
  const severeAlerts = alerts.filter(
    (a) => a.severity === 'Severe' || a.severity === 'Extreme'
  );

  if (dismissed || severeAlerts.length === 0) {
    return null;
  }

  const bgColor =
    severeAlerts.some((a) => a.severity === 'Extreme')
      ? 'bg-purple-600'
      : 'bg-red-600';

  const alertCount = severeAlerts.length;
  const primaryAlert = severeAlerts[0];

  return (
    <div className={`${bgColor} text-white px-4 py-3`}>
      <div className="container mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <AlertTriangle className="h-5 w-5 shrink-0 animate-pulse" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold truncate">
              {alertCount > 1 ? `${alertCount} Weather Alerts` : primaryAlert.event}
            </p>
            <p className="text-sm text-white/80 truncate">
              {alertCount > 1
                ? severeAlerts.map((a) => a.event).join(', ')
                : primaryAlert.headline}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/tenant/${tenantSlug}/weather`}
            className="flex items-center gap-1 text-sm font-medium hover:underline"
          >
            View Details
            <ChevronRight className="h-4 w-4" />
          </Link>

          {dismissible && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 rounded"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
