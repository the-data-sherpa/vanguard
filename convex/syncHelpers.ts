/**
 * Sync Helper Functions
 * Ported from ICAW PulsePoint implementation
 */

// ===================
// Types
// ===================

/**
 * Rich unit status with all timestamp fields
 */
export interface UnitStatus {
  unitId: string;
  status: string;
  timeDispatched?: number;
  timeAcknowledged?: number;
  timeEnroute?: number;
  timeOnScene?: number;
  timeCleared?: number;
}

/**
 * Incident data for comparison
 */
export interface IncidentData {
  callType: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  units?: string[];
  unitStatuses?: UnitStatus[];
  status: "active" | "closed";
  callClosedTime?: number;
}

// ===================
// Exponential Backoff Retry
// ===================

/**
 * Execute an operation with exponential backoff retry
 * Handles Convex conflicts gracefully
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 100
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if it's a conflict error (Convex OCC conflict)
      const isConflict = lastError.message.includes("conflict") ||
                         lastError.message.includes("Optimistic concurrency") ||
                         lastError.message.includes("WriteConflict");

      if (!isConflict || attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 50;
      console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed with conflict, retrying in ${Math.round(delay)}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ===================
// Address Normalization
// ===================

/**
 * Normalize address for consistent grouping/matching
 * - Uppercase
 * - Trim whitespace
 * - Normalize multiple spaces to single
 * - Remove common abbreviation variations
 */
export function normalizeAddress(raw: string | null | undefined): string {
  if (!raw) return "";

  let normalized = raw
    .toUpperCase()
    .trim()
    // Normalize multiple spaces to single space
    .replace(/\s+/g, " ")
    // Standardize common abbreviations
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bCIRCLE\b/g, "CIR")
    .replace(/\bPLACE\b/g, "PL")
    .replace(/\bNORTH\b/g, "N")
    .replace(/\bSOUTH\b/g, "S")
    .replace(/\bEAST\b/g, "E")
    .replace(/\bWEST\b/g, "W")
    .replace(/\bAPARTMENT\b/g, "APT")
    .replace(/\bSUITE\b/g, "STE")
    .replace(/\bHIGHWAY\b/g, "HWY")
    // Remove periods after abbreviations
    .replace(/\./g, "")
    // Remove # symbol
    .replace(/#/g, "");

  return normalized;
}

// ===================
// Conflict Detection
// ===================

/**
 * Check if an incident has meaningful changes
 * Returns true if the incoming data differs from existing data
 */
export function hasIncidentChanged(
  existing: IncidentData,
  incoming: IncidentData
): boolean {
  // Check simple fields
  if (existing.callType !== incoming.callType) return true;
  if (existing.status !== incoming.status) return true;
  if (existing.callClosedTime !== incoming.callClosedTime) return true;

  // Check address (normalize for comparison)
  const existingAddr = normalizeAddress(existing.fullAddress);
  const incomingAddr = normalizeAddress(incoming.fullAddress);
  if (existingAddr !== incomingAddr) return true;

  // Check coordinates (with small tolerance for floating point)
  if (existing.latitude !== undefined && incoming.latitude !== undefined) {
    if (Math.abs(existing.latitude - incoming.latitude) > 0.0001) return true;
  } else if (existing.latitude !== incoming.latitude) {
    return true;
  }

  if (existing.longitude !== undefined && incoming.longitude !== undefined) {
    if (Math.abs(existing.longitude - incoming.longitude) > 0.0001) return true;
  } else if (existing.longitude !== incoming.longitude) {
    return true;
  }

  // Check units array
  const existingUnits = existing.units || [];
  const incomingUnits = incoming.units || [];
  if (existingUnits.length !== incomingUnits.length) return true;
  const sortedExisting = [...existingUnits].sort();
  const sortedIncoming = [...incomingUnits].sort();
  if (!sortedExisting.every((u, i) => u === sortedIncoming[i])) return true;

  // Check unit statuses
  if (hasUnitStatusesChanged(existing.unitStatuses, incoming.unitStatuses)) {
    return true;
  }

  return false;
}

