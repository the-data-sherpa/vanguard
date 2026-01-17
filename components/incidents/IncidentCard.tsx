'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Flame,
  Heart,
  AlertTriangle,
} from 'lucide-react';
import type { Incident, UnitLegend, CallTypeCategory } from '@/lib/types';
import {
  getCallTypeDescription,
  getIncidentPriority,
  getPriorityCardClasses,
  getPriorityBorderClass,
} from '@/lib/callTypeMapping';
import { groupUnitsByDepartment } from './UnitStatusBadge';
import { IncidentTimeline } from './IncidentTimeline';

interface IncidentCardProps {
  incident: Incident;
  onClick?: () => void;
  expandable?: boolean;
  unitLegend?: UnitLegend;
  showStatusBadge?: boolean;
}

// Get icon for call type category
function getCategoryIcon(category: CallTypeCategory) {
  switch (category) {
    case 'fire':
      return <Flame className="h-5 w-5 text-red-500" />;
    case 'medical':
      return <Heart className="h-5 w-5 text-green-500" />;
    case 'rescue':
    case 'traffic':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'hazmat':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default:
      return <MapPin className="h-5 w-5 text-blue-500" />;
  }
}

// Status display labels - maps PulsePoint status codes to readable text
const STATUS_LABELS: Record<string, string> = {
  // Full names
  Dispatched: 'Dispatched',
  Enroute: 'En Route',
  'On Scene': 'On Scene',
  OnScene: 'On Scene',
  Available: 'Available',
  Cleared: 'Cleared',
  Transporting: 'Transporting',
  'At Hospital': 'At Hospital',
  // Abbreviations from PulsePoint
  DP: 'Dispatched',
  EN: 'En Route',
  ER: 'En Route',
  OS: 'On Scene',
  AV: 'Available',
  CL: 'Cleared',
  TR: 'Transporting',
  AH: 'At Hospital',
  AR: 'Arrived',
};

export function IncidentCard({
  incident,
  onClick,
  expandable = true,
  unitLegend,
  showStatusBadge = true,
}: IncidentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const category = incident.callTypeCategory ?? 'other';
  const priority = getIncidentPriority(category);
  const callTypeDescription = getCallTypeDescription(incident.callType);

  const hasUnits = incident.units && incident.units.length > 0;
  const canExpand = expandable && hasUnits;

  // Always try to group units by department (works with or without legend)
  const departmentGroups = hasUnits
    ? groupUnitsByDepartment(incident.units!, unitLegend)
    : null;

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (canExpand) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      className={`transition-shadow hover:shadow-lg border-l-4 ${getPriorityBorderClass(priority)} ${getPriorityCardClasses(priority)} ${canExpand || onClick ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Icon + Call Type + Time */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getCategoryIcon(category)}
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              {showStatusBadge && (
                <Badge
                  className={
                    incident.status === 'active'
                      ? 'bg-red-600 text-white hover:bg-red-600'
                      : 'bg-gray-500 text-white hover:bg-gray-500'
                  }
                >
                  {incident.status === 'active' ? '🚨 ACTIVE' : 'CLOSED'}
                </Badge>
              )}
              <span className="font-semibold truncate">{callTypeDescription}</span>
            </div>
          </div>
          <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
            {formatDistanceToNow(new Date(incident.callReceivedTime), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Incident Progress - always visible */}
        <IncidentTimeline
          status={incident.status}
          unitStatuses={incident.unitStatuses}
        />

        {/* Address */}
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground line-clamp-2">
            {incident.fullAddress}
          </p>
        </div>

        {/* Expand/Collapse for units */}
        {canExpand && !isExpanded && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={handleExpandClick}
          >
            Show {incident.units!.length} Units <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        )}

        {/* Expanded Unit Details */}
        {hasUnits && isExpanded && (
          <div className="border-t pt-3 space-y-3">
            <p className="text-sm font-medium">
              Units Responding ({incident.units!.length})
            </p>

            {/* Group units by department */}
            {departmentGroups && departmentGroups.size > 0 ? (
              <div className="space-y-4">
                {Array.from(departmentGroups.entries())
                  .sort((a, b) => {
                    if (a[0] === 'Other') return 1;
                    if (b[0] === 'Other') return -1;
                    return a[0].localeCompare(b[0]);
                  })
                  .map(([dept, units]) => (
                    <div key={dept}>
                      <p className="text-xs font-semibold text-primary mb-2">{dept}</p>
                      <div className="space-y-1 ml-2">
                        {units.map((unit) => {
                          const unitData = incident.unitStatuses?.[unit];
                          const status = unitData?.status || 'Unknown';
                          const statusLabel = STATUS_LABELS[status] || status;

                          return (
                            <div key={unit} className="flex items-center justify-between">
                              <span className="font-mono text-sm">{unit}</span>
                              <Badge variant="outline" className="text-xs">
                                {statusLabel}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              // Fallback: flat list without grouping
              <div className="space-y-1 ml-2">
                {incident.units!.map((unit) => {
                  const unitData = incident.unitStatuses?.[unit];
                  const status = unitData?.status || 'Unknown';
                  const statusLabel = STATUS_LABELS[status] || status;

                  return (
                    <div key={unit} className="flex items-center justify-between">
                      <span className="font-mono text-sm">{unit}</span>
                      <Badge variant="outline" className="text-xs">
                        {statusLabel}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={handleExpandClick}
            >
              Hide Units <ChevronUp className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        {/* Description if available */}
        {incident.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {incident.description}
          </p>
        )}

        {/* Source indicator */}
        {incident.source === 'pulsepoint' && (
          <span className="text-xs text-muted-foreground">✓ Verified</span>
        )}
        {incident.source === 'user_submitted' && (
          <Badge
            variant="outline"
            className="text-xs border-blue-500 text-blue-700 dark:text-blue-400"
          >
            📱 Community Report
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
