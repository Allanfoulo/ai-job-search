# Local Application UI

This is a local-only UI for the existing AI job-search repository. It reads the canonical `job_search_tracker.csv`, archives drafts under `documents/applications/`, and runs the repository's posting guard. It does not fetch posting URLs, call an AI provider, generate application documents, or submit applications.

## Run

Requirements: Node.js 20+ and Python 3.10+ available as `python` (Windows) or `python3` (macOS/Linux).

```sh
cd app
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The API binds to `127.0.0.1:4178`; do not expose it to a network. Use `npm test` for storage tests and `npm run build` for a production build.

## Data behavior

- The tracker and application archives remain the source of truth; no second database is created.
- Saving a draft creates an archive folder and a `drafted` tracker row only after the user selects **Save local draft**.
- Existing archive folders and candidate information are ignored by Git as configured in the repository.
- AI assessment, document generation, profile editing, URL retrieval, and employer submission are not implemented in this first UI slice.
