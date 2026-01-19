/**
 * Adapters to convert Convex data to the format expected by existing components
 */

import { Doc, Id } from "@/convex/_generated/dataModel";
import type {
  Incident,
  WeatherAlert,
  Tenant,
  UnitLegend,
  CallTypeCategory,
  IncidentStatus,
  IncidentNote,
  UnitStatusesField,
  LegacyUnitStatus,
  UnitStatus,
} from "./types";

/**
 * Convert Convex unitStatuses to component-compatible format
 * Handles both legacy Record format and new Array format
 */
function adaptUnitStatuses(
  raw: Doc<"incidents">["unitStatuses"]
): UnitStatusesField | undefined {
  if (!raw) return undefined;

  // Check if it's the new Array format
  if (Array.isArray(raw)) {
    return raw.map((u) => ({
      unitId: u.unitId,
      status: u.status,
      timeDispatched: u.timeDispatched ? new Date(u.timeDispatched).toISOString() : undefined,
      timeAcknowledged: u.timeAcknowledged ? new Date(u.timeAcknowledged).toISOString() : undefined,
      timeEnroute: u.timeEnroute ? new Date(u.timeEnroute).toISOString() : undefined,
      timeOnScene: u.timeOnScene ? new Date(u.timeOnScene).toISOString() : undefined,
      timeCleared: u.timeCleared ? new Date(u.timeCleared).toISOString() : undefined,
    })) as UnitStatus[];
  }

  // Legacy Record format
  const result: Record<string, LegacyUnitStatus> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key] = {
      unit: value.unit,
      status: value.status,
      timestamp: new Date(value.timestamp).toISOString(),
    };
  }
  return result;
}

/**
 * Convert Convex incident to component-compatible format
 */
export function adaptIncident(doc: Doc<"incidents">): Incident {
  return {
    id: doc._id,
    created: new Date(doc._creationTime).toISOString(),
    updated: new Date(doc._creationTime).toISOString(),
    tenantId: doc.tenantId,
    groupId: doc.groupId,
    source: doc.source,
    externalId: doc.externalId,
    callType: doc.callType,
    callTypeCategory: doc.callTypeCategory as CallTypeCategory | undefined,
    fullAddress: doc.fullAddress,
    normalizedAddress: doc.normalizedAddress,
    latitude: doc.latitude,
    longitude: doc.longitude,
    units: doc.units,
    unitStatuses: adaptUnitStatuses(doc.unitStatuses),
    description: doc.description,
    status: doc.status as IncidentStatus,
    callReceivedTime: new Date(doc.callReceivedTime).toISOString(),
    callClosedTime: doc.callClosedTime ? new Date(doc.callClosedTime).toISOString() : undefined,
    submittedBy: doc.submittedBy,
    moderationStatus: doc.moderationStatus,
    moderatedBy: doc.moderatedBy,
    moderatedAt: doc.moderatedAt ? new Date(doc.moderatedAt).toISOString() : undefined,
    rejectionReason: doc.rejectionReason,
    isSyncedToFacebook: doc.isSyncedToFacebook,
    facebookPostId: doc.facebookPostId,
    needsFacebookUpdate: doc.needsFacebookUpdate,
    lastSyncAttempt: doc.lastSyncAttempt ? new Date(doc.lastSyncAttempt).toISOString() : undefined,
    syncError: doc.syncError,
  };
}

/**
 * Convert array of Convex incidents
 */
export function adaptIncidents(docs: Doc<"incidents">[]): Incident[] {
  return docs.map(adaptIncident);
}

/**
 * Convert Convex weather alert to component-compatible format
 */
export function adaptWeatherAlert(doc: Doc<"weatherAlerts">): WeatherAlert {
  return {
    id: doc._id,
    created: new Date(doc._creationTime).toISOString(),
    updated: new Date(doc._creationTime).toISOString(),
    tenantId: doc.tenantId,
    nwsId: doc.nwsId,
    event: doc.event,
    headline: doc.headline,
    description: doc.description,
    instruction: doc.instruction,
    severity: doc.severity,
    urgency: doc.urgency,
    certainty: doc.certainty,
    category: doc.category,
    onset: doc.onset ? new Date(doc.onset).toISOString() : undefined,
    expires: new Date(doc.expires).toISOString(),
    ends: doc.ends ? new Date(doc.ends).toISOString() : undefined,
    affectedZones: doc.affectedZones,
    status: doc.status,
    isSyncedToFacebook: doc.isSyncedToFacebook,
    facebookPostId: doc.facebookPostId,
    lastFacebookPostTime: doc.lastFacebookPostTime ? new Date(doc.lastFacebookPostTime).toISOString() : undefined,
  };
}

/**
 * Convert array of Convex weather alerts
 */
export function adaptWeatherAlerts(docs: Doc<"weatherAlerts">[]): WeatherAlert[] {
  return docs.map(adaptWeatherAlert);
}

/**
 * Convert Convex tenant to component-compatible format
 */
export function adaptTenant(doc: Doc<"tenants">): Partial<Tenant> & { id: string } {
  return {
    id: doc._id,
    created: new Date(doc._creationTime).toISOString(),
    updated: new Date(doc._creationTime).toISOString(),
    slug: doc.slug,
    name: doc.name,
    displayName: doc.displayName,
    description: doc.description,
    logoUrl: doc.logoUrl,
    primaryColor: doc.primaryColor,
    status: doc.status,
    tier: doc.tier,
    pulsepointConfig: doc.pulsepointConfig,
    weatherZones: doc.weatherZones,
    features: doc.features,
    limits: doc.limits,
    trialEndsAt: doc.trialEndsAt ? new Date(doc.trialEndsAt).toISOString() : undefined,
    unitLegend: doc.unitLegend as UnitLegend,
    unitLegendUpdatedAt: doc.unitLegendUpdatedAt ? new Date(doc.unitLegendUpdatedAt).toISOString() : undefined,
    unitLegendAvailable: doc.unitLegendAvailable,
  };
}

/**
 * Convert Convex incident note to component-compatible format
 */
export function adaptIncidentNote(doc: Doc<"incidentNotes">): IncidentNote {
  return {
    id: doc._id,
    created: new Date(doc._creationTime).toISOString(),
    updated: doc.editedAt ? new Date(doc.editedAt).toISOString() : new Date(doc._creationTime).toISOString(),
    tenantId: doc.tenantId,
    incidentId: doc.incidentId,
    content: doc.content,
    authorId: doc.authorId,
    authorName: doc.authorName,
    isEdited: doc.isEdited,
    editedAt: doc.editedAt ? new Date(doc.editedAt).toISOString() : undefined,
  };
}

/**
 * Convert array of Convex incident notes
 */
export function adaptIncidentNotes(docs: Doc<"incidentNotes">[]): IncidentNote[] {
  return docs.map(adaptIncidentNote);
}
