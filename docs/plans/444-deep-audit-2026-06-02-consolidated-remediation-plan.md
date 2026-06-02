# 444 Deep Audit 2026-06-02 Consolidated Remediation Plan

> Plan Status: in progress
> Last Reviewed: 2026-06-02
> Source: `docs/analysis/2026-06-02-deep-audit-full/summary.md`, `docs/analysis/2026-06-02-open-ended-adversarial-review-01/round-01.md` through `round-08.md`
> Related: `docs/plans/436-deep-audit-2026-05-24-full-remediation-plan.md` (completed predecessor)

## Purpose

收口 2026-06-02 全量深度审计（33 条 retained findings）和开放式对抗性审查 8 轮（18 条 findings）的全部唯一缺陷，让当前仓库在以下基线上重新可信：

- host contract authority 一致（docs/manifest/runtime 三方对齐）
- state ownership 诚实（单一真源、editing owner、workbook baseline）
- renderer contract 规范（无伪造 props、无私有字段 bypass、无声默 drop）
- data pipeline 正确（compile-once、restartable、serialization fidelity）
- async lifecycle 安全（无 stale commit、无 listener 泄漏、TOCTOU 闭环）
- diagnostic surface 受控（debugger API 不默认暴露、redaction 覆盖）
- accessibility 合规（focus management、ARIA、reduced-motion）

## Current Baseline

- 深度审计 20 维度完成两轮独立复核，最终保留 33 条（P1: 6, P2: 11, P3: 13, P4: 3）。
- 零发现维度（复核确认）：05, 06, 08, 11, 13。
- 开放式对抗性审查 8 轮产出 18 条 finding，其中 2 条与深度审计重叠（R01-F2 ≈ 04-02, R07-F3 ≈ 20-03），去重后 16 条独立 finding。
- 合计唯一 finding 约 49 条。
- 上轮 plan 436（2026-05-24）已 `completed`，修复了 152 条；本轮是增量审计，不重开已关闭项。
- `pnpm check:active-doc-code-anchors` 等 hard gate 已在上轮恢复；本轮无新 P0 hard-gate failure。
- 维度 10 另有 4 条 P0 确认性合规项（10-03 layout renderers 合规、10-04 widget renderers 合规、10-05 cn() 统一导入、10-06 Tailwind v4 @source 正确），不需修复操作，故不列入 workstream。Finding Coverage Matrix 中维度 10 仅计 10-01 一条可操作项。
- 深度审计 summary.md 的维度级计数与详细维度文件存在已知偏差（维度 02 summary 列 2 条但详细文件有 4 条；维度 10 summary 列 P3:4 但详细文件为 P3:1 + P0:4；summary P2 表列入 17-01 但复核已降为 P3）。本计划的 coverage matrix 基于各维度详细文件而非 summary 表。

## Goals

- 修复全部 49 条唯一 findings，按优先级：P1 先行 → P2 → P3 → P4。
- 恢复 docs/manifest/runtime 三方对齐，特别是 Flow Designer、Report Designer host contracts。
- 收口 state ownership：spreadsheet editing owner、report workbook 单一基线。
- 消除 renderer contract 违规：CrudRenderer 伪造、surface dispatch bypass、silent strict-mode drop。
- 修复 data pipeline 正确性：stopWhen compile-once、formula restartable、serialization fidelity、cache key collision。
- 消除 async lifecycle 风险：stale save commit、listener accumulation、StrictMode double-dispatch、validateForm TOCTOU。
- 收口 diagnostic surface：debugger 默认不暴露 automation API。
- 补齐 accessibility：form submit focus、tree ARIA、reduced-motion、z-index 一致。
- 同步所有受影响 owner docs，`docs/architecture/` 只描述最终 live baseline。
- 最终通过仓库级 verification，并由独立 fresh-session reviewer 完成 closure audit。

## Non-Goals

- 不重新打开 plan 436 已关闭的 finding。
- 不重开零发现维度 05/06/08/11/13。
- 不引入 backward-compatibility shim，除非 live repo 已有持久化数据或外部消费者依赖。
- 不把 confirmed live defect、contract drift、hard gate failure 放入 non-blocking follow-up。
- 不为 P3/P4 治理项（文件拆分候选、命名风格统一）阻塞 P1/P2 closure。
- 不重写 flow-designer-core 整个状态层；只补齐与 monorepo 模式不一致的 seam。

