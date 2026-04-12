# 71 Large Inline Table Aggregate Validation Performance Plan

> Plan Status: planned
> Last Reviewed: 2026-04-12
> Source: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`, `docs/architecture/performance-design-requirements.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, plus live-code audit of `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/__tests__/form-runtime-performance.test.ts`, `packages/flux-renderers-data/src/table-renderer.tsx`
> Related: `docs/plans/35-form-runtime-performance-and-linkage-implementation-plan.md`, `docs/plans/54-table-row-projection-and-isolation-plan.md`, `docs/plans/68-owner-based-validation-runtime-alignment-plan.md`, `docs/plans/70-composite-value-fields-and-validation-integration-plan.md`

## Purpose

把“大型 inline-edit table + aggregate validation rule”这一已确认的架构风险收口成可执行的 runtime / renderer 策略，使 Flux 在不破坏 compile-time validation graph truth 的前提下，避免把 owner-wide aggregate validation 误用为默认击键路径。

这份计划的完成标准不是“文档已经提醒过有性能风险”，而是以下三件事同时成立：

1. runtime 对大表格高频编辑有明确且可测试的默认执行路径。
2. aggregate correctness 在 `blur` / `commit` / `submit` 等交互边界仍然保持语义完整。
3. repo 中存在 focused verification，证明实现没有退化成 undocumented shortcut，也没有继续把 `validateAll('change')` 当默认 keystroke baseline。

## Current Baseline

### Implemented And True Today

- `docs/architecture/form-validation.md` 已明确：`validateAll('change')` 不是 large inline-edit tables 的规范性默认击键路径，并允许 deferred / incremental aggregate strategies，只要最终 publish 语义保持一致。
- `docs/references/form-validation-execution-details.md` 已补充大表格 aggregate 交互规则：`change` 可保持 local/dependency-aware，broader aggregate validation 可延后到 `blur` / `commit` / `submit`。
- 当前 `FormRuntime` 已具备 `validateAt(path, reason?)`、`validateSubtree(path, reason?)`、`validateAll(reason?)`、`applyChangesAndRevalidate(...)` 等入口，`submit()` 已存在 owner-local supersession 行为。
- `docs/architecture/table-row-identity-and-scope-performance.md` 已定义 table hot-path 原则：row-local invalidation 默认止于 row boundary，避免全表无差别 churn。

### Missing Or Still Incomplete

- 当前 runtime 没有一条明确的、产品可依赖的“大表格高频编辑 aggregate validation 默认策略”；现有入口存在，但调用方仍可能退回到 owner-wide validation。
- repo 中没有 focused tests 覆盖“aggregate-heavy large table editing 不默认走 `validateAll('change')`”这一行为边界。
- 当前 `form-runtime-performance.test.ts` 主要验证 commit 数与发布行为，没有建立 aggregate-heavy editable table 的 interaction baseline 或 regression guard。
- table renderer / editable collection integration 侧还没有一个 shared coordination contract，说明 cell edit、row-level edit、aggregate publish boundary 分别该调用哪个 validation API。
- 当前没有明确决定是优先采用“interaction-policy deferral”还是“incremental aggregate algorithm”作为第一阶段落地路径。

### Execution Constraint

- 本计划不重开 compile-time validation graph redesign，也不推翻 owner-based validation model。
- 本计划必须优先选择最小可落地策略，先收口默认交互路径和 focused regressions，再决定是否需要更激进的 incremental aggregate implementation。
- 如果 runtime 与 renderer integration 需要拆分实施，剩余工作必须在本计划 closure 前明确归属，而不能模糊留作 future optimization。

## Goals

- 为大 inline-edit table 的高频编辑建立一个明确、默认、可测试的 validation execution policy。
- 在 runtime 和 renderer integration 层落地这一 policy，避免 aggregate-heavy 编辑流误用 owner-wide validation。
- 为 `uniqueBy(...)` 等数组 aggregate 规则建立 focused verification，覆盖 `change`、`blur`、`commit` / `submit` 的 publish boundary。
- 如果第一阶段无法安全落地 semantics-preserving incremental aggregate algorithm，则明确收口为 deferred aggregate policy，并留下清晰 successor scope。

## Non-Goals

- 不在本计划内重做 validation compiler、dependency graph schema、或 owner model 基础设计。
- 不以“性能优化”为名引入 undocumented shortcut，跳过 aggregate correctness。
- 不重写所有 table/list/tree renderer；只改动 large inline-edit aggregate validation 所需的最小 runtime / renderer glue。
- 不在本计划内承诺完整 benchmark framework 或 production-grade profiling dashboard；focused regression coverage 是必须的，但全面性能基础设施可以属于后续计划。

## Scope

### In Scope

- `docs/architecture/form-validation.md`
- `docs/references/form-validation-execution-details.md`
- `docs/architecture/performance-design-requirements.md` if normative hot-path constraints need sync
- `docs/architecture/table-row-identity-and-scope-performance.md` if table-side integration contract needs sync
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-subtree.ts`
- `packages/flux-runtime/src/__tests__/form-runtime-performance.test.ts`
- new focused runtime tests for aggregate-heavy editable collections
- `packages/flux-renderers-data/src/table-renderer.tsx` and any extracted helper files only if needed for the chosen interaction contract
- renderer tests that prove the chosen table-edit validation entry path
- `docs/logs/2026/04-12.md`

### Out Of Scope

- a full generic benchmark harness for all renderers and all validation shapes
- non-table form performance work unrelated to aggregate-heavy editable collections
- redesign of row-key, repeated instance identity, or generic table rendering architecture beyond what this validation policy requires
- cross-owner validation scheduling redesign

## Execution Plan

### Phase 1 - Baseline Audit And Strategy Freeze

Status: planned
Targets: docs listed above, `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, table integration call sites