/**
 * Check if unit statuses have changed
 */
function hasUnitStatusesChanged(
  existing: UnitStatus[] | undefined,
  incoming: UnitStatus[] | undefined
): boolean {
  if (!existing && !incoming) return false;
  if (!existing || !incoming) return true;
  if (existing.length !== incoming.length) return true;

  // Create maps for comparison
  const existingMap = new Map(existing.map(u => [u.unitId, u]));

  for (const unit of incoming) {
    const existingUnit = existingMap.get(unit.unitId);
    if (!existingUnit) return true;

    if (existingUnit.status !== unit.status) return true;
    if (existingUnit.timeDispatched !== unit.timeDispatched) return true;
    if (existingUnit.timeAcknowledged !== unit.timeAcknowledged) return true;
    if (existingUnit.timeEnroute !== unit.timeEnroute) return true;
    if (existingUnit.timeOnScene !== unit.timeOnScene) return true;
    if (existingUnit.timeCleared !== unit.timeCleared) return true;
  }

  return false;
}

// ===================
// Time/Filter Helpers
// ===================

/**
 * Check if an incident is within the time window (default 6 hours)
 */
export function isWithinTimeWindow(
  callReceivedTime: number,
  windowMs = 6 * 60 * 60 * 1000 // 6 hours
): boolean {
  // Handle invalid timestamps - include them rather than exclude
  if (!callReceivedTime || isNaN(callReceivedTime)) {
    return true;
  }
  const cutoff = Date.now() - windowMs;
  return callReceivedTime >= cutoff;
}

/**
 * Filter and limit incidents
 * - Remove incidents older than 6 hours (but keep ones with invalid timestamps)
 * - Cap at maxIncidents (default 200)
 */
export function filterAndLimitIncidents<T extends { callReceivedTime: number }>(
  incidents: T[],
  maxIncidents = 200,
  windowMs = 6 * 60 * 60 * 1000
): T[] {
  // Filter by time window (incidents with invalid timestamps are kept)
  const filtered = incidents.filter(inc => isWithinTimeWindow(inc.callReceivedTime, windowMs));

  // Sort by time (newest first), handle NaN values
  const sorted = filtered.sort((a, b) => {
    const aTime = a.callReceivedTime || 0;
    const bTime = b.callReceivedTime || 0;
    if (isNaN(aTime) && isNaN(bTime)) return 0;
    if (isNaN(aTime)) return 1; // Put invalid timestamps at the end
    if (isNaN(bTime)) return -1;
    return bTime - aTime;
  });

  return sorted.slice(0, maxIncidents);
}

// ===================
// Unit Status Transform
// ===================

/**
 * Transform PulsePoint unit data to UnitStatus array format
 * Extracts all 5 timestamps per unit
 * Filters out VTAC (virtual units)
 * Handles UnitClearedDateTime as alternate to TimeCleared (ported from ICAW)
 */
export function transformUnitStatuses(
  units: Array<{
    UnitID: string;
    PulsePointDispatchStatus: string;
    TimeDispatched?: string;
    TimeAcknowledged?: string;
    TimeEnroute?: string;
    TimeOnScene?: string;
    TimeCleared?: string;
    UnitClearedDateTime?: string; // Alternate field name for cleared time
  }> | undefined
): UnitStatus[] {
  if (!units || units.length === 0) return [];

  const parseTime = (timeStr?: string): number | undefined => {
    if (!timeStr) return undefined;
    const parsed = new Date(timeStr).getTime();
    return isNaN(parsed) ? undefined : parsed;
  };

  return units
    // Filter out VTAC units (virtual units used for testing)
    .filter(u => !u.UnitID.toUpperCase().includes("VTAC"))
    .map(u => {
      // Handle alternate field name for cleared time
      const clearedTime = u.TimeCleared || u.UnitClearedDateTime;

      // Determine if unit is cleared - if so, override status to CL
      // This matches ICAW's logic for accurate status tracking
      const isCleared = !!clearedTime;
      const status = isCleared ? "CL" : (u.PulsePointDispatchStatus || "DP");

      return {
        unitId: u.UnitID,
        status,
        timeDispatched: parseTime(u.TimeDispatched),
        timeAcknowledged: parseTime(u.TimeAcknowledged),
        timeEnroute: parseTime(u.TimeEnroute),
        timeOnScene: parseTime(u.TimeOnScene),
        timeCleared: parseTime(clearedTime),
      };
    });
}

