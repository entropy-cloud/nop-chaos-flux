# 166 Module Hygiene And Designer Async Cleanup Plan

> Plan Status: completed
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-01-deep-audit-full-2/02-module-responsibility.md`, `docs/analysis/2026-05-01-deep-audit-full-2/06-async-safety.md`, `docs/analysis/2026-05-01-deep-audit-full-2/10-styling.md`, `docs/analysis/2026-05-01-deep-audit-full-2/11-ui-components.md`
> Related: `docs/plans/165-reactive-subscription-precision-plan.md` (本计划 Phase 1 须先于 Plan 165 Phase 2 落地), `docs/plans/163-core-boundary-and-validation-owner-convergence-plan.md`, `docs/plans/164-adversarial-review-uncovered-findings-remediation-plan.md` (Phase 4 同涉及 crud-renderer-toolbar.tsx，需协调)

## Purpose

消除深度审核中未被 Plans 161-165 覆盖的模块职责、异步安全、样式文档偏差和 UI 规范合规问题。这些问题均为 P1-P2 级别，不影响核心功能但影响长期维护性和开发体验。

## Current Baseline

- `pnpm typecheck`、`pnpm build`、`pnpm lint` 通过
- Plan 165 覆盖 dim 05 响应式订阅精度（P0/P1）
- Plan 163 覆盖 core boundary 和 validation owner
- Plan 164 覆盖 scope 安全、formula 健壮性、表单校验韧性、无障碍和 i18n
- 3 个包的入口文件内联了大量实现代码（dim 02）：flux-renderers-data/index.tsx (326行)、flux-renderers-basic/index.tsx (315行)、flux-formula/index.ts (90行)
- use-table-controls.ts (500行) 包含 5 个完全独立的 hook 未拆分
- 设计器层异步操作缺少取消/清理机制（dim 06）：report-designer-core 是 vanilla Zustand store（非 React 组件），异步操作需 per-operation cancellation + `dispose()` 方法
- `default-spacing.css` 的 marker class 提供了 themeable defaults（gap、padding、flex-direction）—— `docs/architecture/styling-system.md:435` 已允许此行为（"Themeable shipped defaults may be provided by package-owned `@layer base` CSS"），但 AGENTS.md "marker class 零样式" 描述与 styling-system.md 存在矛盾
- 2 处渲染器使用原生 HTML 而非 `@nop-chaos/ui` 组件（dim 11）

## Goals

- 让入口文件收敛为薄入口职责，不再承载大块实现代码
- 让设计器层异步操作有基本的取消和清理机制
- 消除 AGENTS.md 与 styling-system.md 之间关于 marker class 的矛盾描述
- 消除原生 HTML 违规使用

## Non-Goals

- 不拆分 P2 级别的大型编排器文件（schema-compiler.ts 632行等，当前职责清晰）
- 不处理 dim 14 测试质量问题（共享状态泄漏、跨领域大文件、as any 泛滥）—— 由 Plan 167 负责
- 不处理 dim 04 状态所有权 P2 问题（ObjectField 双路径写入、draftValue/savedValue props-to-state）—— 已记录，影响有限

## Scope

### In Scope

| Finding                                                | Severity | File                                                                               | Phase   |
| ------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------- | ------- |
| use-table-controls.ts 5 个独立 hook 未拆分             | P1       | `flux-renderers-data/src/table-renderer/use-table-controls.ts`                     | Phase 1 |
| flux-renderers-data/index.tsx 内联 ~234 行 CRUD 定义   | P1       | `flux-renderers-data/src/index.tsx`                                                | Phase 1 |
| flux-renderers-basic/index.tsx 内联 ~270 行渲染器定义  | P1       | `flux-renderers-basic/src/index.tsx`                                               | Phase 1 |
| flux-formula/index.ts 内联 ~60 行工厂函数实现          | P1       | `flux-formula/src/index.ts`                                                        | Phase 1 |
| report-designer 异步操作无取消（vanilla store）        | P2       | `report-designer-core/src/core.ts`                                                 | Phase 2 |
| source-registry void controller.refresh()              | P2       | `flux-runtime/src/async-data/source-registry.ts:194`                               | Phase 2 |
| detail-view/detail-field void handleConfirm/handleOpen | P2       | `flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `detail-field.tsx` | Phase 2 |
| word-editor 保存无并发保护                             | P2       | `word-editor-renderers/src/word-editor-page.tsx`                                   | Phase 2 |
| flow-designer ELK Layout 无取消                        | P2       | `flow-designer-core/src/elk-layout.ts`                                             | Phase 2 |
| designer-page void handleConfirmCreateDialog           | P2       | `flow-designer-renderers/src/designer-page.tsx:406`                                | Phase 2 |
| AGENTS.md marker class 描述与 styling-system.md 矛盾   | P2       | AGENTS.md, `docs/architecture/styling-system.md`                                   | Phase 3 |
| snippet-panel 原生 button                              | P2       | `flux-code-editor/src/extensions/snippet-panel.tsx:25`                             | Phase 3 |
| crud-renderer-toolbar 原生 label                       | P2       | `flux-renderers-data/src/crud-renderer-toolbar.tsx:84`                             | Phase 3 |

