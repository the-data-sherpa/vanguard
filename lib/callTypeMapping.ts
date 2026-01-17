/**
 * Call Type Mapping Utility
 * Maps PulsePoint call type codes to human-readable categories and descriptions
 */

import type { CallTypeCategory } from './types';

/**
 * Call type code to description mapping
 * Based on ICAW reference: ~/Projects/icaw/convex/callTypes.ts
 */
const CALL_TYPE_DESCRIPTIONS: Record<string, string> = {
  // Aid
  AA: 'Auto Aid',
  MU: 'Mutual Aid',
  ST: 'Strike Team/Task Force',

  // Aircraft
  AC: 'Aircraft Crash',
  AE: 'Aircraft Emergency',
  AES: 'Aircraft Emergency Standby',
  LZ: 'Landing Zone',

  // Alarm
  AED: 'AED Alarm',
  OA: 'Alarm',
  CMA: 'Carbon Monoxide Alarm',
  FA: 'Fire Alarm',
  MA: 'Manual Alarm',
  SD: 'Smoke Detector',
  TRBL: 'Trouble Alarm',
  WFA: 'Waterflow Alarm',

  // Assist
  FL: 'Flooding',
  LR: 'Ladder Request',
  LA: 'Lift Assist',
  PA: 'Police Assist',
  PS: 'Public Service',
  SH: 'Sheared Hydrant',

  // Explosion
  EX: 'Explosion',
  PE: 'Pipeline Emergency',
  TE: 'Transformer Explosion',

  // Fire
  AF: 'Appliance Fire',
  CHIM: 'Chimney Fire',
  CF: 'Commercial Fire',
  WSF: 'Confirmed Structure Fire',
  WVEG: 'Confirmed Vegetation Fire',
  CB: 'Controlled Burn/Prescribed Fire',
  ELF: 'Electrical Fire',
  EF: 'Extinguished Fire',
  FIRE: 'Fire',
  FULL: 'Full Assignment',
  IF: 'Illegal Fire',
  MF: 'Marine Fire',
  OF: 'Outside Fire',
  PF: 'Pole Fire',
  GF: 'Refuse/Garbage Fire',
  RF: 'Residential Fire',
  SF: 'Structure Fire',
  TF: 'Tank Fire',
  VEG: 'Vegetation Fire',
  VF: 'Vehicle Fire',
  WF: 'Confirmed Fire',
  WCF: 'Working Commercial Fire',
  WRF: 'Working Residential Fire',

  // Hazard
  BT: 'Bomb Threat',
  EE: 'Electrical Emergency',
  EM: 'Emergency',
  ER: 'Emergency Response',
  GAS: 'Gas Leak',
  HC: 'Hazardous Condition',
  HMR: 'Hazardous Response',
  TD: 'Tree Down',
  WE: 'Water Emergency',

  // Investigation
  AI: 'Arson Investigation',
  FWI: 'Fireworks Investigation',
  HMI: 'Hazmat Investigation',
  INV: 'Investigation',
  OI: 'Odor Investigation',
  SI: 'Smoke Investigation',

  // Lockout
  CL: 'Commercial Lockout',
  LO: 'Lockout',
  RL: 'Residential Lockout',
  VL: 'Vehicle Lockout',

  // Medical
  CP: 'Community Paramedicine',
  IFT: 'Interfacility Transfer',
  ME: 'Medical Emergency',
  MCI: 'Multi Casualty Incident',

  // Natural Disaster
  EQ: 'Earthquake',
  FLW: 'Flood Warning',
  TOW: 'Tornado Warning',
  TSW: 'Tsunami Warning',
  WX: 'Weather Incident',

  // Rescue
  AR: 'Animal Rescue',
  CR: 'Cliff Rescue',
  CSR: 'Confined Space Rescue',
  ELR: 'Elevator Rescue',
  EER: 'Elevator/Escalator Rescue',
  IR: 'Ice Rescue',
  IA: 'Industrial Accident',
  RES: 'Rescue',
  RR: 'Rope Rescue',
  SC: 'Structural Collapse',
  TR: 'Technical Rescue',
  TNR: 'Trench Rescue',
  USAR: 'Urban Search and Rescue',
  VS: 'Vessel Sinking',
  WR: 'Water Rescue',

  // Vehicle/Traffic
  TCP: 'Collision Involving Pedestrian',
  TCS: 'Collision Involving Structure',
  TCT: 'Collision Involving Train',
  TCE: 'Expanded Traffic Collision',
  RTE: 'Railroad/Train Emergency',
  TC: 'Traffic Collision',
  MVA: 'Motor Vehicle Accident',
  MVC: 'Motor Vehicle Collision',

  // Wires
  PLE: 'Powerline Emergency',
  WA: 'Wires Arcing',
  WD: 'Wires Down',
  WDA: 'Wires Down/Arcing',

  // Other
  BP: 'Burn Permit',
  CA: 'Community Activity',
  FW: 'Fire Watch',
  MC: 'Move-up/Cover',
  NO: 'Notification',
  STBY: 'Standby',
  TEST: 'Test',
  TRNG: 'Training',

  // Alert
  NEWS: 'News',
  CERT: 'CERT',
  DISASTER: 'Disaster',

  // Unknown
  UNK: 'Unknown Call Type',
};

