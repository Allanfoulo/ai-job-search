# Application Pack Retry Design

## Goal

Let Allan retry a drafted or tracked application that does not yet have a downloadable tailored CV and cover letter, without creating a duplicate application record.

## User flow

Each application row shows **Retry pack** when its saved files do not include both a tailored CV PDF and tailored cover-letter PDF. Applications with both PDFs do not show the action. Selecting Retry pack opens the existing application workflow for that application.

The workflow resumes from its saved state:

- If a posting check is saved, reuse its posting text, source URL, guard result, and fetched links.
- If a current fit assessment exists for the current candidate-profile revision, show it and continue to pack generation.
- If the fit assessment is missing or stale, ask the user to approve a new assessment before sending the profile and posting to Ollama Cloud.
- If there is no saved posting check, open the posting form with the application company and role filled in, and use the saved application source as the initial URL when available. Ask the user to provide posting text or a URL when no source is saved.
- Keep the existing explicit Ollama approval before generating and reviewing documents. Keep the current source-check and generation error messages and retry actions attached to the selected application.

Generation writes files to the selected application using the existing filenames and replacement behavior. A retry therefore replaces same-named outputs instead of creating another tracker entry. Once both required PDFs are saved, the row action disappears.

## Approaches considered

1. **Retry action on the application row (selected).** It keeps recovery close to the role with missing files, works one application at a time, and preserves per-role review and Ollama approval.
2. **Select multiple applications and retry them together.** Rejected for this version because each role may need different posting input and a separate AI data-transfer approval.
3. **Manually restart through New application pack.** Rejected because it makes it easy to create a duplicate tracker record and requires the user to re-enter information already saved.

## Implementation

- Add a private, authenticated file-summary query that reports whether an application has both required PDF artifact types.
- Add a **Retry pack** action to rows missing either required PDF.
- Pass the selected application ID into the existing pack workflow and initialize company, role, source, saved workflow, and fit state from Convex.
- Resume at the earliest incomplete or stale workflow stage; never infer consent from prior approvals.
- Keep generated files and workflow data scoped to the authenticated account.

## Failure behavior

- Missing posting content asks for a URL or pasted job description before source preparation.
- A failed source check remains on the selected role and offers **Retry source check**.
- A failed fit request or pack generation shows the error and allows retry without creating another application.
- Partial output remains attached to the application. The retry action remains until both required PDFs are present.
- Existing files with the same generated names are replaced using current storage behavior; other distinct files remain available.

## Acceptance criteria

- An application without a tailored CV PDF or tailored cover-letter PDF shows **Retry pack**.
- An application with both PDFs does not show the retry action.
- Retrying a role does not create another application record.
- Saved posting and current fit data are reused; missing or stale stages are completed with explicit approval where required.
- Missing posting content can be supplied from the retry flow.
- After successful generation, the CV PDF and cover-letter PDF appear in that role's file list and the retry action disappears.
- Retry errors identify the selected application and allow another attempt.
- Other accounts cannot read or retry this application's data.

## Validation

Build the hosted application and run TypeScript checking. Do not run a test suite unless requested.
