# 232 Open-Ended Adversarial Review 2026-05-08 Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-09
> Source: `docs/analysis/2026-05-08-open-ended-adversarial-review-01/{round-01.md,round-02.md,round-03.md,round-04.md}`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/renderer-runtime.md`
> Related: `docs/plans/{134-node-renderer-compile-time-execution-plan-convergence-plan.md,220-cross-boundary-state-and-host-contract-closure-plan.md,221-deep-audit-2026-05-07-confirmed-defect-remediation-plan.md,223-reactive-and-async-follow-up-closure-plan.md}`

## Purpose

收口 `2026-05-08` 开放式对抗性审查确认的 live defects，并把它们按共享机制归并为单一 owner plan：结构激活 lowering、async lifecycle/cancellation、projected scope/write semantics、dynamic schema and action/component targeting integrity、以及 validation traversal equivalence。

完成态要求：每个 defect family 都完成通用修复而非点修，且都有 focused unit/integration regression tests 锁定行为；其中 `when` 必须按 `frontend-programming-model.md` 的结构变换原则落到编译期决定的 node-local render-plan 包装路径，而不是被提升为 runtime meta patch。

## Current Baseline

- `round-01` 确认结构 DSL 与运行时主线仍有断裂：`when` 被文档定义为结构激活机制，但普通节点和 `fragment` 没有通用执行路径；`loop.itemData` 在父 scope 预求值，既读不到当前 item/index，也能覆盖保留的 slot 结构绑定。
- `round-01` 与 `round-03` 还确认了 async/invocation contract 缺口：data-source controller 在 `stop()` / `reset()` / `stopWhen` 后进入 started+stopped 假活状态；reaction dispose 未把 abort `signal` 传入 dispatch；targeted `submitForm` / `component:submit` 通过 form handle 时丢失 `signal`。
- `round-02` 与 `round-03` 确认 projected scope / relative write contract 不闭合：`detail-view` / `detail-field` 对嵌套 path 的读取与写回不对称，`array-field` item scope 的 `merge()` / `replace()` 逃逸到父 scope 根，`setValues.args.path` 在 built-in lowering 中被丢弃。
- `round-02` 与 `round-03` 还确认了 dynamic schema / action / targeting integrity 缺口：`dynamic-renderer` 的 `loadAction` 绕过 action-shape validation，loaded schema 只做 `{ type: string }` 检查并在坏 schema 时退化成 render boundary error；本地 `xui:actions` provider 丢弃调用方 `args` payload；duplicate `componentId` 在 runtime registry 中静默覆盖旧 handle。
- `round-04` 确认 compiler traversal context 在 array-valued capable region 中丢失，导致 object/array 两种合法 authoring 形式在 host-contract validation 上不等价。

## Goals

- 用 compile-time execution-plan lowering 收口 `when` 的结构激活语义，并让普通节点与 `fragment` 共享同一执行模型。
- 修复 repeated/projected scope 相关的上下文与写入语义，让 `loop.itemData`、detail editors、array item scope、以及 `setValues.args.path` 在端到端路径上保持一致。
- 修复 async lifecycle 与 cancellation contract，使 data-source restart/refresh、reaction dispose、以及 targeted form submit 的 abort semantics 真正可用。
- 恢复 dynamic schema、named action payload、component targeting、host-contract traversal 的诊断与调用合同，避免静默降级到 render-time boundary 或 runtime replacement。
- 为每个 defect family 增加 focused regression coverage，并在所有修复落地后运行 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。

## Non-Goals

- 不重开本次审查中已明确去重排除的问题，例如 `dynamic-renderer` stale schema、旧的 detail action-field-as-prop 泛化问题、以及历史上已单独归档的 unknown renderer `continueOnError` 讨论。
- 不把本计划扩大成广义 DSL 重设计、host manifest redesign、或全仓 component/action API 改名工程；只修复本次已确认的 live defect 与相邻 contract drift。
- 不把局部 defect 降级成 vague follow-up；所有已确认问题都必须在本计划中被归类为 `Fix` 并配套 `Proof`。

## Scope

### In Scope

- `packages/flux-core/src/types/{node-identity.ts,renderer-compiler.ts,compilation.ts}` 以及与 node-local render plan 相关的最小类型扩展
- `packages/flux-compiler/src/schema-compiler/{fields.ts,node-compiler.ts,shape-validation.ts,host-action-validation.ts,static-analysis.ts}` 及相关 compiler tests
- `packages/flux-react/src/` 中执行 node-local render plan、render helpers、dynamic schema compile/diagnostic path 的相关实现与 tests
- `packages/flux-renderers-basic/src/{fragment.tsx,loop.tsx,dynamic-renderer.tsx}` 及对应 tests
- `packages/flux-runtime/src/{async-data/**,action-adapter.ts,form-component-handle.ts,component-handle-registry.ts}` 及对应 tests
- `packages/flux-action-core/src/{action-core.ts,action-dispatcher/**}` 及对应 tests
- `packages/flux-renderers-form-advanced/src/detail-view/**` 与 `packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts` 及对应 tests
- 受影响的 owner docs/references：`docs/architecture/{frontend-programming-model.md,renderer-runtime.md,api-data-source.md,component-resolution.md}`, `docs/references/action-payload-matrix.md`, 以及受影响的 component docs

### Out Of Scope

- 与本次确认问题无关的 renderer styling、accessibility、performance、package boundary、或 host projection redesign
- 重新定义 `visible` / `when` / `dynamic-renderer` / `data-source` 的作者心智模型；本计划只让 live code 对齐现行文档基线
- 为了抽象统一而引入新的通用 runtime meta layer；`when` 必须优先走 compile-time structural lowering

## Execution Plan

### Workstream 1 - Structural Activation And Repeated-Scope Lowering

Status: completed
Targets: `packages/flux-core/src/types/*`, `packages/flux-compiler/src/schema-compiler/{fields.ts,node-compiler.ts,static-analysis.ts}`, `packages/flux-react/src/`, `packages/flux-renderers-basic/src/{fragment.tsx,loop.tsx}`, `docs/architecture/{frontend-programming-model.md,renderer-runtime.md}`, `docs/components/{fragment,loop}/design.md`

- Item Types: `Fix | Decision | Proof`

- [x] [Decision] Freeze the `when` implementation direction as compile-time structural lowering: compiler now emits node-local structural guards through compiled `TemplateNode.structuralWhen` instead of a renderer-local runtime meta patch.
- [x] [Fix] Make ordinary nodes and `fragment` execute that compiled structural guard uniformly so falsy `when` suppresses subtree render participation, child lifecycle hooks, data-source/reaction activation, and other mount-time side effects instead of relying on renderer-local prop consumption.
- [x] [Fix] Move `loop.itemData` evaluation onto the repeated item scope so `${item}` / `${index}` bindings resolve per item, and prevent schema-authored `itemData` from overwriting reserved structural slot bindings such as item/index/key aliases and `$parent`.
- [x] [Proof] Add compiler/unit coverage for static-vs-dynamic `when` lowering and focused integration tests proving: `fragment.when` blocks body render, normal node `when` blocks subtree lifecycle/effects, and `loop.itemData` can derive per-item values without mutating reserved bindings.

Exit Criteria:

- [x] `when` no longer depends on ad hoc renderer-local prop handling for structural activation.
- [x] Ordinary nodes and `fragment` share one compile-time-owned structural activation path aligned with `frontend-programming-model.md`.
- [x] `loop.itemData` is evaluated in item scope and reserved slot bindings cannot be shadowed by schema data.
- [x] `docs/architecture/{frontend-programming-model.md,renderer-runtime.md}` and affected `docs/components/*` pages describe the final structural activation baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Async Lifecycle, Restart, And Cancellation Integrity

Status: completed
Targets: `packages/flux-runtime/src/{async-data/**,action-adapter.ts,form-component-handle.ts}`, `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`, focused tests, `docs/architecture/api-data-source.md`

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Repair data-source controller state transitions so `stop()`, `reset()`, `stopWhen`, `start()`, and `refresh()` converge on one restartable contract and registry-driven refresh cannot report false success while the controller remains stopped.
- [x] [Fix] Thread reaction-owned abort `signal` into dispatched action execution so dispose cancels in-flight ajax/action chains rather than only queued/debounced work.
- [x] [Fix] Preserve abort `signal` for targeted `submitForm` / `component:submit` paths when submission is routed through form component handles instead of the direct current-form path.
- [x] [Proof] Add unit tests for controller restart/refresh semantics plus integration tests for reaction dispose, timeout, and user-cancel abort propagation across ajax and remote form-submit paths.

Exit Criteria:

- [x] Stopped or reset data sources can be restarted or refreshed according to one documented lifecycle contract.
- [x] Reaction disposal and targeted form submission preserve abort semantics end to end.
- [x] Focused regression tests cover restartability, fake-live-state prevention, and abort propagation across both direct and indirect execution paths.
- [x] `docs/architecture/api-data-source.md` and any affected action/runtime references are updated to the final baseline, or `No owner-doc update required` is explicitly recorded for purely internal signal-path fixes.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Projected Owner Scope And Relative Write Semantics

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/detail-view/**`, `packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts`, `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`, `packages/flux-runtime/src/action-adapter.ts`, focused tests, affected form/action docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Make `detail-view` / `detail-field` read and write nested paths symmetrically in both form-owned and non-form scope branches so first-open editing sees the current nested value instead of `undefined`.
- [x] [Fix] Make `array-field` item projected scopes preserve item-local semantics for `merge()` and `replace()` instead of escaping bulk writes to the parent scope root.
- [x] [Fix] Preserve `setValues.args.path` through built-in lowering so relative batch writes land under the authored base path rather than silently writing at the root.
- [x] [Proof] Add focused unit tests for nested-path initial read/write symmetry and projected-scope bulk writes, plus integration tests verifying `setValues` and item-local data publication target the intended nested owner path.

Exit Criteria:

- [x] Detail editors no longer lose existing nested values on first edit.
- [x] Array item projected scopes keep `get/update/merge/replace` semantics aligned to the current item.
- [x] `setValues.args.path` survives parser-to-lowering-to-runtime execution unchanged.
- [x] Affected form/action docs are updated to the final supported nested-path baseline, or `No owner-doc update required` is explicitly recorded where the contract was already documented correctly.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - Dynamic Schema, Named Action Payload, And Component Target Integrity

Status: completed
Targets: `packages/flux-renderers-basic/src/dynamic-renderer.tsx`, `packages/flux-compiler/src/schema-compiler/shape-validation.ts`, `packages/flux-core/src/named-action-provider.ts`, `packages/flux-runtime/src/component-handle-registry.ts`, focused tests, `docs/references/action-payload-matrix.md`, `docs/architecture/component-resolution.md`, affected dynamic-renderer docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Move `dynamic-renderer.loadAction` and loaded-schema handling onto owned diagnostic channels: invalid `loadAction` shape must fail schema validation, and invalid returned schema must resolve to a `dynamic-renderer`-owned error/diagnostic state instead of a generic render boundary crash.
- [x] [Fix] Preserve caller `args` payload for local `xui:actions` provider execution through one explicit binding contract that matches the supported plain named-action semantics.
- [x] [Fix] Make duplicate `componentId` resolution explicit ambiguity at runtime instead of silently replacing the older mounted handle.
- [x] [Proof] Add unit tests for invalid `loadAction` shape, invalid loaded schema diagnostics, local named-action payload visibility, and duplicate-`componentId` runtime ambiguity errors.

Exit Criteria:

- [x] `dynamic-renderer` no longer bypasses owned validation/diagnostic handling for either load actions or loaded schema.
- [x] Local named actions receive the same authored payload contract as other supported named-action invocation paths.
- [x] Runtime `componentId` targeting no longer silently picks the last-registered handle under ambiguity.
- [x] `docs/references/action-payload-matrix.md`, `docs/architecture/component-resolution.md`, and affected dynamic-renderer docs reflect the final supported behavior.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 5 - Validation Traversal And Host-Contract Equivalence

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/{shape-validation.ts,host-action-validation.ts}`, focused tests, affected host-contract docs if needed

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Preserve `traversalState` / `hostContext` when traversing array-valued regions so object-form and array-form capable regions remain validation-equivalent.
- [x] [Proof] Add focused unit tests covering object and array region authoring for unknown host methods and invalid host-action args, proving diagnostics survive both shapes.
- [x] [Decision] `No owner-doc update required`: this slice restores validation-context equivalence across supported authoring shapes without changing the documented host-contract surface.

Exit Criteria:

- [x] Array-valued capable regions keep the same host-contract validation context as object-valued regions.
- [x] Host-contract diagnostics are shape-equivalent across object and array authoring forms.
- [x] Affected host-contract docs are updated if the documented baseline needs clarification; otherwise `No owner-doc update required` is explicitly recorded.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 6 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, focused tests, this plan

- Item Types: `Proof | Decision`

- [x] [Proof] Run all newly added focused unit/integration tests for each workstream after the fixes land.
- [x] [Proof] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope code/doc updates land.
- [x] [Decision] Perform an independent closure audit to confirm no in-scope defect family was silently downgraded to residual or follow-up. Evidence: `AUDIT-232-CLOSURE-2026-05-09-A1`.

Exit Criteria:

- [x] Every workstream has recorded focused verification for the landed defect family.
- [x] Workspace verification passes, or any unrelated pre-existing failure is explicitly adjudicated before closure.
- [x] Independent closure audit confirms no remaining in-scope blocker or silent scope drift.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Workstream 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `when` structural activation is owned by compile-time lowering rather than a runtime meta patch.
- [x] All in-scope repeated/projected scope and relative-write defects are fixed.
- [x] All in-scope async lifecycle and cancellation defects are fixed.
- [x] All in-scope dynamic schema, named-action payload, component-targeting, and host-contract validation defects are fixed.
- [x] Every defect family has focused unit/integration regression coverage proving the final behavior.
- [x] No in-scope confirmed live defect or contract drift is silently deferred or downgraded.
- [x] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently. Any retained residual must be recorded here before closure; no in-scope confirmed defect may be moved to follow-up without explicit adjudication.
