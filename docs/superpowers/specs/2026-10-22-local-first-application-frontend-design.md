# Local-First Application Frontend Design

**Date:** 2026-10-22  
**Status:** User-approved direction; awaiting spec review  
**Branch:** `feature/local-application-ui`

## Goal

Create a distinct user-facing application frontend for the existing AI job-search workflow. Keep the current CLI, portal skills, workflow instructions, and default branch unchanged. V1 is a single-user local application. The architecture should leave a narrow, practical seam for a hosted edition later without implementing hosting, authentication, or multi-tenancy now.

## User and primary tasks

The initial user is the repository owner. They need to:

1. Maintain and verify candidate profile information.
2. Create a job application from a URL or pasted job description.
3. Review role fit and eligibility before generating materials.
4. Generate, review, export, and track a tailored application packet.
5. Reopen an application and its archived artifacts for follow-up or interview preparation.

## Product boundary

- Build the new frontend in an isolated `app/` workspace on `feature/local-application-ui`.
- Do not change the CLI, portal-search skills, or existing canonical workflow commands as part of the frontend shell.
- The app is a local browser UI with a companion local service bound to `127.0.0.1` only.
- V1 has one local user, no accounts, no public deployment, no remote database, and no multi-user access.
- The app drafts documents and updates the local tracker; it never submits an application, sends email, or posts to an employer portal.
- The selected home screen is **Overview and list**: compact useful totals, a recent/active applications table or list, clear next actions, and a prominent New application action.

## V1 user flow

### Home and tracking

- Show counts for active applications, interviews, and follow-ups due.
- Show a filterable, scannable list with company, role, location/work mode, status, last activity, fit label, and next action.
- Preserve the status vocabulary and tracker format from `.claude/commands/outcome.md` and `job_search_tracker.csv`.
- Application detail presents source/job facts, fit and eligibility notes, timeline/status, and links to local artifacts.

### Profile review

- Load canonical profile data and optionally extract candidate claims from `codex-session-application.md` and user-selected source material.
- Show each proposed fact with a source reference and actions to accept, edit, or skip.
- Do not infer or auto-promote candidate facts from generated application drafts.
- Write accepted facts only to the repository's canonical profile locations and report every changed file.
- Keep personal profile facts local; do not display them in public/client-side routes.

### New application

1. Accept a job URL or pasted posting.
2. For a URL, retrieve the URL the user supplied and run the content through `tools/posting_guard.py`.
3. Show cleaned posting text, detected guard findings, and source quality; require the user to continue if the guard reports a warning.
4. After cleaning, extract only visible links from the cleaned posting. Fetch one level deep only, using unauthenticated requests, HTTPS, public-address checks on every request/redirect, bounded redirects, response size, and timeout. Never fetch hidden links removed by the posting guard. Do not crawl links found on fetched pages.
5. Evaluate the posting against the canonical candidate profile and `.claude/skills/job-application-assistant/04-job-evaluation.md`. Show skills, experience, behavioral fit, eligibility/logistics, evidence gaps, and overall assessment.
6. Require the user to approve proceeding from fit review to generation.
7. Before every Ollama Cloud call, show the destination and a preview/summary of the job and candidate evidence that will be sent. Require an explicit send action. Do not include personal contact details in model requests; insert these locally in document templates.
8. Generate a tailored CV, cover letter, and applicable free-text answers using `.claude/commands/apply.md`, relevant profile skills, and the active document template instructions.
9. Save valid initial materials as drafts, run an independent reviewer pass, revise, then save the reviewed drafts. Flag unsupported candidate claims and ensure research claims point to retrieved sources.
10. Compile the CV and cover letter using the active templates' declared toolchains. Run available PDF layout and ATS/text checks. Clearly report pass/fail and any degraded verification.
11. Archive the cleaned posting and guard metadata, editable drafts and final PDFs, and update `job_search_tracker.csv` to `drafted`. The user reviews and exports the result.

### Interview and follow-up

- When an application is at an interview stage, offer preparation grounded in its archived posting and the exact materials generated for it.
- Support status changes and follow-up notes using the canonical workflow definitions.
- Keep follow-ups as drafts; do not send them.

### Settings

- Show Ollama Cloud configuration status and selected model, plus a connection check.
- The API key is write-only through the local service and is never returned to frontend code or stored in source control.
- Store local secrets in a gitignored local settings file or environment variable.

## Architecture

