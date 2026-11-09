/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as applications from "../applications.js";
import type * as auth from "../auth.js";
import type * as files from "../files.js";
import type * as hostedActions from "../hostedActions.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as invitedPassword from "../invitedPassword.js";
import type * as preferences from "../preferences.js";
import type * as profiles from "../profiles.js";
import type * as shared_document_builders from "../shared/document_builders.js";
import type * as shared_ownership from "../shared/ownership.js";
import type * as users from "../users.js";
import type * as workflows from "../workflows.js";
import type * as workspaceMigration from "../workspaceMigration.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  applications: typeof applications;
  auth: typeof auth;
  files: typeof files;
  hostedActions: typeof hostedActions;
  http: typeof http;
  invitations: typeof invitations;
  invitedPassword: typeof invitedPassword;
  preferences: typeof preferences;
  profiles: typeof profiles;
  "shared/document_builders": typeof shared_document_builders;
  "shared/ownership": typeof shared_ownership;
  users: typeof users;
  workflows: typeof workflows;
  workspaceMigration: typeof workspaceMigration;
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