/**
 * Convert new array format to legacy Record format for backwards compatibility
 */
export function unitStatusesToRecord(
  statuses: UnitStatus[] | undefined
): Record<string, { unit: string; status: string; timestamp: number }> | undefined {
  if (!statuses || statuses.length === 0) return undefined;

  const record: Record<string, { unit: string; status: string; timestamp: number }> = {};

  for (const status of statuses) {
    // Use the most recent timestamp available
    const timestamp = status.timeOnScene
      || status.timeEnroute
      || status.timeAcknowledged
      || status.timeDispatched
      || Date.now();

    record[status.unitId] = {
      unit: status.unitId,
      status: status.status,
      timestamp,
    };
  }

  return record;
}

/**
 * Convert legacy Record format to new array format
 */
export function recordToUnitStatuses(
  record: Record<string, { unit: string; status: string; timestamp: number }> | undefined
): UnitStatus[] {
  if (!record) return [];

  return Object.values(record).map(r => ({
    unitId: r.unit,
    status: r.status,
    // Legacy format only has one timestamp, assume it's the most recent state
    timeDispatched: r.timestamp,
  }));
}

// ===================
// Call Type Mapping (ported from ICAW)
// ===================

export type CallTypeCategory = "fire" | "medical" | "rescue" | "traffic" | "hazmat" | "other";

/**
 * ICAW category type
 */
type ICAWCategory =
  | "Aid"
  | "Aircraft"
  | "Alarm"
  | "Assist"
  | "Explosion"
  | "Fire"
  | "Hazard"
  | "Investigation"
  | "Lockout"
  | "Medical"
  | "Natural Disaster"
  | "Rescue"
  | "Vehicle"
  | "Wires"
  | "Other"
  | "Alert"
  | "Unknown";

/**
 * Map ICAW's 17 categories to Vanguard's 6 categories
 */
const ICAW_TO_VANGUARD: Record<ICAWCategory, CallTypeCategory> = {
  "Aid": "other",
  "Aircraft": "traffic",
  "Alarm": "fire",
  "Assist": "other",
  "Explosion": "fire",
  "Fire": "fire",
  "Hazard": "hazmat",
  "Investigation": "other",
  "Lockout": "other",
  "Medical": "medical",
  "Natural Disaster": "other",
  "Rescue": "rescue",
  "Vehicle": "traffic",
  "Wires": "hazmat",
  "Other": "other",
  "Alert": "other",
  "Unknown": "other",
};

/**
 * Comprehensive call type code to ICAW category mapping
 * Ported from ICAW's callTypes.ts
 */
