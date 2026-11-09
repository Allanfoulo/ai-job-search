# Canonical Workflows and Agent Instructions

## Purpose

Own the canonical job-search workflows, shared writing rules, and specialist-agent prompts.

## Ownership

- `commands/` defines user-facing workflow entry points.
- `skills/` owns the detailed workflow and candidate methodology.
- `agents/` contains task-specific helper prompts.

## Local Contracts

- This directory is the single source of truth for candidate/application workflow behavior under the root thin-pointer design.
- Keep candidate-specific facts in the designated profile files, not in duplicated instructions elsewhere.
- Portal-search implementations live in `.agents/skills/`; this directory may orchestrate them but should not duplicate their CLI implementation details.

## Work Guidance

Update indexes and cross-references when a command, skill, or specialist agent is added, removed, or renamed. Keep these instructions focused on file ownership; the individual workflow files own their detailed procedures.

## Verification

Use the existing framework/version and security checks when requested or when the edited workflow requires them.

## Child DOX Index

- [commands/AGENTS.md](commands/AGENTS.md) — slash-command entry points and cross-links.
- [skills/AGENTS.md](skills/AGENTS.md) — canonical skills and methodology.
- [agents/AGENTS.md](agents/AGENTS.md) — specialist agent prompts.
