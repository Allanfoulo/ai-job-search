# Local Job Application App Design

**Date:** 2026-10-22  
**Status:** Approved design, awaiting spec review

## Goal

Add a local browser app to this repository that combines an application pipeline with a guided, AI-assisted application workflow. Existing repository files and `.claude/` specifications remain the source of truth.

The app will use the prior Codex session transcript as candidate source material. It will present extracted facts with source references and require the candidate to confirm or correct them before changing canonical profile files.

## Users and primary jobs

The single local user needs to:

1. Review and maintain accurate candidate profile facts.
2. Turn a job posting into a fit assessment and a set of tailored application drafts.
3. Track the application through its stages and reopen its archived materials.

## V1 workflow

### Profile import

- Read the existing canonical profile files and `codex-session-application.md`.
- Extract candidate claims from the session transcript with references to their source text.
- Show each proposed fact for accept, edit, or skip.
- Write only accepted facts to the canonical candidate profile files according to the repository's source-of-truth rules.
- Do not treat previously generated application drafts as evidence for candidate claims.

### Create an application

1. The user supplies a job URL or pastes the posting text.
2. For a URL, retrieve that URL only. Run fetched or pasted content through `tools/posting_guard.py` and present the cleaned text and guard result.
3. Extract visible links from the cleaned posting. Fetch all of them automatically, one level deep, using unauthenticated GET requests. Enforce HTTPS, public-address checks on every request and redirect, redirect limits, response size limits, and timeouts. Never fetch links removed by the posting guard as hidden.
4. Analyze the posting against the canonical profile and `.claude/skills/job-application-assistant/04-job-evaluation.md`. Present skills, experience, behavioral fit, eligibility and logistics, source quality, and an overall rating.
5. Require the user to choose to proceed after reviewing the fit assessment.
6. Before each Ollama Cloud request, show the posting and relevant profile evidence that will be sent and identify Ollama Cloud as the destination. Require an explicit send action. Exclude direct contact details from model requests; fill those into documents locally.
7. Generate a tailored CV, cover letter, and posting-specific free-text answers when applicable. Follow `.claude/commands/apply.md` and the relevant candidate profile skill files for factual grounding, language, requirements, writing, document structure, and verification.
8. Automatically save valid first-pass outputs as drafts. Run a separate reviewer pass over the posting and drafts, revise the drafts, then update the saved draft files with the reviewed versions. The reviewer must use the canonical profile sources, identify unsupported claims, and research claims must be traceable to fetched sources.
9. Compile the CV and cover letter using the active templates' declared toolchains and perform the existing PDF layout and ATS text checks. Save final PDFs alongside the sources and present pass/fail results with any degraded verification mode.
10. Update `job_search_tracker.csv` using the existing status vocabulary and archive the cleaned posting with guard metadata. Display paths and save results. Leave the application marked `drafted` for the candidate to review. The app never submits it to an employer.

### Track and prepare

- The home screen is an overview with a compact application list and a prominent “New application” action.
- An application detail page shows the job facts, fit assessment, status, relevant source links, and links to local documents.
- Status updates use the vocabulary already defined by `.claude/commands/outcome.md`; no second vocabulary is introduced.
- When an application reaches an interview stage, offer stage-specific preparation based on the archived posting and the materials prepared for that role. The interview workflow follows `.claude/skills/job-application-assistant/07-interview-prep.md`.

## App architecture

- Add an isolated `app/` TypeScript project so its dependencies do not affect portal-search CLIs.
- Use a browser UI backed by a local Node service bound to `127.0.0.1`.
- Keep all file operations in the local service. Validate every path and restrict reads and writes to the repository root and approved application directories.
- Keep the Ollama Cloud API key server-side in a local, gitignored settings file or environment variable. Never return the key to browser code or persist it in source files.
- Use the existing files as the data store: canonical profile files, `job_search_tracker.csv`, and `documents/applications/<company>_<role>/`. Do not add a second database in V1.
- Load applicable workflow and candidate-grounding instructions from `.claude/` rather than maintaining duplicate policy text in app configuration. Update the canonical web-research guidance with an app-scoped exception for controlled visible-link fetching; keep the existing `/apply` command's link behavior unchanged.
- Reuse `tools/posting_guard.py`, the existing tracker format, archive naming rules, CV and cover-letter templates, and their established compile and verification steps.
- Generate documents in the existing repository formats and locations. Keep the application archive as the source for the job posting and produced materials.

