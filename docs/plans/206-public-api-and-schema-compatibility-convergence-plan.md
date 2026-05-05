# 206 Public API And Schema Compatibility Convergence Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-05
> Source: `docs/analysis/2026-05-05-open-ended-adversarial-review-01/round-05.md`, `docs/analysis/2026-05-05-open-ended-adversarial-review-01/round-07.md`, `docs/architecture/frontend-programming-model.md`, live repo re-audit on 2026-05-05
> Related: `docs/plans/197-architecture-evolution-formula-di-treeshaking-build-config-plan.md`

## Purpose

收敛一组同类、且证据已经足够稳定的 contract debt：root/package public API 与 compile-time schema contract 仍继续暴露 compatibility aliases 或 parallel public surface。计划目标是让这些 surface 回到单一 canonical baseline，而不混入 host projection、surface runtime、或已关闭旧计划 supersession 这类需要单独 owner 的工作。

## Current Baseline

- 顶层架构规则已经明确区分 `Canonical Core Contract`、`Derived Convenience Projection`、`Compatibility Alias`：`docs/architecture/frontend-programming-model.md` 现在要求 compatibility alias 不能再与 canonical contract 平级出现。
- `flux-formula` 仍同时公开两套 registry contract：
  - canonical instance-owned API：`createFormulaRegistry()`
  - process-global mutable API：`registerFunction`、`registerNamespace`、`getFormulaRegistrySnapshot`、`resetFormulaRegistry`
  - `packages/flux-formula/src/registry.ts` 仍把默认实例标为 `for backward compatibility`。
- `nop-debugger` 仍同时公开两套同义 inspect 入口：
  - canonical `inspectByCid(cid)`
  - 同义 alias `inspectNode(cid)`
  - `packages/nop-debugger/src/controller.ts` 中 `inspectNode` 只是 `currentInspectByCid(cid)` 的直接别名。
- CRUD compile-time authoring surface 仍继续接受 legacy aliases：`packages/flux-renderers-data/src/data-schema-validation.ts` 会把 `filter`、`primaryField`、`perPageField`、`bulkActions` lower 到 canonical 字段。
- compiled validation contract 仍继续公开双字段遍历模型：`packages/flux-core/src/types/validation.ts` 导出 `order` 与 `validationOrder`，`packages/flux-core/src/validation-model.ts` 同时写入两者，并继续提供 fallback helper。
- 这些问题共享同一个结果面：public API / compile-time contract 仍在正式支持第二套 vocabulary 或第二套 owner model。它们不依赖 report/spreadsheet host projection、word-editor closed-plan supersession、或 surface-family runtime convergence 才能收口。

## Goals

- 删除 in-scope package public API 中仍在正式支持的 compatibility alias / parallel entrypoint。
- 删除 in-scope compile-time schema contract 中仍在正式支持的 legacy authoring alias / dual-field contract。
- 让 active docs、exported types、helpers、focused tests 对这些 surface 只背书一套 canonical baseline。

## Non-Goals

- 不处理 host projection vocabulary，例如 report/spreadsheet top-level mirrors。
- 不处理 surface-family close vocabulary（`closeSurface` / `closeDialog` / `closeDrawer`）或任何与 plan 201 相关的 reopened work。
- 不处理 word-editor `DataSet*` compatibility alias 的进一步删除；那属于已关闭计划 181 之后的 supersession 议题，必须单独立 successor plan。
- 不处理 data-source convenience projections，如 `hasError` / `hasData` / `isInitialLoading` / `isRefreshing`。
- 不处理功能性 bug、runtime behavior 修复、或跨域架构重做。

## Scope

### In Scope

- `packages/flux-formula/src/{index.ts,registry.ts,compile/formula-compiler.ts,compile/static-eval.ts,evaluator.ts,builtins.ts}` and focused tests/docs affected by registry API convergence
- `packages/nop-debugger/src/{types.ts,controller.ts,automation.ts,index.tsx}` and focused tests/docs affected by inspect API convergence
- `packages/flux-renderers-data/src/data-schema-validation.ts` plus focused CRUD tests/docs affected by legacy authoring alias removal
- `packages/flux-core/src/{types/validation.ts,validation-model.ts}` plus focused validation tests/docs affected by traversal-order field convergence
- affected owner docs under `docs/architecture/`, `docs/components/`, and the execution-day `docs/logs/`

### Out Of Scope

- `packages/word-editor-core/**` and `packages/word-editor-renderers/**`
- `packages/report-designer-renderers/**`
- `packages/spreadsheet-renderers/**`
- `packages/flux-core/src/{constants.ts,types/actions.ts}` and surface-family close-action work
- Flow Designer naming residuals such as `createFlowDesignerRegistry()`
- convenience projections that remain explicitly derived from canonical core state

## Execution Plan

### Phase 1 - Freeze Canonical API And Schema Decisions

Status: planned
Targets: `docs/architecture/frontend-programming-model.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/flux-formula.md`, `docs/architecture/node-level-compile-time-transforms.md`, `docs/architecture/form-validation.md`, `docs/components/crud/design.md`, `docs/references/form-validation-runtime-types.md`, this plan

- Item Types: `Decision | Fix | Proof`

- [ ] Re-audit each in-scope surface and record one explicit canonical contract for formula registry API, debugger inspect API, CRUD authoring vocabulary, and compiled validation traversal order.
- [ ] Explicitly classify every removed surface as `Compatibility Alias` or `Parallel Public Surface`, not as convenience projection.
- [ ] Update active docs so these in-scope surfaces no longer present compatibility aliases or dual-field contracts as supported peers of the canonical contract.

Exit Criteria:

