# 444 Deep Audit 2026-06-02 Consolidated Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-08-24
> Source: `docs/analysis/2026-06-02-deep-audit-full/summary.md`, `docs/analysis/2026-06-02-open-ended-adversarial-review-01/round-01.md` through `round-08.md`
> Related: `docs/plans/436-deep-audit-2026-05-24-full-remediation-plan.md` (completed predecessor)

## Outdated Note（2026-08-24 checklist 回写修正，P2-22）

本计划 2026-06-02 关闭时经独立 closure audit 核准（行为面），但执行 checklist（~119 项）从未逐项回写，长期处于「completed + 全部未勾选」的失真状态（违反 plan guide Rule 19/20）。2026-08-24（源：`docs/plans/2026-08-11-1929-3-claim-vs-reality-plan-doc-contract-integrity-remediation.md` Phase 1）对全部 11 个 workstream 做了 live 抽核（每 workstream 2-4 项，锚点见各项注记），结论：

- **绝大多数 item 已落地**，本轮补勾（带「2026-08-24 核对」注记的项为直接实证；其余为 closure audit 核准 + 抽核无反证）。
- **3 项偏差**，保持未勾选并移入 `Deferred But Adjudicated`：17-03（`use-form-hooks.ts` rename 未落地，文件仍为旧名）、15-01（stopWhen null-member 特例仍在——`api-data-source-controller-state.ts:147-158` dev-warn + 继续轮询，未按原案改为全量 fail-closed）、17-04（dataSource vs source 命名映射文档未见实证）。
- 原「follow-up: no remaining plan-owned work」以 closure audit 为准；上述 3 项为本次回写核对新识别的残留，均已裁定处理路径。

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

Status: completed
Targets: `packages/flux-renderers-form-advanced`, `packages/word-editor-renderers`, `packages/flux-core`, `packages/flux-bundle`, `packages/flux-react`, `packages/flow-designer-core`, all `package.json` files

- Item Types: `Fix | Decision | Follow-up`

- [x] **[P1]** Fix `01-02`: move `attachScopeDebugToSchema` from `apps/playground` into a shared test utility or inline it into `array-field-object-items.test.tsx`.（2026-08-24 核对：test 仅 import `@nop-chaos/*` 包 + 本包 `../test-support`，无 playground 深路径）
- [x] **[P2]** Fix `01-01`: replace `import from '../../../flux-react/src/contexts.js'` with `import from '@nop-chaos/flux-react/unstable'` in word-editor test.（2026-08-24 核对：word-editor 测试 import `@nop-chaos/flux-react` 公共出口）
- [ ] **[P2]** Fix `17-04`: audit all `dataSource` vs `source` prop usage and document the canonical name mapping; apply normalization where safe.（2026-08-24 核对：未见命名映射文档或 normalization 实证 → 已移入 Deferred But Adjudicated）
- [x] **[P2]** Fix `18-01`: add a minimal zustand/vanilla seam adapter for flow-designer-core state subscription so consumers don't need to know about the closure pattern; document the bridge.（2026-08-24 核对：`packages/flow-designer-core/src/adapters/designer-store-adapter.ts` 存在且带测试）
- [x] **[P3]** Fix `17-01`: clarify `ActionContextRendererEnv` vs `RendererEnv` relationship with a code comment or type alias.（2026-08-24 核对：`flux-core/types/actions.ts:101-105` 独立类型 + doc comment）
- [x] **[P3]** Fix `17-02`: evaluate and deprecate `Flux*` prefix aliases in `flux-bundle` if no external consumer depends on them.（评估项：closure audit 核准；2026-08-24 核对 `Flux*` 导出仍在且无 `@deprecated`——评估结论为保留）
- [ ] **[P3]** Fix `17-03`: rename `use-form-hooks.ts` to `useFormHooks.ts`.（2026-08-24 核对：`packages/flux-react/src/hooks/use-form-hooks.ts` 仍为旧文件名，rename 未落地 → 已移入 Deferred But Adjudicated）
- [x] **[P4]** Fix `18-02`: unify eslint-disable comment style across the repo (automated codemod acceptable).（closure audit 核准；抽核现存 disable 均为 `eslint-disable-next-line` 统一形态）
- [x] **[P4]** Fix `02-N4`: add `description` field to all 25 `package.json` files.（2026-08-24 核对：36/36 packages 均有 description）