### Main screens

1. **Overview:** active counts, interviews, follow-ups, and a recent-application list.
2. **New application:** posting input, safe-link fetch summary, fit review, Ollama Cloud data preview, and generation progress.
3. **Application detail:** stage, company and role facts, fit notes, links, and generated documents.
4. **Profile review:** source-linked candidate facts proposed from the transcript and other available materials.
5. **Settings:** Ollama Cloud API key status, selected model, and connection check. Secret values are write-only in the UI.

## Data and trust boundaries

- The app writes only to repository-defined profile, tracker, and application archive paths.
- Job postings and linked pages are untrusted third-party data. They are inputs to evaluate, never instructions to execute or obey.
- The app may fetch visible links found in cleaned posting content, as requested. It does not crawl links found on those linked pages (one level only), execute downloaded content, or use authenticated sessions.
- The app-specific link-fetch exception is documented in `.claude/`; the existing command workflow continues to follow its current rule unless the user explicitly changes it.
- The app sends only the user-approved posting and relevant candidate evidence to Ollama Cloud. Direct contact details remain local and are inserted into final documents after generation.
- Generated content is saved as a draft and remains subject to user review. The app does not send forms, emails, or applications to employers.
- Tracker updates and document writes must avoid partial state. If a file write fails, report the error and leave the tracker unchanged for that save operation.

## Failure behavior

- Missing Ollama configuration: explain which setting is missing and keep the user in the current step.
- Ollama Cloud timeout or provider error: retain the user's posting and fit review so generation can be retried.
- Malformed or incomplete model response: do not save it; show the failed artifact and allow regeneration.
- Posting guard warning: show the verdict and findings and require the user to decide whether to continue before fit analysis.
- Unsafe URL, blocked address, excessive redirect, timeout, or oversized linked page: report the link and failure; continue with other successfully fetched sources and the cleaned posting.
- Profile write failure: keep proposed facts available for retry and do not mark them as canonical.
- Tracker/archive write failure: show the exact unsaved artifacts and allow retry without duplicating tracker rows.

## V1 acceptance criteria

- The user can import candidate claims from the session transcript and accept, edit, or skip each claim with its source visible.
- A URL or pasted posting can be evaluated after the integrity guard runs; fit and eligibility gaps are visible before the draft step.
- Visible links in cleaned posting text are fetched automatically within the stated one-level and network limits.
- Before data is sent, the user sees the Ollama Cloud destination and a clear summary of the posting and candidate evidence included in the request.
- After generation returns valid materials, the CV, cover letter, relevant application answers, tracker row, and posting archive are saved automatically in repo-compatible locations and formats.
- The reviewer pass and document checks run before the app reports the pack ready. Both editable sources and compiled PDFs are available in the archive.
- Reopening an application shows the same status and artifacts as reading the repo files directly.
- The user can update application stage and find interview preparation when the stage reaches an interview.
- Missing configuration, provider failure, invalid model output, and file errors do not silently lose the current application or create conflicting tracker state.
- The app does not submit an application externally.

## Out of scope for V1

- Automated job-board scraping or ranking; existing scraper commands remain available.
- Employer portal submission, email sending, or any action that transmits a completed application to an employer.
- Hosted deployment, user accounts, or multi-user access.
- A separate database or sync mechanism.
- Automatic promotion of unreviewed session claims into the candidate profile.

## Verification approach

Use manual acceptance walkthroughs against the criteria above, including one successful application, one provider failure, one blocked/unsafe link, and one interrupted file-write scenario. No tests are added or run as part of the design phase.
