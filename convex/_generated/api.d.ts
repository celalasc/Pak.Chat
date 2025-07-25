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
import type * as customModes from "../customModes.js";
import type * as encryption from "../encryption.js";
import type * as getChatPageData from "../getChatPageData.js";
import type * as getNewChatData from "../getNewChatData.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as modelVisibility from "../modelVisibility.js";
import type * as projectFiles from "../projectFiles.js";
import type * as projectThreads from "../projectThreads.js";
import type * as projects from "../projects.js";
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
  customModes: typeof customModes;
  encryption: typeof encryption;
  getChatPageData: typeof getChatPageData;
  getNewChatData: typeof getNewChatData;
  http: typeof http;
  messages: typeof messages;
  modelVisibility: typeof modelVisibility;
  projectFiles: typeof projectFiles;
  projectThreads: typeof projectThreads;
  projects: typeof projects;
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