## Scope

### In Scope

- 深度审计 33 条 retained findings（summary.md 最终保留集）。
- 对抗性审查 16 条独立 findings（去重后）。
- 受影响的 packages、apps、tests、scripts、owner docs、daily logs。
- 必要 focused tests、static checks、E2E fixes、a11y assertions、docs updates。

### Out Of Scope

- 新一轮 deep audit 或 open-ended adversarial review。
- 新 feature design、visual redesign、large-scale cleanup 与本 finding set 无关者。
- 将本计划拆成大量 one-finding micro-plan。
- flow-designer-core 整体重写为 zustand/vanilla；仅补齐 cross-package consistency seam。

## Priority Policy

- P1: 先修，不能与普通 cleanup 混排。
- P2: 修完后才能宣称当前 supported contract baseline 可信。
- P3: 允许低优先级执行，但不能降级成 optional。
- P4: 治理优化项，可 deferred 但需显式裁定。

## Finding Coverage Matrix

| Workstream | Theme                                                 | Deep Audit IDs                                                | Open-Ended IDs                     | Count  |
| ---------- | ----------------------------------------------------- | ------------------------------------------------------------- | ---------------------------------- | ------ |
| 1          | Package boundaries, naming, cross-package consistency | 01-01, 01-02, 17-01, 17-02, 17-03, 17-04, 18-01, 18-02, 02-N4 | —                                  | 9      |
| 2          | Report Designer host contract and workbook truth      | 04-02, 04-02-A, 04-05, 16-02                                  | R01-F2 (dup 04-02), R01-F3         | 4+1    |
| 3          | Spreadsheet/table editing state and async safety      | 04-01, 04-01-A, 04-03, 04-04                                  | R01-F4                             | 4+1    |
| 4          | Renderer contract normalization and error containment | 09-02, 09-03, 09-04, 19-02                                    | R05-F1, R06-F1, R06-F3             | 4+3    |
| 5          | Data source pipeline safety                           | 15-01, 15-02, 15-03                                           | —                                  | 3      |
| 6          | Async lifecycle, resource management, form validation | —                                                             | R04-F1, R04-F2, R06-F2             | 3      |
| 7          | Serialization, cache, and scope data correctness      | —                                                             | R08-F1, R08-F3, R04-F3             | 3      |
| 8          | Flow Designer contract and interaction                | —                                                             | R01-F1, R08-F2                     | 2      |
| 9          | Debugger security and diagnostic surface              | —                                                             | R02-F1                             | 1      |
| 10         | UI accessibility and styling                          | 20-01, 20-03                                                  | R07-F1, R07-F2, R07-F3 (dup 20-03) | 2+2    |
| 11         | Documentation, module governance, and test hygiene    | 02-N1, 02-N2, 02-N3, 10-01, 16-01, 07-01, 14-04               | —                                  | 7      |
| **Total**  |                                                       | **33**                                                        | **16 unique**                      | **49** |

## Test Strategy

本档选择：**必须自动化**

- P1/P2 finding 涉及 host contract、state ownership、data pipeline、async lifecycle 等核心回归路径，必须先写 failing test 再修。
- P3/P4 finding 中涉及 contract 变更的也需 focused proof。
- 纯文档更新项可标注 `Proof: docs-only verification`。

## Execution Plan

### Workstream 1 - Package Boundaries, Naming, And Cross-Package Consistency

Status: planned
Targets: `packages/flux-renderers-form-advanced`, `packages/word-editor-renderers`, `packages/flux-core`, `packages/flux-bundle`, `packages/flux-react`, `packages/flow-designer-core`, all `package.json` files

- Item Types: `Fix | Decision | Follow-up`

