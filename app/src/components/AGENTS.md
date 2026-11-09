# Application Components

## Purpose

Own reusable React components used by the app and its document renderer.

## Ownership

`pdf/` owns reusable pdfcn components; application screens live in `app/hosted/`.

## Local Contracts

- Keep components presentation-focused and preserve their current public props.
- Keep PDF component behavior aligned with the theme and primitive contracts in `app/src/lib/`.

## Work Guidance

Update the owning PDF component guidance when shared rendering behavior changes.

## Verification

Use relevant existing build or PDF checks when requested.

## Child DOX Index

- [pdf/AGENTS.md](pdf/AGENTS.md) — reusable PDF layout components.
