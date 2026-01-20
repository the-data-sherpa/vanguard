/**
 * Call Type Mapping Utility
 * Maps PulsePoint call type codes to human-readable categories and descriptions
 *
 * Ported from ICAW's comprehensive call type system:
 * ~/Projects/icaw/convex/callTypes.ts
 */

import type { CallTypeCategory } from './types';

/**
 * ICAW categories mapped to Vanguard's simplified category system
 * ICAW has 17 categories, Vanguard uses 6
 */
type ICAWCategory =
  | 'Aid'
  | 'Aircraft'
  | 'Alarm'
  | 'Assist'
  | 'Explosion'
  | 'Fire'
  | 'Hazard'
  | 'Investigation'
  | 'Lockout'
  | 'Medical'
  | 'Natural Disaster'
  | 'Rescue'
  | 'Vehicle'
  | 'Wires'
  | 'Other'
  | 'Alert'
  | 'Unknown';

/**
 * Map ICAW's 17 categories to Vanguard's 6 categories
 */
const ICAW_TO_VANGUARD_CATEGORY: Record<ICAWCategory, CallTypeCategory> = {
  'Aid': 'other',
  'Aircraft': 'traffic',
  'Alarm': 'fire',
  'Assist': 'other',
  'Explosion': 'fire',
  'Fire': 'fire',
  'Hazard': 'hazmat',
  'Investigation': 'other',
  'Lockout': 'other',
  'Medical': 'medical',
  'Natural Disaster': 'other',
  'Rescue': 'rescue',
  'Vehicle': 'traffic',
  'Wires': 'hazmat',
  'Other': 'other',
  'Alert': 'other',
  'Unknown': 'other',
};

/**
 * Call type definition with ICAW category
 */
interface CallTypeDefinition {
  id: string;
  description: string;
  category: ICAWCategory;
  alertable: boolean;
}

/**
 * Comprehensive call type definitions from ICAW
 * All call types mapped to 17 ICAW categories
 */
