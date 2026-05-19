# 386 Deep Audit 2026-05-19 Validation Owner And Registration Lifecycle Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `08-01`、`08-02`、`08-03`、`08-04`、`08-05`：让 validation owner resolution、registration updates、以及 async validation lifecycle 回到单一 supported contract。

## Current Baseline

- `scopePolicy: form` 会遮蔽显式 validation owner resolution。
- `array-editor` 与 `key-value` 直接 mutate `childPaths`，绕过 registration API。
- `applyChangesAndRevalidate` lifecycle 语义不清。
- stale async validation run 被记录为 succeeded。

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

Status: planned
Targets: validation owner code, tests, owner docs

- Item Types: `Fix | Proof`
- [ ] Fix validation owner resolution and registration update paths.
- [ ] Fix stale async validation result semantics.
- [ ] Update the owner docs named in Plan `371` to the final supported contract.

Exit Criteria:

- [ ] `08-01` through `08-05` are fixed.
- [ ] Focused proof covers owner resolution, registration updates, and async validation semantics.
- [ ] `docs/architecture/form-validation.md` and `docs/architecture/flux-runtime-module-boundaries.md` are updated.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