### Out Of Scope

- dim 02-P2 大型文件拆分（编排器，职责清晰）
- dim 14 P1 测试质量（Plan 167 负责）
- dim 04-P2 状态所有权问题
- dim 05-P2 React.memo 包裹

## Sequencing Dependencies

- **本计划 Phase 1 须先于 Plan 165 Phase 2 落地**：本计划将 `use-table-controls.ts` 拆分为 5 个独立文件，Plan 165 Phase 2 的 equalityFn 修改应指向拆分后的 `use-table-pagination.ts`。
- **本计划 Phase 3 crud-renderer-toolbar.tsx 与 Plan 164 Phase 4 有文件重叠**：本计划替换 `<label>` 为 `<Label>`，Plan 164 Phase 4 添加 i18n。建议本计划先落地（结构性修改），Plan 164 后落地（内容修改）。

## Execution Plan

### Phase 1 - Entry File Implementation Extraction (P1)

Status: completed
Targets: `packages/flux-renderers-data/src/`, `packages/flux-renderers-basic/src/`, `packages/flux-formula/src/`

- [x] **use-table-controls.ts** (500行)：拆分为 5 个独立文件：
  - `use-table-pagination.ts` (~83行)
  - `use-table-selection.ts` (~137行)
  - `use-table-sort.ts` (~75行)
  - `use-table-filter.ts` (~173行)
  - `use-table-expand.ts` (~19行)
  - `use-table-controls.ts` 改为 barrel re-export
- [x] **flux-renderers-data/index.tsx** (326行)：将 `dataRendererDefinitions` 数组中的 CRUD entry (~234行) 提取到 `crud-renderer-definition.ts`，其余 table/data-source/chart/tree entries 提取到 `data-renderer-definitions.ts`，index.tsx 只做 re-export + `registerDataRenderers` 函数
- [x] **flux-renderers-basic/index.tsx** (315行)：提取 `basicRendererDefinitions` 数组 (~270行) 到 `basic-renderer-definitions.ts`，index.tsx 只做 re-export + `registerBasicRenderers` 函数
- [x] **flux-formula/index.ts** (90行)：提取 `createExpressionCompiler()` (~60行) 到 `expression-compiler.ts`，index.ts 只做 re-export

Exit Criteria:

- [x] 4 个入口文件只保留薄入口职责（re-export、必要类型导出、registration helper）
- [x] 所有实现代码已移到对应的独立文件
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] 确认相关 `docs/architecture/` 无需更新（纯内部文件拆分，无契约变更）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Designer Async Cleanup (P2)

