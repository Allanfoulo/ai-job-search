# Runtime Primitives and PDF Themes

## Purpose

Own shared runtime helpers, pdfcn-compatible primitives, color resolution, and PDF theme definitions.

## Ownership

`pdf-primitives.tsx` and `pdf-themes/` define the PDF rendering contract used by the worker; other helpers remain shared within the app source tree.

## Local Contracts

- Keep PDF primitive units and style normalization consistent with the renderer's physical page dimensions.
- Keep theme tokens typed and avoid candidate-specific content or contact details.
- Update `Dockerfile.worker.dockerignore` if a new runtime helper is imported by the PDF renderer.

## Work Guidance

Update dependent PDF components and renderer code when a primitive or theme contract changes.

## Verification

Use existing PDF layout and validation checks when requested.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
