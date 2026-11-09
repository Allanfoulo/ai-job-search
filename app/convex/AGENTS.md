# Convex Backend

## Purpose

Own authentication, workspace-scoped data, actions, mutations, queries, and private-file HTTP routes.

## Ownership

`schema.ts` defines persisted tables; `shared/` owns shared backend logic; `hostedActions.ts` coordinates posting, Ollama, and worker calls; `files.ts` owns private-file operations.

## Local Contracts

- Every user data read or write must enforce the authenticated workspace owner boundary.
- Keep signup/invitation rules in the auth and invitation modules; do not create an admin path into collaborators' private workspaces.
- Keep worker calls HMAC-authenticated and Ollama credentials server-side.
- Keep private-file CORS limited to exact development/production app origins configured for that deployment.
- Use development deployment for feature work. Production must remain separate until explicitly finalized.

## Work Guidance

When changing an action/worker contract, update both sides and preserve input/output validators. When changing private download behavior, update `APP_ORIGINS` guidance in the deployment guide.

## Verification

Deploy to the selected development deployment when backend changes require live availability. Confirm the deployment target before any remote operation.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
