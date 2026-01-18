/**
 * Adapters to convert Convex data to the format expected by existing components
 */

import { Doc, Id } from "@/convex/_generated/dataModel";
import type { Incident, WeatherAlert, Tenant, UnitLegend, CallTypeCategory, IncidentStatus } from "./types";

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
    unitStatuses: doc.unitStatuses as Incident["unitStatuses"],
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