/**
 * Get the human-readable description for a call type code
 */
export function getCallTypeDescription(callType: string): string {
  // First try exact match
  const upper = callType.toUpperCase().trim();
  if (CALL_TYPE_DESCRIPTIONS[upper]) {
    return CALL_TYPE_DESCRIPTIONS[upper];
  }

  // If it's already a descriptive string (contains spaces), return as-is
  if (callType.includes(' ')) {
    return callType;
  }

  // Return the original if no match found
  return callType;
}

/**
 * Mapping of PulsePoint call type codes to categories
 * Based on common fire/EMS dispatch codes
 */
const CALL_TYPE_MAPPINGS: Record<string, CallTypeCategory> = {
  // Fire calls
  FIRE: 'fire',
  'STRUCTURE FIRE': 'fire',
  'RESIDENTIAL FIRE': 'fire',
  'COMMERCIAL FIRE': 'fire',
  'VEHICLE FIRE': 'fire',
  'BRUSH FIRE': 'fire',
  'WILDLAND FIRE': 'fire',
  'GRASS FIRE': 'fire',
  'TRASH FIRE': 'fire',
  'DUMPSTER FIRE': 'fire',
  'FIRE ALARM': 'fire',
  'SMOKE INVESTIGATION': 'fire',
  'ODOR INVESTIGATION': 'fire',
  'GAS LEAK': 'fire',
  'CARBON MONOXIDE': 'fire',
  CO: 'fire',

  // Medical calls
  MEDICAL: 'medical',
  'MEDICAL EMERGENCY': 'medical',
  'CARDIAC ARREST': 'medical',
  'CHEST PAIN': 'medical',
  'DIFFICULTY BREATHING': 'medical',
  'BREATHING PROBLEMS': 'medical',
  STROKE: 'medical',
  SEIZURE: 'medical',
  'DIABETIC EMERGENCY': 'medical',
  'ALLERGIC REACTION': 'medical',
  'FALL VICTIM': 'medical',
  FALL: 'medical',
  OVERDOSE: 'medical',
  'DRUG OVERDOSE': 'medical',
  'SICK PERSON': 'medical',
  'UNCONSCIOUS PERSON': 'medical',
  'ABDOMINAL PAIN': 'medical',
  'BACK PAIN': 'medical',
  'HEADACHE': 'medical',
  HEMORRHAGE: 'medical',
  BLEEDING: 'medical',
  'PSYCHIATRIC EMERGENCY': 'medical',
  'BEHAVIORAL EMERGENCY': 'medical',
  ASSAULT: 'medical',
  'ASSAULT VICTIM': 'medical',
  'STABBING': 'medical',
  'GUNSHOT': 'medical',
  'SHOOTING': 'medical',
  ELECTROCUTION: 'medical',
  'HEAT EMERGENCY': 'medical',
  'COLD EMERGENCY': 'medical',
  'PREGNANCY': 'medical',
  'CHILDBIRTH': 'medical',
  'CHOKING': 'medical',
  DROWNING: 'medical',
  'NEAR DROWNING': 'medical',
  'ANIMAL BITE': 'medical',
  'BEE STING': 'medical',
  EMS: 'medical',

  // Rescue calls
  RESCUE: 'rescue',
  'WATER RESCUE': 'rescue',
  'SWIFT WATER RESCUE': 'rescue',
  'TECHNICAL RESCUE': 'rescue',
  'HIGH ANGLE RESCUE': 'rescue',
  'CONFINED SPACE RESCUE': 'rescue',
  'TRENCH RESCUE': 'rescue',
  'BUILDING COLLAPSE': 'rescue',
  'ELEVATOR RESCUE': 'rescue',
  'ENTRAPMENT': 'rescue',
  'PERSON TRAPPED': 'rescue',
  'LOCK IN/OUT': 'rescue',
  'LOCKOUT': 'rescue',
  'SEARCH AND RESCUE': 'rescue',
  'MISSING PERSON': 'rescue',

  // Traffic/MVA calls
  'TRAFFIC ACCIDENT': 'traffic',
  'MOTOR VEHICLE ACCIDENT': 'traffic',
  MVA: 'traffic',
  MVC: 'traffic',
  'VEHICLE ACCIDENT': 'traffic',
  'CAR ACCIDENT': 'traffic',
  'AUTO ACCIDENT': 'traffic',
  'TRAFFIC COLLISION': 'traffic',
  'HIT AND RUN': 'traffic',
  'PEDESTRIAN STRUCK': 'traffic',
  'BICYCLE ACCIDENT': 'traffic',
  'MOTORCYCLE ACCIDENT': 'traffic',
  'BUS ACCIDENT': 'traffic',
  'TRAIN ACCIDENT': 'traffic',
  'AIRCRAFT EMERGENCY': 'traffic',
  'PLANE CRASH': 'traffic',
  'ROLLOVER': 'traffic',
  'EXTRICATION': 'traffic',
  'VEHICLE EXTRICATION': 'traffic',
  'ACCIDENT WITH INJURIES': 'traffic',
  'ACCIDENT WITH ENTRAPMENT': 'traffic',

  // Hazmat calls
  HAZMAT: 'hazmat',
  'HAZARDOUS MATERIALS': 'hazmat',
  'HAZ MAT': 'hazmat',
  'CHEMICAL SPILL': 'hazmat',
  'FUEL SPILL': 'hazmat',
  'OIL SPILL': 'hazmat',
  'PROPANE LEAK': 'hazmat',
  'NATURAL GAS LEAK': 'hazmat',
  'UNKNOWN SUBSTANCE': 'hazmat',
  'SUSPICIOUS PACKAGE': 'hazmat',
  'BIOLOGICAL HAZARD': 'hazmat',
  'RADIATION': 'hazmat',
  'TRANSFORMER FIRE': 'hazmat',
  'ELECTRICAL HAZARD': 'hazmat',
  'POWERLINE DOWN': 'hazmat',
  'WIRES DOWN': 'hazmat',
};

