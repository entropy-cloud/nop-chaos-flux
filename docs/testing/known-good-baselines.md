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

## e2e Failure Ledger

The authoritative per-item attribution of the current e2e red baseline (not a full-green record; kept here as the queryable counterpart for "is this failure new?"):

- **2026-10-26 full run** (`E2E_EXCLUDE_WATCH_ONLY=1`, HEAD ~`309a3a567`): expected 1643 / unexpected 248 / flaky 3 / skipped 46 — ledger: `docs/testing/e2e-baseline-ledger.md` (plan 762; A 类=0, 247/248 isolated-rerun stable red). A failure matching a ledger entry with a category + pointer is **known**; anything else is **new** and must be triaged per the ledger's category rules.

## Mutation Baselines

These are **point-in-time measurement records** of the mutation-testing device, refreshed whenever the device (stryker/vitest versions, configs) or a scope changes. They are exempt from the full-green Baselines table Rules above — a mutation baseline is valid when the device passes its canary self-check (`pnpm audit:mutants:canary` exit 0), not when a full-green run lands. Never compare scores across device versions (the pre-fix stryker 9.6.1 device produced invalid scores; see P1-MA4.5-001 / P1-MA4.1-009). Tests/mutant = mean testsCompleted per tested mutant computed from `reports/mutation/mutation.json`; stryker clear-text prints a different average for the same run (closure audit m1).

| Date       | Scope                                                                                                | Mutants | Killed | Survived | NoCov | Score                       | Tests/mutant | Canary                             | Command                                                                             | Commit                                            | Boundary                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------- | ------- | ------ | -------- | ----- | --------------------------- | ------------ | ---------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-24 | flux-runtime/src/validation (excl. index.ts) — canonical scope (supersedes the invalid M0 1.63% row) | 493     | 266    | 137      | 90    | **53.96%** (covered 66.00%) | 8.88         | PASS (0 false survivors)           | `pnpm audit:mutants`                                                                | fdc641adb (device: stryker 10.1.1 + vitest 5.0.1) | per-file: rules.ts 0% (10/10 NoCoverage — the registered 18-line zero-coverage file), message.ts 31.48% weakest covered file; threshold break=60 exits non-zero by design |
| 2026-10-24 | flux-runtime/src/validation/validators.ts — canary/determinism slice                                 | 317     | 177    | 79       | 61    | 55.84% (covered 69.14%)     | 5.08         | PASS (2 killed, 0 false survivors) | `pnpm audit:mutants:canary`                                                         | fdc641adb                                         | determinism 3/3 identical runs (pre-fix device drifted 0.28–217.85 tests/mutant); email-canary sabotage check flips exit 1                                                |
| 2026-10-24 | flux-formula/src (excl. index.ts, tests) — audit-named scope                                         | 3190    | 2093   | 767      | 325   | **65.61%**                  | 44.83        | PASS (0 false survivors)           | `npx stryker run stryker.formula.conf.mjs --plugins @stryker-mutator/vitest-runner` | fdc641adb                                         | registration-only: `thresholds.break: null`; 3min runtime                                                                                                                 |

## Rules

- Never mark an un-run command as passed.
- `full` means **all** real commands in `project-context.md`, not a subset.
- A dirty working-tree baseline must name the dirty files; otherwise the baseline is not reproducible.