const CALL_TYPES: CallTypeDefinition[] = [
  // Aid
  { id: 'AA', description: 'Auto Aid', category: 'Aid', alertable: true },
  { id: 'MU', description: 'Mutual Aid', category: 'Aid', alertable: true },
  { id: 'ST', description: 'Strike Team/Task Force', category: 'Aid', alertable: true },

  // Aircraft
  { id: 'AC', description: 'Aircraft Crash', category: 'Aircraft', alertable: true },
  { id: 'AE', description: 'Aircraft Emergency', category: 'Aircraft', alertable: true },
  { id: 'AES', description: 'Aircraft Emergency Standby', category: 'Aircraft', alertable: true },
  { id: 'LZ', description: 'Landing Zone', category: 'Aircraft', alertable: true },

  // Alarm
  { id: 'AED', description: 'AED Alarm', category: 'Alarm', alertable: false },
  { id: 'OA', description: 'Alarm', category: 'Alarm', alertable: false },
  { id: 'CMA', description: 'Carbon Monoxide Alarm', category: 'Alarm', alertable: false },
  { id: 'FA', description: 'Fire Alarm', category: 'Alarm', alertable: false },
  { id: 'MA', description: 'Manual Alarm', category: 'Alarm', alertable: false },
  { id: 'SD', description: 'Smoke Detector', category: 'Alarm', alertable: false },
  { id: 'TRBL', description: 'Trouble Alarm', category: 'Alarm', alertable: false },
  { id: 'WFA', description: 'Waterflow Alarm', category: 'Alarm', alertable: false },

  // Assist
  { id: 'FL', description: 'Flooding', category: 'Assist', alertable: true },
  { id: 'LR', description: 'Ladder Request', category: 'Assist', alertable: false },
  { id: 'LA', description: 'Lift Assist', category: 'Assist', alertable: false },
  { id: 'PA', description: 'Police Assist', category: 'Assist', alertable: false },
  { id: 'PS', description: 'Public Service', category: 'Assist', alertable: false },
  { id: 'SH', description: 'Sheared Hydrant', category: 'Assist', alertable: false },

  // Explosion
  { id: 'EX', description: 'Explosion', category: 'Explosion', alertable: false },
  { id: 'PE', description: 'Pipeline Emergency', category: 'Explosion', alertable: true },
  { id: 'TE', description: 'Transformer Explosion', category: 'Explosion', alertable: true },

  // Fire
  { id: 'AF', description: 'Appliance Fire', category: 'Fire', alertable: false },
  { id: 'CHIM', description: 'Chimney Fire', category: 'Fire', alertable: false },
  { id: 'CF', description: 'Commercial Fire', category: 'Fire', alertable: true },
  { id: 'WSF', description: 'Confirmed Structure Fire', category: 'Fire', alertable: true },
  { id: 'WVEG', description: 'Confirmed Vegetation Fire', category: 'Fire', alertable: true },
  { id: 'CB', description: 'Controlled Burn/Prescribed Fire', category: 'Fire', alertable: false },
  { id: 'ELF', description: 'Electrical Fire', category: 'Fire', alertable: false },
  { id: 'EF', description: 'Extinguished Fire', category: 'Fire', alertable: false },
  { id: 'FIRE', description: 'Fire', category: 'Fire', alertable: false },
  { id: 'FULL', description: 'Full Assignment', category: 'Fire', alertable: false },
  { id: 'IF', description: 'Illegal Fire', category: 'Fire', alertable: false },
  { id: 'MF', description: 'Marine Fire', category: 'Fire', alertable: false },
  { id: 'OF', description: 'Outside Fire', category: 'Fire', alertable: false },
  { id: 'PF', description: 'Pole Fire', category: 'Fire', alertable: true },
  { id: 'GF', description: 'Refuse/Garbage Fire', category: 'Fire', alertable: false },
  { id: 'RF', description: 'Residential Fire', category: 'Fire', alertable: true },
  { id: 'SF', description: 'Structure Fire', category: 'Fire', alertable: true },
  { id: 'TF', description: 'Tank Fire', category: 'Fire', alertable: false },
  { id: 'VEG', description: 'Vegetation Fire', category: 'Fire', alertable: true },
  { id: 'VF', description: 'Vehicle Fire', category: 'Fire', alertable: true },
  { id: 'WF', description: 'Confirmed Fire', category: 'Fire', alertable: false },
  { id: 'WCF', description: 'Working Commercial Fire', category: 'Fire', alertable: true },
  { id: 'WRF', description: 'Working Residential Fire', category: 'Fire', alertable: true },

  // Hazard
  { id: 'BT', description: 'Bomb Threat', category: 'Hazard', alertable: false },
  { id: 'EE', description: 'Electrical Emergency', category: 'Hazard', alertable: true },
  { id: 'EM', description: 'Emergency', category: 'Hazard', alertable: false },
  { id: 'ER', description: 'Emergency Response', category: 'Hazard', alertable: false },
  { id: 'GAS', description: 'Gas Leak', category: 'Hazard', alertable: true },
  { id: 'HC', description: 'Hazardous Condition', category: 'Hazard', alertable: false },
  { id: 'HMR', description: 'Hazardous Response', category: 'Hazard', alertable: true },
  { id: 'TD', description: 'Tree Down', category: 'Hazard', alertable: false },
  { id: 'WE', description: 'Water Emergency', category: 'Hazard', alertable: true },

  // Investigation
  { id: 'AI', description: 'Arson Investigation', category: 'Investigation', alertable: false },
  { id: 'FWI', description: 'Fireworks Investigation', category: 'Investigation', alertable: false },
  { id: 'HMI', description: 'Hazmat Investigation', category: 'Investigation', alertable: false },
  { id: 'INV', description: 'Investigation', category: 'Investigation', alertable: false },
  { id: 'OI', description: 'Odor Investigation', category: 'Investigation', alertable: false },
  { id: 'SI', description: 'Smoke Investigation', category: 'Investigation', alertable: false },

  // Lockout
  { id: 'CL', description: 'Commercial Lockout', category: 'Lockout', alertable: false },
  { id: 'LO', description: 'Lockout', category: 'Lockout', alertable: false },
  { id: 'RL', description: 'Residential Lockout', category: 'Lockout', alertable: false },
  { id: 'VL', description: 'Vehicle Lockout', category: 'Lockout', alertable: false },

  // Medical
  { id: 'CP', description: 'Community Paramedicine', category: 'Medical', alertable: false },
  { id: 'IFT', description: 'Interfacility Transfer', category: 'Medical', alertable: false },
  { id: 'ME', description: 'Medical Emergency', category: 'Medical', alertable: false },
  { id: 'MCI', description: 'Multi Casualty Incident', category: 'Medical', alertable: true },

  // Natural Disaster
  { id: 'EQ', description: 'Earthquake', category: 'Natural Disaster', alertable: true },
  { id: 'FLW', description: 'Flood Warning', category: 'Natural Disaster', alertable: true },
  { id: 'TOW', description: 'Tornado Warning', category: 'Natural Disaster', alertable: true },
  { id: 'TSW', description: 'Tsunami Warning', category: 'Natural Disaster', alertable: true },
  { id: 'WX', description: 'Weather Incident', category: 'Natural Disaster', alertable: false },

  // Rescue
  { id: 'AR', description: 'Animal Rescue', category: 'Rescue', alertable: true },
  { id: 'CR', description: 'Cliff Rescue', category: 'Rescue', alertable: true },
  { id: 'CSR', description: 'Confined Space Rescue', category: 'Rescue', alertable: true },
  { id: 'ELR', description: 'Elevator Rescue', category: 'Rescue', alertable: true },
  { id: 'EER', description: 'Elevator/Escalator Rescue', category: 'Rescue', alertable: true },
  { id: 'IR', description: 'Ice Rescue', category: 'Rescue', alertable: true },
  { id: 'IA', description: 'Industrial Accident', category: 'Rescue', alertable: false },
  { id: 'RES', description: 'Rescue', category: 'Rescue', alertable: true },
  { id: 'RR', description: 'Rope Rescue', category: 'Rescue', alertable: true },
  { id: 'SC', description: 'Structural Collapse', category: 'Rescue', alertable: false },
  { id: 'TR', description: 'Technical Rescue', category: 'Rescue', alertable: true },
  { id: 'TNR', description: 'Trench Rescue', category: 'Rescue', alertable: true },
  { id: 'USAR', description: 'Urban Search and Rescue', category: 'Rescue', alertable: true },
  { id: 'VS', description: 'Vessel Sinking', category: 'Rescue', alertable: true },
  { id: 'WR', description: 'Water Rescue', category: 'Rescue', alertable: true },

  // Vehicle/Traffic
  { id: 'TCP', description: 'Collision Involving Pedestrian', category: 'Vehicle', alertable: true },
  { id: 'TCS', description: 'Collision Involving Structure', category: 'Vehicle', alertable: true },
  { id: 'TCT', description: 'Collision Involving Train', category: 'Vehicle', alertable: true },
  { id: 'TCE', description: 'Expanded Traffic Collision', category: 'Vehicle', alertable: true },
  { id: 'RTE', description: 'Railroad/Train Emergency', category: 'Vehicle', alertable: true },
  { id: 'TC', description: 'Traffic Collision', category: 'Vehicle', alertable: true },
  { id: 'MVA', description: 'Motor Vehicle Accident', category: 'Vehicle', alertable: true },
  { id: 'MVC', description: 'Motor Vehicle Collision', category: 'Vehicle', alertable: true },

  // Wires
  { id: 'PLE', description: 'Powerline Emergency', category: 'Wires', alertable: true },
  { id: 'WA', description: 'Wires Arcing', category: 'Wires', alertable: true },
  { id: 'WD', description: 'Wires Down', category: 'Wires', alertable: true },
  { id: 'WDA', description: 'Wires Down/Arcing', category: 'Wires', alertable: true },

  // Other
  { id: 'BP', description: 'Burn Permit', category: 'Other', alertable: false },
  { id: 'CA', description: 'Community Activity', category: 'Other', alertable: false },
  { id: 'FW', description: 'Fire Watch', category: 'Other', alertable: false },
  { id: 'MC', description: 'Move-up/Cover', category: 'Other', alertable: false },
  { id: 'NO', description: 'Notification', category: 'Other', alertable: false },
  { id: 'STBY', description: 'Standby', category: 'Other', alertable: false },
  { id: 'TEST', description: 'Test', category: 'Other', alertable: false },
  { id: 'TRNG', description: 'Training', category: 'Other', alertable: false },

  // Alert
  { id: 'NEWS', description: 'News', category: 'Alert', alertable: false },
  { id: 'CERT', description: 'CERT', category: 'Alert', alertable: false },
  { id: 'DISASTER', description: 'Disaster', category: 'Alert', alertable: false },

  // Unknown
  { id: 'UNK', description: 'Unknown Call Type', category: 'Unknown', alertable: false },
];

