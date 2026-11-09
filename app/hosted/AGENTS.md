# Hosted React Client

## Purpose

Own the browser-based Northstar workspace UI and its interaction with Convex.

## Ownership

`src/` contains the client screens and workflow forms. Convex owns authorization and persisted state; this client owns presentation and user interaction.

## Local Contracts

- Never place Ollama keys, worker HMAC secrets, or service credentials in browser code.
- Keep private file downloads authenticated and use the configured Convex site URL.
- Show consent before sending profile and application content to Ollama Cloud.
- Preserve retry paths for failed posting checks and incomplete application packs.

## Work Guidance

Keep user-facing copy concise. Update the hosted UI build/configuration when client entry points or deployment variables change.

## Verification

Use the hosted frontend build when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