- [ ] Re-audit the current runtime and renderer call paths that can be used during table cell editing, and identify where owner-wide validation is currently reachable from ordinary `change` interactions.
- [ ] Freeze the shipping strategy for this plan's first closure target:
- [ ] either explicit deferred aggregate policy (`change` stays local/dependency-aware; broader aggregate runs on `blur` / `commit` / `submit`)
- [ ] or semantics-preserving incremental aggregate publish for the supported aggregate rule subset
- [ ] Document the chosen strategy as the active baseline, including which validation API each table editing boundary should call.
- [ ] Decide the minimum supported aggregate rule set for phase-1 optimization scope, with `uniqueBy(...)` required and any additional rules explicitly listed.
- [ ] Identify whether the strategy can stay runtime-only, or requires a renderer-facing integration contract for editable table cell events.

Exit Criteria:

- [ ] One reader can answer what validation path a large editable table cell should use on `change`, on `blur`, and on `commit` / `submit`.
- [ ] The plan explicitly names the first supported aggregate rule set instead of implying “all aggregate rules maybe optimized later”.
- [ ] The repo has one clear first-phase strategy rather than mixing deferred policy and half-landed incremental heuristics.

### Phase 2 - Runtime Entry Semantics And Guard Rails

Status: planned
Targets: `packages/flux-runtime/src/form-runtime.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime-subtree.ts`, focused runtime tests

- [ ] Implement the chosen runtime behavior so aggregate-heavy `change` flows no longer implicitly depend on owner-wide validation.
- [ ] Add explicit guard rails or helper APIs when needed so hosts can request the intended behavior without guessing among `validateAt`, `validateSubtree`, `validateAll`, and `applyChangesAndRevalidate`.
- [ ] Ensure `blur`, `commit`, and `submit` paths still publish full aggregate-correct state for the supported rule set.
- [ ] Preserve owner-local supersession semantics so a broader `submit` / `commit` run can supersede older lower-priority `change` work.
- [ ] If incremental aggregate logic is chosen, prove that the published aggregate result matches the compiled-rule semantics at the supported publish boundary.
- [ ] If deferred aggregate logic is chosen, prove that broader aggregate validation still occurs at the documented interaction boundaries and is not silently dropped.

Exit Criteria:

- [ ] Runtime behavior no longer relies on `validateAll('change')` as the practical default for aggregate-heavy editing.
- [ ] Supported aggregate rules still produce correct owner-local results at the documented publish boundary.
- [ ] Focused tests prove the new runtime semantics rather than only method availability.

### Phase 3 - Table Integration Contract

Status: planned
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`, related helpers/tests, `docs/architecture/table-row-identity-and-scope-performance.md` if needed

- [ ] Wire the chosen validation policy into editable table interaction boundaries: cell `change`, cell `blur`, row commit, and form submit as applicable.
- [ ] Keep row-local invalidation and rendering behavior aligned with the existing row-identity architecture; do not widen render churn just to deliver validation.
- [ ] Avoid per-cell ad hoc validation dispatch logic if a table-level helper or integration layer can own the contract once.
- [ ] Add focused renderer or integration tests showing that editable table interactions call the intended validation entry paths.
- [ ] If the current table renderer does not yet expose the necessary editable coordination surface, land the minimal helper/glue required for this plan and record any remaining renderer debt explicitly.

Exit Criteria:

- [ ] Editable table integration uses the documented validation path for each interaction boundary.
- [ ] Focused tests prove the renderer/integration layer does not regress back to owner-wide keystroke validation by default.
- [ ] Row-local rendering principles remain intact or any necessary deviation is explicitly documented and justified.

### Phase 4 - Focused Regression Coverage And Closure Audit Prep

Status: planned
Targets: runtime tests, renderer tests, affected docs, daily log

- [ ] Add at least one aggregate-heavy editable-table scenario centered on `uniqueBy(...)` with enough rows/cells to make the interaction boundary meaningful.
- [ ] Verify both correctness and execution policy:
- [ ] `change` path keeps local editing responsive and does not require owner-wide validation by default
- [ ] `blur` or `commit` / `submit` publishes aggregate-correct state
- [ ] superseding `submit` / `commit` still wins over older lower-priority validation work
- [ ] If feasible, add a low-cost regression signal such as call-count, entry-path assertion, or bounded traversal expectation so future changes cannot silently reintroduce owner-wide keystroke validation.
- [ ] Re-sync any architecture/reference docs that shifted during implementation.
- [ ] Record final verification evidence needed for a later closure audit.

Exit Criteria:

- [ ] The repo contains plan-owned focused tests for aggregate-heavy editable table validation behavior.
- [ ] The tests assert both semantic correctness and the intended interaction policy.
- [ ] Remaining debt, if any, is either landed or explicitly moved to a successor plan before closure.

## Validation Checklist

- [ ] Large editable table validation behavior has one documented default interaction policy.
- [ ] Supported aggregate rules remain semantically correct at the documented publish boundary.
- [ ] Runtime-focused verification covers aggregate-heavy `change` vs `blur` / `commit` / `submit` behavior.
- [ ] Renderer/integration-focused verification covers editable table call-path behavior.
- [ ] Related docs stay aligned (`form-validation`, execution details, and table/performance docs as needed).
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: not started.

Follow-up:

- If phase-1 closure lands only deferred aggregate policy, move any remaining semantics-preserving incremental aggregate work to a successor plan instead of implying it was included here.
- If table integration reveals broader editable-collection renderer debt outside inline-table aggregate validation, split that debt into a renderer-focused successor plan before closing this one.
