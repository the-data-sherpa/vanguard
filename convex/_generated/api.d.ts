/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cacheHelpers from "../cacheHelpers.js";
import type * as crons from "../crons.js";
import type * as exports from "../exports.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as incidentNotes from "../incidentNotes.js";
import type * as incidents from "../incidents.js";
import type * as maintenance from "../maintenance.js";
import type * as scheduler from "../scheduler.js";
import type * as seed from "../seed.js";
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
  cacheHelpers: typeof cacheHelpers;
  crons: typeof crons;
  exports: typeof exports;
  files: typeof files;
  http: typeof http;
  incidentNotes: typeof incidentNotes;
  incidents: typeof incidents;
  maintenance: typeof maintenance;
  scheduler: typeof scheduler;
  seed: typeof seed;
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