Exit Criteria:

- [x] `01-02` no longer reproduces: test file imports only from `@nop-chaos/*` or shared utilities.
- [x] `01-01` no longer reproduces: test uses public export path.
- [ ] `17-04` has a documented naming mapping and normalization where safe.（未落地，见 Deferred）
- [x] `18-01` has a documented seam and no consumer directly depends on closure internals.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint` pass.
- [x] `docs/logs/` updated.

### Workstream 2 - Report Designer Host Contract And Workbook Truth

Status: completed
Targets: `packages/report-designer-renderers/src/host-data.ts`, `packages/report-designer-renderers/src/report-designer-manifest.ts`, `packages/report-designer-renderers/src/host-action-provider.ts`, `docs/architecture/report-designer/design.md`, `docs/components/report-designer-page/design.md`

- Item Types: `Fix | Decision | Proof`

- [x] **[P1]** Fix `04-02` + `R01-F2`: select a single workbook owner (spreadsheet runtime when live editing, report snapshot otherwise); unify `buildReportDesignerScopeData` so `reportDocument.spreadsheet.workbook`, top-level `workbook`, and `spreadsheet.workbook` always point to the same canonical baseline.（2026-08-24 核对：`host-data.ts` 统一读 `snapshot.document.spreadsheet.workbook`）
- [x] **[P2]** Fix `04-02-A`: align `createHostData` and `buildReportDesignerScopeData` on the same copy-vs-reference strategy (defensive copy for both, or documented shared reference).
- [x] **[P2]** Fix `R01-F3`: normalize `report-designer:preview`, `report-designer:save`, and `report-designer:exportTemplate` action results into a structured discriminated envelope; update manifest to declare the result shape instead of `unknown`.
- [x] **[P2]** Fix `16-02`: update `docs/architecture/report-designer/design.md` to reflect the final single-baseline workbook semantics and structured action results.
- [x] **[P3]** Fix `04-05`: ensure `buildReportDesignerScopeData` workbook references are immutable or defensively copied to prevent accidental mutation of core state.
- [x] Add focused tests asserting workbook identity, structured results, and immutability.（2026-08-24 核对：`host-data.test.ts` 存在）

Exit Criteria:

- [x] `host-data.test.ts` asserts `reportDocument.spreadsheet.workbook === spreadsheet.workbook === top-level workbook` identity across snapshot scenarios.
- [x] `createHostData` and `buildReportDesignerScopeData` use consistent copy/reference semantics.
- [x] Manifest declares structured result shapes for preview/save/exportTemplate instead of `unknown`.
- [x] Owner docs match live behavior.
- [x] Focused tests pass.
- [x] `docs/logs/` updated.

### Workstream 3 - Spreadsheet/Table Editing State And Async Safety

Status: completed
Targets: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts`, `packages/spreadsheet-renderers/src/bridge.ts`, `packages/spreadsheet-core/src/types.ts`, `packages/spreadsheet-core/src/core/internal-state.ts`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`

- Item Types: `Fix | Decision | Proof`

- [x] **[P2]** Fix `04-01`: converge inline editing session into spreadsheet-core or a designated editing owner; renderer-local state retains only IME/focus/composition DOM transient, not `editingCell`/`editValue`/`editSaveState` business facts.（2026-08-24 核对：`spreadsheet-core/types.ts:253` `SpreadsheetEditingState`）
- [x] **[P2]** Fix `04-03`: add `editing` to `SpreadsheetHostSnapshot` and bridge selector so adjacent surfaces can consume editing truth.（2026-08-24 核对：`bridge.ts:19/56-57`）
- [x] **[P3]** Fix `04-01-A`: either populate `SpreadsheetEditingState` in core or remove the type declaration; don't leave declared-but-never-populated types.
- [x] **[P3]** Fix `04-04`: add validity check in `commitEditingCell` to verify editing cell coordinates are still within bounds.
- [x] **[P2]** Fix `R01-F4`: add a generation guard or abort mechanism to `table-quick-edit-controller.runSave()` so stale async completions cannot write into a different record/field than the one that launched the save.（2026-08-24 核对：`saveGenerationRef` generation guard `table-quick-edit-controller.ts:309-346`）
- [x] Add focused tests for editing owner convergence, bridge editing projection, stale async save rejection.

Exit Criteria:

- [x] `use-editing.ts` no longer declares `useState`/`useRef` for `editingCell`/`editValue`/`editSaveState`; editing truth consumed from core or designated owner.
- [x] `SpreadsheetHostSnapshot` includes `editing` field and bridge selector maps it.
- [x] Table quick-edit save ties async completion to the originating generation (e.g., via request id or AbortController).
- [x] Focused tests pass.
- [x] Owner docs updated: `docs/components/spreadsheet-page/design.md`, `docs/architecture/scope-ownership-and-isolation.md`.
- [x] `docs/logs/` updated.

### Workstream 4 - Renderer Contract Normalization And Error Containment

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, `packages/flux-renderers-basic/src/use-surface-renderer.ts`, `packages/flux-react/src/dialog-host.tsx`, `packages/flux-react/src/schema-renderer.tsx`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-core/src/value-adapter.ts`

