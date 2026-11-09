# Job Scraper Data

## Purpose

Own scraper-generated state and local search outputs in `job_scraper/`.

## Ownership

The canonical scraping procedure lives in `.claude/skills/job-scraper/`; portal-specific search behavior lives in `.agents/skills/`.

## Local Contracts

- Treat cached postings, identifiers, and search history as user data.
- Keep generated state out of source control according to the root ignore rules.
- Do not duplicate workflow or portal instructions here.

## Work Guidance

Change the owning skill when scraper workflow changes; change local data layout only when its consumer is updated.

## Verification

Use existing state/security checks when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