/**
 * Normalize a call type string for comparison
 */
function normalizeCallType(callType: string): string {
  return callType
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Map a PulsePoint call type to a category
 */
export function mapCallTypeToCategory(callType: string): CallTypeCategory {
  const normalized = normalizeCallType(callType);

  // Direct match
  if (CALL_TYPE_MAPPINGS[normalized]) {
    return CALL_TYPE_MAPPINGS[normalized];
  }

  // Partial match - check if any mapping key is contained in the call type
  for (const [key, category] of Object.entries(CALL_TYPE_MAPPINGS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }

  // Keyword-based fallback
  const lowerCallType = callType.toLowerCase();

  if (
    lowerCallType.includes('fire') ||
    lowerCallType.includes('smoke') ||
    lowerCallType.includes('alarm')
  ) {
    return 'fire';
  }

  if (
    lowerCallType.includes('medical') ||
    lowerCallType.includes('ems') ||
    lowerCallType.includes('ambulance') ||
    lowerCallType.includes('cardiac') ||
    lowerCallType.includes('breathing') ||
    lowerCallType.includes('unconscious') ||
    lowerCallType.includes('injury') ||
    lowerCallType.includes('sick')
  ) {
    return 'medical';
  }

  if (
    lowerCallType.includes('rescue') ||
    lowerCallType.includes('trapped') ||
    lowerCallType.includes('missing')
  ) {
    return 'rescue';
  }

  if (
    lowerCallType.includes('accident') ||
    lowerCallType.includes('collision') ||
    lowerCallType.includes('mva') ||
    lowerCallType.includes('mvc') ||
    lowerCallType.includes('vehicle') ||
    lowerCallType.includes('traffic')
  ) {
    return 'traffic';
  }

  if (
    lowerCallType.includes('hazmat') ||
    lowerCallType.includes('hazardous') ||
    lowerCallType.includes('spill') ||
    lowerCallType.includes('chemical') ||
    lowerCallType.includes('leak')
  ) {
    return 'hazmat';
  }

  return 'other';
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