- [ ] **[P1]** Fix `01-02`: move `attachScopeDebugToSchema` from `apps/playground` into a shared test utility or inline it into `array-field-object-items.test.tsx`.
- [ ] **[P2]** Fix `01-01`: replace `import from '../../../flux-react/src/contexts.js'` with `import from '@nop-chaos/flux-react/unstable'` in word-editor test.
- [ ] **[P2]** Fix `17-04`: audit all `dataSource` vs `source` prop usage and document the canonical name mapping; apply normalization where safe.
- [ ] **[P2]** Fix `18-01`: add a minimal zustand/vanilla seam adapter for flow-designer-core state subscription so consumers don't need to know about the closure pattern; document the bridge.
- [ ] **[P3]** Fix `17-01`: clarify `ActionContextRendererEnv` vs `RendererEnv` relationship with a code comment or type alias.
- [ ] **[P3]** Fix `17-02`: evaluate and deprecate `Flux*` prefix aliases in `flux-bundle` if no external consumer depends on them.
- [ ] **[P3]** Fix `17-03`: rename `use-form-hooks.ts` to `useFormHooks.ts`.
- [ ] **[P4]** Fix `18-02`: unify eslint-disable comment style across the repo (automated codemod acceptable).
- [ ] **[P4]** Fix `02-N4`: add `description` field to all 25 `package.json` files.

Exit Criteria:

- [ ] `01-02` no longer reproduces: test file imports only from `@nop-chaos/*` or shared utilities.
- [ ] `01-01` no longer reproduces: test uses public export path.
- [ ] `17-04` has a documented naming mapping and normalization where safe.
- [ ] `18-01` has a documented seam and no consumer directly depends on closure internals.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint` pass.
- [ ] `docs/logs/` updated.

### Workstream 2 - Report Designer Host Contract And Workbook Truth

Status: planned
Targets: `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/report-designer-manifest.ts`, `packages/report-designer-renderers/src/host-action-provider.ts`, `docs/architecture/report-designer/design.md`, `docs/components/report-designer-page/design.md`

- Item Types: `Fix | Decision | Proof`

- [ ] **[P1]** Fix `04-02` + `R01-F2`: select a single workbook owner (spreadsheet runtime when live editing, report snapshot otherwise); unify `buildReportDesignerScopeData` so `reportDocument.spreadsheet.workbook`, top-level `workbook`, and `spreadsheet.workbook` always point to the same canonical baseline.
- [ ] **[P2]** Fix `04-02-A`: align `createHostData` and `buildReportDesignerScopeData` on the same copy-vs-reference strategy (defensive copy for both, or documented shared reference).
- [ ] **[P2]** Fix `R01-F3`: normalize `report-designer:preview`, `report-designer:save`, and `report-designer:exportTemplate` action results into a structured discriminated envelope; update manifest to declare the result shape instead of `unknown`.
- [ ] **[P2]** Fix `16-02`: update `docs/architecture/report-designer/design.md` to reflect the final single-baseline workbook semantics and structured action results.
- [ ] **[P3]** Fix `04-05`: ensure `buildReportDesignerScopeData` workbook references are immutable or defensively copied to prevent accidental mutation of core state.
- [ ] Add focused tests asserting workbook identity, structured results, and immutability.

Exit Criteria:

- [ ] `host-data.test.ts` asserts `reportDocument.spreadsheet.workbook === spreadsheet.workbook === top-level workbook` identity across snapshot scenarios.
- [ ] `createHostData` and `buildReportDesignerScopeData` use consistent copy/reference semantics.
- [ ] Manifest declares structured result shapes for preview/save/exportTemplate instead of `unknown`.
- [ ] Owner docs match live behavior.
- [ ] Focused tests pass.
- [ ] `docs/logs/` updated.

### Workstream 3 - Spreadsheet/Table Editing State And Async Safety

Status: planned
Targets: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts`, `packages/spreadsheet-renderers/src/bridge.ts`, `packages/spreadsheet-core/src/types.ts`, `packages/spreadsheet-core/src/core/internal-state.ts`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`

- Item Types: `Fix | Decision | Proof`

- [ ] **[P2]** Fix `04-01`: converge inline editing session into spreadsheet-core or a designated editing owner; renderer-local state retains only IME/focus/composition DOM transient, not `editingCell`/`editValue`/`editSaveState` business facts.
- [ ] **[P2]** Fix `04-03`: add `editing` to `SpreadsheetHostSnapshot` and bridge selector so adjacent surfaces can consume editing truth.
- [ ] **[P3]** Fix `04-01-A`: either populate `SpreadsheetEditingState` in core or remove the type declaration; don't leave declared-but-never-populated types.
- [ ] **[P3]** Fix `04-04`: add validity check in `commitEditingCell` to verify editing cell coordinates are still within bounds.
- [ ] **[P2]** Fix `R01-F4`: add a generation guard or abort mechanism to `table-quick-edit-controller.runSave()` so stale async completions cannot write into a different record/field than the one that launched the save.
- [ ] Add focused tests for editing owner convergence, bridge editing projection, stale async save rejection.

Exit Criteria:

- [ ] `use-editing.ts` no longer declares `useState`/`useRef` for `editingCell`/`editValue`/`editSaveState`; editing truth consumed from core or designated owner.
- [ ] `SpreadsheetHostSnapshot` includes `editing` field and bridge selector maps it.
- [ ] Table quick-edit save ties async completion to the originating generation (e.g., via request id or AbortController).
- [ ] Focused tests pass.
- [ ] Owner docs updated: `docs/components/spreadsheet-page/design.md`, `docs/architecture/scope-ownership-and-isolation.md`.
- [ ] `docs/logs/` updated.

### Workstream 4 - Renderer Contract Normalization And Error Containment

Status: planned
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-basic/src/use-surface-renderer.ts`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-core/src/value-adapter.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] **[P1]** Fix `09-02`: refactor `CrudRenderer` to stop forging `RendererComponentProps`; extract shared table view/controller layer or use `helpers.render(tableSchema, ...)` through standard path.
- [ ] **[P1]** Fix `09-03`: replace `helpers.dispatch.__actionScope`/`.__componentRegistry` private field access with standard `useCurrentActionScope()`/`useCurrentComponentRegistry()` hooks.
- [ ] **[P2]** Fix `09-04`: surface open/close events (`onOpen`/`onClose`) should receive semantic event payload (surfaceId, kind, open state) instead of being called with zero arguments.
- [ ] **[P2]** Fix `R05-F1`: in strict mode, unknown schema types should produce a diagnostic event or visible placeholder instead of being silently dropped.
- [ ] **[P3]** Fix `R06-F1`: wrap dialog/drawer `titleNode` and `actionsNode` in `SurfaceBodyBoundary` or dedicated boundary so crashes in these regions don't propagate past the dialog.
- [ ] **[P3]** Fix `R06-F3`: wrap runtime creation factories (`createRendererRuntime`, `createPageRuntime`, `createSurfaceRuntime`) in try/catch within `useMemo`/`useRef` to prevent white-screen crashes.
- [ ] **[P3]** Fix `19-02`: extend `AdapterValidationIssue` with `value` and `cause` fields for better debugging.
- [ ] Add focused tests asserting standard path usage, error containment, and diagnostic signaling.

