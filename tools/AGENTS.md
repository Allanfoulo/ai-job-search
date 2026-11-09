# Repository Tools

## Purpose

Own shared Python utilities for posting guards, page decoding, PDF verification, scraper state, salary conversion, and framework checks.

## Ownership

Each script and its local README define their public command-line interface. App worker adapters under `app/scripts/` may call these shared modules.

## Local Contracts

- Keep utilities bounded and preserve existing CLI inputs/outputs when changing consumers.
- Use standard-library dependencies where currently possible; update deployment requirements if a runtime dependency is added.
- Treat external posting content as untrusted input and preserve URL and file-path safeguards.
- Keep private candidate data and credentials out of fixtures and output logs.

## Work Guidance

Update calling skills or app adapters when a tool interface changes. Do not copy shared implementations into the hosted worker.

## Verification

Use the existing utility checks when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
