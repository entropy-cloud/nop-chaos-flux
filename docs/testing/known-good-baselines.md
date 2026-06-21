# Known-Good Baselines

## Purpose

Record the latest verified project state so future sessions can tell a **new** failure from a **pre-existing** one. This is the durable counterpart of `AGENTS.md`'s full-green commit rule: that rule records green in a commit message; this file records it as a queryable baseline.

## Baselines

| Date                                                              | Source | Git State | Scope | Commands Passed | Known Failures | Evidence | Notes |
| ----------------------------------------------------------------- | ------ | --------- | ----- | --------------- | -------------- | -------- | ----- |
| _<none yet — add the first row when a real full-green run lands>_ |        |           |       |                 |                |          |       |

## Columns

- **Date** — when the run happened (`YYYY-MM-DD`).
- **Source** — who/what ran it (human, goal-driver, CI).
- **Git State** — commit SHA, or `dirty: <files>` if the working tree was not clean.
- **Scope** — `full` (every command in `docs/context/project-context.md`) or a named subset (e.g. `unit+typecheck`, `e2e-only`).
- **Commands Passed** — only commands that actually passed (e.g. `pnpm typecheck && pnpm build && pnpm test`).
- **Known Failures** — accepted, pre-existing failures with reason + evidence; empty if none.
- **Evidence** — log path, run dir (`_tmp/<ts>-goal-driver`), or commit SHA.
- **Notes** — anything odd (flaky, skipped, platform-specific).

## When To Update

- After a full-green run (per `AGENTS.md`, also record in the commit message and `docs/logs/`).
- When a previously-green command starts failing (so the new failure is distinguishable from history).
- When accepted failures change (resolved or newly accepted).

## Rules

- Never mark an un-run command as passed.
- `full` means **all** real commands in `project-context.md`, not a subset.
- A dirty working-tree baseline must name the dirty files; otherwise the baseline is not reproducible.
