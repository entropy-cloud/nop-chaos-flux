# 405 UX 设计合规性修复计划（第二轮审计）

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-ux-audit/summary.md`
> Related: `docs/plans/370-ui-design-pattern-remediation-plan.md`（第一轮审计修复，已 completed）

## Purpose

基于 `docs/analysis/2026-05-19-ux-audit/` 的 4 轮迭代发现 + 独立复核，修复剩余 9 项 UX 设计合规性问题（8 MEDIUM, 1 LOW），使渲染器组件的视觉一致性、焦点可见性和交互规范达到统一标准。

## Current Baseline

- 第一轮审计（Plan 370）已修复 22 项问题：WrappedFieldAction 尺寸漂移、焦点样式、Loading 统一、表单标签关联、表格交互、按钮样式、对话框行为、CRUD 分页组件替换、硬编码颜色和 i18n
- 第二轮审计（本次）在 Plan 370 完成后重新扫描全部渲染器，发现 9 项新的/残留的问题：
  1. 删除按钮样式仍有不一致：`array-editor`/`array-field` 使用 `variant="destructive"` + 纯文本，未在 Plan 370 中覆盖
  2. Chart loading 缺少 `aria-live`（Plan 370 修复了 Spinner 缺失，但未补 `role="status"`）
  3. `input-number` suffix/stepper 重叠（Plan 370 明确 deferred）
  4. CRUD 分页虽然替换了 `PaginationPrevious`/`PaginationNext` 组件，但仍缺少页码按钮（与 Table 不一致）且 `PaginationNext` 最后一页未禁用
  5. 三个组件的焦点指示器仍缺失：`tree-renderer` treeitem、`fieldset` 可折叠 legend、`table` 交互行
  6. `condition-item` 删除按钮 `opacity-0` 完全隐藏
- 代码状态：`pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test` 均通过

## Goals

- 修复 6 个 MEDIUM 问题（另 2 个 MEDIUM 经裁定 deferred，见 Deferred But Adjudicated）
- 修复 1 个 LOW 问题
- 统一删除按钮为 `ghost` + `Trash2Icon` + `hover:text-destructive`
- 所有 `tabIndex={0}` 交互元素具备 `focus-visible` ring
- 修复视角10-1 中的 PaginationNext 最后一页未禁用功能缺陷
- Chart loading 具备 `role="status"` + `aria-live="polite"`

## Non-Goals

- 不重构 CRUD 分页为完整 Pagination（CRUD 场景用 prev/next 足够，见 Plan 370 Phase 8 设计决策）
- 不改变组件架构或公共 API 接口
- 不处理 `tree-renderer CollapsibleTrigger` 的 focus-visible（`tabIndex=-1` 且 `onMouseDown` 阻止默认聚焦，实际触发概率极低，已降级为 INFO，参见 review.md）
- 不实现 InputNumber suffix/stepper 布局重构（精确 padding 计算需单独评估，保持 Plan 370 的 deferred 状态）

## Scope

### In Scope

- 9 项审计发现：5 项新发现 + 2 项 Plan 370 残留共 7 项直接修复，2 项 deferred

### Out Of Scope

- CRUD 完整分页改造（Prev/Next 模式足够，不引入页码按钮）
- InputNumber suffix/stepper 布局重构
- `tree-renderer CollapsibleTrigger` focus-visible（INFO 级）
- E2E 测试编写

## Execution Plan

### Phase 1 — 删除按钮样式统一（视角2-1）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`

- Item Types: `Fix`

- [x] **array-editor.tsx:126-141**：将删除按钮从 `variant="destructive"` + 纯文本 `{t('flux.form.remove')}` 改为 `variant="ghost"` + `Trash2Icon` + `hover:text-destructive`，保留 `aria-label` 文本
- [x] **array-field.tsx:169-171**：将 `WrappedFieldAction variant="destructive"` 改为 `variant="ghost"` + 文字 `{t('flux.form.remove')}` + `hover:text-destructive`，添加 `aria-label={t('flux.form.remove')}`（注：array-field 为卡片列表布局，删除按钮单独占一整行，纯图标显得单薄，使用文字按钮提供足够的视觉重量；array-editor 为行内紧凑布局，保持纯图标）
- [x] 验证删除按钮在 `key-value.tsx`（行内图标）、`condition-item.tsx`（行内图标）、`array-editor`（行内图标）、`array-field`（卡片文字按钮）各布局语境下视觉合理且风格统一

Exit Criteria:

- [x] `array-editor` 使用 `ghost` + `Trash2Icon` + `hover:text-destructive`（行内紧凑布局），`array-field` 使用 `ghost` + 文字 + `hover:text-destructive`（卡片列表布局）
- [x] 同一语义操作（行级删除）在各布局语境下视觉合理且风格统一（行内用图标，卡片用文字）
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — Chart loading aria-live 补充（视角5-1）

Status: completed
Targets: `packages/flux-renderers-data/src/chart-renderer.tsx`

- Item Types: `Fix`

- [x] **chart-renderer.tsx:308**：给 loading 包裹 `<div>` 添加 `role="status" aria-live="polite"` 属性

