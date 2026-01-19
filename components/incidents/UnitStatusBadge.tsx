'use client';

import { Badge } from '@/components/ui/badge';
import type { UnitLegend, UnitStatusesField } from '@/lib/types';
import { getUnitStatusByUnitId } from '@/lib/types';

// Fire/Rescue unit type suffixes - these get stripped to show department name
const FIRE_UNIT_SUFFIXES = [
  'ENGINE', 'LADDER', 'TRUCK', 'TANKER', 'BRUSH', 'RESCUE',
  'BATTALION', 'CHIEF', 'CAPTAIN', 'UTILITY', 'SQUAD',
  'HAZMAT', 'SPECIAL', 'PUMPER', 'QUINT', 'TOWER',
];

// EMS unit type suffixes - these keep "EMS" in the group name
const EMS_UNIT_SUFFIXES = ['AMBULANCE', 'EMS', 'MEDIC'];

// EMS-related prefixes for descriptions that start with EMS
const EMS_PREFIXES = ['EMS ', 'MEDIC ', 'AMBULANCE '];

/**
 * Extract department/service name from unit description
 *
 * Fire units: "MOORESVILLE ENGINE" → "Mooresville"
 * EMS units: "MOORESVILLE EMS" → "Mooresville EMS"
 * Generic EMS: "EMS SUPERVISOR" → "EMS"
 */
export function extractDepartment(description: string): string {
  const upper = description.toUpperCase().trim();

  // Helper to title case a string
  const titleCase = (str: string) => str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Check if description starts with EMS-related prefix (e.g., "EMS SUPERVISOR", "EMS CONVALESCENT")
  for (const prefix of EMS_PREFIXES) {
    if (upper.startsWith(prefix) || upper === prefix.trim()) {
      return 'EMS';
    }
  }

  // Check for EMS suffixes - keep "EMS" in the group name
  for (const suffix of EMS_UNIT_SUFFIXES) {
    if (upper.endsWith(` ${suffix}`)) {
      const dept = description.slice(0, -(suffix.length + 1)).trim();
      if (dept) {
        return `${titleCase(dept)} EMS`;
      }
      return 'EMS';
    }
  }

  // Check for fire/rescue suffixes - strip suffix, return department name
  for (const suffix of FIRE_UNIT_SUFFIXES) {
    if (upper.endsWith(` ${suffix}`)) {
      const dept = description.slice(0, -(suffix.length + 1)).trim();
      if (dept) {
        return titleCase(dept);
      }
    }
  }

  // If no suffix found, return the whole description title-cased
  return titleCase(description);
}

/**
 * Group units by their department
 * Uses legend descriptions if available, otherwise groups under "Other"
 */
export function groupUnitsByDepartment(
  units: string[],
  unitLegend?: UnitLegend
): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const unit of units) {
    // Skip VTAC (radio channel) units
    if (unit.toUpperCase().includes('VTAC')) continue;

    let department: string = 'Other';

    // Try to get department from legend
    if (unitLegend && unitLegend.length > 0) {
      const entry = unitLegend.find((u) => u.UnitKey === unit);
      if (entry?.Description) {
        department = extractDepartment(entry.Description);
      }
    }

    if (!groups.has(department)) {
      groups.set(department, []);
    }
    groups.get(department)!.push(unit);
  }

  return groups;
}

interface UnitStatusBadgeProps {
  unit: string;
  status: string;
  description?: string | null;
}

