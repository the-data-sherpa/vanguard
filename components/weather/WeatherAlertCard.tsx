'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, Info, TrendingUp } from 'lucide-react';
import type { WeatherAlert } from '@/lib/types';

/**
 * Threat score calculation (matches backend logic from weatherFacebookSync.ts)
 */
const SEVERITY_SCORES: Record<string, number> = {
  Extreme: 40,
  Severe: 30,
  Moderate: 20,
  Minor: 10,
  Unknown: 5,
};

const URGENCY_SCORES: Record<string, number> = {
  Immediate: 30,
  Expected: 20,
  Future: 10,
  Unknown: 5,
};

const CERTAINTY_SCORES: Record<string, number> = {
  Observed: 30,
  Likely: 25,
  Possible: 15,
  Unlikely: 5,
  Unknown: 5,
};

function calculateThreatScore(alert: WeatherAlert): number {
  const severityScore = SEVERITY_SCORES[alert.severity] || 5;
  const urgencyScore = URGENCY_SCORES[alert.urgency || "Unknown"] || 5;
  const certaintyScore = CERTAINTY_SCORES[alert.certainty || "Unknown"] || 5;
  return severityScore + urgencyScore + certaintyScore;
}

function getThreatScoreColor(score: number): string {
  if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
  if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
  if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-blue-600 bg-blue-50 border-blue-200';
}

/**
 * Get Tailwind classes for severity badge styling
 */
function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'extreme':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'severe':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'minor':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

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
  const threatScore = calculateThreatScore(alert);
  const threatScoreClass = getThreatScoreColor(threatScore);

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

        {/* Threat Score Calculation */}
        <div className={`rounded-lg border p-3 ${threatScoreClass}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="font-medium text-sm">Threat Score: {threatScore}/100</span>
            </div>
            {(threatScore >= 55 || alert.severity === "Extreme") && (
              <Badge variant="outline" className="text-xs">
                Auto-Post Eligible
              </Badge>
            )}
          </div>
          <div className="text-xs space-y-1 text-muted-foreground">
            <div className="flex justify-between">
              <span>Severity ({alert.severity}):</span>
              <span className="font-medium">{SEVERITY_SCORES[alert.severity] || 5} pts</span>
            </div>
            <div className="flex justify-between">
              <span>Urgency ({alert.urgency || "Unknown"}):</span>
              <span className="font-medium">{URGENCY_SCORES[alert.urgency || "Unknown"] || 5} pts</span>
            </div>
            <div className="flex justify-between">
              <span>Certainty ({alert.certainty || "Unknown"}):</span>
              <span className="font-medium">{CERTAINTY_SCORES[alert.certainty || "Unknown"] || 5} pts</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
