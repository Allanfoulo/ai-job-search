# Hosted Northstar Application Visual Design

**Product kind:** authenticated job application workspace (software)  
**Design direction:** Guided workflow (Visual Companion option C)  
**Status:** Design approved; awaiting written spec review before implementation

## Goal

Give the hosted Northstar app a polished, distinctive visual system that makes the application workflow easy to understand at a glance. Cover sign-in, the workspace overview, applications and files, candidate profile, settings, and the new application flow. Preserve the current product identity and all current behavior.

## Current product context

The hosted client is a React/Vite app in `app/hosted`. `App.tsx` owns authentication presentation and the overview, application list, profile, settings, and four-stage new application flow. `styles.css` contains the existing green palette, fixed desktop sidebar, page panels, forms, tables, workflow states, and mobile layout. Convex provides the current private workspace data and mutations. The hosted app is deployed from the `features/UI-design-one` feature branch.

The real workflow is Posting -> Source check -> Fit review -> Draft pack. It includes user consent before Ollama Cloud calls, fit eligibility gates, error and loading feedback, auto-saving generated pack files, and a completion state that links to application files. The profile remains an editable canonical Markdown profile. Settings include provider configuration and local workspace import controls.

## Design approach

Use the **Guided workflow** direction chosen in the Visual Companion. Retain the pale canvas and forest-green identity, while improving hierarchy and making the next useful action obvious. The overview leads with a prominent "Start a tailored application" action, a compact progress cue, application/interview counts, recent roles, and profile readiness. The four existing application stages receive a clear, persistent step indicator and stronger stage headings. Consent, eligibility blocks, loading, errors, and completed PDFs each have distinct, readable treatments.

Use a consistent heading and body type system, deliberate spacing, aligned page edges, one button family, a restrained radius and shadow scale, and legible status colors. Load the selected fonts explicitly with sensible system fallbacks. Keep the interface focused on the real app: no stock imagery or decorative marketing sections. Motion is limited to brief control feedback and subtle transitions; respect reduced-motion preferences.

## Screen treatments

- **Sign-in and account creation:** Align the brand mark, background, form card, field labels, and primary action with the workspace visual system. Keep invitation-only copy, authentication flow, and current validation/error behavior.
- **Overview:** Put the next step first, followed by clear progress metrics and recent applications. Keep profile readiness and existing navigation actions visible without adding new data or workflow rules.
- **Applications and files:** Improve the table/list hierarchy, search and status controls, empty states, document rows, upload affordance, and download actions. Keep all current records, filters, updates, uploads, and downloads.
- **Candidate profile:** Make the Markdown editor, revision/saved state, guidance, discard, and save controls easier to scan. Keep the editor and profile data model unchanged.
- **Settings:** Group the existing provider, import, and related workspace controls into clear panels with visible labels and feedback. Preserve their current behavior and access controls.
- **New application:** Make Posting, Source check, Fit review, and Draft pack visibly distinct stages, with a persistent stepper, clear primary and back actions, and readable consent, error, loading, gate, and completion states. Keep existing requests, user approvals, eligibility checks, PDF rendering, and save behavior unchanged.
- **Responsive layout:** At tablet and mobile widths, retain the current navigation destinations and keep forms, step progress, tables, status labels, and primary actions usable. Stack panels and form fields cleanly, allow tables to scroll within their own region, and avoid fixed overlays obscuring workflow content.

## Boundaries

- Visual refinement only. No Convex schema, backend, authentication, AI provider, data flow, copy-policy, workflow, or permission changes.
- Do not introduce new product features or new tracking fields.
- Keep the implementation in the existing React/Vite app and its current component structure unless a small presentation-only extraction materially improves reuse.
- Keep unrelated working-tree changes and generated application documents untouched.

## Quality and accessibility

- Maintain semantic heading order, visible field labels, accessible names for icon-only controls, keyboard operation, and clear focus indicators.
- Use adequate contrast for text, actions, statuses, disabled controls, and focus rings.
- Keep interaction targets comfortable on touch screens and preserve reduced-motion preferences.
- Verify all requested screens, empty/loading/error/completion states, and representative desktop, tablet, and mobile widths in the running app.
- Run the hosted app build and the Impeccable detector on changed UI files. Do not add or run a test suite as part of this visual pass.
- Review the rendered UI at the target viewport sizes and resolve any layout or console errors found during the visual check.

## Implementation outline after spec approval

1. Inspect the existing hosted app source and current runtime data without changing behavior.
2. Refine shared design tokens, typography, navigation, buttons, panels, fields, tables, statuses, and responsive rules.
3. Apply the shared system to sign-in, overview, applications/files, profile, settings, and all new-application states.
4. Build and visually review desktop, tablet, and mobile layouts; fix issues found.
5. Run `impeccable detect --json` once for the changed UI targets and report results and any remaining limitations.