/**
 * Build lookup map for fast access by code
 */
const CALL_TYPE_BY_CODE = new Map<string, CallTypeDefinition>(
  CALL_TYPES.map(ct => [ct.id.toUpperCase(), ct])
);

/**
 * Get call type definition by code
 */
export function getCallTypeByCode(code: string): CallTypeDefinition | undefined {
  return CALL_TYPE_BY_CODE.get(code.toUpperCase().trim());
}

/**
 * Get the human-readable description for a call type code
 */
export function getCallTypeDescription(callType: string): string {
  const def = getCallTypeByCode(callType);
  if (def) {
    return def.description;
  }

  // If it's already a descriptive string (contains spaces), return as-is
  if (callType.includes(' ')) {
    return callType;
  }

  // Return the original if no match found
  return callType;
}

/**
 * Map a PulsePoint call type code to a Vanguard category
 * Uses ICAW's code-based lookup for accuracy
 */
export function mapCallTypeToCategory(callType: string): CallTypeCategory {
  // First, try direct code lookup (most reliable)
  const def = getCallTypeByCode(callType);
  if (def) {
    return ICAW_TO_VANGUARD_CATEGORY[def.category];
  }

  // Fallback: keyword-based matching for descriptive call types
  const lower = callType.toLowerCase();

  // Fire-related keywords
  if (
    lower.includes('fire') ||
    lower.includes('smoke') ||
    lower.includes('alarm') ||
    lower.includes('explosion')
  ) {
    return 'fire';
  }

  // Medical keywords
  if (
    lower.includes('medical') ||
    lower.includes('ems') ||
    lower.includes('ambulance') ||
    lower.includes('cardiac') ||
    lower.includes('breathing') ||
    lower.includes('unconscious') ||
    lower.includes('injury') ||
    lower.includes('sick') ||
    lower.includes('casualty')
  ) {
    return 'medical';
  }

  // Rescue keywords
  if (
    lower.includes('rescue') ||
    lower.includes('trapped') ||
    lower.includes('missing') ||
    lower.includes('collapse')
  ) {
    return 'rescue';
  }

  // Traffic/Vehicle keywords
  if (
    lower.includes('accident') ||
    lower.includes('collision') ||
    lower.includes('mva') ||
    lower.includes('mvc') ||
    lower.includes('vehicle') ||
    lower.includes('traffic') ||
    lower.includes('aircraft') ||
    lower.includes('train')
  ) {
    return 'traffic';
  }

  // Hazmat keywords
  if (
    lower.includes('hazmat') ||
    lower.includes('hazardous') ||
    lower.includes('spill') ||
    lower.includes('chemical') ||
    lower.includes('leak') ||
    lower.includes('gas') ||
    lower.includes('wires') ||
    lower.includes('powerline') ||
    lower.includes('electrical')
  ) {
    return 'hazmat';
  }

  return 'other';
}