Exit Criteria:

- [ ] `CrudRenderer` uses standard renderer assembly path or shared extracted layer.
- [ ] `useSurfaceRenderer` uses standard hooks, not private field access.
- [ ] Surface events carry semantic payloads.
- [ ] Strict mode produces observable feedback for unknown types.
- [ ] Dialog title/actions and runtime factories are error-contained.
- [ ] Owner docs updated: `docs/architecture/renderer-runtime.md`, `docs/architecture/styling-system.md`.
- [ ] `docs/logs/` updated.

### Workstream 5 - Data Source Pipeline Safety

Status: planned
Targets: `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`, `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`, `packages/flux-compiler/src/source-compiler.ts`, `packages/flux-runtime/src/runtime-eval-helpers.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] **[P1]** Fix `15-02`: stop downgrading `stopWhen` from compiled expression to source string; preserve `CompiledRuntimeValue<boolean>` through registration and poll via `runtime.evaluateCompiled(...)` instead of `runtime.evaluate(string, ...)`.
- [ ] **[P1]** Fix `15-03`: reset `started` flag in `formula-data-source-controller.stop()` and `reset()` so `start()`/`refresh()` work after stop/reset; add stop→start and reset→refresh regression tests.
- [ ] **[P2]** Fix `15-01`: remove null-member special-case in `stopWhen` evaluation error handling; all evaluation errors should enter error state and report to host.
- [ ] Add focused tests for compile-once preservation, restartable lifecycle, and fail-closed error handling.

Exit Criteria:

- [ ] `stopWhen` is never downgraded from compiled to string in the polling path.
- [ ] Formula data-source is restartable after stop/reset.
- [ ] All `stopWhen` evaluation errors enter error state, no silent continue.
- [ ] Focused tests pass.
- [ ] Owner docs updated: `docs/architecture/api-data-source.md`.
- [ ] `docs/logs/` updated.

### Workstream 6 - Async Lifecycle, Resource Management, And Form Validation

Status: planned
Targets: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flux-react/src/node-renderer-effects.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] **[P2]** Fix `R04-F1`: ensure `mergeAbortSignals` cleans up its `abort` listener on `rootSignal` after normal completion (not just on abort); use a completion callback or weak-ref dedup to prevent monotonic listener accumulation.
- [ ] **[P2]** Fix `R04-F2`: add a dedup guard to `useNodeLifecycleActions` so `onMount` doesn't fire twice in React 19 StrictMode; parallel the `lastInitKeyRef` pattern from `form.tsx`.
- [ ] **[P2]** Fix `R06-F2`: close the TOCTOU window in `validateForm` by using functional update or per-form validation lock instead of snapshot-based read-then-replace of `fieldStates`.
- [ ] Add focused tests for listener cleanup, StrictMode dedup, and concurrent validation serialization.

Exit Criteria:

- [ ] `rootSignal` listener count does not grow monotonically with sustained dispatch.
- [ ] `onMount` fires once per mount cycle in StrictMode.
- [ ] Concurrent `validateForm` and `validatePath` do not silently discard error state.
- [ ] Focused tests pass.
- [ ] `docs/logs/` updated.

### Workstream 7 - Serialization, Cache, And Scope Data Correctness

Status: planned
Targets: `packages/flux-runtime/src/scope.ts`, `packages/flux-runtime/src/async-data/api-cache.ts`, `packages/flux-runtime/src/async-data/request-runtime.ts`, `packages/flux-formula/src/evaluator.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] **[P2]** Fix `R08-F1`: add explicit type guards in `sanitizeValue` for `undefined`→`null`, `NaN`→`null`, `Infinity`→`null`, `Date`→ISO string, `Map`/`Set`→plain object/array; add dev-mode warning when non-serializable types are encountered.
- [ ] **[P2]** Fix `R08-F3`: replace `JSON.stringify(value)` in `stableStringifyInternal` and `hashValue64` with explicit type checks that handle `NaN` and `Infinity` as distinct keys; fix `request-runtime.ts` query param serialization similarly.
- [ ] **[P3]** Fix `R04-F3`: block `Object.prototype` method names (`toString`, `valueOf`, `hasOwnProperty`, etc.) in `evaluateMemberTarget` alongside existing `DANGEROUS_MEMBER_KEYS`, or use `hasOwnProperty` guards on member access.
- [ ] Add focused tests for serialization fidelity, cache key uniqueness, and prototype chain blocking.

