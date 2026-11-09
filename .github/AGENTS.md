# GitHub Repository Automation

## Purpose

Own repository CI, issue and pull-request templates, and contribution support files.

## Ownership

Workflow YAML belongs in `.github/workflows/`; issue and pull-request templates stay in their corresponding folders.

## Local Contracts

- CI must not expose secrets in logs or commit workflow-generated candidate data.
- Keep workflow triggers and branch behavior consistent with the repository's feature-branch workflow.

## Work Guidance

When a workflow changes, review its permissions, triggers, and referenced scripts. Keep documentation aligned with the actual workflow.

## Verification

Use existing CI checks when requested.

## Child DOX Index

- [workflows/AGENTS.md](workflows/AGENTS.md) — GitHub Actions workflow contracts.
