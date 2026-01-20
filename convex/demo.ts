import { query } from "./_generated/server";

// ===================
// Demo Data - Static mock data for public demo tenant
// ===================

// Mock demo incidents - realistic fire department data
const DEMO_INCIDENTS = [
  {
    id: "demo-001",
    callType: "Structure Fire",
    callTypeCategory: "fire" as const,
    description: "Reported structure fire with smoke showing",
    fullAddress: "123 Main Street",
    latitude: 35.2271,
    longitude: -80.8431,
    units: ["E1", "E2", "L1", "BC1"],
    status: "active" as const,
    callReceivedTime: Date.now() - 15 * 60 * 1000, // 15 minutes ago
  },
  {
    id: "demo-002",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Cardiac arrest reported",
    fullAddress: "456 Oak Avenue",
    latitude: 35.2285,
    longitude: -80.8445,
    units: ["M1", "E3"],
    status: "active" as const,
    callReceivedTime: Date.now() - 8 * 60 * 1000, // 8 minutes ago
  },
  {
    id: "demo-003",
    callType: "Vehicle Accident",
    callTypeCategory: "traffic" as const,
    description: "Multi-vehicle accident with injuries",
    fullAddress: "789 Highway 51",
    latitude: 35.2295,
    longitude: -80.8410,
    units: ["E4", "M2", "R1"],
    status: "active" as const,
    callReceivedTime: Date.now() - 22 * 60 * 1000, // 22 minutes ago
  },
  {
    id: "demo-004",
    callType: "Gas Leak",
    callTypeCategory: "hazmat" as const,
    description: "Natural gas leak reported at commercial property",
    fullAddress: "321 Industrial Parkway",
    latitude: 35.2310,
    longitude: -80.8500,
    units: ["E5", "HZ1"],
    status: "active" as const,
    callReceivedTime: Date.now() - 35 * 60 * 1000, // 35 minutes ago
  },
  {
    id: "demo-005",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Fall victim, elderly patient",
    fullAddress: "555 Elm Street",
    latitude: 35.2260,
    longitude: -80.8480,
    units: ["M3"],
    status: "closed" as const,
    callReceivedTime: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    callClosedTime: Date.now() - 1.5 * 60 * 60 * 1000, // closed 1.5 hours ago
  },
  {
    id: "demo-006",
    callType: "Automatic Fire Alarm",
    callTypeCategory: "fire" as const,
    description: "Commercial fire alarm activation",
    fullAddress: "999 Commerce Drive",
    latitude: 35.2320,
    longitude: -80.8390,
    units: ["E1", "L2"],
    status: "closed" as const,
    callReceivedTime: Date.now() - 3 * 60 * 60 * 1000, // 3 hours ago
    callClosedTime: Date.now() - 2.5 * 60 * 60 * 1000, // closed 2.5 hours ago
  },
  {
    id: "demo-007",
    callType: "Vehicle Fire",
    callTypeCategory: "fire" as const,
    description: "Car fire on highway shoulder",
    fullAddress: "Highway 74 Eastbound",
    latitude: 35.2340,
    longitude: -80.8350,
    units: ["E2"],
    status: "closed" as const,
    callReceivedTime: Date.now() - 4 * 60 * 60 * 1000, // 4 hours ago
    callClosedTime: Date.now() - 3.5 * 60 * 60 * 1000,
  },
  {
    id: "demo-008",
    callType: "Rescue",
    callTypeCategory: "rescue" as const,
    description: "Water rescue - person in distress",
    fullAddress: "Lake Park Marina",
    latitude: 35.2200,
    longitude: -80.8550,
    units: ["R1", "M1", "BC2"],
    status: "closed" as const,
    callReceivedTime: Date.now() - 5 * 60 * 60 * 1000,
    callClosedTime: Date.now() - 4 * 60 * 60 * 1000,
  },
  {
    id: "demo-009",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Difficulty breathing",
    fullAddress: "222 Pine Lane",
    latitude: 35.2250,
    longitude: -80.8420,
    units: ["M2"],
    status: "closed" as const,
    callReceivedTime: Date.now() - 6 * 60 * 60 * 1000,
    callClosedTime: Date.now() - 5.5 * 60 * 60 * 1000,
  },
  {
    id: "demo-010",
    callType: "Brush Fire",
    callTypeCategory: "fire" as const,
    description: "Small brush fire spreading near homes",
    fullAddress: "Rural Route 7",
    latitude: 35.2380,
    longitude: -80.8600,
    units: ["E3", "E4", "BR1"],
    status: "closed" as const,
    callReceivedTime: Date.now() - 8 * 60 * 60 * 1000,
    callClosedTime: Date.now() - 6 * 60 * 60 * 1000,
  },
  // Additional closed incidents for history
  {
    id: "demo-011",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Chest pain",
    fullAddress: "888 Cedar Blvd",
    latitude: 35.2290,
    longitude: -80.8470,
    units: ["M4", "E1"],
    status: "closed" as const,
    callReceivedTime: Date.now() - 10 * 60 * 60 * 1000,
    callClosedTime: Date.now() - 9 * 60 * 60 * 1000,
  },
  {
    id: "demo-012",
    callType: "Automatic Fire Alarm",
    callTypeCategory: "fire" as const,
    description: "Residential alarm activation",
    fullAddress: "444 Maple Court",
    latitude: 35.2275,
    longitude: -80.8510,
    units: ["E5"],
    status: "closed" as const,
    callReceivedTime: Date.now() - 12 * 60 * 60 * 1000,
    callClosedTime: Date.now() - 11.5 * 60 * 60 * 1000,
  },
];