Exit Criteria:

- [ ] `sanitizeSnapshot` handles all non-JSON-serializable types explicitly.
- [ ] Cache keys for `{ value: NaN }` and `{ value: null }` are distinct.
- [ ] Expression evaluator blocks `Object.prototype` method leaks.
- [ ] Focused tests pass.
- [ ] `docs/logs/` updated.

### Workstream 8 - Flow Designer Contract And Interaction

Status: planned
Targets: `packages/flow-designer-renderers/src/designer-manifest.ts`, `packages/flow-designer-renderers/src/designer-action-provider.ts`, `docs/architecture/flow-designer/api.md`, `packages/flow-designer-core/src/core/node-operations.ts`, `packages/flow-designer-core/src/core-node-commands.ts`, `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-interactions.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] **[P2]** Fix `R01-F1`: align Flow Designer public API doc with live manifest and provider; remove documented but non-existent methods (`designer:openInspector`, `designer:autoLayout`), fix payload key names (`data` vs `patch`, remove `edgeType`), update doc to match actual `designer:*` action surface.
- [ ] **[P2]** Fix `R08-F2`: add coordinate validation (finite check + boundary clamping) in node drag delta application, palette drop position, and direct position assignment; at minimum guard against `NaN`/`Infinity`/negative coordinates.
- [ ] Add focused tests for doc-manifest-provider consistency and coordinate validation.

Exit Criteria:

- [ ] Flow Designer API doc, manifest, and provider agree on all method names and payload shapes.
- [ ] Node positions are validated for finiteness and reasonable bounds.
- [ ] Focused tests pass.
- [ ] Owner docs updated: `docs/architecture/flow-designer/api.md`.
- [ ] `docs/logs/` updated.

### Workstream 9 - Debugger Security And Diagnostic Surface

Status: planned
Targets: `apps/playground/src/App.tsx`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/automation.ts`, `packages/nop-debugger/src/redaction.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] **[P2]** Fix `R02-F1`: change `createNopDebugger` to default `exposeAutomationApi` to `false`; require explicit opt-in for `window.__NOP_DEBUGGER_API__` and `window.__NOP_DEBUGGER_HUB__`; apply redaction to `inspectByCid`/`evaluateNodeExpression` output when automation is enabled.
- [ ] Add focused tests verifying default-off behavior and redaction coverage.

Exit Criteria:

- [ ] Playground does not expose `window.__NOP_DEBUGGER_API__` by default.
- [ ] Inspect/evaluate automation APIs apply redaction when enabled.
- [ ] Focused tests pass.
- [ ] `docs/logs/` updated.

### Workstream 10 - UI Accessibility And Styling

Status: planned
Targets: `packages/flux-renderers-form/src/form/form-renderer.tsx`, `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/ui/src/components/ui/drawer.tsx`, `packages/ui/src/components/ui/` (all animated components)

- Item Types: `Fix | Decision | Proof`

- [ ] **[P2]** Fix `20-01`: add focus management to `FormRenderer` submit failure path — focus the first `aria-invalid="true"` field after validation errors are displayed.
- [ ] **[P2]** Fix `R07-F1`: change Drawer overlay from `z-40` to `z-50` to match all other surface overlays; add theme-contract test asserting uniform z-index across surfaces.
- [ ] **[P2]** Fix `R07-F2`: add `prefers-reduced-motion` support to all animated UI components — either via per-component `motion-reduce:` Tailwind variants or a global CSS rule disabling animations when `prefers-reduced-motion: reduce` is set.
- [ ] **[P3]** Fix `20-03` + `R07-F3`: add `aria-multiselectable` to tree root when multi-select is enabled; add `aria-selected` to each `role="treeitem"` based on `selectedRowKeys`.
- [ ] Add focused tests for focus management, z-index uniformity, reduced-motion, and ARIA attributes.

Exit Criteria:

- [ ] Form submit failure focuses first error field.
- [ ] All surface overlays share the same z-index tier.
- [ ] All animated components respect `prefers-reduced-motion`.
- [ ] Tree ARIA attributes are complete for multi-select mode.
- [ ] Focused tests pass.
- [ ] Owner docs updated: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`.
- [ ] `docs/logs/` updated.

