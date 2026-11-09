# GitHub Actions Workflows

## Purpose

Own automated repository workflows under `.github/workflows/`.

## Ownership

Each workflow file defines its triggers, jobs, and required permissions.

## Local Contracts

- Grant only the permissions required by each job.
- Do not print tokens, secrets, candidate records, or private application material to logs.
- Keep scheduled update workflows read-only unless their explicit job requires a narrowly scoped write.

## Work Guidance

Update the relevant repository documentation when triggers or automation outputs change.

## Verification

Validate YAML and referenced script paths using existing repository checks when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