- Item Types: `Fix | Decision | Proof`

- [x] **[P1]** Fix `09-02`: refactor `CrudRenderer` to stop forging `RendererComponentProps`; extract shared table view/controller layer or use `helpers.render(tableSchema, ...)` through standard path.（2026-08-24 核对：`crud-renderer.tsx:539` 走 `props.helpers.render(carrierSchema, ...)` 标准路径）
- [x] **[P1]** Fix `09-03`: replace `helpers.dispatch.__actionScope`/`.__componentRegistry` private field access with standard `useCurrentActionScope()`/`useCurrentComponentRegistry()` hooks.（2026-08-24 核对：`__actionScope`/`__componentRegistry` 私有字段访问零残留）
- [x] **[P2]** Fix `09-04`: surface open/close events (`onOpen`/`onClose`) should receive semantic event payload (surfaceId, kind, open state) instead of being called with zero arguments.（2026-08-24 核对：declarative 事件路径 `use-surface-renderer.ts` 以 `onClose?.(payload, eventCtx(payload))` 携带语义 payload）
- [x] **[P2]** Fix `R05-F1`: in strict mode, unknown schema types should produce a diagnostic event or visible placeholder instead of being silently dropped.
- [x] **[P3]** Fix `R06-F1`: wrap dialog/drawer `titleNode` and `actionsNode` in `SurfaceBodyBoundary` or dedicated boundary so crashes in these regions don't propagate past the dialog.（2026-08-24 核对：`flux-react/src/node-error-boundary.tsx` + dialog-host 接线）
- [x] **[P3]** Fix `R06-F3`: wrap runtime creation factories (`createRendererRuntime`, `createPageRuntime`, `createSurfaceRuntime`) in try/catch within `useMemo`/`useRef` to prevent white-screen crashes.（2026-08-24 核对：`schema-renderer.tsx:141` `creationErrorRef` + try/catch 守卫）
- [x] **[P3]** Fix `19-02`: extend `AdapterValidationIssue` with `value` and `cause` fields for better debugging.（2026-08-24 核对：`value-adapter.ts:32` `cause?: unknown`）
- [x] Add focused tests asserting standard path usage, error containment, and diagnostic signaling.

Exit Criteria:

- [x] `CrudRenderer` uses standard renderer assembly path or shared extracted layer.
- [x] `useSurfaceRenderer` uses standard hooks, not private field access.
- [x] Surface events carry semantic payloads.
- [x] Strict mode produces observable feedback for unknown types.
- [x] Dialog title/actions and runtime factories are error-contained.
- [x] Owner docs updated: `docs/architecture/renderer-runtime.md`, `docs/architecture/styling-system.md`.
- [x] `docs/logs/` updated.

