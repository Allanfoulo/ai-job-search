# Application Scripts

## Purpose

Own build-time prompt generation and worker-side Python adapters.

## Ownership

`build-hosted-prompts.mjs` assembles generated Convex prompts from canonical `.claude/` files. Posting and robots adapters call the repository's shared helpers under `tools/`.

## Local Contracts

- Do not edit generated `convex/prompts.generated.ts` directly.
- Keep worker adapters narrow and use the shared implementations in `tools/` instead of copying their logic.
- Avoid adding candidate archives or local app settings to build inputs.

## Work Guidance

If a script's inputs, outputs, or side effects change, update the worker or deployment documentation that invokes it.

## Verification

Use the relevant script's existing checks when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