- Put frontend, local API/service, and app-only dependencies under `app/`; do not add dependencies to the portal CLIs.
- Use a TypeScript browser frontend and a local Node service bound to loopback. Keep all filesystem, network-fetch, and model-provider operations in the service, never in browser code.
- Define narrow application services/interfaces for candidate profile storage, application/tracker storage, posting retrieval/guarding, document generation, and model-provider calls.
- V1 adapters use the existing repository files, tracker, posting guard, templates, and archive paths as the source of truth. Do not add a second database.
- Validate all paths against the repository root and approved application/archive locations; reject traversal and symlink escape.
- Use atomic or staged file writes so a failed archive save does not leave a partially updated tracker or a false `drafted` state.
- Keep the UI decoupled from filesystem layout and provider-specific response formats. This is the migration seam for a future hosted storage/provider adapter, not permission to host candidate data now.
- Keep `127.0.0.1` binding, local-only CORS/origin validation, and request protections explicit. Do not expose the local service on LAN interfaces.

## Future-hosting boundary

Future hosting is a separate phase. Before deployment, add and review authentication, per-user authorization/data isolation, managed secret storage, encrypted database and document storage, retention/deletion controls, remote URL-fetch SSRF protections, audit trails, rate limits, backups, and deployment monitoring. A hosted mode must not reuse the local filesystem adapter or assume the repository is a safe multi-user datastore. No hosted services, credentials, infrastructure, or dependencies are introduced in V1.

## Trust and privacy boundaries

- Job postings and linked pages are untrusted data, never instructions to follow.
- App network fetching must enforce URL scheme, DNS/public IP checks, redirect revalidation, timeouts, and bounded response sizes.
- Candidate data remains local except the exact user-approved evidence sent to Ollama Cloud. Present a preview and explicit consent each time; keep direct contact details local.
- Generated material is untrusted draft content. Validate shape and required sections; reviewer pass checks for unsupported facts before export.
- No application is considered submitted or applied merely because its materials are generated.
- Do not commit personal candidate source material, generated files, settings, or secrets as part of the app implementation.

## Failure behavior

- Invalid/unsafe URL: show the reason and do not fetch it.
- Posting-guard warning: show findings and require a deliberate continue action.
- Partial linked-source failures: identify each failed URL and continue only with allowed, successfully fetched content.
- Missing provider config or provider failure: preserve the posting and fit review so generation can be retried.
- Invalid model response or unsupported claims: do not mark the packet ready; surface issues and allow regeneration/editing.
- Document compile/verification failure: preserve editable sources, report failure, and do not claim the packet is complete.
- File write or tracker failure: report exact paths and preserve retryable state; do not duplicate tracker rows or indicate a successful save.

## Acceptance criteria

- The overview/list screen shows useful counts, statuses, fit labels, and next actions, and opens application details.
- The user can create an application from a pasted posting or URL; a URL is guarded before analysis.
- The app's fetch behavior passes tests for scheme validation, private/loopback IP rejection, redirect revalidation, redirect limits, timeouts, and size limits.
- Fit and eligibility gaps appear before a user can proceed to document generation.
- The user sees the outbound Ollama Cloud data summary and explicitly approves each model call.
- Profile facts imported from a transcript have traceable source excerpts and remain proposed until accepted.
- The app creates, reviews, verifies, archives, and tracks drafts using existing workflow rules and formats.
- App restart/reopen shows state consistent with repository files; there is no separate source-of-truth database.
- The local API only listens on `127.0.0.1` and rejects untrusted browser origins/requests.
- No application submission, email sending, public hosting, account system, or cloud database is present in V1.
- The `master` branch and upstream remote remain unchanged throughout implementation.

## Out of scope

- Hosted deployment or public URL.
- User accounts, multi-user workspaces, or collaborative editing.
- A new database or synchronization layer in V1.
- Automated job-portal scraping/ranking from the UI; CLI scraper workflows remain available.
- Employer application submission, email sending, or automated account creation.
- Changes to the upstream project or upstream repository.
- Replacing the repository's canonical `.claude/` workflow instructions with duplicated app policy.

## Verification plan

- Unit tests for path confinement, tracker parsing/writing, posting guard integration, and URL safety.
- Service tests with mocked network/model providers for success, malformed responses, retries, and timeouts.
- Manual walkthrough of profile review, new application, fit approval, outbound-data preview, draft generation/review, PDF checks, archive, and status update.
- Confirm local-only binding and absence of any remote listener or committed secrets.
- Run existing repository tests and app-specific tests without modifying or requiring the upstream remote.
