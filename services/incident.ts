/**
 * Incident Service
 * CRUD operations and processing for incidents
 */

import type {
  Incident,
  IncidentGroup,
  IncidentStatus,
  IncidentSource,
  TenantContext,
  UnitStatus,
  CallTypeCategory,
  ModerationStatus,
  MergeReason,
} from '../lib/types';
import type { PulsePointIncident, ProcessingResult, ProcessingError } from '../types/pulsepoint';
import {
  getClient,
  createWithTenant,
  listWithTenant,
  getWithTenant,
  updateWithTenant,
  deleteWithTenant,
  getFirstWithTenant,
  countWithTenant,
} from '../lib/pocketbase';
import { mapCallTypeToCategory } from '../lib/callTypeMapping';

// ===================
// Input/Option Types
// ===================

export interface CreateIncidentInput {
  source: IncidentSource;
  externalId?: string;
  callType: string;
  fullAddress: string;
  latitude?: number;
  longitude?: number;
  units?: string[];
  unitStatuses?: Record<string, UnitStatus>;
  description?: string;
  callReceivedTime: string;
  submittedBy?: string;
}

export interface UpdateIncidentInput {
  callType?: string;
  fullAddress?: string;
  latitude?: number;
  longitude?: number;
  units?: string[];
  unitStatuses?: Record<string, UnitStatus>;
  description?: string;
  status?: IncidentStatus;
  callClosedTime?: string;
  moderationStatus?: ModerationStatus;
  moderatedBy?: string;
  moderatedAt?: string;
  rejectionReason?: string;
}

