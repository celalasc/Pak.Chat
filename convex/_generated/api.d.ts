/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as apiKeys from "../apiKeys.js";
import type * as attachments from "../attachments.js";
import type * as encryption from "../encryption.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as modelVisibility from "../modelVisibility.js";
import type * as threads from "../threads.js";
import type * as userSettings from "../userSettings.js";
import type * as users from "../users.js";
import type * as utils from "../utils.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  attachments: typeof attachments;
  encryption: typeof encryption;
  http: typeof http;
  messages: typeof messages;
  modelVisibility: typeof modelVisibility;
  threads: typeof threads;
  userSettings: typeof userSettings;
  users: typeof users;
  utils: typeof utils;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
