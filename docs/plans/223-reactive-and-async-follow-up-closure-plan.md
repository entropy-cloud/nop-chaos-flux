# 223 Runtime Ownership And Reactive Precision Plan

> Plan Status: planned
> Last Reviewed: 2026-05-07
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,04-state-ownership.md,05-reactive-precision.md}`
> Related: `docs/plans/{211-runtime-state-reactivity-and-safety-closure-plan.md,220-cross-boundary-state-and-host-contract-closure-plan.md,224-validation-subtree-follow-up-plan.md,229-async-lifecycle-and-error-integrity-plan.md}`

## Purpose

收口 `full-8` 中 state ownership 与 reactive precision 两组 retained defects。完成态要求：surface/CRUD/Table/Flow/object-field/dynamic-renderer 的 owner contract honest，`flux-react` hooks 与 retained host-shell 订阅不再依赖 audit 已确认的宽订阅路径，并有 focused proof。

## Current Baseline

- 维度 04 保留了 P1 owner defects：surface cleanup 依赖变化误关、`close/closeTop` 与 `onClose` 生命周期分裂、CRUD/Table sort/filter shape 与 ownership split、controlled fallback 退回 local、Flow host replace history/dirty、`object-field` stale `transformOut`、`dynamic-renderer` stale schema。
- 维度 05 保留了 retained wide-subscription defects：`useScopeSelector` / `useOwnScopeSelector` / `useDataSourceStatus` / `useCurrentFormModelGeneration` 的 full-scope/full-store 订阅，以及 flow/report/spreadsheet/debugger host snapshot 粗粒度消费与 flow selector identity 漂移。
- `220` 已关闭 flow tree-mode owner/history coherence；本计划只拥有另一个 distinct residual: host replace document 仍被当作 dirty/history user edit 的 publication path，不重开 tree undo/redo correctness。
- `211` 已关闭 earlier runtime/reactive correctness families；本计划只拥有 `full-8` 仍保留的 distinct residuals。

## Goals

- 修复 retained owner-state defects，恢复单一事实源与 honest controlled contract。
- 收窄 retained subscriptions，使 in-scope hooks 和 host shells 不再因为 full-scope/full-store 读取而无差别唤醒。
- 用 focused proof 固定 final owner/reactive baseline。

## Non-Goals

- 不接管 async guard、lifecycle dispose、or error-fidelity defects；这些由 `229` owning。
- 不重开 `211` 与 `220` 已关闭的 earlier correctness baselines。
- 不把本计划扩大成 generic state framework rewrite。

## Scope

### In Scope

- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flux-runtime/src/surface-runtime.ts` only for retained close/onClose owner-state parity
- `packages/flux-renderers-data/src/{crud-renderer.tsx,crud-renderer-state.ts,table-renderer/*}`
- `packages/flow-designer-core/src/core.ts` only for the retained host-replace dirty/history publication residual, not tree undo/redo coherence
- `packages/flow-designer-renderers/src/{designer-toolbar.tsx,designer-inspector.tsx}` and directly affected selector/helper modules
- `packages/flux-renderers-form-advanced/src/{object-field.tsx,dynamic-renderer.tsx,variant-field/variant-field.tsx}` for retained owner-state/reactive slices
- `packages/flux-react/src/{hooks.ts,hook-subscriptions.ts}`
- directly affected report/spreadsheet/debugger retained host-snapshot consumers where the audit confirmed wide subscriptions
- directly affected focused tests and owner docs for the above files

### Out Of Scope

- async/lifecycle/error integrity owned by `229`
- validation/external-error semantics owned by `224`
- module-boundary refactors owned by `222`

## Execution Plan

### Workstream 1 - Repair Owner State And Controlled Contract Integrity

Status: planned
Targets: surface/crud/table/flow/object-field/dynamic-renderer state-owner surfaces, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Repair retained surface lifecycle and close/onClose parity gaps without reopening `220`'s teardown cleanup baseline.
- [ ] [Fix] Align CRUD/Table sort/filter shape, ownership semantics, and controlled behavior so `controlled` does not silently fall back to local state.
- [ ] [Fix] Stop Flow host replace from publishing history/dirty as user-edit mutations, while keeping `220`'s tree undo/redo correctness carve-out explicit.
- [ ] [Fix] Stop stale async `transformOut` and stale dynamic schema windows from overwriting or displaying superseded owner state.
- [ ] [Proof] Add focused tests for the repaired owner/controlled/state lifecycle paths.

Exit Criteria:

- [ ] The retained owner-state defects no longer reproduce on the supported paths.
- [ ] `controlled` table/CRUD behavior is honest and test-covered.
- [ ] Flow host replace no longer marks history/dirty as if the user edited the document.
- [ ] Focused proof exists for surface, CRUD/Table, Flow, object-field, and dynamic-renderer owner-state repairs.
- [ ] Affected owner docs are updated if the supported state contract changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Narrow Retained Reactive Subscriptions

Status: planned
Targets: `flux-react` hooks, retained host-shell consumers, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [ ] [Fix] Add path-aware or dependency-aware subscription behavior for the retained scope-selector hooks.
- [ ] [Fix] Provide a narrower subscription channel for form model generation and `useDataSourceStatus`-style status readers.
- [ ] [Fix] Narrow the retained flow/report/spreadsheet/debugger host snapshot consumers and fix selector identity churn where the audit confirmed it.
- [ ] [Proof] Add focused proof for the repaired subscription precision paths.

Exit Criteria:

- [ ] The retained wide-subscription paths identified by `full-8` no longer depend on full-scope/full-store reads in the supported path.
- [ ] Focused tests prove the narrowed subscriptions preserve supported behavior.
- [ ] Affected owner docs are updated if the stable reactive baseline changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Verification And Closure Audit

Status: planned
Targets: in-scope packages/tests/docs, this plan

- Item Types: `Proof | Decision`

- [ ] Run focused verification for owner-state and reactive-precision workstreams.
- [ ] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all changes land.
- [ ] Perform an independent closure audit and fix any remaining in-scope ambiguity before closing the plan.

Exit Criteria:

- [ ] Focused verification is recorded for both retained families.
- [ ] Workspace verification passes.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [ ] All in-scope retained owner-state defects are fixed.
- [ ] All in-scope retained reactive-precision defects are fixed.
- [ ] Focused verification exists for each landed family.
- [ ] No in-scope retained defect is silently deferred or downgraded.
- [ ] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Validation Checklist

- [ ] `211` and `220` carve-outs remain explicit and honest.
- [ ] Focused tests cover all owned owner-state/reactive families.
- [ ] The Flow host-replace slice is clearly distinguished from `220`'s tree history coherence fix.
- [ ] No `full-8` retained item from dimensions 04/05 is left without an owner decision.

## Closure

Status Note: pending execution.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending execution.