export interface ListIncidentsOptions {
  page?: number;
  perPage?: number;
  status?: IncidentStatus | IncidentStatus[];
  source?: IncidentSource | IncidentSource[];
  category?: CallTypeCategory | CallTypeCategory[];
  search?: string;
  sort?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedIncidents {
  items: Incident[];
  totalItems: number;
  totalPages: number;
  page: number;
  perPage: number;
}

// ===================
// CRUD Operations
// ===================

/**
 * Create a new incident
 */
export async function createIncident(
  ctx: TenantContext,
  data: CreateIncidentInput
): Promise<Incident> {
  const callTypeCategory = mapCallTypeToCategory(data.callType);

  const incidentData = {
    source: data.source,
    externalId: data.externalId,
    callType: data.callType,
    callTypeCategory,
    fullAddress: data.fullAddress,
    normalizedAddress: normalizeAddress(data.fullAddress),
    latitude: data.latitude,
    longitude: data.longitude,
    units: data.units ?? [],
    unitStatuses: data.unitStatuses ?? {},
    description: data.description,
    status: 'active' as IncidentStatus,
    callReceivedTime: data.callReceivedTime,
    submittedBy: data.submittedBy,
    moderationStatus:
      data.source === 'pulsepoint' ? ('auto_approved' as ModerationStatus) : ('pending' as ModerationStatus),
  };

  // PocketBase adds id, created, updated automatically
  return await createWithTenant('incidents', ctx, incidentData) as unknown as Incident;
}

/**
 * Get a single incident by ID
 */
export async function getIncident(
  ctx: TenantContext,
  id: string
): Promise<Incident | null> {
  return await getWithTenant<Incident>('incidents', ctx, id);
}

/**
 * Update an incident
 */
export async function updateIncident(
  ctx: TenantContext,
  id: string,
  data: UpdateIncidentInput
): Promise<Incident | null> {
  const updateData: Record<string, unknown> = { ...data };

  // Recalculate category if call type changed
  if (data.callType) {
    updateData.callTypeCategory = mapCallTypeToCategory(data.callType);
  }

  // Normalize address if changed
  if (data.fullAddress) {
    updateData.normalizedAddress = normalizeAddress(data.fullAddress);
  }

  return await updateWithTenant('incidents', ctx, id, updateData) as Incident | null;
}

/**
 * Delete an incident
 */
export async function deleteIncident(ctx: TenantContext, id: string): Promise<boolean> {
  return await deleteWithTenant('incidents', ctx, id);
}

/**
 * List incidents with filtering and pagination
 */
export async function listIncidents(
  ctx: TenantContext,
  options: ListIncidentsOptions = {}
): Promise<PaginatedIncidents> {
  const isDev = process.env.NODE_ENV === 'development';
  const { page = 1, perPage = 50, sort = '-callReceivedTime' } = options;

  const filters: string[] = [];

  // Status filter
  if (options.status) {
    const statuses = Array.isArray(options.status) ? options.status : [options.status];
    filters.push(`(${statuses.map((s) => `status="${s}"`).join(' || ')})`);
  }

  // Source filter
  if (options.source) {
    const sources = Array.isArray(options.source) ? options.source : [options.source];
    filters.push(`(${sources.map((s) => `source="${s}"`).join(' || ')})`);
  }

  // Category filter
  if (options.category) {
    const categories = Array.isArray(options.category) ? options.category : [options.category];
    filters.push(`(${categories.map((c) => `callTypeCategory="${c}"`).join(' || ')})`);
  }

  // Search filter
  if (options.search) {
    const searchTerm = options.search.replace(/"/g, '\\"');
    filters.push(
      `(callType ~ "${searchTerm}" || fullAddress ~ "${searchTerm}" || description ~ "${searchTerm}")`
    );
  }

  // Date range filters
  if (options.startDate) {
    filters.push(`callReceivedTime >= "${options.startDate}"`);
  }
  if (options.endDate) {
    filters.push(`callReceivedTime <= "${options.endDate}"`);
  }

  try {
    const result = await listWithTenant<Incident>('incidents', ctx, {
      page,
      perPage,
      filter: filters.length > 0 ? filters.join(' && ') : undefined,
      sort,
    });

    // Collapse grouped incidents into single entries
    const collapsedItems = collapseGroupedIncidents(result.items);

    return {
      ...result,
      items: collapsedItems,
      // Note: totalItems may be higher than actual display count due to grouping
      page,
      perPage,
    };
  } catch (error) {
    if (isDev) {
      console.warn('[incident] Dev mode: returning empty incidents list');
      return { items: [], totalItems: 0, totalPages: 0, page, perPage };
    }
    throw error;
  }
}

/**
 * Get active incidents only
 */
export async function getActiveIncidents(ctx: TenantContext): Promise<Incident[]> {
  const isDev = process.env.NODE_ENV === 'development';

  try {
    const result = await listWithTenant<Incident>('incidents', ctx, {
      filter: 'status="active"',
      sort: '-callReceivedTime',
      perPage: 100,
    });
    // Collapse grouped incidents into single entries
    return collapseGroupedIncidents(result.items);
  } catch (error) {
    if (isDev) {
      console.warn('[incident] Dev mode: returning empty active incidents');
      return [];
    }
    throw error;
  }
}

/**
 * Count incidents by status
 */
export async function countIncidentsByStatus(
  ctx: TenantContext
): Promise<Record<IncidentStatus, number>> {
  const isDev = process.env.NODE_ENV === 'development';

  try {
    const [active, closed, archived] = await Promise.all([
      countWithTenant('incidents', ctx, 'status="active"'),
      countWithTenant('incidents', ctx, 'status="closed"'),
      countWithTenant('incidents', ctx, 'status="archived"'),
    ]);

    return { active, closed, archived };
  } catch (error) {
    if (isDev) {
      console.warn('[incident] Dev mode: returning zero counts');
      return { active: 0, closed: 0, archived: 0 };
    }
    throw error;
  }
}

// ===================
// Processing Operations
// ===================

/**
 * Find an existing incident by external ID
 */
export async function findExistingIncident(
  ctx: TenantContext,
  externalId: string
): Promise<Incident | null> {
  return await getFirstWithTenant<Incident>(
    'incidents',
    ctx,
    `externalId="${externalId}"`
  );
}

/**
 * Process incoming PulsePoint incidents
 * Creates new incidents, updates existing ones, and closes missing ones
 */
export async function processIncomingIncidents(
  ctx: TenantContext,
  pulsePointIncidents: PulsePointIncident[]
): Promise<ProcessingResult> {
  const timestamp = new Date().toISOString();
  const errors: ProcessingError[] = [];
  let created = 0;
  let updated = 0;
  let closed = 0;
  let skipped = 0;

  // Get current active PulsePoint incidents
  const currentActive = await listWithTenant<Incident>('incidents', ctx, {
    filter: 'source="pulsepoint" && status="active"',
    perPage: 500,
  });

  const activeExternalIds = new Set(
    currentActive.items.map((i) => i.externalId).filter(Boolean)
  );
  const incomingExternalIds = new Set(
    pulsePointIncidents.map((i) => i.ID)
  );

  // Process incoming incidents
  for (const ppIncident of pulsePointIncidents) {
    try {
      const existing = await findExistingIncident(ctx, ppIncident.ID);

      if (existing) {
        // Update existing incident
        const hasChanges = checkForChanges(existing, ppIncident);
        if (hasChanges) {
          await updateIncidentFromPulsePoint(ctx, existing.id, ppIncident);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Create new incident
        await createIncidentFromPulsePoint(ctx, ppIncident);
        created++;
      }
    } catch (error) {
      errors.push({
        incidentId: ppIncident.ID,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp,
      });
    }
  }

  // Close incidents that are no longer in the feed
  for (const incident of currentActive.items) {
    if (incident.externalId && !incomingExternalIds.has(incident.externalId)) {
      try {
        await closeIncident(ctx, incident.id);
        closed++;
      } catch (error) {
        errors.push({
          incidentId: incident.id,
          message: `Failed to close: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp,
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    timestamp,
    created,
    updated,
    closed,
    skipped,
    errors,
  };
}

/**
 * Create an incident from PulsePoint data
 */
async function createIncidentFromPulsePoint(
  ctx: TenantContext,
  ppIncident: PulsePointIncident
): Promise<Incident> {
  const units = ppIncident.Unit?.map((u) => u.UnitID) ?? [];
  const unitStatuses: Record<string, UnitStatus> = {};

  if (ppIncident.Unit) {
    for (const unit of ppIncident.Unit) {
      unitStatuses[unit.UnitID] = {
        unit: unit.UnitID,
        status: unit.PulsePointDispatchStatus,
        timestamp: unit.UnitClearedDateTime ?? '',
      };
    }
  }

  // Parse lat/lng from strings, handling "0.0000000000" as undefined
  const lat = parseFloat(ppIncident.Latitude);
  const lng = parseFloat(ppIncident.Longitude);

  // Determine initial status based on whether incident is already closed
  const isClosed = Boolean(ppIncident.ClosedDateTime);

  const incident = await createIncident(ctx, {
    source: 'pulsepoint',
    externalId: ppIncident.ID,
    callType: ppIncident.PulsePointIncidentCallType,
    fullAddress: ppIncident.FullDisplayAddress,
    latitude: lat !== 0 ? lat : undefined,
    longitude: lng !== 0 ? lng : undefined,
    units,
    unitStatuses,
    callReceivedTime: ppIncident.CallReceivedDateTime,
  });

  // If incident came in already closed, update its status
  if (isClosed) {
    await updateIncident(ctx, incident.id, {
      status: 'closed',
      callClosedTime: ppIncident.ClosedDateTime,
    });
  }

  // Try to auto-merge with similar incidents (same address, call type, within 10 min)
  await tryAutoMergeIncident(ctx, incident);

  // Re-fetch to get updated groupId
  return await getIncident(ctx, incident.id) as Incident;
}

/**
 * Update an existing incident from PulsePoint data
 */
async function updateIncidentFromPulsePoint(
  ctx: TenantContext,
  incidentId: string,
  ppIncident: PulsePointIncident
): Promise<Incident | null> {
  const units = ppIncident.Unit?.map((u) => u.UnitID) ?? [];
  const unitStatuses: Record<string, UnitStatus> = {};

  if (ppIncident.Unit) {
    for (const unit of ppIncident.Unit) {
      unitStatuses[unit.UnitID] = {
        unit: unit.UnitID,
        status: unit.PulsePointDispatchStatus,
        timestamp: unit.UnitClearedDateTime ?? '',
      };
    }
  }

  // Parse lat/lng from strings, handling "0.0000000000" as undefined
  const lat = parseFloat(ppIncident.Latitude);
  const lng = parseFloat(ppIncident.Longitude);

  const updateData: UpdateIncidentInput = {
    callType: ppIncident.PulsePointIncidentCallType,
    fullAddress: ppIncident.FullDisplayAddress,
    latitude: lat !== 0 ? lat : undefined,
    longitude: lng !== 0 ? lng : undefined,
    units,
    unitStatuses,
  };

  // Check if incident was closed
  if (ppIncident.ClosedDateTime) {
    updateData.status = 'closed';
    updateData.callClosedTime = ppIncident.ClosedDateTime;
  }

  return await updateIncident(ctx, incidentId, updateData);
}

/**
 * Check if there are meaningful changes between existing and incoming incident
 */
function checkForChanges(existing: Incident, incoming: PulsePointIncident): boolean {
  // Check units changed
  const existingUnits = new Set(existing.units ?? []);
  const incomingUnits = new Set(incoming.Unit?.map((u) => u.UnitID) ?? []);

  if (existingUnits.size !== incomingUnits.size) return true;
  for (const unit of existingUnits) {
    if (!incomingUnits.has(unit)) return true;
  }

  // Check unit statuses changed
  if (incoming.Unit) {
    for (const unit of incoming.Unit) {
      const existingStatus = existing.unitStatuses?.[unit.UnitID];
      if (!existingStatus || existingStatus.status !== unit.PulsePointDispatchStatus) {
        return true;
      }
    }
  }

  // Check if call was closed
  if (incoming.ClosedDateTime && existing.status !== 'closed') {
    return true;
  }

  // Check address changed
  if (existing.fullAddress !== incoming.FullDisplayAddress) {
    return true;
  }

  return false;
}

/**
 * Close an incident
 */
export async function closeIncident(ctx: TenantContext, id: string): Promise<Incident | null> {
  return await updateIncident(ctx, id, {
    status: 'closed',
    callClosedTime: new Date().toISOString(),
  });
}

/**
 * Archive old closed incidents
 */
export async function archiveOldIncidents(
  ctx: TenantContext,
  olderThanDays: number = 30
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  const cutoffIso = cutoffDate.toISOString();

  const closedIncidents = await listWithTenant<Incident>('incidents', ctx, {
    filter: `status="closed" && callClosedTime < "${cutoffIso}"`,
    perPage: 500,
  });

  let archived = 0;
  for (const incident of closedIncidents.items) {
    const result = await updateIncident(ctx, incident.id, { status: 'archived' });
    if (result) archived++;
  }

  return archived;
}

// ===================
// Utility Functions
// ===================

/**
 * Generate a merge key for grouping incidents at display time
 * Key is based on: normalized address + call type + 10-minute time window
 */
function generateDisplayMergeKey(incident: Incident): string {
  const normalizedAddr = incident.normalizedAddress ||
    incident.fullAddress.toLowerCase().replace(/[.,#]/g, '').replace(/\s+/g, ' ').trim();
  const callTime = new Date(incident.callReceivedTime);

  // Round time down to nearest 10-minute window
  const windowStart = new Date(callTime);
  windowStart.setMinutes(Math.floor(windowStart.getMinutes() / 10) * 10);
  windowStart.setSeconds(0);
  windowStart.setMilliseconds(0);

  return `${normalizedAddr}|${incident.callType.toLowerCase()}|${windowStart.toISOString()}`;
}

/**
 * Collapse grouped incidents into a single representative incident
 * Combines units from all incidents in the group
 * Works with both groupId-based grouping AND automatic grouping by address/type/time
 */
export function collapseGroupedIncidents(incidents: Incident[]): Incident[] {
  // First, group by explicit groupId
  const byGroupId = new Map<string, Incident[]>();
  const needsAutoGroup: Incident[] = [];

  for (const incident of incidents) {
    if (incident.groupId) {
      const existing = byGroupId.get(incident.groupId) || [];
      existing.push(incident);
      byGroupId.set(incident.groupId, existing);
    } else {
      needsAutoGroup.push(incident);
    }
  }

  // For incidents without groupId, group by address/type/time window
  const byMergeKey = new Map<string, Incident[]>();
  for (const incident of needsAutoGroup) {
    const mergeKey = generateDisplayMergeKey(incident);
    const existing = byMergeKey.get(mergeKey) || [];
    existing.push(incident);
    byMergeKey.set(mergeKey, existing);
  }

  // Helper function to merge a group of incidents
  const mergeGroup = (groupIncidents: Incident[]): Incident => {
    if (groupIncidents.length === 1) {
      return groupIncidents[0];
    }

    // Multiple incidents - merge into the earliest one
    const sorted = groupIncidents.sort(
      (a, b) => new Date(a.callReceivedTime).getTime() - new Date(b.callReceivedTime).getTime()
    );
    const primary = sorted[0];

    // Combine units from all incidents
    const allUnits = new Set<string>();
    const mergedUnitStatuses: Record<string, UnitStatus> = {};

    for (const incident of groupIncidents) {
      if (incident.units) {
        for (const unit of incident.units) {
          allUnits.add(unit);
        }
      }
      if (incident.unitStatuses) {
        for (const [unitId, status] of Object.entries(incident.unitStatuses)) {
          // Keep the most recent status for each unit
          const existing = mergedUnitStatuses[unitId];
          if (!existing || new Date(status.timestamp) > new Date(existing.timestamp)) {
            mergedUnitStatuses[unitId] = status;
          }
        }
      }
    }

    // Create merged incident
    return {
      ...primary,
      units: Array.from(allUnits),
      unitStatuses: mergedUnitStatuses,
    };
  };

  // Collapse explicit groups
  const collapsed: Incident[] = [];
  for (const [, groupIncidents] of byGroupId) {
    collapsed.push(mergeGroup(groupIncidents));
  }

  // Collapse auto-detected groups
  for (const [, groupIncidents] of byMergeKey) {
    collapsed.push(mergeGroup(groupIncidents));
  }

  // Sort by call received time (most recent first)
  return collapsed.sort(
    (a, b) => new Date(b.callReceivedTime).getTime() - new Date(a.callReceivedTime).getTime()
  );
}

/**
 * Escape a string for use in PocketBase filter queries
 */
function escapeFilterValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Normalize an address for comparison/deduplication
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\b(street|st)\b/g, 'st')
    .replace(/\b(avenue|ave)\b/g, 'ave')
    .replace(/\b(boulevard|blvd)\b/g, 'blvd')
    .replace(/\b(drive|dr)\b/g, 'dr')
    .replace(/\b(road|rd)\b/g, 'rd')
    .replace(/\b(lane|ln)\b/g, 'ln')
    .replace(/\b(court|ct)\b/g, 'ct')
    .replace(/\b(place|pl)\b/g, 'pl')
    .replace(/\b(north|n)\b/g, 'n')
    .replace(/\b(south|s)\b/g, 's')
    .replace(/\b(east|e)\b/g, 'e')
    .replace(/\b(west|w)\b/g, 'w')
    .trim();
}

// ===================
// Incident Grouping / Merge Logic
// ===================

const MERGE_WINDOW_MINUTES = 10;

/**
 * Generate a merge key for auto-grouping incidents
 * Key is based on: normalized address + call type + 10-minute time window
 */
function generateMergeKey(normalizedAddr: string, callType: string, callTime: Date): string {
  // Round time down to nearest 10-minute window
  const windowStart = new Date(callTime);
  windowStart.setMinutes(Math.floor(windowStart.getMinutes() / MERGE_WINDOW_MINUTES) * MERGE_WINDOW_MINUTES);
  windowStart.setSeconds(0);
  windowStart.setMilliseconds(0);

  return `${normalizedAddr}|${callType.toLowerCase()}|${windowStart.toISOString()}`;
}

/**
 * Find an existing incident group by merge key
 */
async function findGroupByMergeKey(
  ctx: TenantContext,
  mergeKey: string
): Promise<IncidentGroup | null> {
  const escaped = escapeFilterValue(mergeKey);
  return await getFirstWithTenant<IncidentGroup>('incident_groups', ctx, `mergeKey="${escaped}"`);
}

/**
 * Create a new incident group
 */
async function createIncidentGroup(
  ctx: TenantContext,
  mergeKey: string,
  callType: string,
  normalizedAddr: string,
  callTime: Date
): Promise<IncidentGroup> {
  const windowStart = new Date(callTime);
  windowStart.setMinutes(Math.floor(windowStart.getMinutes() / MERGE_WINDOW_MINUTES) * MERGE_WINDOW_MINUTES);
  windowStart.setSeconds(0);
  windowStart.setMilliseconds(0);

  const windowEnd = new Date(windowStart.getTime() + MERGE_WINDOW_MINUTES * 60 * 1000);

  return await createWithTenant('incident_groups', ctx, {
    mergeKey,
    mergeReason: 'auto_address_time' as MergeReason,
    callType,
    normalizedAddress: normalizedAddr,
    windowStart: windowStart.toISOString(),
    windowEnd: windowEnd.toISOString(),
  }) as unknown as IncidentGroup;
}

/**
 * Find existing incidents that could be merged with a new one
 * Criteria: same address, same call type, within 10 minutes
 */
async function findMergeableIncidents(
  ctx: TenantContext,
  normalizedAddr: string,
  callType: string,
  callTime: Date
): Promise<Incident[]> {
  const windowStart = new Date(callTime.getTime() - MERGE_WINDOW_MINUTES * 60 * 1000);
  const windowEnd = new Date(callTime.getTime() + MERGE_WINDOW_MINUTES * 60 * 1000);
  const escapedAddr = escapeFilterValue(normalizedAddr);
  const escapedType = escapeFilterValue(callType);

  const result = await listWithTenant<Incident>('incidents', ctx, {
    filter: `normalizedAddress="${escapedAddr}" && callType="${escapedType}" && callReceivedTime >= "${windowStart.toISOString()}" && callReceivedTime <= "${windowEnd.toISOString()}"`,
    perPage: 10,
  });

  return result.items;
}

/**
 * Assign an incident to a group (or create group if needed)
 * Returns the group ID if merged, null if no merge needed
 */
export async function tryAutoMergeIncident(
  ctx: TenantContext,
  incident: Incident
): Promise<string | null> {
  const pb = getClient();
  const normalizedAddr = incident.normalizedAddress || normalizeAddress(incident.fullAddress);
  const callTime = new Date(incident.callReceivedTime);
  const mergeKey = generateMergeKey(normalizedAddr, incident.callType, callTime);

  // Check if there's already a group for this merge key
  let group = await findGroupByMergeKey(ctx, mergeKey);

  if (group) {
    // Group exists - add this incident to it
    await pb.collection('incidents').update(incident.id, { groupId: group.id });
    return group.id;
  }

  // Check if there are other incidents that should be grouped with this one
  const mergeableIncidents = await findMergeableIncidents(
    ctx,
    normalizedAddr,
    incident.callType,
    callTime
  );

  // Filter out the current incident and any already-grouped incidents
  const ungroupedMergeables = mergeableIncidents.filter(
    (i) => i.id !== incident.id && !i.groupId
  );

  if (ungroupedMergeables.length > 0) {
    // Found other incidents to merge - create a group
    group = await createIncidentGroup(ctx, mergeKey, incident.callType, normalizedAddr, callTime);

    // Add current incident to group
    await pb.collection('incidents').update(incident.id, { groupId: group.id });

    // Add other incidents to group
    for (const mergeable of ungroupedMergeables) {
      await pb.collection('incidents').update(mergeable.id, { groupId: group.id });
    }

    return group.id;
  }

  // No merge needed
  return null;
}
