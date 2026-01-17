/**
 * PulsePoint API Type Definitions
 * Types for the encrypted API response and decrypted incident data
 */

// ===================
// API Response Types
// ===================

/**
 * Encrypted response from PulsePoint API
 * Uses AES-256-CBC encryption with EVP_BytesToKey derivation
 */
export interface PulsePointEncryptedData {
  /** Base64-encoded ciphertext */
  ct: string;
  /** Hex-encoded initialization vector */
  iv: string;
  /** Hex-encoded salt for key derivation */
  s: string;
}

// ===================
// Decrypted Data Types
// ===================

/**
 * A single unit/apparatus assigned to an incident
 */
export interface PulsePointUnit {
  UnitID: string;
  PulsePointDispatchStatus: string;
  /** ISO timestamp when unit was cleared */
  UnitClearedDateTime?: string;
}

/**
 * Decrypted incident from PulsePoint API
 * Note: Field names match the actual API response
 */
export interface PulsePointIncident {
  /** Incident ID (API returns as "ID", not "PulsePointIncidentID") */
  ID: string;
  AgencyID: string;
  PulsePointIncidentCallType: string;
  FullDisplayAddress: string;
  MedicalEmergencyDisplayAddress?: string;
  /** String representation of latitude (may be "0.0000000000" if not public) */
  Latitude: string;
  /** String representation of longitude (may be "0.0000000000" if not public) */
  Longitude: string;
  /** ISO timestamp when call was received */
  CallReceivedDateTime: string;
  /** ISO timestamp when call was closed (only on recent/closed incidents) */
  ClosedDateTime?: string;
  Unit?: PulsePointUnit[];
  /** "0" or "1" - whether location is public */
  PublicLocation?: string;
  /** "0" or "1" - whether incident is shareable */
  IsShareable?: string;
  /** "0" or "1" - whether address is truncated */
  AddressTruncated?: string;
}

/**
 * Decrypted response structure containing active and recent incidents
 */
export interface PulsePointDecryptedData {
  incidents?: {
    active?: PulsePointIncident[];
    recent?: PulsePointIncident[];
  };
}

// ===================
// Service Result Types
// ===================

/**
 * Result from fetching PulsePoint incidents for a single agency
 */
export interface PulsePointFetchResult {
  success: boolean;
  timestamp: string;
  agencyId: string;
  data?: PulsePointDecryptedData;
  error?: string;
}

/**
 * Result from fetching incidents for a tenant (may have multiple agencies)
 */
export interface TenantIncidentFetchResult {
  success: boolean;
  timestamp: string;
  tenantId: string;
  agencies: PulsePointFetchResult[];
  totalIncidents: number;
}

/**
 * Result from processing incoming PulsePoint incidents
 */
export interface ProcessingResult {
  success: boolean;
  timestamp: string;
  created: number;
  updated: number;
  closed: number;
  skipped: number;
  errors: ProcessingError[];
}

/**
 * An error that occurred during incident processing
 */
export interface ProcessingError {
  incidentId: string;
  message: string;
  timestamp: string;
}

/**
 * Result from a sync operation for a single tenant
 */
export interface SyncResult {
  success: boolean;
  tenantId: string;
  tenantSlug: string;
  timestamp: string;
  created: number;
  updated: number;
  closed: number;
  errors: ProcessingError[];
  skippedRateLimited?: boolean;
}

/**
 * Result from syncing all tenants
 */
export interface MultiTenantSyncResult {
  success: boolean;
  timestamp: string;
  tenantsProcessed: number;
  tenantsSkipped: number;
  totalCreated: number;
  totalUpdated: number;
  totalClosed: number;
  results: SyncResult[];
}

/**
 * Weather sync result
 */
export interface WeatherSyncResult {
  success: boolean;
  tenantId: string;
  timestamp: string;
  created: number;
  updated: number;
  expired: number;
  errors: string[];
}