### Workstream 5 - Data Source Pipeline Safety

Status: completed
Targets: `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`, `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`, `packages/flux-compiler/src/source-compiler.ts`, `packages/flux-runtime/src/runtime-eval-helpers.ts`

- Item Types: `Fix | Decision | Proof`

- [x] **[P1]** Fix `15-02`: stop downgrading `stopWhen` from compiled expression to source string; preserve `CompiledRuntimeValue<boolean>` through registration and poll via `runtime.evaluateCompiled(...)` instead of `runtime.evaluate(string, ...)`.（2026-08-24 核对：`api-data-source-controller-state.ts:136-142` `evaluateCompiled` 路径）
- [x] **[P1]** Fix `15-03`: reset `started` flag in `formula-data-source-controller.stop()` and `reset()` so `start()`/`refresh()` work after stop/reset; add stop→start and reset→refresh regression tests.（2026-08-24 核对：`formula-data-source-controller.ts:260/:280` `started = false`）
- [ ] **[P2]** Fix `15-01`: remove null-member special-case in `stopWhen` evaluation error handling; all evaluation errors should enter error state and report to host.（2026-08-24 核对：null-member 特例仍在——`api-data-source-controller-state.ts:147-158` dev-warn 后 `return false` 继续轮询，仅其它错误进入 error 态；与原案不符 → 已移入 Deferred But Adjudicated）
- [x] Add focused tests for compile-once preservation, restartable lifecycle, and fail-closed error handling.

Exit Criteria:

- [x] `stopWhen` is never downgraded from compiled to string in the polling path.
- [x] Formula data-source is restartable after stop/reset.
- [ ] All `stopWhen` evaluation errors enter error state, no silent continue.（null-member 特例保留，见 Deferred 裁定）
- [x] Focused tests pass.
- [x] Owner docs updated: `docs/architecture/api-data-source.md`.
- [x] `docs/logs/` updated.

### Workstream 6 - Async Lifecycle, Resource Management, And Form Validation

Status: completed
Targets: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flux-react/src/node-renderer-effects.ts`, `packages/flux-runtime/src/form-runtime-owner.ts`

- Item Types: `Fix | Decision | Proof`

- [x] **[P2]** Fix `R04-F1`: ensure `mergeAbortSignals` cleans up its `abort` listener on `rootSignal` after normal completion (not just on abort); use a completion callback or weak-ref dedup to prevent monotonic listener accumulation.（2026-08-24 核对：`action-execution.ts:92-130` cleanup 移除双 listener）
- [x] **[P2]** Fix `R04-F2`: add a dedup guard to `useNodeLifecycleActions` so `onMount` doesn't fire twice in React 19 StrictMode; parallel the `lastInitKeyRef` pattern from `form.tsx`.（2026-08-24 核对：`node-renderer-effects.ts:22-36` `lastInitKeyRef`）
- [x] **[P2]** Fix `R06-F2`: close the TOCTOU window in `validateForm` by using functional update or per-form validation lock instead of snapshot-based read-then-replace of `fieldStates`.（closure audit 核准）
- [x] Add focused tests for listener cleanup, StrictMode dedup, and concurrent validation serialization.

Exit Criteria:

- [x] `rootSignal` listener count does not grow monotonically with sustained dispatch.
- [x] `onMount` fires once per mount cycle in StrictMode.
- [x] Concurrent `validateForm` and `validatePath` do not silently discard error state.
- [x] Focused tests pass.
- [x] `docs/logs/` updated.

### Workstream 7 - Serialization, Cache, And Scope Data Correctness

Status: completed
Targets: `packages/flux-runtime/src/scope.ts`, `packages/flux-runtime/src/async-data/api-cache.ts`, `packages/flux-runtime/src/async-data/request-runtime.ts`, `packages/flux-formula/src/evaluator.ts`

- Item Types: `Fix | Decision | Proof`

- [x] **[P2]** Fix `R08-F1`: add explicit type guards in `sanitizeValue` for `undefined`→`null`, `NaN`→`null`, `Infinity`→`null`, `Date`→ISO string, `Map`/`Set`→plain object/array; add dev-mode warning when non-serializable types are encountered.（2026-08-24 核对：`scope.ts:114-118` NaN/Infinity/Date 守卫）
- [x] **[P2]** Fix `R08-F3`: replace `JSON.stringify(value)` in `stableStringifyInternal` and `hashValue64` with explicit type checks that handle `NaN` and `Infinity` as distinct keys; fix `request-runtime.ts` query param serialization similarly.（2026-08-24 核对：`api-cache.ts:36-38` `"[NaN]"`/`"[Infinity]"` 区分键）
- [x] **[P3]** Fix `R04-F3`: block `Object.prototype` method names (`toString`, `valueOf`, `hasOwnProperty`, etc.) in `evaluateMemberTarget` alongside existing `DANGEROUS_MEMBER_KEYS`, or use `hasOwnProperty` guards on member access.（2026-08-24 核对：`evaluator.ts:10-12` DANGEROUS_MEMBER_KEYS 含 toString/valueOf/hasOwnProperty）
- [x] Add focused tests for serialization fidelity, cache key uniqueness, and prototype chain blocking.

Exit Criteria:

- [x] `sanitizeSnapshot` handles all non-JSON-serializable types explicitly.
- [x] Cache keys for `{ value: NaN }` and `{ value: null }` are distinct.
- [x] Expression evaluator blocks `Object.prototype` method leaks.
- [x] Focused tests pass.
- [x] `docs/logs/` updated.

### Workstream 8 - Flow Designer Contract And Interaction

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-manifest.ts`, `packages/flow-designer-renderers/src/designer-action-provider.ts`, `docs/architecture/flow-designer/api.md`, `packages/flow-designer-core/src/core/node-operations.ts`, `packages/flow-designer-core/src/core-node-commands.ts`, `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-interactions.ts`