/**
 * Check if a call type is alertable (important enough to notify users)
 */
export function isAlertableCallType(callType: string): boolean {
  const def = getCallTypeByCode(callType);
  return def?.alertable ?? false;
}

/**
 * Get the ICAW category for a call type (more granular than Vanguard category)
 */
export function getICAWCategory(callType: string): ICAWCategory {
  const def = getCallTypeByCode(callType);
  return def?.category ?? 'Unknown';
}

/**
 * Get display color for a call type category
 */
export function getCategoryColor(category: CallTypeCategory): string {
  switch (category) {
    case 'fire':
      return '#ef4444'; // red-500
    case 'medical':
      return '#3b82f6'; // blue-500
    case 'rescue':
      return '#f59e0b'; // amber-500
    case 'traffic':
      return '#8b5cf6'; // violet-500
    case 'hazmat':
      return '#22c55e'; // green-500
    default:
      return '#6b7280'; // gray-500
  }
}

/**
 * Get display label for a call type category
 */
export function getCategoryLabel(category: CallTypeCategory): string {
  switch (category) {
    case 'fire':
      return 'Fire';
    case 'medical':
      return 'Medical';
    case 'rescue':
      return 'Rescue';
    case 'traffic':
      return 'Traffic';
    case 'hazmat':
      return 'HazMat';
    default:
      return 'Other';
  }
}

/**
 * Get Tailwind CSS classes for a call type category badge
 */
export function getCategoryBadgeClasses(category: CallTypeCategory): string {
  switch (category) {
    case 'fire':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'medical':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'rescue':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    case 'traffic':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200';
    case 'hazmat':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}

/**
 * Get incident priority level based on category
 */
export type IncidentPriority = 'high' | 'medium' | 'low';

export function getIncidentPriority(category: CallTypeCategory): IncidentPriority {
  switch (category) {
    case 'fire':
    case 'hazmat':
      return 'high';
    case 'medical':
    case 'rescue':
    case 'traffic':
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Get Tailwind CSS classes for priority-based card background
 */
export function getPriorityCardClasses(priority: IncidentPriority): string {
  switch (priority) {
    case 'high':
      return 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800';
    case 'medium':
      return 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800';
    case 'low':
      return 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800';
  }
}

/**
 * Get the left border color class for priority
 */
export function getPriorityBorderClass(priority: IncidentPriority): string {
  switch (priority) {
    case 'high':
      return 'border-l-red-500';
    case 'medium':
      return 'border-l-orange-500';
    case 'low':
      return 'border-l-blue-500';
  }
}