const statusColors: Record<string, string> = {
  // Full names
  Dispatched: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  Enroute: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'On Scene': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  OnScene: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  Available: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  Cleared: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  Transporting: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'At Hospital': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  // Abbreviations from PulsePoint
  DP: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  EN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ER: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  OS: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  AV: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  CL: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  TR: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  AH: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  AR: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const statusLabels: Record<string, string> = {
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

export function UnitStatusBadge({ unit, status, description }: UnitStatusBadgeProps) {
  const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';

  return (
    <Badge
      variant="outline"
      className={`${colorClass} font-mono text-xs`}
      title={description || undefined}
    >
      {unit}
    </Badge>
  );
}

interface UnitStatusListProps {
  units: string[];
  unitStatuses?: UnitStatusesField;
  unitLegend?: UnitLegend;
}

export function UnitStatusList({ units, unitStatuses, unitLegend }: UnitStatusListProps) {
  if (!units || units.length === 0) {
    return <span className="text-muted-foreground text-sm">No units</span>;
  }

  const getDescription = (unitKey: string): string | null => {
    if (!unitLegend) return null;
    const entry = unitLegend.find((u) => u.UnitKey === unitKey);
    return entry?.Description || null;
  };

  return (
    <div className="flex flex-wrap gap-1">
      {units.map((unit) => {
        const unitData = getUnitStatusByUnitId(unitStatuses, unit);
        const status = unitData?.status || 'Unknown';
        const description = getDescription(unit);
        return (
          <UnitStatusBadge
            key={unit}
            unit={unit}
            status={status}
            description={description}
          />
        );
      })}
    </div>
  );
}

interface UnitStatusDetailProps {
  units: string[];
  unitStatuses?: UnitStatusesField;
  unitLegend?: UnitLegend;
}

export function UnitStatusDetail({ units, unitStatuses, unitLegend }: UnitStatusDetailProps) {
  if (!units || units.length === 0) {
    return <span className="text-muted-foreground text-sm">No units assigned</span>;
  }

  const getDescription = (unitKey: string): string | null => {
    if (!unitLegend) return null;
    const entry = unitLegend.find((u) => u.UnitKey === unitKey);
    return entry?.Description || null;
  };

  // Get unit type from description (e.g., "ENGINE" from "ALEXANDER ENGINE")
  const getUnitType = (unitKey: string): string | null => {
    const desc = getDescription(unitKey);
    if (!desc) return null;
    const upper = desc.toUpperCase();
    // Check both fire and EMS suffixes
    const allSuffixes = [...FIRE_UNIT_SUFFIXES, ...EMS_UNIT_SUFFIXES];
    for (const suffix of allSuffixes) {
      if (upper.endsWith(` ${suffix}`)) {
        return suffix.charAt(0) + suffix.slice(1).toLowerCase();
      }
    }
    return null;
  };

  // Group units by department if legend is available
  const departmentGroups = unitLegend
    ? groupUnitsByDepartment(units, unitLegend)
    : null;

  // Render a single unit row
  const renderUnit = (unit: string, showDescription = true) => {
    const unitData = getUnitStatusByUnitId(unitStatuses, unit);
    const status = unitData?.status || 'Unknown';
    const timestamp = unitData?.timestamp;
    const colorClass = statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    const statusLabel = statusLabels[status] || status;
    const description = showDescription ? getDescription(unit) : null;
    const unitType = getUnitType(unit);

    // Format timestamp if available
    let formattedTime = '';
    if (timestamp) {
      try {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          formattedTime = date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {
        // Ignore invalid timestamps
      }
    }

    return (
      <div
        key={unit}
        className="flex items-center justify-between gap-4 rounded-md border px-3 py-2"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-medium shrink-0">{unit}</span>
            {unitType && (
              <span className="text-xs text-muted-foreground">{unitType}</span>
            )}
            <Badge variant="outline" className={`${colorClass} text-xs shrink-0`}>
              {statusLabel}
            </Badge>
          </div>
          {description && !unitType && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {description}
            </p>
          )}
        </div>
        {formattedTime && (
          <span className="text-xs text-muted-foreground shrink-0">{formattedTime}</span>
        )}
      </div>
    );
  };

  // If we have department groups, render grouped view
  if (departmentGroups && departmentGroups.size > 0) {
    // Sort departments alphabetically, but put "Unknown" last
    const sortedDepts = Array.from(departmentGroups.keys()).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return a.localeCompare(b);
    });

    return (
      <div className="space-y-4">
        {sortedDepts.map((dept) => {
          const deptUnits = departmentGroups.get(dept)!;
          return (
            <div key={dept}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {dept} ({deptUnits.length})
              </h4>
              <div className="space-y-2">
                {deptUnits.map((unit) => renderUnit(unit, false))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: render flat list without grouping
  return (
    <div className="space-y-2">
      {units.map((unit) => renderUnit(unit, true))}
    </div>
  );
}