const CALL_TYPE_CATEGORIES: Record<string, ICAWCategory> = {
  // Aid
  AA: "Aid", MU: "Aid", ST: "Aid",
  // Aircraft
  AC: "Aircraft", AE: "Aircraft", AES: "Aircraft", LZ: "Aircraft",
  // Alarm
  AED: "Alarm", OA: "Alarm", CMA: "Alarm", FA: "Alarm", MA: "Alarm",
  SD: "Alarm", TRBL: "Alarm", WFA: "Alarm",
  // Assist
  FL: "Assist", LR: "Assist", LA: "Assist", PA: "Assist", PS: "Assist", SH: "Assist",
  // Explosion
  EX: "Explosion", PE: "Explosion", TE: "Explosion",
  // Fire
  AF: "Fire", CHIM: "Fire", CF: "Fire", WSF: "Fire", WVEG: "Fire", CB: "Fire",
  ELF: "Fire", EF: "Fire", FIRE: "Fire", FULL: "Fire", IF: "Fire", MF: "Fire",
  OF: "Fire", PF: "Fire", GF: "Fire", RF: "Fire", SF: "Fire", TF: "Fire",
  VEG: "Fire", VF: "Fire", WF: "Fire", WCF: "Fire", WRF: "Fire",
  // Hazard
  BT: "Hazard", EE: "Hazard", EM: "Hazard", ER: "Hazard", GAS: "Hazard",
  HC: "Hazard", HMR: "Hazard", TD: "Hazard", WE: "Hazard",
  // Investigation
  AI: "Investigation", FWI: "Investigation", HMI: "Investigation", INV: "Investigation",
  OI: "Investigation", SI: "Investigation",
  // Lockout
  CL: "Lockout", LO: "Lockout", RL: "Lockout", VL: "Lockout",
  // Medical
  CP: "Medical", IFT: "Medical", ME: "Medical", MCI: "Medical",
  // Natural Disaster
  EQ: "Natural Disaster", FLW: "Natural Disaster", TOW: "Natural Disaster",
  TSW: "Natural Disaster", WX: "Natural Disaster",
  // Rescue
  AR: "Rescue", CR: "Rescue", CSR: "Rescue", ELR: "Rescue", EER: "Rescue",
  IR: "Rescue", IA: "Rescue", RES: "Rescue", RR: "Rescue", SC: "Rescue",
  TR: "Rescue", TNR: "Rescue", USAR: "Rescue", VS: "Rescue", WR: "Rescue",
  // Vehicle
  TCP: "Vehicle", TCS: "Vehicle", TCT: "Vehicle", TCE: "Vehicle", RTE: "Vehicle",
  TC: "Vehicle", MVA: "Vehicle", MVC: "Vehicle",
  // Wires
  PLE: "Wires", WA: "Wires", WD: "Wires", WDA: "Wires",
  // Other
  BP: "Other", CA: "Other", FW: "Other", MC: "Other", NO: "Other",
  STBY: "Other", TEST: "Other", TRNG: "Other",
  // Alert
  NEWS: "Alert", CERT: "Alert", DISASTER: "Alert",
  // Unknown
  UNK: "Unknown",
};

/**
 * Map a PulsePoint call type code to a Vanguard category
 * Uses ICAW's code-based lookup for accuracy
 */
export function mapCallTypeToCategory(callType: string): CallTypeCategory {
  // First, try direct code lookup (most reliable)
  const upper = callType.toUpperCase().trim();
  const icawCategory = CALL_TYPE_CATEGORIES[upper];
  if (icawCategory) {
    return ICAW_TO_VANGUARD[icawCategory];
  }

  // Fallback: keyword-based matching for descriptive call types
  const lower = callType.toLowerCase();

  // Fire-related keywords
  if (
    lower.includes("fire") ||
    lower.includes("smoke") ||
    lower.includes("alarm") ||
    lower.includes("explosion")
  ) {
    return "fire";
  }

  // Medical keywords
  if (
    lower.includes("medical") ||
    lower.includes("ems") ||
    lower.includes("ambulance") ||
    lower.includes("cardiac") ||
    lower.includes("breathing") ||
    lower.includes("unconscious") ||
    lower.includes("injury") ||
    lower.includes("sick") ||
    lower.includes("casualty")
  ) {
    return "medical";
  }

  // Rescue keywords
  if (
    lower.includes("rescue") ||
    lower.includes("trapped") ||
    lower.includes("missing") ||
    lower.includes("collapse")
  ) {
    return "rescue";
  }

  // Traffic/Vehicle keywords
  if (
    lower.includes("accident") ||
    lower.includes("collision") ||
    lower.includes("mva") ||
    lower.includes("mvc") ||
    lower.includes("vehicle") ||
    lower.includes("traffic") ||
    lower.includes("aircraft") ||
    lower.includes("train")
  ) {
    return "traffic";
  }

  // Hazmat keywords
  if (
    lower.includes("hazmat") ||
    lower.includes("hazardous") ||
    lower.includes("spill") ||
    lower.includes("chemical") ||
    lower.includes("leak") ||
    lower.includes("gas") ||
    lower.includes("wires") ||
    lower.includes("powerline") ||
    lower.includes("electrical")
  ) {
    return "hazmat";
  }

  return "other";
}
