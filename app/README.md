# Northstar Application Workspace

The repository currently contains two app entry points:

- **Local workspace:** the established app that reads and writes the job-search repository on your computer.
- **Hosted workspace:** a React/Vite client backed by Convex Auth and Convex, with invite-only sign-in, isolated per-account data, profile editing, application tracking, private file storage, and an explicit local-data import preview.

The hosted frontend and Convex backend are separate deployments. The hosted workspace does not read local repo files directly. It only receives existing data after you download a local export, review it in the hosted app, and confirm import.

## Run

From the repository root:

```powershell
pnpm --dir app install
node --experimental-strip-types app/src/server.ts
```

Open `http://127.0.0.1:4173`. The service binds to loopback only. Keep the repository open while using the app because it reads the profile, templates, tracker, and application archives directly.

## Hosted workspace development

Install dependencies after the package store is available:

```powershell
pnpm --dir app install
```

Copy `.env.example` to `.env.local` and set the Convex deployment URL and Convex site URL. Configure Convex Auth's password provider, owner email, and invite settings as described in [HOSTED-DEPLOYMENT.md](HOSTED-DEPLOYMENT.md). Then run the Convex development deployment and frontend in separate terminals:

```powershell
pnpm --dir app convex:dev
pnpm --dir app dev:hosted
```

The hosted app opens at `http://127.0.0.1:4174`; the local workspace remains at `http://127.0.0.1:4173`. Use a separate Convex production deployment from development. See [HOSTED-DEPLOYMENT.md](HOSTED-DEPLOYMENT.md) for account setup, environment values, invitations, and production hosting.

The hosted app includes account-scoped profiles, applications, profile editing, local workspace export/import, private file storage, posting preparation, fit assessment, Ollama draft/review, and automatic pdfcn/Takumi CV and cover-letter PDFs. Interview preparation and transcript-evidence extraction remain available in the local app.

## Importing the existing workspace

1. Open the local app at `http://127.0.0.1:4173` and go to **Settings**.
2. Choose **Download workspace export**. The resulting JSON contains the canonical candidate profile, tracker rows, and supported application archive files.
3. Sign in to the hosted app, open **Settings → Import your local workspace**, and choose the JSON file.
4. Review the profile, application, duplicate, and file counts. Confirm only when they look right.

The import copies files into the signed-in account. It does not modify or delete local files. Each collaborator must use their own export to populate their separate workspace.

## Ollama Cloud

Open **Settings**, enter an Ollama Cloud API key and model, then save. The key is stored in `.application-app.settings.json`, which is gitignored. Before every request that includes your application data, the app identifies what it will send to Ollama Cloud.

For posting pages, this app has the narrowly scoped link-fetch exception documented in `.claude/skills/job-application-assistant/09-web-research.md`. Other repository workflows keep their existing link policy.

## Storage

- Candidate profile: `CLAUDE.md` and `.claude/skills/job-application-assistant/01-candidate-profile.md`
- Application tracker: `job_search_tracker.csv`
- Tailored LaTeX sources: `cv/` and `cover_letters/`
- Per-role archive: `documents/applications/<company>_<role>/`
- Each generated application automatically includes a tailored CV PDF and cover-letter PDF, rendered locally with pdfcn/Takumi. Editable `.tex` sources are kept alongside them.
- Generated files use `<Role> - <Company> - <Candidate Name> - <Artifact Type>.<extension>` names, including CVs, cover letters, fit assessments, postings, answers, research sources, and interview-prep notes.

The session transcript is gitignored personal source material. Accepted claims are appended to the canonical candidate profile with an evidence excerpt.
