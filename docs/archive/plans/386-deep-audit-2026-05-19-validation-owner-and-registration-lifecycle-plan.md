# 386 Deep Audit 2026-05-19 Validation Owner And Registration Lifecycle Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `08-01`、`08-02`、`08-03`、`08-04`、`08-05`：让 validation owner resolution、registration updates、以及 async validation lifecycle 回到单一 supported contract。

## Current Baseline

- `08-01`, `08-02`, `08-03`, `08-05` 的 live fixes 已存在于当前代码与 focused tests 中。
- `08-04` 现在已补 focused proof 并同步 owner docs：`applyChangesAndRevalidate(...)` 在 `bootstrapping` / `refreshing` 下允许 owner-local writes 先落库，但验证发布必须等待 owner 回到 `active` 后再基于当前 model generation 执行。
- 剩余工作是回填 plan/log closure bookkeeping、repo-wide gates、以及独立 closure audit evidence。

## Goals

- 修复 `08-01` 至 `08-05`。
- 同步 validation owner/runtime docs。

## Non-Goals

- 不处理 detail-field contract findings；那由 Plan `387` owning。

## Scope

### In Scope

- `08-01`, `08-02`, `08-03`, `08-04`, `08-05`
- relevant compiler/runtime/form-advanced files
- related focused tests
- `docs/architecture/form-validation.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- table and detail-field retained findings

## Execution Plan

### Phase 1 - Restore Validation Owner Lifecycle Contract

Status: completed
Targets: validation owner code, tests, owner docs

- Item Types: `Fix | Proof`
- [x] Fix validation owner resolution and registration update paths.
- [x] Fix stale async validation result semantics.
- [x] Update the owner docs named in Plan `371` to the final supported contract.

Exit Criteria:

- [x] `08-01` through `08-05` are fixed.
- [x] Focused proof covers owner resolution, registration updates, and async validation semantics.
- [x] `docs/architecture/form-validation.md` and `docs/architecture/flux-runtime-module-boundaries.md` are updated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed after re-checking the already-landed `08-01` / `08-02` / `08-03` / `08-05` fixes, adding explicit focused proof for the `08-04` transitional lifecycle contract, updating owner docs, and confirming package plus repo-wide verification.

Closure Audit Evidence:

- Reviewer / Agent: independent subagent closure audit `ses_1bd9a8ecaffe4EkEyNbzkS8XuJ`
- Evidence: `Verdict: acceptable`, `Findings: none`, `Plan 386 can be marked completed now: yes`
