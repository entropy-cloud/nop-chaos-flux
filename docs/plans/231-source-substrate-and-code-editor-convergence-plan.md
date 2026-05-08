# 231 Source Substrate And Code Editor Convergence Plan

> Plan Status: planned
> Last Reviewed: 2026-05-08
> Source: `docs/architecture/api-data-source.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/flux-runtime-module-boundaries.md`
> Related: `docs/plans/139-unified-action-dispatch-for-submit-validation-and-data-access.md`

## Purpose

收敛 `source` / `data-source` / `allowSource` 到同一套 runtime-owned source substrate，并移除 `flux-react` 与 `flux-code-editor` 中仍然自带的平行 source 语义。计划完成后，匿名 `source`、命名 `data-source`、source-enabled props、以及 code-editor 的动态数据加载都应共享同一 producer contract 与宿主边界。

重要约束：`SourceSchema` 属于 authoring / execution-schema 输入面，不是控件运行时 props contract。框架层可以识别并执行匿名 `source`，但 renderer 最终应收到 resolved value 和窄化后的 transient state，而不是直接消费 `SourceSchema` 对象。

## Current Baseline

- `packages/flux-runtime/src/async-data/source-registry.ts` 已经拥有 scope-scoped source registry，并统一管理命名 `data-source` 的 registration / invalidation / refresh / disposal。
- `packages/flux-runtime/src/async-data/source-executor.ts` 已经支持匿名 `SourceSchema` 的 formula/action 执行，并将 action-backed source 复用到 `runtime.dispatch(...)`。
- `packages/flux-compiler/src/source-compiler.ts` 与 `packages/flux-core/src/types/compilation.ts` 已将 `CompiledDataSource` 收敛为 `formula` 或 `action` 两类 producer，而不是 schema-level `api`。
- `packages/flux-react/src/use-node-source-props.ts`、`packages/flux-react/src/node-source-prop-controller.ts`、以及导出的 `packages/flux-react/src/use-source-value.ts` 仍然维持 React-owned anonymous source state：它们直接调用 `runtime.executeSource(...)` 并在 React 本地管理 loading/value/error，但不经过统一 runtime-owned source entry model。
- `packages/flux-code-editor/src/types.ts` 与 `source-resolvers.ts` 仍保留独立的 source ref vocabulary（如 `source: 'action'`、`loadAction`）。这些写法没有回到统一 framework-level source handling contract；按目标设计，schema authoring 可以声明匿名 `source`，但框架层必须先把它解析为 resolved arrays，再交给 code-editor renderer，而不是让 renderer props 直接暴露 `SourceSchema`。`code-editor-renderer/use-sql-editor-state.ts` 的 SQL execution contract 仍需后续 owner 决策，但不是这次 source-substrate closure 的主轴。
- 现有 architecture docs 已收敛到新的目标：`source` 是匿名 source carrier，`data-source` 是 named source-owner profile，`allowSource` 是字段级入口，不应再有 React-only 或 code-editor-only 的第三套模型。

## Goals

- 让匿名 `source`、命名 `data-source`、source-enabled props 共用同一套 runtime-owned source substrate。
- 移除 `flux-react` prop-level source 的 React-owned controller 语义，使其退化为 runtime-owned source substrate 的宿主接线层。
- 将 `flux-code-editor` 的动态数据加载 contract 收敛到统一的 framework-level source handling，不再保留 `loadAction` / ad hoc action-ref 特例，也不引入新的 code-editor 包层字段；renderer 最终仍只消费 resolved data props。
- 保持 `source` 与 `data-source` 的 authoring distinction，但让差异只体现在匿名消费 vs 命名 owner/publication，而不是底层执行机制。
- 为这次收敛补齐 focused tests、owner docs、daily log，并跑完仓库要求的 verification。

## Non-Goals

- 不在本计划中重命名 schema surface，把 `source` / `data-source` 合并成单一 authoring 名称。
- 不在本计划中重做 `ActionRuntimeAdapter`、request runtime、或 general action algebra。
- 不在本计划中重定义 SQL execution 作为 action/effect contract；`code-editor` SQL 执行 fallback 是否收紧为显式 action-only，留给后续 owner plan 决定。
- 不扩展新的 visual authoring UI 或 builder metadata beyond 当前 contract 必需项。
- 不主动清理与本计划无关的工作树变更。

## Scope

### In Scope

- `packages/flux-core/src/types/{schema.ts,compilation.ts,renderer-core.ts,runtime.ts}`
- `packages/flux-compiler/src/{source-compiler.ts,schema-compiler/node-compiler.ts}` 及相关测试
- `packages/flux-runtime/src/async-data/*`、`runtime-factory.ts`、相关 runtime tests
- `packages/flux-react/src/{use-node-source-props.ts,node-source-prop-controller.ts,use-source-value.ts,node-renderer-resolved.tsx,index.tsx}` 及相关 tests
- `packages/flux-code-editor/src/{types.ts,source-resolvers.ts}` 及相关 tests / e2e proofs
- `docs/architecture/`、`docs/components/code-editor/design.md`、`docs/logs/2026/05-08.md`

### Out Of Scope

- 将 `data-source` schema surface 删除并完全并入 `source`
- 新建更大范围的 source visual debugger UI
- 与本计划无关的 report/spreadsheet/word-editor follow-up

## Execution Plan

### Phase 1 - Lock The Unified Source Contract

