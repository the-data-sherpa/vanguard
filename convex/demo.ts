import { query } from "./_generated/server";

// ===================
// Demo Data - Realistic mock data for public demo tenant
// Charlotte, NC area fire/rescue calls
// ===================

// Helper to create dynamic timestamps
const now = Date.now();
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

// ===================
// Mission Control Demo Data
// ===================

// Mock Facebook connection
const DEMO_FACEBOOK_CONNECTION = {
  connected: true,
  pageName: "Charlotte Fire Department",
  pageId: "demo-page-123456",
};

// Mock incident updates for Mission Control
const DEMO_INCIDENT_UPDATES: Record<string, Array<{
  id: string;
  content: string;
  createdAt: number;
  isSynced: boolean;
}>> = {
  "demo-001": [
    {
      id: "update-001-1",
      content: "Second alarm requested. Heavy fire involvement on floors 1 and 2.",
      createdAt: now - 5 * MINUTE,
      isSynced: false,
    },
    {
      id: "update-001-2",
      content: "All occupants accounted for. Primary search complete.",
      createdAt: now - 3 * MINUTE,
      isSynced: false,
    },
  ],
  "demo-003": [
    {
      id: "update-003-1",
      content: "Extrication complete. Patient being transported to CMC Trauma.",
      createdAt: now - 8 * MINUTE,
      isSynced: false,
    },
  ],
  "demo-005": [
    {
      id: "update-005-1",
      content: "Patient transported to CMC Main in stable condition.",
      createdAt: now - 1.6 * HOUR,
      isSynced: true,
    },
  ],
  "demo-013": [
    {
      id: "update-013-1",
      content: "Fire knocked down. Overhaul in progress.",
      createdAt: now - 20.5 * HOUR,
      isSynced: true,
    },
    {
      id: "update-013-2",
      content: "Fire under control. Cause under investigation. Red Cross notified for displaced residents.",
      createdAt: now - 19.5 * HOUR,
      isSynced: true,
    },
  ],
};

