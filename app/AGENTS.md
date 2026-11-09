# Application Workspace

## Purpose

Own the local application workspace and the separate hosted Northstar application.

## Ownership

- `convex/` owns hosted backend functions, auth, data schema, and HTTP endpoints.
- `hosted/` owns the hosted React client.
- `src/` owns the local Node app, hosted worker, and shared PDF rendering code.
- `scripts/` owns build and runtime helper scripts.
- `HOSTED-DEPLOYMENT.md` is the operational setup guide.

## Local Contracts

- The hosted app and local app have separate entry points; preserve their distinct build and runtime configurations.
- Hosted accounts use isolated private workspaces. Preserve owner checks on every private data and file operation.
- Keep Convex development separate from production. Do not put secrets in frontend code, local exports, or Docker build context.
- Keep generated Convex prompts derived from the canonical `.claude/` source files; do not edit generated prompt output directly.

## Work Guidance

Read the relevant child contract before changing a subsystem. Update `HOSTED-DEPLOYMENT.md` when environment variables, deployment steps, or host boundaries change.

## Verification

Use the relevant app build or deployment checks when requested.

## Child DOX Index

- [convex/AGENTS.md](convex/AGENTS.md) — hosted backend and private data boundaries.
- [hosted/AGENTS.md](hosted/AGENTS.md) — hosted user interface.
- [scripts/AGENTS.md](scripts/AGENTS.md) — prompt and runtime helper scripts.
- [src/AGENTS.md](src/AGENTS.md) — local server, worker, and PDF renderer.
