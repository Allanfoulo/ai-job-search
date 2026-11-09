# Reusable PDF Components

## Purpose

Own reusable pdfcn-compatible components used by the CV and cover-letter renderer.

## Ownership

Component folders own their implementation and styles. `app/src/lib/pdf-primitives.tsx` owns shared rendering primitives; `app/src/lib/pdf-themes/` owns shared tokens and presets.

## Local Contracts

- Preserve pdfcn/Takumi-compatible props and theme resolution.
- Keep candidate facts out of components; render only the structured document supplied by the caller.
- Avoid adding runtime dependencies without updating the worker Docker build and allowlist.

## Work Guidance

Keep component APIs small and update the renderer if a prop or output contract changes.

## Verification

Use existing PDF layout and validation checks when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed; component folders remain small, self-contained units.
