// Call type definitions for frontend use
// These mirror the convex/callTypes.ts definitions

import type { CallTypeCategory } from "./types";

export interface CallType {
  id: string;
  description: string;
  category: CallTypeCategory;
}

// Comprehensive call type mappings
export const CALL_TYPES: CallType[] = [
  // Aid
  { id: "AA", description: "Auto Aid", category: "fire" },
  { id: "MU", description: "Mutual Aid", category: "fire" },
  { id: "ST", description: "Strike Team/Task Force", category: "fire" },

  // Aircraft
  { id: "AC", description: "Aircraft Crash", category: "rescue" },
  { id: "AE", description: "Aircraft Emergency", category: "rescue" },
  { id: "AES", description: "Aircraft Emergency Standby", category: "rescue" },
  { id: "LZ", description: "Landing Zone", category: "medical" },

  // Alarm
  { id: "AED", description: "AED Alarm", category: "fire" },
  { id: "OA", description: "Alarm", category: "fire" },
  { id: "CMA", description: "Carbon Monoxide Alarm", category: "fire" },
  { id: "FA", description: "Fire Alarm", category: "fire" },
  { id: "MA", description: "Manual Alarm", category: "fire" },
  { id: "SD", description: "Smoke Detector", category: "fire" },
  { id: "TRBL", description: "Trouble Alarm", category: "fire" },
  { id: "WFA", description: "Waterflow Alarm", category: "fire" },

  // Assist
  { id: "FL", description: "Flooding", category: "rescue" },
  { id: "LR", description: "Ladder Request", category: "fire" },
  { id: "LA", description: "Lift Assist", category: "medical" },
  { id: "PA", description: "Police Assist", category: "other" },
  { id: "PS", description: "Public Service", category: "other" },
  { id: "SH", description: "Sheared Hydrant", category: "fire" },

  // Explosion
  { id: "EX", description: "Explosion", category: "fire" },
  { id: "PE", description: "Pipeline Emergency", category: "hazmat" },
  { id: "TE", description: "Transformer Explosion", category: "fire" },

  // Fire
  { id: "AF", description: "Appliance Fire", category: "fire" },
  { id: "CHIM", description: "Chimney Fire", category: "fire" },
  { id: "CF", description: "Commercial Fire", category: "fire" },
  { id: "WSF", description: "Confirmed Structure Fire", category: "fire" },
  { id: "WVEG", description: "Confirmed Vegetation Fire", category: "fire" },
  { id: "CB", description: "Controlled Burn", category: "fire" },
  { id: "ELF", description: "Electrical Fire", category: "fire" },
  { id: "EF", description: "Extinguished Fire", category: "fire" },
  { id: "FIRE", description: "Fire", category: "fire" },
  { id: "FULL", description: "Full Assignment", category: "fire" },
  { id: "IF", description: "Illegal Fire", category: "fire" },
  { id: "MF", description: "Marine Fire", category: "fire" },
  { id: "OF", description: "Outside Fire", category: "fire" },
  { id: "PF", description: "Pole Fire", category: "fire" },
  { id: "GF", description: "Refuse/Garbage Fire", category: "fire" },
  { id: "RF", description: "Residential Fire", category: "fire" },
  { id: "SF", description: "Structure Fire", category: "fire" },
  { id: "TF", description: "Tank Fire", category: "fire" },
  { id: "VEG", description: "Vegetation Fire", category: "fire" },
  { id: "VF", description: "Vehicle Fire", category: "fire" },
  { id: "WF", description: "Confirmed Fire", category: "fire" },
  { id: "WCF", description: "Working Commercial Fire", category: "fire" },
  { id: "WRF", description: "Working Residential Fire", category: "fire" },

  // Hazard
  { id: "BT", description: "Bomb Threat", category: "hazmat" },
  { id: "EE", description: "Electrical Emergency", category: "hazmat" },
  { id: "EM", description: "Emergency", category: "other" },
  { id: "ER", description: "Emergency Response", category: "other" },
  { id: "GAS", description: "Gas Leak", category: "hazmat" },
  { id: "HC", description: "Hazardous Condition", category: "hazmat" },
  { id: "HMR", description: "Hazmat Response", category: "hazmat" },
  { id: "TD", description: "Tree Down", category: "other" },
  { id: "WE", description: "Water Emergency", category: "rescue" },

  // Investigation
  { id: "AI", description: "Arson Investigation", category: "fire" },
  { id: "FWI", description: "Fireworks Investigation", category: "fire" },
  { id: "HMI", description: "Hazmat Investigation", category: "hazmat" },
  { id: "INV", description: "Investigation", category: "other" },
  { id: "OI", description: "Odor Investigation", category: "other" },
  { id: "SI", description: "Smoke Investigation", category: "fire" },

  // Lockout
  { id: "CL", description: "Commercial Lockout", category: "other" },
  { id: "LO", description: "Lockout", category: "other" },
  { id: "RL", description: "Residential Lockout", category: "other" },
  { id: "VL", description: "Vehicle Lockout", category: "other" },

  // Medical
  { id: "CP", description: "Community Paramedicine", category: "medical" },
  { id: "IFT", description: "Interfacility Transfer", category: "medical" },
  { id: "ME", description: "Medical Emergency", category: "medical" },
  { id: "MCI", description: "Mass Casualty Incident", category: "medical" },
  { id: "CPR", description: "CPR in Progress", category: "medical" },

  // Natural Disaster
  { id: "EQ", description: "Earthquake", category: "rescue" },
  { id: "FLW", description: "Flood Warning", category: "rescue" },
  { id: "TOW", description: "Tornado Warning", category: "rescue" },
  { id: "TSW", description: "Tsunami Warning", category: "rescue" },
  { id: "WX", description: "Weather Incident", category: "rescue" },

  // Rescue
  { id: "AR", description: "Animal Rescue", category: "rescue" },
  { id: "CR", description: "Cliff Rescue", category: "rescue" },
  { id: "CSR", description: "Confined Space Rescue", category: "rescue" },
  { id: "ELR", description: "Elevator Rescue", category: "rescue" },
  { id: "EER", description: "Elevator/Escalator Rescue", category: "rescue" },
  { id: "IR", description: "Ice Rescue", category: "rescue" },
  { id: "IA", description: "Industrial Accident", category: "rescue" },
  { id: "RES", description: "Rescue", category: "rescue" },
  { id: "RR", description: "Rope Rescue", category: "rescue" },
  { id: "SC", description: "Structural Collapse", category: "rescue" },
  { id: "TR", description: "Technical Rescue", category: "rescue" },
  { id: "TNR", description: "Trench Rescue", category: "rescue" },
  { id: "USAR", description: "Urban Search and Rescue", category: "rescue" },
  { id: "VS", description: "Vessel Sinking", category: "rescue" },
  { id: "WR", description: "Water Rescue", category: "rescue" },

  // Traffic/Vehicle
  { id: "TCP", description: "Collision Involving Pedestrian", category: "traffic" },
  { id: "TCS", description: "Collision Involving Structure", category: "traffic" },
  { id: "TCT", description: "Collision Involving Train", category: "traffic" },
  { id: "TCE", description: "Expanded Traffic Collision", category: "traffic" },
  { id: "RTE", description: "Railroad/Train Emergency", category: "traffic" },
  { id: "TC", description: "Traffic Collision", category: "traffic" },
  { id: "MVA", description: "Motor Vehicle Accident", category: "traffic" },
  { id: "MVC", description: "Motor Vehicle Collision", category: "traffic" },

  // Wires
  { id: "PLE", description: "Powerline Emergency", category: "hazmat" },
  { id: "WA", description: "Wires Arcing", category: "hazmat" },
  { id: "WD", description: "Wires Down", category: "hazmat" },
  { id: "WDA", description: "Wires Down/Arcing", category: "hazmat" },

  // Other
  { id: "BP", description: "Burn Permit", category: "other" },
  { id: "CA", description: "Community Activity", category: "other" },
  { id: "FW", description: "Fire Watch", category: "fire" },
  { id: "MC", description: "Move-up/Cover", category: "fire" },
  { id: "NO", description: "Notification", category: "other" },
  { id: "STBY", description: "Standby", category: "other" },
  { id: "TEST", description: "Test", category: "other" },
  { id: "TRNG", description: "Training", category: "other" },
];

// Group call types by category for easier display
export const CALL_TYPES_BY_CATEGORY = CALL_TYPES.reduce((acc, ct) => {
  if (!acc[ct.category]) {
    acc[ct.category] = [];
  }
  acc[ct.category].push(ct);
  return acc;
}, {} as Record<CallTypeCategory, CallType[]>);

// Get call type by ID
export function getCallTypeById(id: string): CallType | undefined {
  return CALL_TYPES.find((ct) => ct.id === id);
}

// Get call type description by ID
export function getCallTypeDescription(id: string): string {
  const ct = getCallTypeById(id);
  return ct?.description ?? id;
}

// Category labels for display
export const CATEGORY_LABELS: Record<CallTypeCategory, string> = {
  fire: "Fire",
  medical: "Medical",
  rescue: "Rescue",
  traffic: "Traffic",
  hazmat: "HazMat",
  other: "Other",
};
