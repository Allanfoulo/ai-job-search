# pdfcn Application Document PDFs

**Date:** 2026-10-24  
**Status:** Approved for spec review; implementation pending  
**Scope:** Automatically create PDF copies of generated CVs and cover letters.

## Goal

Every successfully generated application has a submit-ready CV PDF and cover letter PDF saved in its local application archive. The app uses pdfcn components with the Takumi PDF renderer, keeps editable LaTeX sources, and does not require a machine-wide LaTeX installation to make the PDFs.

The user selected CV and cover-letter PDFs only. The app will not create a combined application packet PDF.

## Current behavior

The local Node service asks Ollama Cloud for complete LaTeX sources, saves those sources in the repository and per-role archive, then invokes `lualatex` for the CV and `xelatex` for the cover letter. This fails on machines without those executables. The application detail screen already lists archived PDF files automatically.

The app uses a vanilla JavaScript interface and a TypeScript Node server. pdfcn is a React component registry whose Takumi components render through the `takumi-pdf` WebAssembly runtime. Therefore the change adds a small React based renderer inside the app rather than converting the main application UI to React.

## Proposed design

### Document content and editable sources

- Change the generation response contract to provide structured, reviewed CV and cover-letter content in addition to the editable LaTeX sources.
- Keep the structured content as the single content source for PDF rendering and LaTeX source generation. This prevents the PDF and `.tex` files from drifting.
- Render the LaTeX sources locally from the reviewed content using the existing CV and cover-letter template rules. Keep the current archive filenames and root `cv/` / `cover_letters/` source locations.
- Keep application answers, fit assessments, posting archives, and research links in their current text formats. No PDFs are generated for these materials in this scope.

### PDF rendering

- Add a small Node renderer using React, pdfcn's Takumi components, and the Takumi PDF runtime.
- Run the renderer as an isolated TSX worker so the app's existing vanilla JavaScript UI and lightweight Node server remain unchanged. Pass content through the app's file-backed child-process handoff to work on Windows without depending on piped child-process I/O.
- Use the pdfcn document primitives for A4 pages, headings, sections, text, lists, links, and page footers. The renderer runs locally in Node and writes PDF bytes to the role archive; it does not open a browser or send document contents to another service.
- Create `cv_draft.pdf` and `cover_letter.pdf` in `documents/applications/<company>_<role>/` after the reviewed content is saved.
- Target the existing document rules: a two-page CV and one-page cover letter. Keep text selectable for ATS ingestion and links usable.
- The existing application detail view will expose these files through its current archive file list.

### Failure handling and progress

- A generation job is complete only after both PDFs are written and pass the existing PDF validation checks for page count and extractable text.
- If PDF rendering or validation fails, preserve the editable LaTeX files and report which PDF failed and why. Do not report the application pack as ready.
- Update generation progress labels so the user can see the PDF rendering stage.
- Preserve the current behavior that the app saves drafts locally and never submits them to an employer.

## Components and responsibilities

| Component | Responsibility |
|---|---|
| Generation and reviewer prompts | Produce one structured content model for each document and ensure reviewed wording is used by both renderers. |
| Local document builders | Convert reviewed CV and cover-letter models into the existing editable LaTeX source formats. |
| pdfcn/Takumi renderer | Render the same reviewed content models into selectable, paginated PDFs. |
| Application archive | Store `.tex` and `.pdf` files together under each role folder. |
| Existing application detail view | Link to the new PDFs alongside the existing archived materials. |

## Dependencies

- Add React, the TSX worker runtime, and the Takumi PDF runtime needed for the renderer.
- Add the selected pdfcn/Takumi components through the pdfcn registry and keep their source in the app so output does not depend on registry availability at runtime.
- Update the app setup instructions to install the renderer dependencies once. Runtime PDF generation remains local and offline.

## Verification

- Confirm the Node PDF renderer writes valid, non-empty PDF files for a representative CV and cover letter.
- Confirm the CV has two pages, the cover letter has one page, and both have selectable text and the expected headings, links, and contact fields.
- Confirm application details displays the two PDF links and the editable `.tex` files remain present.
- Confirm a renderer or validation failure leaves the `.tex` sources intact and returns a clear failed job status.

No separate packet PDF, PDF UI redesign, or employer submission is in scope.

## References

- pdfcn repository: <https://github.com/shadcn-labs/pdfcn>
- pdfcn installation: <https://www.pdfcn.dev/docs/installation>
- Takumi PDF generation and Node runtime: <https://takumi.kane.tw/docs/pdf>