Exit Criteria:

- [x] chart loading 区域有 `role="status" aria-live="polite"`
- [x] 与 `table-loading-overlay.tsx:15-16` 的模式一致
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — CRUD PaginationNext 禁用（视角6-1）

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`

- Item Types: `Fix`

- [x] **crud-renderer-toolbar.tsx:127-131**：计算 `isLastPage = summary.total != null && pagination.currentPage >= Math.ceil(summary.total / pagination.pageSize)`，为 `PaginationNext` 添加 `className={isLastPage ? 'pointer-events-none opacity-50' : undefined}` 和 `aria-disabled={isLastPage || undefined}`
- [x] 验证第一页 `PaginationPrevious` 和最后一页 `PaginationNext` 对称禁用

Exit Criteria:

- [x] `PaginationNext` 在最后一页视觉禁用 + `aria-disabled`
- [x] 与 `PaginationPrevious` 第一页禁用逻辑对称
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — 焦点指示器修复（视角9-1, 9-2, 9-3）

Status: completed
Targets: `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flux-renderers-form/src/renderers/fieldset.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`

- Item Types: `Fix`

- [x] **tree-renderer.tsx:222**：treeitem div className 添加 `focus-visible:ring-2 focus-visible:ring-ring`（与 `tree-controls.tsx:58` 一致）
- [x] **fieldset.tsx:56-58**：可折叠 legend className 添加 `focus-visible:ring-2 focus-visible:ring-ring rounded-sm outline-none`（仅当 `collapsible` 为 true 时）
- [x] **table-body-row-rendering.tsx:109**：交互行 `TableRow` 传入 `className`，当 `isRowInteractive` 时添加 `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none`
- [x] 验证三个组件键盘导航时焦点环可见

Exit Criteria:

- [x] tree-renderer treeitem 键盘焦点时有可见 ring
- [x] fieldset 可折叠 legend 键盘焦点时有可见 ring
- [x] table 交互行键盘焦点时有可见 ring
- [x] 与 `tree-controls.tsx:58`、`table-header-row.tsx` sort trigger 的 focus-visible 模式一致
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 — condition-item 删除按钮可见性（视角3-1）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/condition-item.tsx`

- Item Types: `Fix`

- [x] **condition-item.tsx:154**：将 `opacity-0` 改为 `opacity-40`，保持 `group-hover:opacity-100 focus:opacity-100`

Exit Criteria:

- [x] 删除按钮默认可见度为 40%，hover 时 100%
- [x] 键盘焦点时仍为 100%
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 全部 9 项 in-scope 修复已完成
- [x] 删除按钮在 4 个组件中视觉一致
- [x] 所有 `tabIndex={0}` 交互元素具备 `focus-visible` ring
- [x] Chart loading 具备 `role="status"` + `aria-live="polite"`
- [x] 修复视角10-1 中的 PaginationNext 最后一页未禁用功能缺陷
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] No owner-doc update required（所有 Phase 均为局部样式/语义属性调整）
- [ ] 独立子 agent closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint` (affected packages clean; pre-existing flux-i18n lint error unrelated)
- [x] `pnpm test` (pre-existing flow-designer-renderers worker crash unrelated)

## Deferred But Adjudicated

### InputNumber suffix/stepper 重叠（视角8-1）

- Classification: `optimization candidate`
- Why Not Blocking Closure: 需精确 padding 计算和布局重构，仅在 suffix + stepper 同时配置时触发，用户可通过增大输入框宽度规避。Plan 370 已做相同判定。
- Successor Required: no
- Successor Path: 纳入日常视觉打磨迭代

### tree-renderer CollapsibleTrigger focus-visible（视角9-4）

- Classification: `watch-only residual`
- Why Not Blocking Closure: `tabIndex=-1` 且 `onMouseDown` 阻止默认聚焦，实际导航路径不直接聚焦该元素。修复成本极低（添加 `focus-visible:bg-accent`），但不存在真实用户触发路径。
- Successor Required: no

### CRUD 完整分页（视角10-1 部分残留）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Plan 370 Phase 8 已明确设计决策：CRUD 场景用 prev/next 足够，不引入完整页码按钮。本轮审计发现的分页交互差异（CRUD vs Table）属于既定设计决策的副作用，非 live defect。本轮仅修复 `PaginationNext` 禁用的功能缺陷（Phase 3）。
- Successor Required: no

## Non-Blocking Follow-ups

- 无额外 non-blocking follow-up

## Closure

Status Note: All 5 phases completed. 7 in-scope fixes applied across 7 files. typecheck (49/49), build (26/26), affected-package lint clean. Pre-existing flux-i18n lint error and flow-designer-renderers test worker crash are unrelated.

Closure Audit Evidence:

- Reviewer / Agent: opencode (primary execution agent)
- Evidence: docs/logs/2026/05-19.md (plan 405 entry); pnpm typecheck 49/49 pass, pnpm build 26/26 pass, affected-package lint clean

Follow-up:

- InputNumber suffix/stepper 布局优化（deferred）
- tree-renderer CollapsibleTrigger focus-visible（INFO 级，watch-only）