// Mock weather alerts
const DEMO_WEATHER_ALERTS = [
  {
    id: "demo-alert-001",
    event: "Severe Thunderstorm Warning",
    headline: "Severe Thunderstorm Warning until 8:00 PM",
    description: "The National Weather Service has issued a severe thunderstorm warning for the area. Large hail and damaging winds are possible.",
    instruction: "Move to an interior room on the lowest floor of a sturdy building. Avoid windows.",
    severity: "Severe" as const,
    urgency: "Immediate" as const,
    certainty: "Observed" as const,
    onset: Date.now() - 30 * 60 * 1000,
    expires: Date.now() + 3 * 60 * 60 * 1000,
    status: "active" as const,
  },
  {
    id: "demo-alert-002",
    event: "Heat Advisory",
    headline: "Heat Advisory in effect from noon to 8 PM",
    description: "High temperatures are expected to reach 100-105 degrees. Heat index values up to 110 degrees possible.",
    instruction: "Drink plenty of fluids, stay in an air-conditioned room, stay out of the sun, and check up on relatives and neighbors.",
    severity: "Moderate" as const,
    urgency: "Expected" as const,
    certainty: "Likely" as const,
    onset: Date.now() + 2 * 60 * 60 * 1000,
    expires: Date.now() + 10 * 60 * 60 * 1000,
    status: "active" as const,
  },
  {
    id: "demo-alert-003",
    event: "Flash Flood Watch",
    headline: "Flash Flood Watch through Friday evening",
    description: "Heavy rainfall is expected which could lead to flash flooding in low-lying areas and near streams.",
    instruction: "Be prepared to move to higher ground if flooding develops.",
    severity: "Moderate" as const,
    urgency: "Future" as const,
    certainty: "Possible" as const,
    onset: Date.now() + 6 * 60 * 60 * 1000,
    expires: Date.now() + 36 * 60 * 60 * 1000,
    status: "active" as const,
  },
  {
    id: "demo-alert-004",
    event: "Air Quality Alert",
    headline: "Air Quality Alert for sensitive groups",
    description: "Air quality is expected to be unhealthy for sensitive groups including the elderly, young children, and those with respiratory conditions.",
    instruction: "Sensitive groups should limit prolonged outdoor exertion.",
    severity: "Minor" as const,
    urgency: "Expected" as const,
    certainty: "Likely" as const,
    onset: Date.now(),
    expires: Date.now() + 24 * 60 * 60 * 1000,
    status: "active" as const,
  },
];

// Demo tenant information
const DEMO_TENANT = {
  name: "Demo Fire Department",
  displayName: "Demo Fire & Rescue",
  slug: "demo",
  description: "Interactive demo showcasing Vanguard CAD features",
  primaryColor: "#dc2626",
};

// Unit legend for the demo
const DEMO_UNIT_LEGEND = [
  { UnitKey: "E1", Description: "Engine 1" },
  { UnitKey: "E2", Description: "Engine 2" },
  { UnitKey: "E3", Description: "Engine 3" },
  { UnitKey: "E4", Description: "Engine 4" },
  { UnitKey: "E5", Description: "Engine 5" },
  { UnitKey: "L1", Description: "Ladder 1" },
  { UnitKey: "L2", Description: "Ladder 2" },
  { UnitKey: "M1", Description: "Medic 1" },
  { UnitKey: "M2", Description: "Medic 2" },
  { UnitKey: "M3", Description: "Medic 3" },
  { UnitKey: "M4", Description: "Medic 4" },
  { UnitKey: "R1", Description: "Rescue 1" },
  { UnitKey: "BC1", Description: "Battalion Chief 1" },
  { UnitKey: "BC2", Description: "Battalion Chief 2" },
  { UnitKey: "HZ1", Description: "Hazmat 1" },
  { UnitKey: "BR1", Description: "Brush 1" },
];

// ===================
// Queries
// ===================

/**
 * Get demo tenant info
 */
export const getDemoTenant = query({
  args: {},
  handler: async () => {
    return DEMO_TENANT;
  },
});

/**
 * Get demo incidents
 */
export const getDemoIncidents = query({
  args: {},
  handler: async () => {
    return DEMO_INCIDENTS;
  },
});

/**
 * Get demo weather alerts
 */
export const getDemoWeatherAlerts = query({
  args: {},
  handler: async () => {
    return DEMO_WEATHER_ALERTS;
  },
});

/**
 * Get demo unit legend
 */
export const getDemoUnitLegend = query({
  args: {},
  handler: async () => {
    return DEMO_UNIT_LEGEND;
  },
});

/**
 * Get demo stats (similar to tenant stats)
 */
export const getDemoStats = query({
  args: {},
  handler: async () => {
    const activeIncidents = DEMO_INCIDENTS.filter((i) => i.status === "active");
    const activeAlerts = DEMO_WEATHER_ALERTS.filter((a) => a.status === "active");

    // Count active units
    const activeUnits = new Set<string>();
    for (const incident of activeIncidents) {
      incident.units.forEach((unit) => activeUnits.add(unit));
    }

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    for (const incident of activeIncidents) {
      const category = incident.callTypeCategory || "other";
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
    }

    return {
      activeIncidentCount: activeIncidents.length,
      todaysCallCount: DEMO_INCIDENTS.length,
      activeUnitCount: activeUnits.size,
      activeAlertCount: activeAlerts.length,
      categoryBreakdown,
    };
  },
});