Status: completed
Targets: `packages/report-designer-core/src/core.ts`, `packages/flux-runtime/src/async-data/source-registry.ts`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/flow-designer-core/src/elk-layout.ts`, `packages/flow-designer-renderers/src/designer-page.tsx`

- [x] **report-designer-core/core.ts**：这是 vanilla Zustand store（非 React 组件），无"组件卸载"事件。为 `refreshDerivedState` 和 `refreshFieldSources` 添加 per-operation AbortController，为 `setSelectionTarget` 复用刷新取消，并为 `createReportDesignerCore` 返回对象添加 `dispose()` 方法用于清理进行中的操作
- [x] **source-registry.ts:194**：subscribe callback 是同步函数，不能使用 `await`。将 `void controller.refresh()` 改为 `controller.refresh().catch((err) => { /* log or handle */ })`，确保 promise rejection 不被静默吞掉
- [x] **detail-view.tsx**：将 `void handleConfirm()` / `void handleOpen()` 添加 `.catch()` 错误处理
- [x] **detail-field.tsx**：同上模式，将 `void handleConfirm()` / `void handleOpen()` 添加 `.catch()` 错误处理
- [x] **word-editor-page.tsx**：为 handleSave 添加并发保护（`isSaving` ref），防止并发保存
- [x] **elk-layout.ts**：ELK 的 `layout()` 方法不支持 AbortSignal。为调用方添加 requestId/stale-result 检查：在 `layoutWithElk` 返回后对比 requestId，过期的结果不应用。在调用方组件卸载时递增 requestId 跳过过期结果
- [x] **designer-page.tsx:406**：将 `void handleConfirmCreateDialog()` 添加 `.catch()` 错误处理

Exit Criteria:

- [x] 7 处异步操作有适当的取消或错误处理机制
- [x] 无新增 `void` 吞掉 promise 的情况
- [x] 为 AbortController/stale-guard 添加测试验证取消行为
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] 确认相关 `docs/architecture/` 或 `docs/components/` 已更新为最终设计状态（或确认无需更新）
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 - Styling Doc Alignment And UI Component Compliance (P2)

Status: completed
Targets: `AGENTS.md`, `docs/architecture/styling-system.md`, `packages/flux-react/src/default-spacing.css`, `packages/flux-code-editor/src/extensions/snippet-panel.tsx`, `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`

- [x] **AGENTS.md marker class 描述**：当前 AGENTS.md 说"Layout renderers emit marker classes ONLY. Markers carry zero visual styles."但 `docs/architecture/styling-system.md:435` 已明确允许 `default-spacing.css` 提供 themeable defaults via `@layer base` CSS。更新 AGENTS.md 描述使其与 styling-system.md 一致：marker classes 默认无样式，但 `flux-react/default-spacing.css` 可通过 `@layer base` 提供主题可调的默认间距
- [x] **snippet-panel.tsx:25**：将原生 `<button>` 替换为 `<Button variant="ghost" size="icon-sm">`。验证 `PopoverTrigger` 的 `render` prop 仍接受该 React element
- [x] **crud-renderer-toolbar.tsx:84**：将原生 `<label>` 替换为 `<Label>`，采用 `htmlFor` + `id` 关联模式避免 wrapping pattern 兼容性问题

Exit Criteria:

- [x] AGENTS.md marker class 描述与 `docs/architecture/styling-system.md` 一致
- [x] 本计划识别的 2 处原生 HTML 已替换为 `@nop-chaos/ui` 组件，且无功能回归
- [x] `pnpm typecheck && pnpm build && pnpm lint && pnpm test` 通过
- [x] `docs/architecture/styling-system.md` 已更新为最终设计状态（无需改动，已是最终状态）
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] 4 个入口文件不再承载大块实现代码
- [x] 7 处异步操作有取消或错误处理
- [x] AGENTS.md 与 styling-system.md 关于 marker class 的描述一致
- [x] 本计划识别的 2 处原生 HTML 违规使用已消除
- [x] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Risks And Rollback

| Risk                                                   | Impact               | Mitigation                                                                                          |
| ------------------------------------------------------ | -------------------- | --------------------------------------------------------------------------------------------------- |
| Entry file 拆分可能影响 barrel export 的 consumers     | 编译错误             | 保持所有 public export 不变，只做内部文件移动                                                       |
| AbortController 取消可能中断设计器操作                 | 用户体验             | 仅在操作重新触发或 dispose 时取消，不影响进行中的正常操作                                           |
| AGENTS.md 描述变更可能被误解为允许所有 marker 带样式   | 设计原则弱化         | 明确限制为仅 `default-spacing.css` 可通过 `@layer base` 提供默认间距，其余 renderer marker 仍无样式 |
| PopoverTrigger `render` prop 与 shadcn Button ref 冲突 | 类型错误或运行时异常 | Phase 3 执行前在 playground 验证替换后的行为                                                        |
| `<label>` wrapping pattern 与 shadcn `<Label>` 不兼容  | 无障碍回归           | 若 wrapping 不支持，改用 `htmlFor` + `id` 关联模式                                                  |
| Plan 164 Phase 4 同修改 crud-renderer-toolbar.tsx      | Merge conflict       | 本计划先落地结构修改，Plan 164 后落地内容修改                                                       |

## Closure

Status Note: Phase 1-3 全部按当前 live repo 落地完成：入口文件已收敛为薄入口 surface，设计器异步路径具备最小取消/错误处理保护，AGENTS 与 styling-system 对 marker class 的约束已一致，本计划识别的原生 HTML 违规点已移除。最终 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 均已通过。

Closure Audit Evidence:

- Reviewer / Agent: `explore` subagent (fresh closure-audit session)
- Evidence: fresh closure audit (`ses_21b345003ffeWAgxAEckIpBBfZ`) re-checked `packages/flux-renderers-data/src/index.tsx`, `packages/flux-renderers-basic/src/index.tsx`, `packages/flux-formula/src/index.ts`, `packages/report-designer-core/src/core.ts`, `packages/flow-designer-core/src/elk-layout.ts`, `packages/flux-code-editor/src/extensions/snippet-panel.tsx`, `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`, focused async regression tests, and final repo-wide verification. Audit verdict: plan is closeable; only wording cleanup was recommended, no remaining plan-owned implementation gaps found.

Follow-up:

- Plan 167 负责 dim 14 P1 测试质量
- dim 04-P2 状态所有权问题（ObjectField 双路径、draftValue/savedValue）可随相关 feature 工作一并修复
- no remaining plan-owned work