Status: planned
Targets: `packages/flux-core/src/types/`, `packages/flux-compiler/src/source-compiler.ts`, `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, `docs/architecture/*.md`

- Item Types: `Fix | Decision | Proof`

- [ ] Audit the current `SourceSchema`, `DataSourceSchema`, `CompiledDataSource`, and renderer-field `allowSource/sourceStateKey` contracts against the updated architecture docs.
- [ ] Remove any remaining type/compiler drift that still treats anonymous source as a separate action-only model instead of a shared formula/action producer contract.
- [ ] Make compiler/runtime-facing naming honest where needed so `data-source` is documented and typed as a named source-owner profile over the same substrate.
- [ ] Add or update focused compiler/type tests proving source-enabled prop metadata and `CompiledDataSource` still compile correctly after the contract cleanup.

Exit Criteria:

- [ ] Core type surface and compiler output no longer encode a second source model for prop-level or code-editor-specific loading, and renderer runtime props remain resolved-value contracts.
- [ ] Focused compiler/type tests covering the unified contract pass.
- [ ] Relevant `docs/architecture/` pages remain aligned with the live contract.
- [ ] `docs/logs/2026/05-08.md` updated.

### Phase 2 - Move Prop-Level Source Resolution Onto Runtime-Owned Substrate

Status: planned
Targets: `packages/flux-runtime/src/async-data/*`, `packages/flux-react/src/{use-node-source-props.ts,node-source-prop-controller.ts,use-source-value.ts,node-renderer-resolved.tsx,index.tsx}`, `packages/flux-react/src/__tests__/*`

- Item Types: `Fix | Decision | Proof`

- [ ] Introduce the minimal runtime-owned source entry/snapshot support needed for anonymous source-enabled props so React no longer owns a parallel controller semantic model.
- [ ] Replace or reduce `node-source-prop-controller` and `use-source-value.ts` so both `useNodeSourceProps(...)` and exported anonymous-source hooks become host wiring over runtime-owned source execution/state instead of direct React controller ownership.
- [ ] Preserve `sourceStateKey` companion props as the narrow UI-facing anonymous-source state surface without inventing a second status API.
- [ ] Add or update focused React/runtime tests covering loading, success, error, resubscribe, and disposal behavior for source-enabled props.

Exit Criteria:

- [ ] Prop-level source execution/state is runtime-owned; React only mounts/subscribes/disposes.
- [ ] `sourceStateKey` behavior still works through focused tests, and exported anonymous-source hooks no longer own a parallel runtime model.
- [ ] `docs/architecture/renderer-runtime.md` and `docs/architecture/flux-runtime-module-boundaries.md` match the live baseline.
- [ ] `docs/logs/2026/05-08.md` updated.

### Phase 3 - Converge Code Editor Dynamic Sources

Status: planned
Targets: `packages/flux-code-editor/src/{types.ts,source-resolvers.ts}`, `packages/flux-code-editor/src/*.test.ts`, `tests/e2e/code-editor.spec.ts`, `docs/components/code-editor/design.md`

- Item Types: `Fix | Decision | Proof`

- [ ] Replace code-editor-specific `loadAction` / `source: 'action'` loading contracts with framework-level anonymous-source handling so variables/functions/tables loading uses the shared anonymous-source contract without a new wrapper like `source: 'remote'`.
- [ ] Keep scope-backed local reads where they are simply synchronous value reads, but ensure action-backed remote loading uses the unified source vocabulary.
- [ ] Update unit and e2e coverage for expression/sql editor data loading so code-editor no longer depends on its legacy special-case source model.
- [ ] Update `docs/components/code-editor/design.md` to describe the unified source contract instead of the legacy source-ref vocabulary.

Exit Criteria:

- [ ] Code editor no longer exposes `loadAction`/special action-source vocabulary as a parallel source contract, and renderer runtime props remain resolved arrays/values instead of raw `SourceSchema` objects.
- [ ] Focused code-editor tests/e2e proofs covering dynamic variable/function/table loading pass.
- [ ] `docs/components/code-editor/design.md` and relevant architecture docs remain aligned; no code-editor-only source semantics remain documented.
- [ ] `docs/logs/2026/05-08.md` updated.

### Phase 4 - Closure, Verification, And Plan Sync

Status: planned
Targets: `docs/plans/231-source-substrate-and-code-editor-convergence-plan.md`, `docs/logs/2026/05-08.md`, affected tests/docs

- Item Types: `Proof | Follow-up`

- [ ] Re-audit the live repo against all in-scope items and sync this plan’s checkboxes/status markers.
- [ ] Run required verification: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.
- [ ] Run an independent closure audit with a separate subagent after implementation lands.
- [ ] Record closure evidence and any explicitly adjudicated residuals.

Exit Criteria:

- [ ] Plan/checklist text matches live repo state with no stale unchecked in-scope item.
- [ ] Required workspace verification passes.
- [ ] Independent closure audit evidence is recorded.
- [ ] `docs/logs/2026/05-08.md` updated.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] All in-scope source substrate drifts are fixed.
- [ ] All in-scope code-editor source contract drifts are fixed.
- [ ] Anonymous `source`, named `data-source`, and source-enabled props share one runtime-owned substrate.
- [ ] Necessary focused verification is complete.
- [ ] No in-scope live defect or contract drift is silently deferred.
- [ ] Affected owner docs are synced to the live baseline.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

None currently.

## Closure

Status Note: pending

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: pending

Follow-up:

- no remaining plan-owned work
