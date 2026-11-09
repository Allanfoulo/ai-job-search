# Project Documentation

## Purpose

Own durable project guides, architecture decisions, and design specifications under `docs/`.

## Ownership

`superpowers/specs/` contains design documents; operational guides remain near the subsystem they describe unless they are repository-wide.

## Local Contracts

- Keep implemented behavior authoritative in source code and operational configuration; use docs to explain stable contracts and decisions.
- Do not copy canonical candidate-profile or workflow rules into design documents.
- Remove stale design guidance when implementation changes invalidate it.

## Work Guidance

Update the owning spec or guide when architecture or deployment behavior changes. Keep indexes aligned with child documentation boundaries.

## Verification

Check links and file paths after moving or renaming documentation.

## Child DOX Index

- [superpowers/AGENTS.md](superpowers/AGENTS.md) — brainstorming artifacts and design specifications.