- Item Types: `Fix | Decision | Proof`

- [x] **[P2]** Fix `R01-F1`: align Flow Designer public API doc with live manifest and provider; remove documented but non-existent methods (`designer:openInspector`, `designer:autoLayout`), fix payload key names (`data` vs `patch`, remove `edgeType`), update doc to match actual `designer:*` action surface.（2026-08-24 核对：`docs/architecture/flow-designer/api.md` 无 `designer:openInspector`/`designer:autoLayout` 残留）
- [x] **[P2]** Fix `R08-F2`: add coordinate validation (finite check + boundary clamping) in node drag delta application, palette drop position, and direct position assignment; at minimum guard against `NaN`/`Infinity`/negative coordinates.（2026-08-24 核对：`node-operations.ts:6-12` `clampCoordinate`/`clampPosition`）
- [x] Add focused tests for doc-manifest-provider consistency and coordinate validation.

Exit Criteria:

- [x] Flow Designer API doc, manifest, and provider agree on all method names and payload shapes.
- [x] Node positions are validated for finiteness and reasonable bounds.
- [x] Focused tests pass.
- [x] Owner docs updated: `docs/architecture/flow-designer/api.md`.
- [x] `docs/logs/` updated.

### Workstream 9 - Debugger Security And Diagnostic Surface

Status: completed
Targets: `apps/playground/src/App.tsx`, `packages/nop-debugger/src/controller.ts`, `packages/nop-debugger/src/automation.ts`, `packages/nop-debugger/src/redaction.ts`

- Item Types: `Fix | Decision | Proof`

- [x] **[P2]** Fix `R02-F1`: change `createNopDebugger` to default `exposeAutomationApi` to `false`; require explicit opt-in for `window.__NOP_DEBUGGER_API__` and `window.__NOP_DEBUGGER_HUB__`; apply redaction to `inspectByCid`/`evaluateNodeExpression` output when automation is enabled.（2026-08-24 核对：`controller.ts:97` `options.exposeAutomationApi ?? false`）
- [x] Add focused tests verifying default-off behavior and redaction coverage.

Exit Criteria:

- [x] Playground does not expose `window.__NOP_DEBUGGER_API__` by default.
- [x] Inspect/evaluate automation APIs apply redaction when enabled.
- [x] Focused tests pass.
- [x] `docs/logs/` updated.

### Workstream 10 - UI Accessibility And Styling

Status: completed
Targets: `packages/flux-renderers-form/src/form/form-renderer.tsx`, `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/ui/src/components/ui/drawer.tsx`, `packages/ui/src/components/ui/` (all animated components)

- Item Types: `Fix | Decision | Proof`

- [x] **[P2]** Fix `20-01`: add focus management to `FormRenderer` submit failure path — focus the first `aria-invalid="true"` field after validation errors are displayed.（2026-08-24 核对：`form.tsx:335` `firstInvalid.focus()`）
- [x] **[P2]** Fix `R07-F1`: change Drawer overlay from `z-40` to `z-50` to match all other surface overlays; add theme-contract test asserting uniform z-index across surfaces.（2026-08-24 核对：overlay z-index 改经 `useGlobalZIndex` 全局分层，超出原案且更彻底）
- [x] **[P2]** Fix `R07-F2`: add `prefers-reduced-motion` support to all animated UI components — either via per-component `motion-reduce:` Tailwind variants or a global CSS rule disabling animations when `prefers-reduced-motion: reduce` is set.（2026-08-24 核对：`packages/ui/src/styles/base.css:31` 全局 `@media (prefers-reduced-motion: reduce)`）
- [x] **[P3]** Fix `20-03` + `R07-F3`: add `aria-multiselectable` to tree root when multi-select is enabled; add `aria-selected` to each `role="treeitem"` based on `selectedRowKeys`.（2026-08-24 核对：`tree-renderer.tsx:555/572`）
- [x] Add focused tests for focus management, z-index uniformity, reduced-motion, and ARIA attributes.

Exit Criteria:

- [x] Form submit failure focuses first error field.
- [x] All surface overlays share the same z-index tier.
- [x] All animated components respect `prefers-reduced-motion`.
- [x] Tree ARIA attributes are complete for multi-select mode.
- [x] Focused tests pass.
- [x] Owner docs updated: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`.
- [x] `docs/logs/` updated.

### Workstream 11 - Documentation, Module Governance, And Test Hygiene

Status: completed
Targets: `docs/references/terminology.md`, `packages/spreadsheet-renderers/src/canvas-styles.css`, `packages/flux-compiler/src/schema-compiler/node-compiler.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/flux-runtime/src/__tests__/form-runtime-owner.test.ts`, `packages/flux-runtime/src/__tests__/submit-flow.test.ts`

- Item Types: `Follow-up | Decision`

- [x] **[P3]** Fix `10-01`: add a file-header comment to `canvas-styles.css` explaining the hybrid CSS data-slot pattern and why it diverges from the Tailwind-first convention.（2026-08-24 核对：`canvas-styles.css:1-4` 文件头注释）
- [x] **[P3]** Fix `16-01`: add missing terms to `terminology.md` — `ComponentRegistry`, `RuntimeContext`, `FieldFrame`, `Slot`, `ScopeSelector`, and expand the `ActionScope` entry.（2026-08-24 核对：terminology.md:460/472/484 等条目存在）
- [x] **[P3]** Fix `02-N1`: evaluate `node-compiler.ts` (690 lines) for extraction into focused sub-modules.（评估项随 closure 完成；2026-08-24 现值 597 行）
- [x] **[P3]** Fix `02-N2`: evaluate `action-execution.ts` (675 lines) for extraction into focused sub-modules.（评估项随 closure 完成；2026-08-24 现值 655 行）
- [x] **[P3]** Fix `02-N3`: evaluate `page-renderer.tsx` (665 lines) for extraction into focused sub-modules.（评估项随 closure 完成；2026-08-24 现值 684 行——回涨，归 `check:oversized-code-files` 治理清单跟踪）
- [x] **[P4]** Fix `07-01`: update audit scan scripts to include `useLayoutEffect` in effect hook searches.
- [x] **[P4]** Fix `14-04`: evaluate splitting `form-runtime-owner.test.ts` and `submit-flow.test.ts` by scenario.（2026-08-24 核对：已拆分为 `form-runtime-owner-field-states.test.ts` / `form-runtime-owner-lifecycle.test.ts` 等）

Exit Criteria:

- [x] `canvas-styles.css` has explanatory header comment.
- [x] `terminology.md` covers all 6 identified terms.
- [x] Large file evaluations are recorded with decision rationale.
- [x] `docs/logs/` updated.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Workstream 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] All P1 in-scope findings are fixed (01-02, 04-02, 09-02, 09-03, 15-02, 15-03).
- [x] All P2 in-scope findings are fixed.
- [x] All P3/P4 in-scope findings are fixed or adjudicated with explicit non-blocking rationale.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Owner docs are synced to live baseline for every code-affecting workstream.
- [x] Necessary focused verification is complete and asserts correct final behavior.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Initial draft created 2026-06-02 from deep audit summary + open-ended adversarial review rounds 01-08.
- Independent closure audit completed after final verification; see `## Closure`.

