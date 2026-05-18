# 130 Form Validation Current-Vs-Target Wording Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-04-22
> Source: `docs/architecture/form-validation.md`, `docs/architecture/data-domain-owner.md`, `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/src/types/validation.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`, `packages/flux-runtime/src/page-runtime.ts`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts`, `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts`
> Related: `docs/plans/127-data-domain-owner-doc-alignment-and-operational-rules-plan.md`, `docs/plans/129-detail-owner-and-surface-boundary-doc-alignment-plan.md`

## Purpose

把 `docs/architecture/form-validation.md` 收敛到与当前 live implementation 一致的 wording：保留它作为 validation 规则与 API 的局部权威文档，但明确哪些部分已经是 live concrete baseline，哪些仍是 target architecture，尤其是 page/root validation owner、non-form validation owner、child-contract maturity、以及 multi-owner owner-resolution 的当前落地程度。

## Current Baseline

- `form-validation.md` 已具备完整的 target validation architecture，但其中若干段落把 page/root owner、non-form owner、child contract、nearest-owner/multi-owner 说得比 live implementation 更成熟。
- live concrete validation owner 仍是 `FormRuntime`；`ValidationScopeRuntime` 当前主要体现为接口/目标抽象，而不是独立已量产的 runtime/factory。
- live child-contract machinery 已有真实部分落地：manual registration、`summary-gate` 对 `canSubmit` 的影响、`recurse-submit` submit-time recursion；但还不是 fully automatic/lifecycle-aware multi-owner orchestration。
- live `PageRuntime` 不是 validation owner；page-backed `detail-view` 只是本地 draft form validate 后写回 parent scope。

## Goals

- 让 `form-validation.md` 的 current-vs-target wording 与 live code一致。
- 保留 target architecture 叙事，但不再把未落地能力写成 current usable baseline。
- 明确 live concrete center of gravity: form-first, partial multi-owner machinery, renderer-local draft isolation.

## Non-Goals

- 不修改 validation runtime、page runtime、detail renderers、compiler owner resolution。
- 不在本计划内实现 page/root validation owner、generic non-form validation runtime、automatic child-owner activation、or compiler-driven owner tree。

## Scope

### In Scope

- `docs/architecture/form-validation.md`
- `docs/logs/2026/04-22.md`

### Out Of Scope

- code changes
- edits to other docs except minimal cross-reference sync if absolutely required

## Execution Plan

### Phase 1 - Tighten Live Baseline Wording

Status: completed
Targets: `docs/architecture/form-validation.md`

- [x] Reworded page/root and non-form validation-owner passages so they are clearly target architecture, not current live baseline.
- [x] Reworded owner-resolution and nearest-owner sections so current implementation is described as form-first plus renderer-local draft isolation, not as a fully realized generic owner tree.
- [x] Reworded scenario mapping so only live concrete cases read as current baseline.

Exit Criteria:

- [x] No section still implies that page/root validation owner or generic non-form validation runtime is already live.
- [x] Current live baseline and target owner model are cleanly separated.

### Phase 2 - Tighten Child-Contract Maturity Wording

Status: completed
Targets: `docs/architecture/form-validation.md`

- [x] Reworded child-contract sections so they acknowledge live manual contract hooks and current `summary-gate` / `recurse-submit` behavior.
- [x] Marked lifecycle-aware activation snapshots, automatic contract participation, and stronger multi-owner orchestration as target-only.
- [x] Corrected wording that mismatched current `canSubmit` logic or submit recursion behavior.

Exit Criteria:

- [x] Child-contract wording matches live code: partial/manual, real but not fully mature.
- [x] No incorrect claim remains about `ready` vs `valid` gating or automatic activation semantics.

### Phase 3 - Evidence And Closure

Status: completed
Targets: `docs/logs/2026/04-22.md`, this plan file

- [x] Added a daily-log entry for the form-validation wording convergence slice.
- [x] Ran an independent docs/code closure audit and recorded the evidence here.
- [x] Closed the plan only after the audit confirmed no remaining plan-owned doc drift.

Exit Criteria:

- [x] Daily log entry exists with code/doc anchors.
- [x] Closure audit evidence is recorded from a fresh sub-agent session.
- [x] No remaining plan-owned doc drift remains.

## Validation Checklist

- [x] `form-validation.md` no longer overclaims page/root validation ownership as current live behavior.
- [x] `form-validation.md` accurately describes the live concrete center of gravity as form-first.
- [x] `form-validation.md` accurately describes child-contract maturity and current submit/canSubmit behavior.
- [x] `docs/logs/2026/04-22.md` records the landing and evidence.
- [x] An independent closure audit is completed and recorded before plan closure.
- [x] No plan-owned code changes were required; workspace verification commands are not closure gates for this docs-only plan.

## Closure

Status Note: Completed as a docs-only wording-convergence slice. `form-validation.md` now keeps its target architecture intact while describing the current live center of gravity accurately: form-first concrete owner runtime, partial/manual child-contract machinery, renderer-local draft isolation, and target-only page/root or generic non-form validation ownership.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent sub-agents
- Evidence: `ses_248621968ffeLHsIaEABZwvsUN` found one final wording drift in the current-implementation writeback sentence, which was fixed before closure; `ses_248621924ffeEu2vZf6uHFM6fl` recommended closure after daily-log evidence, confirming the edited doc matches live anchors in `packages/flux-core/src/types/runtime.ts`, `packages/flux-core/src/types/validation.ts`, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`, `packages/flux-runtime/src/page-runtime.ts`, and `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx` / `detail-view.tsx`.

Follow-up:

- If future work lands page/root validation owner, generic non-form validation runtime, or automatic multi-owner orchestration, handle it in separate implementation plans.
- No remaining plan-owned work.
