/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as autoPostRules from "../autoPostRules.js";
import type * as billing from "../billing.js";
import type * as cacheHelpers from "../cacheHelpers.js";
import type * as callTypes from "../callTypes.js";
import type * as clerk from "../clerk.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as exports from "../exports.js";
import type * as facebook from "../facebook.js";
import type * as facebookSync from "../facebookSync.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as incidentNotes from "../incidentNotes.js";
import type * as incidentUpdates from "../incidentUpdates.js";
import type * as incidents from "../incidents.js";
import type * as maintenance from "../maintenance.js";
import type * as missionControl from "../missionControl.js";
import type * as postTemplates from "../postTemplates.js";
import type * as scheduler from "../scheduler.js";
import type * as seed from "../seed.js";
import type * as stripe from "../stripe.js";
import type * as sync from "../sync.js";
import type * as syncHelpers from "../syncHelpers.js";
import type * as tenants from "../tenants.js";
import type * as users from "../users.js";
import type * as weather from "../weather.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  autoPostRules: typeof autoPostRules;
  billing: typeof billing;
  cacheHelpers: typeof cacheHelpers;
  callTypes: typeof callTypes;
  clerk: typeof clerk;
  crons: typeof crons;
  demo: typeof demo;
  exports: typeof exports;
  facebook: typeof facebook;
  facebookSync: typeof facebookSync;
  files: typeof files;
  http: typeof http;
  incidentNotes: typeof incidentNotes;
  incidentUpdates: typeof incidentUpdates;
  incidents: typeof incidents;
  maintenance: typeof maintenance;
  missionControl: typeof missionControl;
  postTemplates: typeof postTemplates;
  scheduler: typeof scheduler;
  seed: typeof seed;
  stripe: typeof stripe;
  sync: typeof sync;
  syncHelpers: typeof syncHelpers;
  tenants: typeof tenants;
  users: typeof users;
  weather: typeof weather;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
