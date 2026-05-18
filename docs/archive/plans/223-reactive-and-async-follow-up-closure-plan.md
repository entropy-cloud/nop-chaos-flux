# 223 Runtime Ownership And Reactive Precision Plan

> Plan Status: completed
> Last Reviewed: 2026-05-08
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

Status: completed
Targets: surface/crud/table/flow/object-field/dynamic-renderer state-owner surfaces, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Repair retained surface lifecycle and close/onClose parity gaps without reopening `220`'s teardown cleanup baseline.
- [x] [Fix] Align CRUD/Table sort/filter shape, ownership semantics, and controlled behavior so `controlled` does not silently fall back to local state.
- [x] [Fix] Stop Flow host replace from publishing history/dirty as user-edit mutations, while keeping `220`'s tree undo/redo correctness carve-out explicit.
- [x] [Fix] Stop stale async `transformOut` and stale dynamic schema windows from overwriting or displaying superseded owner state.
- [x] [Proof] Add focused tests for the repaired owner/controlled/state lifecycle paths.

Exit Criteria:

- [x] The retained owner-state defects no longer reproduce on the supported paths.
- [x] `controlled` table/CRUD behavior is honest and test-covered.
- [x] Flow host replace no longer marks history/dirty as if the user edited the document.
- [x] Focused proof exists for surface, CRUD/Table, Flow, object-field, and dynamic-renderer owner-state repairs.
- [x] Affected owner docs are updated if the supported state contract changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Narrow Retained Reactive Subscriptions

Status: completed
Targets: `flux-react` hooks, retained host-shell consumers, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Add path-aware or dependency-aware subscription behavior for the retained scope-selector hooks.
- [x] [Fix] Provide a narrower subscription channel for form model generation and `useDataSourceStatus`-style status readers.
- [x] [Fix] Narrow the retained flow/report/spreadsheet/debugger host snapshot consumers and fix selector identity churn where the audit confirmed it for the remaining live Flow toolbar/inspector slice.
- [x] [Proof] Add focused proof for the repaired subscription precision paths.

Exit Criteria:

- [x] The retained wide-subscription paths identified by `full-8` no longer depend on full-scope/full-store reads in the supported path.
- [x] Focused tests prove the narrowed subscriptions preserve supported behavior.
- [x] Affected owner docs are updated if the stable reactive baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Verification And Closure Audit

Status: completed
Targets: in-scope packages/tests/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused verification for owner-state and reactive-precision workstreams.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all changes land.
- [x] Perform an independent closure audit and fix any remaining in-scope ambiguity before closing the plan.

Exit Criteria:

- [x] Focused verification is recorded for both retained families.
- [x] Workspace verification passes.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope retained owner-state defects are fixed.
- [x] All in-scope retained reactive-precision defects are fixed.
- [x] Focused verification exists for each landed family.
- [x] No in-scope retained defect is silently deferred or downgraded.
- [x] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Validation Checklist

- [x] `211` and `220` carve-outs remain explicit and honest.
- [x] Focused tests cover the landed owner-state/reactive families.
- [x] The Flow host-replace slice is clearly distinguished from `220`'s tree history coherence fix.
- [x] No `full-8` retained item from dimensions 04/05 is left without an owner decision.

## Closure

Status Note: the stale owner-state family and the remaining retained host-consumer reactive precision family are now closed in live code. Report designer, spreadsheet page, and debugger host consumers now subscribe through selector-scoped snapshot slices with focused proof, so the plan-owned `full-8` dimension 04/05 residual set is complete.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode fresh closure pass plus independent general-agent audit (`ses_1f9650d38ffeBGmMp3zm9BINAo`)
- Evidence: live code and `docs/logs/2026/05-08.md` confirm landed work for path-scoped subscriptions, narrower form-generation/data-source status subscriptions, controlled table/filter behavior, surface close/onClose parity, Flow host-replace dirty/history repair, stale `object-field`/`dynamic-renderer` owner-state fixes, the earlier Flow selector-precision fixes in `packages/flow-designer-renderers/src/{designer-toolbar.tsx,designer-inspector.tsx}`, and the final non-Flow host-consumer precision fixes in `packages/{report-designer-renderers/src/page-renderer.tsx,spreadsheet-renderers/src/page-renderer.tsx,nop-debugger/src/panel.tsx,nop-debugger/src/panel/hooks.ts}` with focused proof in `packages/{report-designer-renderers/src/page-renderer-selector.test.tsx,spreadsheet-renderers/src/page-renderer-selector.test.tsx,nop-debugger/src/panel/hooks.test.tsx}`. The independent audit found no remaining plan-owned blocker.

Follow-up:

- No further plan-owned follow-up is required.