### Workstream 11 - Documentation, Module Governance, And Test Hygiene

Status: planned
Targets: `docs/references/terminology.md`, `packages/spreadsheet-renderers/src/canvas-styles.css`, `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/flux-runtime/src/__tests__/form-runtime-owner.test.ts`, `packages/flux-runtime/src/__tests__/submit-flow.test.ts`

- Item Types: `Follow-up | Decision`

- [ ] **[P3]** Fix `10-01`: add a file-header comment to `canvas-styles.css` explaining the hybrid CSS data-slot pattern and why it diverges from the Tailwind-first convention.
- [ ] **[P3]** Fix `16-01`: add missing terms to `terminology.md` — `ComponentRegistry`, `RuntimeContext`, `FieldFrame`, `Slot`, `ScopeSelector`, and expand the `ActionScope` entry.
- [ ] **[P3]** Fix `02-N1`: evaluate `node-compiler.ts` (690 lines) for extraction into focused sub-modules.
- [ ] **[P3]** Fix `02-N2`: evaluate `action-execution.ts` (675 lines) for extraction into focused sub-modules.
- [ ] **[P3]** Fix `02-N3`: evaluate `page-renderer.tsx` (665 lines) for extraction into focused sub-modules.
- [ ] **[P4]** Fix `07-01`: update audit scan scripts to include `useLayoutEffect` in effect hook searches.
- [ ] **[P4]** Fix `14-04`: evaluate splitting `form-runtime-owner.test.ts` and `submit-flow.test.ts` by scenario.

