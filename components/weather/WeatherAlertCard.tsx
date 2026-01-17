'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import type { WeatherAlert } from '@/lib/types';
import { getSeverityColor } from '@/services/weather';

interface WeatherAlertCardProps {
  alert: WeatherAlert;
  onClick?: () => void;
  compact?: boolean;
}

export function WeatherAlertCard({ alert, onClick, compact = false }: WeatherAlertCardProps) {
  const expiresDate = new Date(alert.expires);
  const formattedExpires = expiresDate.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const severityClass = getSeverityColor(alert.severity);

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 rounded-md border p-3 ${onClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
        onClick={onClick}
      >
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{alert.event}</p>
          <p className="text-sm text-muted-foreground truncate">{alert.headline}</p>
        </div>
        <Badge variant="secondary" className={severityClass}>
          {alert.severity}
        </Badge>
      </div>
    );
  }

  return (
    <Card
      className={`transition-shadow hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">{alert.event}</CardTitle>
          </div>
          <Badge variant="secondary" className={severityClass}>
            {alert.severity}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm">{alert.headline}</p>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Expires: {formattedExpires}</span>
        </div>

        {alert.instruction && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-sm">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="line-clamp-3">{alert.instruction}</p>
          </div>
        )}

        {alert.urgency && alert.certainty && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Urgency: {alert.urgency}</Badge>
            <Badge variant="outline">Certainty: {alert.certainty}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
