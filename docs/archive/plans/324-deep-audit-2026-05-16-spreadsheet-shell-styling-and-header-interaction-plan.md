# 324 Deep Audit 2026-05-16 Spreadsheet Shell Styling And Header Interaction Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{10-styling.md,11-ui-components.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/296-deep-audit-2026-05-15-public-css-slot-and-facade-contract-plan.md`

## Purpose

收口 spreadsheet shell styling / header interaction surface：canvas stylesheet 仍含 package 外泄选择器、header 基础样式重复冲突、样式仍依赖 `Input` 内部 DOM，且 interactive headers 仍把原生 `<th>` 当控制体。

## Current Baseline

- `10-*` 与 `11-01` 共享 spreadsheet shell / header semantics surface。
- 这些条目不属于 Plan `296` 已 closure 的 `default-spacing.css` / facade stylesheet surface。

## Goals

- Root spreadsheet shell styles to spreadsheet-owned selectors and stable slots.
- Collapse header base styling to one supported baseline.
- Carry header interaction semantics through supported UI primitives.

## Non-Goals

- 不接管 spreadsheet command result fidelity。
- 不重构 spreadsheet core canvas rendering。

## Scope

### In Scope

- `10-01`
- `10-02`
- `10-03`
- `10-04`
- `11-01`
- `packages/spreadsheet-renderers/src/{canvas-styles.css,spreadsheet-grid.tsx}`
- focused tests and relevant docs

### Out Of Scope

- `06-01`
- `06-03`
- `06-04`

## Execution Plan

### Phase 1 - Freeze Shell Styling Baseline

Status: completed
Targets: touched stylesheet / grid files, focused tests/docs

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit the exact overlap with Plan `296` and record why these are spreadsheet-shell residuals rather than reopened facade/default-spacing work.
- [x] Add or update focused proof for selector scope, token contract, and header interaction behavior.

Exit Criteria:

- [x] The plan records a clean boundary against Plan `296`.
- [x] Focused proof exists for all in-scope styling / interaction residuals.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Shell Styling And Header Interaction Fixes

Status: completed
Targets: `packages/spreadsheet-renderers/src/{canvas-styles.css,spreadsheet-grid.tsx}`

- Item Types: `Fix | Proof`

- [x] Fix `10-01` so shell stylesheet selectors are rooted to spreadsheet-owned markers/slots.
- [x] Fix `10-02` so outer shell token usage follows the supported `--nop-*` baseline where required.
- [x] Fix `10-03` so header base selectors have one canonical, non-conflicting baseline.
- [x] Fix `10-04` so shell styling targets stable slot/root hooks instead of `Input` internal DOM.
- [x] Fix `11-01` so interactive headers use supported UI primitives instead of raw `<th>` controls.

Exit Criteria:

- [x] Spreadsheet shell styles are rooted to spreadsheet-owned selectors.
- [x] No duplicated conflicting base header selector set remains.
- [x] Header interaction semantics are carried by supported UI primitives.
- [x] Focused proof is green.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, Plan `296`, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope residuals has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining spreadsheet shell styling / header interaction blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`10-01`, `10-02`, `10-03`, `10-04`, `11-01`) are fixed.
- [x] Spreadsheet shell styling and header interaction converge to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed on the 2026-05-17 live baseline after rooting spreadsheet shell CSS to spreadsheet-owned `data-slot` selectors, removing duplicate/conflicting header rules, and keeping header controls on supported UI primitives.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ce657a57ffehya0nv61esDKO2`
- Evidence: The previously flagged shell drift is now closed by the `data-slot`-rooted toolbar/panel/grid selectors in `packages/spreadsheet-renderers/src/canvas-styles.css` plus focused grid/toolbar tests that assert the supported header and shell contract.

Follow-up:

- None currently.
