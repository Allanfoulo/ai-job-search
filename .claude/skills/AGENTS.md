# Canonical Skills

## Purpose

Own the reusable job-search procedures and methodology under `.claude/skills/`.

## Ownership

Each skill directory owns its `SKILL.md` and the referenced numbered methodology documents. These files remain authoritative over summaries elsewhere in the repository.

## Local Contracts

- Keep the candidate profile and application-writing rules in their canonical skill files.
- Keep portal CLI implementations in `.agents/skills/` and link to them where needed.
- Do not add candidate-specific profile details to generic instructions.

## Work Guidance

When a workflow changes, update its owning skill, any affected command, and related references together. Preserve explicit source links and approval gates.

## Verification

Use existing framework/version checks when requested.

## Child DOX Index

- [job-application-assistant/AGENTS.md](job-application-assistant/AGENTS.md) — candidate methodology and application-writing workflow.
- [job-scraper/AGENTS.md](job-scraper/AGENTS.md) — portal-search orchestration and scraper state rules.
- [upskill/AGENTS.md](upskill/AGENTS.md) — canonical upskilling workflow.
