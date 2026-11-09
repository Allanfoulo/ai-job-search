---
framework_version: 1.0.0
---

# Agent Guidelines: AI Job Search

This workspace manages job-search workflows, portal tools, candidate materials, and the local and hosted application.

## DOX contract

- `AGENTS.md` files apply to their directory and all descendants. Read this file and every applicable child file before editing.
- The nearest `AGENTS.md` gives area-specific guidance. Parent guidance still applies; a child cannot weaken it.
- Keep these files concise and operational. Update the nearest owner and affected indexes when structure, responsibilities, contracts, or durable workflows change.
- Do not record candidate-specific facts, credentials, tokens, or temporary session notes in these files.
- DOX is Markdown guidance only; this repository has no DOX runtime or package dependency.

## Single sources of truth

This workspace uses a thin-pointer design to prevent workflow and profile drift across agent frameworks.

1. **Candidate profile:** Contact details, education, skills, and job preferences are maintained in [CLAUDE.md](CLAUDE.md) and the profile methodology under [.claude/skills/job-application-assistant/](.claude/skills/job-application-assistant/), especially `01-candidate-profile.md`.
2. **Application workflows:** Setup, search, ranking, applications, upskilling, and interviews are specified in [.claude/](.claude/). Treat those files as canonical; local DOX files may point to them but must not duplicate their rules.
3. **Portal search skills:** Portable portal search skills and their CLIs live in [.agents/skills/](.agents/skills/). The canonical job-scraper workflow in `.claude/skills/job-scraper/` orchestrates them.
4. **Application code:** The local and hosted app responsibilities and deployment boundaries are indexed under [app/AGENTS.md](app/AGENTS.md).

## Privacy and deployment boundaries

- Candidate records, CVs, cover letters, application packs, and local app settings are private workspace data. Read only what the task requires and do not copy their contents into agent instructions.
- Keep API keys, auth codes, worker secrets, and local settings out of source control and deployment artifacts.
- Keep Convex development and production deployments separate. Do not redirect or deploy production while working on development tasks.

## DOX closeout

After meaningful work, check whether the nearest local contract or its parent index needs updating. Keep indexes aligned with actual child `AGENTS.md` files. Run only relevant existing verification when requested or required by the task.

## Child DOX Index

- [.agents/AGENTS.md](.agents/AGENTS.md) — portable agent skills and their CLIs.
- [.claude/AGENTS.md](.claude/AGENTS.md) — canonical commands, skills, and specialist agents.
- [.github/AGENTS.md](.github/AGENTS.md) — repository automation and contribution templates.
- [app/AGENTS.md](app/AGENTS.md) — local/hosted application and backend boundaries.
- [cover_letters/AGENTS.md](cover_letters/AGENTS.md) — local cover-letter sources and naming.
- [cv/AGENTS.md](cv/AGENTS.md) — local CV sources and naming.
- [documents/AGENTS.md](documents/AGENTS.md) — private candidate and application records.
- [docs/AGENTS.md](docs/AGENTS.md) — project documentation and design specifications.
- [job_scraper/AGENTS.md](job_scraper/AGENTS.md) — scraper state and generated data.
- [tests/AGENTS.md](tests/AGENTS.md) — existing repository verification.
- [tools/AGENTS.md](tools/AGENTS.md) — repository utility scripts.