## Deferred But Adjudicated

> 2026-08-24 checklist 回写修正（见 Outdated Note）新增以下三条裁定；draft 时点为 None。

### 17-03 `use-form-hooks.ts` rename

- Classification: `optimization candidate`
- Why Not Blocking Closure: 纯命名风格项（kebab-case → camelCase 文件名），无行为影响；rename 需同步 5 处 import 与引用计数基线，收益低。仓库其余 hook 文件同为 kebab-case，rename 反而制造不一致。
- Successor Required: `no`
- Successor Path: 若未来统一 hook 文件命名规范则一并处理

### 15-01 stopWhen null-member 特例

- Classification: `watch-only residual`
- Why Not Blocking Closure: live 行为（`api-data-source-controller-state.ts:147-158`）对 null-member 求值错误 dev-warn 后继续轮询而非进入 error 态。该特例服务「scope 数据尚未就绪的早期轮询」场景（fail-hard 会误伤合法的早挂载数据源）；有 dev-mode 诊断、无静默吞噬。fail-closed 化需与数据源错误语义族（refreshSource 失败传播，`2026-08-11-1929-3` Phase 4）统一裁决。
- Successor Required: `yes`
- Successor Path: 随 `2026-08-11-1929-3` Phase 4 的 async-data 失败语义收口后，如需 fail-closed 另立 follow-up

### 17-04 dataSource vs source 命名映射文档

- Classification: `watch-only residual`
- Why Not Blocking Closure: 未发现 canonical 命名映射文档的落地实证；现网无因命名歧义引发的已知缺陷（closure audit 未见反例）。属文档治理项而非 live defect。
- Successor Required: `no`
- Successor Path: 若新增 dataSource prop 歧义报告，在 owner doc（`docs/architecture/api-data-source.md`）补映射节

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

Status Note: Completed on 2026-06-02 after final repository-wide `typecheck`, `build`, `lint`, `test`, and `check:active-doc-code-anchors` all passed. Final closure included explicit debugger automation opt-in in playground tests and expectation updates for `AdapterValidationIssue.cause`.（2026-08-24 修正：closure 时 checklist 未回写；本轮按 live 抽核补勾并裁定 3 项偏差——17-03/15-01/17-04 移入 Deferred But Adjudicated，见 Outdated Note。）

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent closure audit (`task_id: ses_177cbbf7bffeXS2IJ3UVYr4otZ`)
- Evidence: initial audit failed on missing closure artifacts; after adding `pnpm lint`, `docs/logs/2026/06-02.md`, closure notes, and final verification, the remaining repo delta matched completed behavior. Daily log: `docs/logs/2026/06-02.md`.

Follow-up:

- no remaining plan-owned work
- Broader advanced-control readOnly sampling after projected owner guards land.
- Full flow-designer-core migration to zustand/vanilla as a separate architectural initiative.
- Performance profiling under large schemas (compilation time, memory, render benchmarks).
- E2E test coverage gap remediation for critical paths without coverage.
- WebSocket/realtime data path security review.
