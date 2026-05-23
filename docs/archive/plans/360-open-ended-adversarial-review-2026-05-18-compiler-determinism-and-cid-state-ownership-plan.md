# 360 Open-Ended Adversarial Review 2026-05-18 Compiler Determinism And Cid-State Ownership Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-02/round-01.md` (Finding 1), `docs/analysis/2026-05-18-open-ended-adversarial-review-02/summary.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/350-open-ended-adversarial-review-2026-05-18-priority-remediation-plan.md`, `docs/architecture/template-instantiation-and-node-identity.md`, `docs/architecture/unified-runtime-indexing-and-path-binding.md`

## Purpose

收口单一 compiler determinism / cid-state ownership defect：compiler `cidState` 共享可变状态会破坏重复 compile 的幂等性。

## Current Baseline

Outdated Note: the bullets below capture the pre-fix determinism baseline. Final live status is recorded in the completed execution checklist, closure gates, and `docs/logs/2026/05-18.md`.

- `R1-1` 是窄 scope 的 compiler state-ownership / determinism defect，不属于 action validation/dispatch fidelity surface。
- 当前 live baseline 下，`enrichTemplateNodeIds()` 会原地修改 `cidState`，导致同一 schema 重复 compile 时出现不同的 `templateNodeId` 结果和累计 duplicate tracking。
- 该问题属于 template/node identity baseline；如果修复改变了 owner-doc 可见的 determinism/identity 语义，需要同步 `docs/architecture/template-instantiation-and-node-identity.md` 或 `docs/architecture/unified-runtime-indexing-and-path-binding.md`。

## Goals

- Restore one honest deterministic compile baseline for the touched cid-state ownership surface.
- Eliminate unsafe shared mutable-state semantics from repeated compile on the supported baseline.
- Add focused proof that repeated compile no longer drifts for the in-scope surface.

## Non-Goals

- 不接管 action runner normalization 或 action shape validation；那部分由 Plan `352` owning。
- 不做 generic compiler rewrite。
- 不扩展到 runtime scope lifecycle 或 flow-designer identity semantics。

## Scope

### In Scope

- `R1-1`
- `packages/flux-compiler/src/{schema-compiler.ts,schema-compiler/target-enrichment.ts}`
- focused tests and relevant docs
- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/unified-runtime-indexing-and-path-binding.md`
- `docs/logs/2026/05-18.md`

### Out Of Scope

- `R1-2`
- `R2-4`
- generic duplicate-id diagnostics redesign

## Execution Plan

### Phase 1 - Freeze Compiler Determinism Baseline

Status: completed
Targets: touched compiler files, focused tests, owner docs

- Item Types: `Decision | Proof`

- [x] Re-audit repeated compile behavior for the touched cid-state ownership surface and record one supported determinism baseline.
- [x] Add or update focused proof that reproduces the current idempotency drift.
- [x] Decide owner-doc impact for template/node identity wording.

Exit Criteria:

- [x] The plan records one explicit supported baseline for repeated compile determinism on the in-scope surface.
- [x] Focused proof exists for the in-scope drift.
- [x] Owner-doc impact is explicitly decided: affected identity/path-binding docs are named, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Determinism Fix

Status: completed
Targets: `packages/flux-compiler/src/{schema-compiler.ts,schema-compiler/target-enrichment.ts}`

- Item Types: `Fix | Proof`

- [x] Fix `R1-1` so repeated compile on the supported baseline no longer depends on unsafe shared mutable cid-state ownership.
- [x] Keep focused proof green after the implementation change.

Exit Criteria:

- [x] The in-scope compiler surface has one deterministic supported baseline for repeated compile.
- [x] Focused proof is green.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched package/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after in-scope changes land.
- [x] Record execution and verification evidence in `docs/logs/2026/05-18.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis, live code/docs/tests, and verification results.

Exit Criteria:

- [x] Focused verification has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned compiler determinism blocker.
- [x] Closure audit explicitly re-checks `R1-1` against final evidence so it cannot silently drop out of scope.
- [x] This plan's statuses, checklists, closure gates, and daily-log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects (`R1-1`) are fixed.
- [x] Compiler determinism and cid-state ownership converge to one supported baseline.
- [x] Necessary focused verification exists for the touched defect family.
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

Status Note: Completed. Target enrichment no longer mutates caller-provided `cidState` in place, repeated compile stays deterministic on the supported baseline, and `docs/architecture/template-instantiation-and-node-identity.md` now documents per-compile caller-owned `CompiledCidState`.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit `ses_1c66e86ebffeUQPLe8MOl7YoC6`.
- Evidence: the fresh reviewer re-checked `packages/flux-compiler/src/schema-compiler/target-enrichment.ts`, the determinism proof, and `docs/architecture/template-instantiation-and-node-identity.md`, and reported `360` closure-ready with no remaining plan-owned blockers.

Follow-up:

- None.
