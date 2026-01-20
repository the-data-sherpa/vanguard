// Type definitions for demo data

export interface DemoIncident {
  id: string;
  callType: string;
  callTypeCategory: "fire" | "medical" | "traffic" | "hazmat" | "rescue" | "other";
  description?: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  units: string[];
  status: "active" | "closed";
  callReceivedTime: number;
  callClosedTime?: number;
}

export interface DemoWeatherAlert {
  id: string;
  event: string;
  headline: string;
  description: string;
  instruction?: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor";
  urgency: "Immediate" | "Expected" | "Future";
  certainty: "Observed" | "Likely" | "Possible";
  onset?: number;
  expires: number;
  status: "active" | "expired";
}

export interface DemoUnitLegendEntry {
  UnitKey: string;
  Description: string;
}

export interface DemoTenant {
  name: string;
  displayName: string;
  slug: string;
  description: string;
  primaryColor: string;
}

export interface DemoStats {
  activeIncidentCount: number;
  todaysCallCount: number;
  activeUnitCount: number;
  activeAlertCount: number;
  categoryBreakdown: Record<string, number>;
}