// Mock demo incidents - realistic Charlotte, NC fire department data
// With Mission Control sync status fields
const DEMO_INCIDENTS = [
  // ACTIVE INCIDENTS (4 current calls)
  {
    id: "demo-001",
    callType: "Structure Fire",
    callTypeCategory: "fire" as const,
    description: "Working structure fire, 2-story SFD, heavy smoke showing from C-side. First alarm assigned.",
    fullAddress: "2847 Providence Road, Charlotte, NC",
    latitude: 35.1847,
    longitude: -80.8174,
    units: ["E7", "E12", "L7", "BC2", "R3"],
    unitStatuses: {
      E7: { unit: "E7", status: "on_scene", timestamp: now - 8 * MINUTE },
      E12: { unit: "E12", status: "on_scene", timestamp: now - 6 * MINUTE },
      L7: { unit: "L7", status: "on_scene", timestamp: now - 5 * MINUTE },
      BC2: { unit: "BC2", status: "on_scene", timestamp: now - 4 * MINUTE },
      R3: { unit: "R3", status: "enroute", timestamp: now - 2 * MINUTE },
    },
    status: "active" as const,
    callReceivedTime: now - 12 * MINUTE,
    // Mission Control: Posted but has pending updates
    isSyncedToFacebook: true,
    needsFacebookUpdate: true,
    facebookPostId: "pfbid02ABC123structurefire",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-002",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Cardiac arrest, CPR in progress. AED deployed by bystander.",
    fullAddress: "4400 Sharon Road, Charlotte, NC",
    latitude: 35.1522,
    longitude: -80.8521,
    units: ["M14", "E14", "D2"],
    unitStatuses: {
      M14: { unit: "M14", status: "on_scene", timestamp: now - 4 * MINUTE },
      E14: { unit: "E14", status: "on_scene", timestamp: now - 3 * MINUTE },
      D2: { unit: "D2", status: "enroute", timestamp: now - 1 * MINUTE },
    },
    status: "active" as const,
    callReceivedTime: now - 6 * MINUTE,
    // Mission Control: Pending (not yet posted)
    isSyncedToFacebook: false,
    needsFacebookUpdate: false,
    facebookPostId: undefined,
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-003",
    callType: "Vehicle Accident w/ Entrapment",
    callTypeCategory: "traffic" as const,
    description: "Multi-vehicle MVA, one occupant trapped. Northbound lanes blocked. Heavy damage.",
    fullAddress: "I-77 NB at Exit 16 (Brookshire Fwy), Charlotte, NC",
    latitude: 35.2421,
    longitude: -80.8612,
    units: ["E4", "E9", "L4", "M4", "R1", "BC1"],
    unitStatuses: {
      E4: { unit: "E4", status: "on_scene", timestamp: now - 18 * MINUTE },
      E9: { unit: "E9", status: "on_scene", timestamp: now - 16 * MINUTE },
      L4: { unit: "L4", status: "on_scene", timestamp: now - 15 * MINUTE },
      M4: { unit: "M4", status: "on_scene", timestamp: now - 14 * MINUTE },
      R1: { unit: "R1", status: "on_scene", timestamp: now - 12 * MINUTE },
      BC1: { unit: "BC1", status: "on_scene", timestamp: now - 10 * MINUTE },
    },
    status: "active" as const,
    callReceivedTime: now - 22 * MINUTE,
    // Mission Control: Posted with pending update
    isSyncedToFacebook: true,
    needsFacebookUpdate: true,
    facebookPostId: "pfbid02DEF456entrapment",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-004",
    callType: "Gas Leak - Commercial",
    callTypeCategory: "hazmat" as const,
    description: "Natural gas odor investigation at restaurant. Building evacuated. Piedmont Natural Gas notified.",
    fullAddress: "7800 Rea Road, Charlotte, NC",
    latitude: 35.0756,
    longitude: -80.8089,
    units: ["E19", "HZ1", "BC4"],
    unitStatuses: {
      E19: { unit: "E19", status: "on_scene", timestamp: now - 28 * MINUTE },
      HZ1: { unit: "HZ1", status: "on_scene", timestamp: now - 20 * MINUTE },
      BC4: { unit: "BC4", status: "on_scene", timestamp: now - 18 * MINUTE },
    },
    status: "active" as const,
    callReceivedTime: now - 35 * MINUTE,
    // Mission Control: Pending (not yet posted)
    isSyncedToFacebook: false,
    needsFacebookUpdate: false,
    facebookPostId: undefined,
    syncError: undefined,
    source: "pulsepoint" as const,
  },

  // CLOSED INCIDENTS - Today (within last 12 hours)
  {
    id: "demo-005",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Fall victim, 78yo female, hip injury. Patient transported to CMC Main.",
    fullAddress: "9110 University City Blvd, Charlotte, NC",
    latitude: 35.3089,
    longitude: -80.7334,
    units: ["M27", "E27"],
    unitStatuses: {
      M27: { unit: "M27", status: "cleared", timestamp: now - 1.5 * HOUR },
      E27: { unit: "E27", status: "cleared", timestamp: now - 1.8 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 2 * HOUR,
    callClosedTime: now - 1.4 * HOUR,
    // Mission Control: Posted successfully
    isSyncedToFacebook: true,
    needsFacebookUpdate: false,
    facebookPostId: "pfbid02GHI789fallvictim",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-006",
    callType: "Automatic Fire Alarm",
    callTypeCategory: "fire" as const,
    description: "Commercial alarm activation - sprinkler flow alarm. Accidental activation confirmed, system reset.",
    fullAddress: "6801 Carnegie Blvd, Charlotte, NC",
    latitude: 35.0987,
    longitude: -80.8445,
    units: ["E19", "L19"],
    unitStatuses: {
      E19: { unit: "E19", status: "cleared", timestamp: now - 2.5 * HOUR },
      L19: { unit: "L19", status: "cleared", timestamp: now - 2.6 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 3 * HOUR,
    callClosedTime: now - 2.4 * HOUR,
    // Mission Control: Not posted (fire alarms often not posted)
    isSyncedToFacebook: false,
    needsFacebookUpdate: false,
    facebookPostId: undefined,
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-007",
    callType: "Vehicle Fire",
    callTypeCategory: "fire" as const,
    description: "Passenger vehicle fully involved on highway shoulder. Occupant self-extricated prior to arrival.",
    fullAddress: "I-85 SB at Mile Marker 38, Charlotte, NC",
    latitude: 35.2667,
    longitude: -80.7812,
    units: ["E22", "L22"],
    unitStatuses: {
      E22: { unit: "E22", status: "cleared", timestamp: now - 3.5 * HOUR },
      L22: { unit: "L22", status: "cleared", timestamp: now - 3.6 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 4 * HOUR,
    callClosedTime: now - 3.4 * HOUR,
    // Mission Control: Posted successfully
    isSyncedToFacebook: true,
    needsFacebookUpdate: false,
    facebookPostId: "pfbid02JKL012vehiclefire",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-008",
    callType: "Technical Rescue - Water",
    callTypeCategory: "rescue" as const,
    description: "Kayaker in distress on Lake Norman. Subject rescued, no injuries.",
    fullAddress: "Lake Norman State Park, Troutman, NC",
    latitude: 35.6612,
    longitude: -80.9334,
    units: ["R1", "M28", "D3", "BOAT1"],
    unitStatuses: {
      R1: { unit: "R1", status: "cleared", timestamp: now - 4.5 * HOUR },
      M28: { unit: "M28", status: "cleared", timestamp: now - 4.6 * HOUR },
      D3: { unit: "D3", status: "cleared", timestamp: now - 4.7 * HOUR },
      BOAT1: { unit: "BOAT1", status: "cleared", timestamp: now - 4.5 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 5 * HOUR,
    callClosedTime: now - 4.3 * HOUR,
    // Mission Control: Failed to post (API error example)
    isSyncedToFacebook: false,
    needsFacebookUpdate: false,
    facebookPostId: undefined,
    syncError: "Facebook API rate limit exceeded. Will retry automatically.",
    source: "pulsepoint" as const,
  },
  {
    id: "demo-009",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Diabetic emergency, altered mental status. BGL 42. Patient treated and transported.",
    fullAddress: "2730 South Blvd, Charlotte, NC",
    latitude: 35.1912,
    longitude: -80.8634,
    units: ["M7"],
    unitStatuses: {
      M7: { unit: "M7", status: "cleared", timestamp: now - 5.5 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 6 * HOUR,
    callClosedTime: now - 5.3 * HOUR,
    // Mission Control: Not posted (medical calls often not posted publicly)
    isSyncedToFacebook: false,
    needsFacebookUpdate: false,
    facebookPostId: undefined,
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-010",
    callType: "Fuel Spill",
    callTypeCategory: "hazmat" as const,
    description: "Diesel fuel spill at gas station, approximately 50 gallons. Containment established, HazMat cleanup underway.",
    fullAddress: "5500 South Tryon St, Charlotte, NC",
    latitude: 35.1456,
    longitude: -80.8912,
    units: ["E32", "HZ1", "BC4"],
    unitStatuses: {
      E32: { unit: "E32", status: "cleared", timestamp: now - 6 * HOUR },
      HZ1: { unit: "HZ1", status: "cleared", timestamp: now - 5.8 * HOUR },
      BC4: { unit: "BC4", status: "cleared", timestamp: now - 6.2 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 8 * HOUR,
    callClosedTime: now - 5.5 * HOUR,
    // Mission Control: Posted successfully
    isSyncedToFacebook: true,
    needsFacebookUpdate: false,
    facebookPostId: "pfbid02MNO345fuelspill",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-011",
    callType: "Downed Power Lines",
    callTypeCategory: "other" as const,
    description: "Power lines down across roadway, arcing. Duke Energy on scene. Road closed.",
    fullAddress: "1400 Eastway Drive, Charlotte, NC",
    latitude: 35.2345,
    longitude: -80.7889,
    units: ["E17", "BC3"],
    unitStatuses: {
      E17: { unit: "E17", status: "cleared", timestamp: now - 9 * HOUR },
      BC3: { unit: "BC3", status: "cleared", timestamp: now - 9.2 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 10 * HOUR,
    callClosedTime: now - 8.5 * HOUR,
    // Mission Control: Posted successfully
    isSyncedToFacebook: true,
    needsFacebookUpdate: false,
    facebookPostId: "pfbid02PQR678powerlines",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-012",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Chest pain, 62yo male. 12-lead shows STEMI. RACE alert activated, transported to CMC.",
    fullAddress: "3434 Latrobe Drive, Charlotte, NC",
    latitude: 35.1678,
    longitude: -80.7623,
    units: ["M11", "E11", "D1"],
    unitStatuses: {
      M11: { unit: "M11", status: "cleared", timestamp: now - 10.5 * HOUR },
      E11: { unit: "E11", status: "cleared", timestamp: now - 11 * HOUR },
      D1: { unit: "D1", status: "cleared", timestamp: now - 10.8 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 11 * HOUR,
    callClosedTime: now - 10.2 * HOUR,
    // Mission Control: Not posted (medical privacy)
    isSyncedToFacebook: false,
    needsFacebookUpdate: false,
    facebookPostId: undefined,
    syncError: undefined,
    source: "pulsepoint" as const,
  },

  // CLOSED INCIDENTS - Yesterday
  {
    id: "demo-013",
    callType: "Structure Fire",
    callTypeCategory: "fire" as const,
    description: "Apartment fire, 3rd floor unit. Fire contained to unit of origin. 2 residents displaced.",
    fullAddress: "1801 Sardis Road N, Charlotte, NC",
    latitude: 35.1534,
    longitude: -80.7845,
    units: ["E14", "E19", "L14", "L19", "BC4", "R3", "M14"],
    unitStatuses: {
      E14: { unit: "E14", status: "cleared", timestamp: now - 20 * HOUR },
      E19: { unit: "E19", status: "cleared", timestamp: now - 20 * HOUR },
      L14: { unit: "L14", status: "cleared", timestamp: now - 20.2 * HOUR },
      L19: { unit: "L19", status: "cleared", timestamp: now - 20.2 * HOUR },
      BC4: { unit: "BC4", status: "cleared", timestamp: now - 19.5 * HOUR },
      R3: { unit: "R3", status: "cleared", timestamp: now - 20.5 * HOUR },
      M14: { unit: "M14", status: "cleared", timestamp: now - 21 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 22 * HOUR,
    callClosedTime: now - 19 * HOUR,
    // Mission Control: Posted with multiple updates
    isSyncedToFacebook: true,
    needsFacebookUpdate: false,
    facebookPostId: "pfbid02STU901apartmentfire",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-014",
    callType: "Technical Rescue - Elevator",
    callTypeCategory: "rescue" as const,
    description: "3 occupants stuck in elevator at office building. Elevator company on scene, rescue effected.",
    fullAddress: "201 S College St, Charlotte, NC",
    latitude: 35.2256,
    longitude: -80.8445,
    units: ["E1", "L1"],
    unitStatuses: {
      E1: { unit: "E1", status: "cleared", timestamp: now - 23 * HOUR },
      L1: { unit: "L1", status: "cleared", timestamp: now - 23 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 24 * HOUR,
    callClosedTime: now - 22.5 * HOUR,
    // Mission Control: Posted successfully
    isSyncedToFacebook: true,
    needsFacebookUpdate: false,
    facebookPostId: "pfbid02VWX234elevator",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-015",
    callType: "Brush Fire",
    callTypeCategory: "fire" as const,
    description: "Brush fire spreading near residences, approximately 2 acres. Controlled burn that escaped containment.",
    fullAddress: "McAlpine Creek Park, Charlotte, NC",
    latitude: 35.1234,
    longitude: -80.7556,
    units: ["E28", "E29", "BR1", "BR2", "BC4"],
    unitStatuses: {
      E28: { unit: "E28", status: "cleared", timestamp: now - 26 * HOUR },
      E29: { unit: "E29", status: "cleared", timestamp: now - 26 * HOUR },
      BR1: { unit: "BR1", status: "cleared", timestamp: now - 25.5 * HOUR },
      BR2: { unit: "BR2", status: "cleared", timestamp: now - 25.5 * HOUR },
      BC4: { unit: "BC4", status: "cleared", timestamp: now - 26.5 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 28 * HOUR,
    callClosedTime: now - 25 * HOUR,
    // Mission Control: Posted successfully
    isSyncedToFacebook: true,
    needsFacebookUpdate: false,
    facebookPostId: "pfbid02YZA567brushfire",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-016",
    callType: "Vehicle Accident",
    callTypeCategory: "traffic" as const,
    description: "2-vehicle accident at intersection. Minor injuries. Both vehicles towed.",
    fullAddress: "Independence Blvd at Idlewild Road, Charlotte, NC",
    latitude: 35.1823,
    longitude: -80.7234,
    units: ["E16", "M16"],
    unitStatuses: {
      E16: { unit: "E16", status: "cleared", timestamp: now - 30 * HOUR },
      M16: { unit: "M16", status: "cleared", timestamp: now - 30 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 31 * HOUR,
    callClosedTime: now - 29.5 * HOUR,
    // Mission Control: Failed to post (token expired example)
    isSyncedToFacebook: false,
    needsFacebookUpdate: false,
    facebookPostId: undefined,
    syncError: "Page access token expired. Please reconnect Facebook in settings.",
    source: "pulsepoint" as const,
  },
  {
    id: "demo-017",
    callType: "Medical Emergency",
    callTypeCategory: "medical" as const,
    description: "Seizure activity, 34yo male. Post-ictal on arrival. History of epilepsy. Transported.",
    fullAddress: "600 E 4th St, Charlotte, NC",
    latitude: 35.2234,
    longitude: -80.8334,
    units: ["M1", "E1"],
    unitStatuses: {
      M1: { unit: "M1", status: "cleared", timestamp: now - 32 * HOUR },
      E1: { unit: "E1", status: "cleared", timestamp: now - 32.5 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 33 * HOUR,
    callClosedTime: now - 31.5 * HOUR,
    // Mission Control: Not posted (medical privacy)
    isSyncedToFacebook: false,
    needsFacebookUpdate: false,
    facebookPostId: undefined,
    syncError: undefined,
    source: "pulsepoint" as const,
  },
  {
    id: "demo-018",
    callType: "Carbon Monoxide Investigation",
    callTypeCategory: "hazmat" as const,
    description: "CO detector activation in residential. Elevated CO readings confirmed. HVAC issue identified.",
    fullAddress: "5623 Closeburn Road, Charlotte, NC",
    latitude: 35.1567,
    longitude: -80.8234,
    units: ["E14", "HZ1"],
    unitStatuses: {
      E14: { unit: "E14", status: "cleared", timestamp: now - 35 * HOUR },
      HZ1: { unit: "HZ1", status: "cleared", timestamp: now - 34.5 * HOUR },
    },
    status: "closed" as const,
    callReceivedTime: now - 36 * HOUR,
    callClosedTime: now - 34 * HOUR,
    // Mission Control: Posted successfully
    isSyncedToFacebook: true,
    needsFacebookUpdate: false,
    facebookPostId: "pfbid02BCD890codetector",
    syncError: undefined,
    source: "pulsepoint" as const,
  },
];

// Mock weather alerts - realistic Charlotte area alerts
const DEMO_WEATHER_ALERTS = [
  {
    id: "demo-alert-001",
    event: "Severe Thunderstorm Warning",
    headline: "Severe Thunderstorm Warning until 8:00 PM EST",
    description: "The National Weather Service in Greenville-Spartanburg has issued a Severe Thunderstorm Warning for Mecklenburg County until 8:00 PM. At 5:45 PM, a severe thunderstorm was located near Charlotte Douglas International Airport, moving northeast at 35 mph. HAZARD: 60 mph wind gusts and quarter size hail. SOURCE: Radar indicated.",
    instruction: "Move to an interior room on the lowest floor of a building. Large hail, damaging winds, and continuous cloud-to-ground lightning is occurring with this storm.",
    severity: "Severe" as const,
    urgency: "Immediate" as const,
    certainty: "Observed" as const,
    onset: now - 30 * MINUTE,
    expires: now + 2.5 * HOUR,
    status: "active" as const,
  },
  {
    id: "demo-alert-002",
    event: "Heat Advisory",
    headline: "Heat Advisory in effect from noon to 8 PM EST Wednesday",
    description: "The National Weather Service has issued a Heat Advisory for the Charlotte metro area. High temperatures are expected to reach 98-102 degrees with heat index values up to 110 degrees possible.",
    instruction: "Drink plenty of fluids, stay in air-conditioned rooms, stay out of the sun, and check up on relatives and neighbors. Young children and pets should never be left unattended in vehicles.",
    severity: "Moderate" as const,
    urgency: "Expected" as const,
    certainty: "Likely" as const,
    onset: now + 18 * HOUR,
    expires: now + 26 * HOUR,
    status: "active" as const,
  },
  {
    id: "demo-alert-003",
    event: "Flash Flood Watch",
    headline: "Flash Flood Watch through Thursday evening",
    description: "A Flash Flood Watch is in effect for the Charlotte metro area and surrounding counties. Heavy rainfall of 2-4 inches is expected which could lead to flash flooding in low-lying areas, near streams and creeks, and in urban areas with poor drainage.",
    instruction: "Be prepared to move to higher ground if flooding develops. Turn around, don't drown when encountering flooded roads. Most flood deaths occur in vehicles.",
    severity: "Moderate" as const,
    urgency: "Future" as const,
    certainty: "Possible" as const,
    onset: now + 6 * HOUR,
    expires: now + 36 * HOUR,
    status: "active" as const,
  },
  {
    id: "demo-alert-004",
    event: "Air Quality Alert",
    headline: "Air Quality Alert for ozone - Code Orange",
    description: "The NC Department of Environmental Quality has issued a Code Orange Air Quality Alert for ground-level ozone. Air quality is expected to be unhealthy for sensitive groups including the elderly, young children, and those with respiratory conditions such as asthma.",
    instruction: "Sensitive groups should limit prolonged outdoor exertion. Consider moving activities indoors or rescheduling.",
    severity: "Minor" as const,
    urgency: "Expected" as const,
    certainty: "Likely" as const,
    onset: now,
    expires: now + 24 * HOUR,
    status: "active" as const,
  },
];

// Demo tenant information
const DEMO_TENANT = {
  name: "Demo Fire Calls and Weather Alerts",
  displayName: "Charlotte Fire Department (Demo)",
  slug: "demo",
  description: "Interactive demo showcasing real-time fire/EMS incident tracking and weather alert monitoring for the Charlotte, NC metro area.",
  primaryColor: "#dc2626",
};

// Unit legend for the demo - Charlotte FD apparatus
const DEMO_UNIT_LEGEND = [
  { UnitKey: "E1", Description: "Engine 1 - Uptown" },
  { UnitKey: "E4", Description: "Engine 4 - North Davidson" },
  { UnitKey: "E7", Description: "Engine 7 - Myers Park" },
  { UnitKey: "E9", Description: "Engine 9 - North End" },
  { UnitKey: "E11", Description: "Engine 11 - Eastland" },
  { UnitKey: "E12", Description: "Engine 12 - Dilworth" },
  { UnitKey: "E14", Description: "Engine 14 - South Park" },
  { UnitKey: "E16", Description: "Engine 16 - Independence" },
  { UnitKey: "E17", Description: "Engine 17 - Plaza-Midwood" },
  { UnitKey: "E19", Description: "Engine 19 - Ballantyne" },
  { UnitKey: "E22", Description: "Engine 22 - University City" },
  { UnitKey: "E27", Description: "Engine 27 - University Area" },
  { UnitKey: "E28", Description: "Engine 28 - Matthews" },
  { UnitKey: "E29", Description: "Engine 29 - Mint Hill" },
  { UnitKey: "E32", Description: "Engine 32 - Steele Creek" },
  { UnitKey: "L1", Description: "Ladder 1 - Uptown" },
  { UnitKey: "L4", Description: "Ladder 4 - North Davidson" },
  { UnitKey: "L7", Description: "Ladder 7 - Myers Park" },
  { UnitKey: "L14", Description: "Ladder 14 - South Park" },
  { UnitKey: "L19", Description: "Ladder 19 - Ballantyne" },
  { UnitKey: "L22", Description: "Ladder 22 - University City" },
  { UnitKey: "M1", Description: "Medic 1 - Uptown" },
  { UnitKey: "M4", Description: "Medic 4 - North Davidson" },
  { UnitKey: "M7", Description: "Medic 7 - Myers Park" },
  { UnitKey: "M11", Description: "Medic 11 - Eastland" },
  { UnitKey: "M14", Description: "Medic 14 - South Park" },
  { UnitKey: "M16", Description: "Medic 16 - Independence" },
  { UnitKey: "M27", Description: "Medic 27 - University Area" },
  { UnitKey: "M28", Description: "Medic 28 - Matthews" },
  { UnitKey: "R1", Description: "Rescue 1 - Heavy Rescue" },
  { UnitKey: "R3", Description: "Rescue 3 - Technical Rescue" },
  { UnitKey: "BC1", Description: "Battalion Chief 1 - North" },
  { UnitKey: "BC2", Description: "Battalion Chief 2 - Central" },
  { UnitKey: "BC3", Description: "Battalion Chief 3 - East" },
  { UnitKey: "BC4", Description: "Battalion Chief 4 - South" },
  { UnitKey: "HZ1", Description: "HazMat 1 - Special Operations" },
  { UnitKey: "BR1", Description: "Brush 1 - Wildland" },
  { UnitKey: "BR2", Description: "Brush 2 - Wildland" },
  { UnitKey: "D1", Description: "District Chief 1" },
  { UnitKey: "D2", Description: "District Chief 2" },
  { UnitKey: "D3", Description: "District Chief 3" },
  { UnitKey: "BOAT1", Description: "Marine 1 - Water Rescue" },
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
      todaysCallCount: DEMO_INCIDENTS.filter(
        (i) => i.callReceivedTime > now - 24 * HOUR
      ).length,
      activeUnitCount: activeUnits.size,
      activeAlertCount: activeAlerts.length,
      categoryBreakdown,
    };
  },
});

// ===================
// Mission Control Demo Queries
// ===================

/**
 * Get demo Mission Control dashboard stats
 */
export const getDemoMissionControlStats = query({
  args: {},
  handler: async () => {
    const activeIncidents = DEMO_INCIDENTS.filter((i) => i.status === "active").length;
    const pendingPosts = DEMO_INCIDENTS.filter(
      (i) => i.status === "active" && !i.isSyncedToFacebook && !i.syncError
    ).length;
    const postedIncidents = DEMO_INCIDENTS.filter((i) => i.isSyncedToFacebook).length;
    const failedPosts = DEMO_INCIDENTS.filter((i) => i.syncError).length;

    // Count pending updates
    let pendingUpdates = 0;
    for (const incidentId of Object.keys(DEMO_INCIDENT_UPDATES)) {
      const updates = DEMO_INCIDENT_UPDATES[incidentId];
      pendingUpdates += updates.filter((u) => !u.isSynced).length;
    }

    return {
      activeIncidents,
      pendingPosts,
      postedIncidents,
      failedPosts,
      pendingUpdates,
      facebookConnected: DEMO_FACEBOOK_CONNECTION.connected,
      facebookPageName: DEMO_FACEBOOK_CONNECTION.pageName,
    };
  },
});

/**
 * Get demo pending posts (incidents ready to post)
 */
export const getDemoPendingPosts = query({
  args: {},
  handler: async () => {
    return DEMO_INCIDENTS
      .filter((i) => i.status === "active" && !i.isSyncedToFacebook && !i.syncError)
      .map((incident) => {
        const updates = DEMO_INCIDENT_UPDATES[incident.id] || [];
        return {
          ...incident,
          _id: incident.id,
          syncStatus: "pending" as const,
          updateCount: updates.length,
          pendingUpdateCount: updates.filter((u) => !u.isSynced).length,
        };
      });
  },
});

/**
 * Get demo posted incidents
 */
export const getDemoPostedIncidents = query({
  args: {},
  handler: async () => {
    return DEMO_INCIDENTS
      .filter((i) => i.isSyncedToFacebook)
      .map((incident) => {
        const updates = DEMO_INCIDENT_UPDATES[incident.id] || [];
        const pendingUpdateCount = updates.filter((u) => !u.isSynced).length;
        return {
          ...incident,
          _id: incident.id,
          syncStatus: pendingUpdateCount > 0 ? "needs_update" as const : "posted" as const,
          updateCount: updates.length,
          pendingUpdateCount,
        };
      });
  },
});

/**
 * Get demo failed posts
 */
export const getDemoFailedPosts = query({
  args: {},
  handler: async () => {
    return DEMO_INCIDENTS
      .filter((i) => i.syncError)
      .map((incident) => {
        const updates = DEMO_INCIDENT_UPDATES[incident.id] || [];
        return {
          ...incident,
          _id: incident.id,
          syncStatus: "failed" as const,
          updateCount: updates.length,
          pendingUpdateCount: updates.filter((u) => !u.isSynced).length,
        };
      });
  },
});

/**
 * Get demo incident updates for a specific incident
 */
export const getDemoIncidentUpdates = query({
  args: {},
  handler: async () => {
    return DEMO_INCIDENT_UPDATES;
  },
});
