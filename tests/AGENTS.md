# Repository Tests

## Purpose

Own the existing automated checks for repository tools, workflows, documents, and app behavior.

## Ownership

Each test file owns checks for the corresponding module or contract.

## Local Contracts

- Keep tests isolated from real candidate records, credentials, external accounts, and live application submissions.
- Prefer fixtures and temporary files over repository user data.
- Do not change a test to hide a behavior regression; update it only when the contract intentionally changes.

## Work Guidance

Add tests only when requested or when required by an approved implementation plan. Use relevant existing checks for the changed subsystem.

## Verification

Run only the applicable existing checks when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