Exit Criteria:

- [ ] `canvas-styles.css` has explanatory header comment.
- [ ] `terminology.md` covers all 6 identified terms.
- [ ] Large file evaluations are recorded with decision rationale.
- [ ] `docs/logs/` updated.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Workstream 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] All P1 in-scope findings are fixed (01-02, 04-02, 09-02, 09-03, 15-02, 15-03).
- [ ] All P2 in-scope findings are fixed.
- [ ] All P3/P4 in-scope findings are fixed or adjudicated with explicit non-blocking rationale.
- [ ] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [ ] Owner docs are synced to live baseline for every code-affecting workstream.
- [ ] Necessary focused verification is complete and asserts correct final behavior.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Draft Review Record

- Initial draft created 2026-06-02 from deep audit summary + open-ended adversarial review rounds 01-08.
- Pending independent review.

## Deferred But Adjudicated

None at draft time.

## Failure Paths

> 涉及错误处理、API 契约、鉴权/安全边界的 workstream 强烈建议填写。

| 场景                               | 触发                              | 行为                                     | 可重试 | 用户可见表现                             |
| ---------------------------------- | --------------------------------- | ---------------------------------------- | ------ | ---------------------------------------- |
| stopWhen 求值错误                  | 表达式引用 null member 或语法错误 | 进入 error state，上报 host              | 否     | 数据源状态标记 error，轮询停止           |
| formula source stop 后 start       | stop/reset 后调用 start/refresh   | 正常重启（修复后）                       | 是     | 数据恢复刷新                             |
| sanitizeSnapshot 遇到 NaN/Date/Map | scope 写入非 JSON-safe 值         | 转换为 null/ISO string/plain object      | 否     | dev-mode console.warn                    |
| unknown schema type (strict mode)  | schema 引用不存在的 renderer type | 发出 diagnostic event 或显示 placeholder | 否     | 开发者看到 warning 或 dimmed placeholder |
| runtime factory crash              | createRendererRuntime 配置错误    | try/catch 降级为错误 UI                  | 否     | 错误边界 fallback 而非白屏               |
| validateForm concurrent write      | setValue 和 validateForm 同时执行 | functional update 序列化                 | 否     | 无错误丢失                               |
| debugger automation 默认暴露       | playground 加载                   | 不暴露（修复后）                         | N/A    | window 上无 **NOP_DEBUGGER_API**         |

## Execution Notes

- WS5（Data Pipeline）和 WS4（Renderer Contract）无硬依赖，可立即开始。WS3（Spreadsheet Editing）建议在 WS5 完成后或并行执行，因 editing-state 收敛依赖数据源生命周期模式。
- R08-F1（serialization corruption）被对抗性审查评为 High 但本计划归为 P2：corruption 仅在 JSON 序列化边界可见（save/load 周期），不是即时运行时故障或安全漏洞。P2 合理。
- WS11 的 P3 项包含文件拆分评估（02-N1/N2/N3），这些是治理优化而非 live defect。按 anti-slacking 规则，评估结论（拆或不拆）必须明确记录，不能悬而未决。

## Closure

Status Note: <<完成或关闭时填写>>

Closure Audit Evidence:

- Reviewer / Agent: <<独立审阅者或独立子 agent>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<no remaining plan-owned work>>
- Broader advanced-control readOnly sampling after projected owner guards land.
- Full flow-designer-core migration to zustand/vanilla as a separate architectural initiative.
- Performance profiling under large schemas (compilation time, memory, render benchmarks).
- E2E test coverage gap remediation for critical paths without coverage.
- WebSocket/realtime data path security review.