- [ ] Every in-scope subsystem has one named canonical contract and one documented removal target list.
- [ ] Active docs for these in-scope surfaces no longer present compatibility aliases or dual-field contracts as co-equal peers.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Remove Parallel Package Public APIs

Status: planned
Targets: `packages/flux-formula/src/{index.ts,registry.ts,compile/formula-compiler.ts,compile/static-eval.ts,evaluator.ts,builtins.ts}`, `packages/nop-debugger/src/{types.ts,controller.ts,automation.ts,index.tsx}`, focused tests, owner docs including `docs/architecture/flux-formula.md`

- Item Types: `Fix | Proof`

- [ ] Remove process-global formula registry wrappers from the active root public API and converge runtime/compiler/builtin wiring onto the canonical instance-owned registry model.
- [ ] Remove `inspectNode(cid)` from debugger controller/automation/public types and keep `inspectByCid(cid)` as the single canonical inspect entrypoint.
- [ ] Add focused tests proving the surviving canonical APIs still satisfy runtime behavior and package-entry expectations after alias removal.

Exit Criteria:

- [ ] `flux-formula` root public API exposes one registry-extension model, not both instance-local and global mutable owners.
- [ ] debugger automation/controller/public types expose one canonical inspect entrypoint.
- [ ] Focused tests prove canonical package surfaces still work after alias removal.
- [ ] Affected owner docs and execution-day `docs/logs/` entry are updated.

### Phase 3 - Remove Legacy Authoring And Dual-Field Contracts

Status: planned
Targets: `packages/flux-renderers-data/src/data-schema-validation.ts`, `packages/flux-core/src/{types/validation.ts,validation-model.ts}`, focused tests, `docs/components/crud/design.md`, `docs/architecture/node-level-compile-time-transforms.md`, `docs/architecture/form-validation.md`, `docs/references/form-validation-runtime-types.md`

- Item Types: `Fix | Proof`

- [ ] Stop accepting and lowering legacy CRUD authoring fields (`filter`, `primaryField`, `perPageField`, `bulkActions`) in the live authoring transform; keep only canonical CRUD schema fields.
- [ ] Choose one canonical compiled validation traversal field and remove the parallel `order` / `validationOrder` contract from exported types, helpers, docs, and tests.
- [ ] Add focused tests proving canonical CRUD authoring and canonical validation traversal semantics still work, while removed alias paths are no longer treated as supported baseline.

Exit Criteria:

- [ ] CRUD authoring transform no longer accepts the in-scope legacy alias fields as supported input.
- [ ] Compiled validation model exports one traversal-order contract, not two co-equal fields.
- [ ] CRUD and validation owner docs describe only the landed canonical contract.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 4 - Proof And Closure Audit

Status: planned
Targets: focused tests across in-scope packages, affected owner docs, this plan

- Item Types: `Proof | Follow-up`

- [ ] Re-audit the live repo for any remaining in-scope compatibility alias or parallel public surface that survived Phases 2-3.
- [ ] Run required verification for code changes and keep workspace `typecheck` / `build` / `lint` / `test` as hard closure gates.
- [ ] Perform an independent closure audit that checks semantics, not just exported names or deleted lines.

Exit Criteria:

- [ ] No in-scope live compatibility alias or parallel public surface remains in active code/docs/tests.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are green.
- [ ] Independent closure audit evidence is recorded in this plan or the execution-day log.
- [ ] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [ ] All in-scope confirmed compatibility aliases and parallel public surfaces are removed or explicitly adjudicated as out of scope with successor ownership.
- [ ] All in-scope confirmed contract drifts between active docs and live code/tests are resolved.
- [ ] No in-scope live defect or contract drift is silently downgraded to deferred or follow-up.
- [ ] Active docs describe only the final supported canonical contract for the in-scope subsystems.
- [ ] Required focused verification is complete for formula, debugger, CRUD, and validation contract convergence.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Word-Editor Dataset Alias Removal

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `DataSet*` removal would supersede the closed plan-181 compatibility decision and still requires a dedicated successor that owners all remaining live consumers/docs.
- Successor Required: yes
- Successor Path: `docs/plans/207-word-editor-dataset-alias-removal-successor-plan.md`

### Surface Close Vocabulary Reopen

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: this work overlaps surface-family runtime ownership and remains owned by the reactivated `docs/plans/201-surface-family-runtime-convergence-plan.md`, which was confirmed on 2026-05-05 to have never actually started execution before the temporary owner split.
- Successor Required: yes
- Successor Path: `docs/plans/201-surface-family-runtime-convergence-plan.md`

### Host Projection Vocabulary Convergence

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: report/spreadsheet host projection mirrors require separate owner-doc adjudication before any deletion work can be considered in-scope.
- Successor Required: yes
- Successor Path: `docs/plans/208-host-projection-vocabulary-convergence-successor-plan.md`

### Flow Designer Naming Residuals

- Classification: `watch-only residual`
- Why Not Blocking Closure: `createFlowDesignerRegistry()` 等问题在 refined-rubric 下更接近 naming residual，而不是当前确认的 package/schema compatibility defect。
- Successor Required: no

### Data-Source Convenience Projections

- Classification: `watch-only residual`
- Why Not Blocking Closure: `hasError` / `hasData` / `isInitialLoading` / `isRefreshing` 属于可接受的 derived convenience projection；当前需要的是分层说明，而不是删除 helper。
- Successor Required: no

## Non-Blocking Follow-ups

- 后续若继续开放式审查，应优先按“package public API / compile-time schema contract / host projection / runtime family”拆成独立 owner plan，不再把不同 owner surface 混进同一 closure 计划。

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: Pending independent closure audit
- Evidence: Pending

Follow-up:

- no remaining plan-owned work once all in-scope package/schema compatibility convergence lands
