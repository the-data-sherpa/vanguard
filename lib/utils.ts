import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { UnitLegend, UnitLegendEntry } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ===================
// Unit Department Grouping Utilities
// ===================

// Fire/Rescue unit type suffixes - these get stripped to show department name
export const FIRE_UNIT_SUFFIXES = [
  'ENGINE', 'LADDER', 'TRUCK', 'TANKER', 'BRUSH', 'RESCUE',
  'BATTALION', 'CHIEF', 'CAPTAIN', 'UTILITY', 'SQUAD',
  'HAZMAT', 'SPECIAL', 'PUMPER', 'QUINT', 'TOWER', 'FIRE',
];

// EMS unit type suffixes - these keep "EMS" in the group name
export const EMS_UNIT_SUFFIXES = ['AMBULANCE', 'EMS', 'MEDIC'];

// EMS-related prefixes for descriptions that start with EMS
export const EMS_PREFIXES = ['EMS ', 'MEDIC ', 'AMBULANCE '];

/**
 * Extract department/service name from unit description
 * 
 * Handles:
 * - Fire units: "MOORESVILLE ENGINE" → "Mooresville"
 * - Fire units with numbers: "SHEPHERDS BRUSH 1" → "Shepherds"
 * - EMS units: "MOORESVILLE EMS" → "Mooresville EMS"
 * - Generic EMS: "EMS SUPERVISOR" → "EMS"
 * - Units without suffixes: "MOORESVILLE" → "Mooresville"
 * 
 * @param description - Unit description from legend (e.g., "Mount Mourne Tanker 1")
 * @returns Department name (e.g., "Mount Mourne")
 */
export function extractDepartment(description: string): string {
  let upper = description.toUpperCase().trim();
  let desc = description.trim();

  // Helper to title case a string
  const titleCase = (str: string) => str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Strip trailing numbers FIRST (e.g., "SHEPHERDS BRUSH 1" → "SHEPHERDS BRUSH")
  // This handles apparatus numbers like Engine 1, Tanker 2, Brush 1, etc.
  const trailingNumberMatch = upper.match(/^(.+?)\s+\d+$/);
  if (trailingNumberMatch) {
    upper = trailingNumberMatch[1];
    desc = desc.replace(/\s+\d+$/, '');
  }

  // Check if description starts with EMS-related prefix (e.g., "EMS SUPERVISOR", "EMS CONVALESCENT")
  for (const prefix of EMS_PREFIXES) {
    if (upper.startsWith(prefix) || upper === prefix.trim()) {
      return 'EMS';
    }
  }

  // Check for EMS suffixes - keep "EMS" in the group name
  for (const suffix of EMS_UNIT_SUFFIXES) {
    if (upper.endsWith(` ${suffix}`)) {
      const dept = desc.slice(0, -(suffix.length + 1)).trim();
      if (dept) {
        return `${titleCase(dept)} EMS`;
      }
      return 'EMS';
    }
  }

  // Check for fire/rescue suffixes - strip suffix, return department name
  for (const suffix of FIRE_UNIT_SUFFIXES) {
    if (upper.endsWith(` ${suffix}`)) {
      const dept = desc.slice(0, -(suffix.length + 1)).trim();
      if (dept) {
        return titleCase(dept);
      }
    }
  }

  // If no suffix found, return the whole description title-cased
  return titleCase(desc);
}

/**
 * Group units by their department name
 *
 * Uses legend descriptions if available, otherwise groups under "Other".
 *
 * @param units - Array of unit IDs (e.g., ["F70T1", "F12BR1"])
 * @param unitLegend - Optional unit legend with descriptions
 * @returns Map of department name to array of unit IDs
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
      const entry = unitLegend.find(
        (u) => u.UnitKey.toLowerCase() === unit.toLowerCase()
      );
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
