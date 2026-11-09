# Workflow Commands

## Purpose

Own the user-facing slash-command definitions in `.claude/commands/`.

## Ownership

Each command file defines its entry point and points to the canonical skill or methodology that performs the work.

## Local Contracts

- Keep commands thin; shared procedures belong in `.claude/skills/`.
- Preserve command names and referenced paths when editing unless the user requests a workflow change.

## Work Guidance

Update a command and its owning skill together when their contract changes. Add new command files to the parent index only if a child `AGENTS.md` is introduced.

## Verification

Check referenced files and paths after changing a command.

## Child DOX Index

No child `AGENTS.md` files are currently needed.
