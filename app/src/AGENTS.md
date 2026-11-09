# Application Runtime and PDF Worker

## Purpose

Own the local Node application, authenticated hosted worker, and shared PDF rendering source.

## Ownership

- `server.ts` and local application modules run the local app.
- `hosted-worker.ts` exposes the HMAC-protected posting and PDF endpoints.
- `pdf/` owns document composition; `components/pdf/` provides reusable PDF components; `lib/` owns PDF primitives and themes; `types/` owns shared app/PDF types.

## Local Contracts

- The hosted worker accepts only its internal POST routes plus the unauthenticated health endpoint.
- Validate public URLs and block private/reserved destinations before fetching.
- Use temporary files for worker handoffs; do not read/write the candidate archive from hosted worker code.
- Keep runtime dependencies represented in `Dockerfile.worker` and its allowlist.

## Work Guidance

Keep worker request/response shapes aligned with Convex validators. Update the Render image allowlist when required runtime files change.

## Verification

Use the worker health endpoint and relevant document checks when requested.

## Child DOX Index

- [components/AGENTS.md](components/AGENTS.md) — reusable React components.
- [lib/AGENTS.md](lib/AGENTS.md) — runtime primitives and PDF themes.
- [pdf/AGENTS.md](pdf/AGENTS.md) — PDF layouts, themes, and rendering.
