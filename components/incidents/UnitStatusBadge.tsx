'use client';

import { Badge } from '@/components/ui/badge';
import type { UnitLegend } from '@/lib/types';

// Common unit type suffixes to strip when extracting department names
const UNIT_TYPE_SUFFIXES = [
  'AMBULANCE', 'EMS', 'MEDIC',
  'ENGINE', 'LADDER', 'TRUCK', 'TANKER', 'BRUSH', 'RESCUE',
  'BATTALION', 'CHIEF', 'CAPTAIN', 'UTILITY', 'SQUAD',
  'HAZMAT', 'SPECIAL', 'PUMPER', 'QUINT', 'TOWER',
];

/**
 * Department mapping based on unit ID prefixes
 * This is used as a fallback when no legend is available
 */
const DEPARTMENT_PREFIXES: Record<string, string> = {
  // EMS
  IMED: 'Iredell EMS',
  MED: 'Medic',
  EMS: 'EMS',
  AMB: 'Ambulance',

  // Mooresville Fire
  MF: 'Mooresville Fire',
  ME: 'Mooresville Fire',
  MFD: 'Mooresville Fire',

  // Statesville Fire
  SF: 'Statesville Fire',
  SE: 'Statesville Fire',
  SFD: 'Statesville Fire',

  // Troutman Fire
  TF: 'Troutman Fire',
  TE: 'Troutman Fire',
  TFD: 'Troutman Fire',

  // Numbered Fire Departments
  F11: 'Lake Norman Fire',
  F12: 'South Iredell Fire',
  F13: 'Ebenezer Fire',
  F14: 'Monticello Fire',
  F15: 'Union Grove Fire',
  F16: 'Sheffield-Callahan Fire',
  F18: 'County Line Fire',
  F20: 'Cool Springs Fire',
  F23: 'Wilkes-Iredell Fire',
  F24: 'Lone Hickory Fire',
  F30: 'West Iredell Fire',
  F34: 'Stony Point Fire',
  F44: 'Harmony Fire',
  F50: 'Shepherds Fire',
  F60: 'Wayside Fire',
  F70: 'Mount Mourne Fire',
  F80: 'Trinity Fire',
  F90: 'Central Fire',

  // Rescue Squads
  ICRS: 'Iredell County Rescue',
  R11: 'Iredell County Rescue',
  NIRS: 'North Iredell Rescue',
  NI: 'North Iredell Rescue',

  // Other Services
  FMO: 'Fire Marshal',
  FM: 'Fire Marshal',
  NCFS: 'NC Forestry Service',
  NC: 'NC Forestry Service',
  ACO: 'Animal Control',
  AC: 'Animal Control',
};

/**
 * Extract department from unit ID using prefix patterns
 * e.g., "IMED13" → "Iredell EMS"
 *       "F30E1" → "West Iredell Fire"
 *       "MFE4" → "Mooresville Fire"
 */
export function extractDepartmentFromUnitId(unitId: string): string | null {
  // Try to match known prefixes using regex
  // Matches: IMED13->IMED, F30E1->F30, SFE4->SF, ICRS1->ICRS
  const match = unitId.match(
    /^(IMED|ICRS|NIRS|FMO|NCFS|ACO|MED|EMS|AMB|SF|MF|TF|IC|NI|FM|NC|AC|F\d{2}|E\d{2}|R\d{2})/i
  );

  if (match) {
    const deptCode = match[1].toUpperCase();
    return DEPARTMENT_PREFIXES[deptCode] || null;
  }

  return null;
}

/**
 * Extract department name from unit description
 * e.g., "ALEXANDER AMBULANCE" → "Alexander"
 *       "BUCK SHOALS LADDER" → "Buck Shoals"
 */
export function extractDepartment(description: string): string {
  const upper = description.toUpperCase().trim();

  // Try to find and remove unit type suffix
  for (const suffix of UNIT_TYPE_SUFFIXES) {
    if (upper.endsWith(` ${suffix}`)) {
      const dept = description.slice(0, -(suffix.length + 1)).trim();
      // Title case the department name
      return dept
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }

  // If no suffix found, return the whole description title-cased
  return description
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Group units by their department
 * Uses legend descriptions if available, falls back to unit ID prefix extraction
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

    // First try to get department from legend
    if (unitLegend && unitLegend.length > 0) {
      const entry = unitLegend.find((u) => u.UnitKey === unit);
      if (entry?.Description) {
        department = extractDepartment(entry.Description);
      }
    }

    // If no legend match, try extracting from unit ID prefix
    if (department === 'Other') {
      const deptFromId = extractDepartmentFromUnitId(unit);
      if (deptFromId) {
        department = deptFromId;
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
  unitStatuses?: Record<string, { unit: string; status: string; timestamp: string }>;
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
        const status = unitStatuses?.[unit]?.status || 'Unknown';
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
  unitStatuses?: Record<string, { unit: string; status: string; timestamp: string }>;
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
    for (const suffix of UNIT_TYPE_SUFFIXES) {
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
    const unitData = unitStatuses?.[unit];
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
