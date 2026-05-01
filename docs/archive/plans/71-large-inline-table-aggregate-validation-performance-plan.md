# 71 Large Inline Table Aggregate Validation Performance Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`, `docs/architecture/performance-design-requirements.md`, `docs/architecture/table-row-identity-and-scope-performance.md`, plus live-code audit of `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/__tests__/form-runtime-performance.test.ts`, `packages/flux-renderers-data/src/table-renderer.tsx`
> Related: `docs/plans/35-form-runtime-performance-and-linkage-implementation-plan.md`, `docs/plans/54-table-row-projection-and-isolation-plan.md`, `docs/plans/68-owner-based-validation-runtime-alignment-plan.md`, `docs/plans/70-composite-value-fields-and-validation-integration-plan.md`

## Purpose

把"大型 inline-edit table + aggregate validation rule"这一已确认的架构风险收口成可执行的 runtime / renderer 策略，使 Flux 在不破坏 compile-time validation graph truth 的前提下，避免把 owner-wide aggregate validation 误用为默认击键路径。

这份计划的完成标准不是"文档已经提醒过有性能风险"，而是以下三件事同时成立：

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

- 当前 runtime 没有一条明确的、产品可依赖的"大表格高频编辑 aggregate validation 默认策略"；现有入口存在，但调用方仍可能退回到 owner-wide validation。
- repo 中没有 focused tests 覆盖"aggregate-heavy large table editing 不默认走 `validateAll('change')`"这一行为边界。
- 当前 `form-runtime-performance.test.ts` 主要验证 commit 数与发布行为，没有建立 aggregate-heavy editable table 的 interaction baseline 或 regression guard。
- table renderer / editable collection integration 侧还没有一个 shared coordination contract，说明 cell edit、row-level edit、aggregate publish boundary 分别该调用哪个 validation API。
- 当前没有明确决定是优先采用"interaction-policy deferral"还是"incremental aggregate algorithm"作为第一阶段落地路径。

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
- 不以"性能优化"为名引入 undocumented shortcut，跳过 aggregate correctness。
- 不重写所有 table/list/tree renderer；只改动 large inline-edit aggregate validation 所需的最小 runtime / renderer glue。
- 不在本计划内承诺完整 benchmark framework 或 production-grade profiling dashboard；focused regression coverage 是必须的，但全面性能基础设施可以属于后续计划。

## Scope

### In Scope

- `docs/architecture/form-validation.md`
- `docs/references/form-validation-execution-details.md`
- `docs/architecture/performance-design-requirements.md` if normative hot-path constraints need sync
- `docs/architecture/table-row-identity-and-scope-performance.md` if table-side integration contract needs sync
- `packages/flux-runtime/src/form-runtime-owner.ts`
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

Status: completed
Targets: docs listed above, `packages/flux-runtime/src/form-runtime-owner.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, table integration call sites

- [x] Re-audit the current runtime and renderer call paths that can be used during table cell editing, and identify where owner-wide validation is currently reachable from ordinary `change` interactions.
- [x] Freeze the shipping strategy for this plan's first closure target:
- [x] explicit deferred aggregate policy (`change` stays local/dependency-aware; broader aggregate runs on `blur` / `commit` / `submit`) — **chosen**
- [x] Document the chosen strategy as the active baseline, including which validation API each table editing boundary should call.
- [x] Decide the minimum supported aggregate rule set for phase-1 optimization scope, with `uniqueBy(...)` required and any additional rules explicitly listed.
- [x] Identify whether the strategy can stay runtime-only, or requires a renderer-facing integration contract for editable table cell events.

Audit findings (recorded 2026-04-12):

- `applyChangesAndRevalidate` in `form-runtime-owner.ts` previously called `validateForm(reason)` unconditionally, including on `reason === 'change'`. This was the identified architecture risk.
- `setValue` (single-field assignment) was always correct: only `revalidateDependents`, no owner-wide validateForm.
- `TableRenderer` (`table-renderer.tsx`) has no editable cell support; Phase 3 table integration has nothing to wire.
- `uniqueBy` is an O(n) full-array scan; if triggered on every keystroke, the cost compounds linearly with row count.
- Chosen strategy: **deferred aggregate policy**. `change` stays local + dependency-aware; `uniqueBy` and other aggregate rules evaluate at `blur` / `commit` / `submit`.

Exit Criteria:

- [x] One reader can answer what validation path a large editable table cell should use on `change`, on `blur`, and on `commit` / `submit`.
- [x] The plan explicitly names the first supported aggregate rule set instead of implying "all aggregate rules maybe optimized later".
- [x] The repo has one clear first-phase strategy rather than mixing deferred policy and half-landed incremental heuristics.

### Phase 2 - Runtime Entry Semantics And Guard Rails

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-owner.ts`, focused runtime tests

- [x] Implement the chosen runtime behavior so aggregate-heavy `change` flows no longer implicitly depend on owner-wide validation.
- [x] Ensure `blur`, `commit`, and `submit` paths still publish full aggregate-correct state for the supported rule set.
- [x] Preserve owner-local supersession semantics so a broader `submit` / `commit` run can supersede older lower-priority `change` work.
- [x] Prove that deferred aggregate validation still occurs at the documented interaction boundaries and is not silently dropped.

Implementation (landed 2026-04-12):

