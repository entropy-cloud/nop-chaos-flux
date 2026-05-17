# 320 Deep Audit 2026-05-16 Bundle Facade Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{01-dependency-graph.md,03-api-surface.md,13-type-safety.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/291-deep-audit-2026-05-15-variant-field-contract-convergence-plan.md`

## Purpose

收口 `flux-bundle` facade public contract：facade public renderer types 比底层 runtime / registry 更宽。

## Current Baseline

- `03-04` 与 `13-01` 属同一 `flux-bundle` facade family：公开类型允许的 renderer shape 比底层 registry 真正支持的更宽。

## Goals

- Make bundle public renderer types match the real runtime/registry contract.

## Non-Goals

- 不接管 workspace manifest dependency hard gate；那部分由独立 successor owner 处理。
- 不接管 compiler slot / validation parity；那部分由独立 successor owner 处理。
- 不接管 private package root export cleanup。
- 不把 low-code dynamic boundaries 全部收紧为强类型。

## Scope

### In Scope

- `03-04`
- `13-01`
- `packages/flux-bundle/src/**`
- relevant docs and focused tests

### Out Of Scope

- `01-01`
- `03-01`
- `03-02`
- `12-01`
- `12-02`
- `13-02`
- `13-03`

## Execution Plan

### Phase 1 - Freeze Supported Bundle Public Contract

Status: completed
Targets: `flux-bundle`, `flux-core` registry contract docs/tests

- Item Types: `Decision | Fix | Proof`

- [x] Re-audit `03-04` and `13-01` together and define one supported public `FluxRendererDefinition` contract that does not over-promise beyond the real registry/runtime baseline.

Exit Criteria:

- [x] Bundle public type and runtime registration contract are explicitly aligned.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.

### Phase 2 - Land Bundle Facade Contract Fixes

Status: completed
Targets: `packages/flux-bundle/src/**`, focused tests/docs

- Item Types: `Fix | Proof`

- [x] Land the bundle facade type fix for `03-04` and `13-01`.

Exit Criteria:

- [x] `FluxRendererDefinition` no longer over-promises unsupported renderer shapes or variadic `any` signatures.
- [x] Focused proof is green for the supported bundle registration baseline.
- [x] `docs/logs/2026/05-17.md` records the contract decisions.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining bundle facade blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`03-04`, `13-01`) are fixed.
- [x] Bundle facade public contract converges to one supported baseline.
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

Status Note: Completed on the 2026-05-17 live baseline after final workspace verification and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ce657a57ffehya0nv61esDKO2`
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `320` is closure-ready with no remaining bundle facade blocker.

Follow-up:

- None currently.
