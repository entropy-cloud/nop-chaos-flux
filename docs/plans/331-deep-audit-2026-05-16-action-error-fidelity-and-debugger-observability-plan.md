# 331 Deep Audit 2026-05-16 Action Error Fidelity And Debugger Observability Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{15-security-performance.md,19-error-fidelity.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 error-fidelity / debugger observability residual：debugger inspector enrich 失败时完全吞错且无 telemetry，`onError` secondary failure 不会结构化附着到返回结果，report-designer host action provider 仍把 unexpected throw 本地扁平化成 `{ ok:false }`。

## Current Baseline

- `15-02`、`19-01`、`19-03` 都属于“错误存在但 observability / fidelity 被扁平化”的结果面。
- 这些问题都比 cache identity 或 validation trigger 更窄，适合单独 owning。

## Goals

- Preserve structured visibility for secondary or unexpected failures.
- Ensure debugger enrichment failures do not disappear without any observable trace.

## Non-Goals

- 不接管 runtime cache identity。
- 不接管 validation trigger / diagnostics fidelity。

## Scope

### In Scope

- `15-02`
- `19-01`
- `19-03`
- `packages/nop-debugger/src/controller-component-inspector.ts`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `packages/report-designer-renderers/src/host-action-provider.ts`
- focused tests and relevant docs

### Out Of Scope

- `15-01`
- `08-03`
- `19-02`

## Execution Plan

### Phase 1 - Freeze Error-Fidelity / Observability Baseline

Status: completed
Targets: touched debugger / action files, focused tests/docs

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit the three in-scope surfaces and record one supported baseline for unexpected throws and enrichment failures.
- [x] Add or update focused proof for debugger telemetry, `onError` secondary failure attachment, and host-action thrown-error fidelity.

Exit Criteria:

- [x] The plan records one explicit observability/fidelity baseline.
- [x] Focused proof exists for each in-scope residual or an explicit no-proof rationale is recorded.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Error-Fidelity / Observability Fixes

Status: completed
Targets: touched debugger / action files

- Item Types: `Fix | Proof`

- [x] Fix or honestly adjudicate `15-02` so debugger enrich failures do not disappear without any observable trace.
- [x] Fix or honestly narrow `19-01` so `onError` secondary failures are structurally attached to the returned result.
- [x] Fix or honestly narrow `19-03` so host-action unexpected throws preserve diagnostics/cause fidelity.

Exit Criteria:

- [x] Secondary or unexpected failure paths are no longer silently flattened on the supported baseline.
- [x] Focused proof is green.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope residuals has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining error-fidelity / debugger observability blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] In-scope residuals (`15-02`, `19-01`, `19-03`) are fixed or honestly adjudicated.
- [x] Action error fidelity and debugger observability converge to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect is silently downgraded to deferred/follow-up.
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
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `331` is closure-ready with no remaining action-error-fidelity or debugger-observability blocker.

Follow-up:

- None currently.
