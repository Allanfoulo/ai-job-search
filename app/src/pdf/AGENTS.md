# Application PDF Renderer

## Purpose

Own the structured CV and cover-letter PDF layouts rendered with pdfcn components and Takumi.

## Ownership

`render-application-pdf.tsx` composes documents. Shared primitives, themes, and components live in the corresponding `app/src/lib/` and `app/src/components/pdf/` directories.

## Local Contracts

- Keep renderer input aligned with reviewed document schemas and confirmed contact data.
- Preserve CV and cover-letter page limits and PDF verification performed by the worker.
- Do not add unsupported candidate claims or hard-code candidate contact details.

## Work Guidance

Update the worker Docker allowlist when adding runtime imports outside the existing renderer subtree.

## Verification

Use the existing PDF validation and layout checks when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