- `applyChangesAndRevalidate` in `packages/flux-runtime/src/form-runtime-owner.ts:170` now short-circuits for `reason === 'change'`: returns the current error snapshot after running `revalidateDependents` without calling `validateForm`.
- All other reasons (`blur`, `commit`, `submit`, `system`) remain unchanged and still call `validateForm(reason)`.
- Three focused tests added to `packages/flux-runtime/src/__tests__/form-runtime-performance.test.ts` in the `applyChangesAndRevalidate deferred-aggregate policy` describe block:
  1. `does not trigger validateForm when reason is change — store commits are bounded`
  2. `triggers full validateForm when reason is blur — uniqueBy aggregate error is published`
  3. `uniqueBy aggregate rule is not evaluated on rapid change — only on blur`

Exit Criteria:

- [x] Runtime behavior no longer relies on `validateAll('change')` as the practical default for aggregate-heavy editing.
- [x] Supported aggregate rules still produce correct owner-local results at the documented publish boundary.
- [x] Focused tests prove the new runtime semantics rather than only method availability.

### Phase 3 - Table Integration Contract

Status: completed (documented as not applicable for current TableRenderer)
Targets: `packages/flux-renderers-data/src/table-renderer.tsx`

Audit finding (2026-04-12): The current `TableRenderer` renders read-only data rows. It has no editable cell surface, no per-cell event handlers, and no validation API calls. There is no integration contract to wire.

Decision: When a cell embeds standard form fields (e.g., via a future `EditableTable` renderer), those fields use the standard form validation contract already defined by this plan. The table renderer itself has no coordination responsibility. Any remaining editable-table renderer work is explicitly out of scope for this plan; it belongs in a successor renderer plan when the need arises.

- [x] Audit table renderer for existing editable cell validation contract.
- [x] Document current state: table renderer has no editable cell surface; standard form field integration applies when cells embed form fields.
- [x] Record remaining editable-table renderer debt as out of scope for this plan.

Exit Criteria:

- [x] Current table renderer integration status is documented.
- [x] Any renderer debt is explicitly moved out of this plan's scope.

### Phase 4 - Focused Regression Coverage And Closure Audit Prep

Status: completed
Targets: runtime tests, affected docs, daily log

- [x] Add aggregate-heavy editable-collection scenario centered on `uniqueBy(...)` that makes the interaction boundary meaningful.
- [x] Verify both correctness and execution policy:
  - [x] `change` path keeps local editing responsive and does not require owner-wide validation by default
  - [x] `blur` publishes aggregate-correct state
  - [x] rapid `change` loop does not trigger `validateForm`; single `blur` does trigger it once
- [x] Add a regression signal (call-count spy via `vi.spyOn`) so future changes cannot silently reintroduce owner-wide keystroke validation.
- [x] Re-sync architecture/reference docs confirmed unchanged — no docs changes required beyond this plan and the daily log.
- [x] Record final verification evidence for closure audit.

Exit Criteria:

- [x] The repo contains plan-owned focused tests for aggregate-heavy editable table validation behavior.
- [x] The tests assert both semantic correctness and the intended interaction policy.
- [x] No remaining debt; table renderer debt explicitly moved out of scope.

## Validation Checklist

- [x] Large editable table validation behavior has one documented default interaction policy.
- [x] Supported aggregate rules remain semantically correct at the documented publish boundary.
- [x] Runtime-focused verification covers aggregate-heavy `change` vs `blur` / `commit` / `submit` behavior.
- [x] Renderer/integration: current table renderer has no editable cell surface; documented as not applicable.
- [x] Related docs stay aligned — no normative doc changes required for this scope.
- [x] `pnpm typecheck` — passed
- [x] `pnpm build` — passed
- [x] `pnpm lint` — passed
- [x] `pnpm test` — passed (478 runtime tests)

## Closure

Status Note: completed 2026-04-12.

### Evidence

**Runtime change** (`packages/flux-runtime/src/form-runtime-owner.ts:170`):
`applyChangesAndRevalidate` now short-circuits for `reason === 'change'`, returning the current error snapshot after `revalidateDependents` without calling `validateForm`. All other reasons proceed as before.

**Focused tests** (`packages/flux-runtime/src/__tests__/form-runtime-performance.test.ts`, `applyChangesAndRevalidate deferred-aggregate policy` describe block):

- Test 1: `change` reason produces ≤ 2 store commits, no `contacts` error published.
- Test 2: `blur` reason with duplicate emails publishes `uniqueBy` error (`rule: 'uniqueBy'`, correct message).
- Test 3: 10 rapid `change` calls produce 0 `validateForm` calls via spy; single `blur` call produces exactly 1 `validateForm` call and correct `uniqueBy` error.

**Verification run** (2026-04-12):

- `pnpm typecheck` — clean
- `pnpm build` — clean
- `pnpm lint` — clean
- `pnpm test` — 478 runtime tests passed

### Successor Scope

Any remaining work is explicitly deferred:

- Full editable-table renderer (`EditableTable`) with per-cell events and aggregate coordination contract belongs in a renderer-focused successor plan, to be created when a concrete product need arises.
- Semantics-preserving incremental aggregate algorithm (e.g., dirty-row-only `uniqueBy` evaluation) is a future optimization, not a correctness gap. The current deferred-aggregate policy is the documented baseline.
