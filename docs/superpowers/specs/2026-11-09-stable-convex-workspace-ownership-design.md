# Stable Convex Workspace Ownership Design

## Goal

Keep each hosted workspace attached to the same Convex Auth account across sign-ins, and recover existing profile, application, workflow, preference, and file data that was stored under prior session identifiers.

## Current behavior and cause

Convex Auth creates token subjects in the form `userId|sessionId`. The application currently stores the complete `identity.subject` as `ownerId` in profiles, applications, application files, preferences, and workflows. Because the session ID changes on a later sign-in, ownership-scoped queries see a different workspace and return no data. The Auth package's `getAuthUserId(ctx)` extracts the stable Convex user document ID from the token subject. `users.current` already uses this helper; the other workspace modules do not.

## Approaches considered

1. **Use the stable account ID and migrate legacy records (selected).** Change all workspace ownership checks and writes to `getAuthUserId(ctx)`, then perform an idempotent, account-scoped migration of records whose old owner IDs begin with the current user ID and session separator. This prevents future splits and restores prior data.
2. **Use the stable account ID without migrating.** This fixes future sign-ins but leaves the existing imported data inaccessible, forcing the user to import again. Rejected because it does not recover the current workspace.
3. **Keep session ownership and aggregate every session on reads.** This preserves old rows but requires every query and mutation to merge aliases, handle duplicates, and authorize changes across multiple old IDs indefinitely. Rejected as a more fragile permanent data model.

## Ownership model

- The workspace owner key is the stable Convex Auth user document ID returned by `getAuthUserId(ctx)`.
- This ID belongs to the account created with the user's email address; the email string itself is not used as the data key.
- Every authenticated read, write, action, upload, and private-file download uses the same stable owner ID.
- No function accepts a caller-supplied owner ID as authorization. Collaborator accounts continue to resolve to their own Convex Auth user IDs and private workspaces.

## Existing data recovery

On the first authenticated workspace load after the code change, the client waits for an authenticated migration operation to finish before rendering workspace queries. The migration examines only rows under the current user's legacy owner-ID prefix (`<stableUserId>|`) and the current stable owner ID. It does not scan or modify another account's records.

The migration is idempotent. It consolidates legacy rows into the stable owner ID and repairs related application references before deleting duplicate records:

- Keep the profile with the newest `updatedAt` and remove the user's duplicate profile rows.
- Group applications by `applicationKey`; use the newest row as the main record, retain non-empty generated CV and cover-letter names from older copies, and map every old application ID to the canonical application ID.
- Consolidate duplicate workflows onto the canonical application. Keep the newest posting/source and timestamp fields, and retain the newest available fit assessment, draft documents, and review data so a later empty re-import cannot erase generated work.
- Reparent files to the canonical application and stable owner. Keep distinct filenames; when multiple legacy rows have the same application and filename, retain the newest file and delete redundant storage objects only after the canonical metadata is in place.
- Keep the preference row with the newest `updatedAt`.
- Remove legacy rows only after their canonical replacements and foreign-key references are saved.

If migration fails, the client shows an error with a retry path and does not render an empty workspace as if the migration had succeeded. Re-running migration after partial progress must safely finish without duplicating or losing records.

## Affected code areas

- `profiles.ts`, `applications.ts`, `files.ts`, `preferences.ts`, and `workflows.ts`: switch ownership helpers and checks to the stable Auth user ID.
- `hostedActions.ts`: pass the stable owner ID into internal workflow operations.
- `files.ts` private-download HTTP action: authorize the stable owner ID.
- Hosted app startup: wait for migration before showing profile/application queries, and surface migration failure/retry.
- Convex schema: add a migration marker or state only if needed to support safe paginated progress; avoid storing email as an owner key.

## Failure and data-safety behavior

- Migration is scoped to one authenticated account and never accepts an owner ID from the browser.
- Migration must preserve the current account's latest profile, application states, generated documents, and all distinct filenames.
- Storage blobs are deleted only when duplicate metadata is confirmed and a retained copy exists.
- Unauthenticated access and cross-account access remain denied.
- The local archive and its files are not modified by this repair.

## Acceptance criteria

- Import the local workspace once, sign out, and sign back into the same email account: profile and applications remain present.
- Repeat sign-out/sign-in with a new session: the same data remains present without another import.
- Existing records stored under multiple sessions for that account are consolidated, with no duplicate application rows and with generated files/workflows still available.
- A separate invited account remains empty and cannot read or modify this account's data.
- If migration is interrupted or retried, it completes without losing the latest profile, statuses, draft documents, or non-duplicate files.

## Implementation sequence

1. Change owner identity helpers to `getAuthUserId(ctx)` throughout the Convex workspace API.
2. Implement an account-scoped, idempotent migration and verify its merge rules against the schema and storage references.
3. Gate the authenticated workspace UI on migration completion and provide retry/error feedback.
4. Review the diff for privacy boundaries and data deletion safety, then validate persistence across a new sign-in session.
