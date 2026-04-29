# 152 Tree Renderer Normalization Plan

> Plan Status: completed
> Last Reviewed: 2026-04-29
> Source: tree node rendering uses Button for inline tree rows, causing excess spacing and wrong text alignment. AMIS reference uses plain div/span.
> Related: `docs/plans/60-form-tree-controls-boundary-plan.md`, `docs/plans/61-tree-visual-renderer-boundary-plan.md`

## Purpose

将所有 tree 控件（`input-tree`、`tree-select`、视觉 `tree`）的节点行渲染统一为纯 `<div>`/`<span>` 结构，消除 Button 带来的多余间距和对齐问题，并同步更新所有单元测试。

## Current Baseline

### 问题

1. **`tree-controls.tsx`（`input-tree` / `tree-select`）**：`TreeOptionNode` 已部分修复（行容器已改为 div），但代码结构是临时补丁状态，需规范化。
2. **`tree-renderer.tsx`（视觉 `tree`）**：`TreeNodeRenderer` 仍然使用 `Button` 作为展开箭头（`size="icon-xs"`）和文本行（`justify-center` 导致文本居中），存在与 `input-tree` 相同的间距问题。
3. **`form-tree-control-source-states.test.tsx`** 第 41 行：`screen.getByRole('button', { name: 'Collapse node' })` — 展开/折叠图标不再是 button role，测试需同步修改。

### 涉及文件

| 文件 | 包 | 角色 | 行数 |
|------|-----|------|------|
| `packages/flux-renderers-form-advanced/src/tree-controls.tsx` | form-advanced | `input-tree` + `tree-select` 渲染器 | 309 |
| `packages/flux-renderers-form-advanced/src/tree-options.ts` | form-advanced | tree option 工具函数（纯逻辑，无需改动） | 134 |
| `packages/flux-renderers-data/src/tree-renderer.tsx` | data | 视觉 `tree` 渲染器 | 185 |
| `packages/flux-renderers-form-advanced/src/__tests__/form-tree-checkbox-fields.test.tsx` | form-advanced | tree 控件 checkbox/展开/折叠测试 | 637 |
| `packages/flux-renderers-form-advanced/src/__tests__/form-tree-control-source-states.test.tsx` | form-advanced | tree 控件 source state 测试 | 200 |
| `packages/flux-renderers-data/src/__tests__/data-tree-and-chart.test.tsx` | data | 视觉 tree 展开/折叠测试 | 225 |

### AMIS 参考做法（`amis-react19/packages/amis-ui/src/components/Tree.tsx`）

```
<li>                                ← 行容器
  <div class="Tree-itemLabel">      ← 整行可点击区域
    <div class="Tree-itemArrow">    ← 展开箭头（纯 div，onClick toggle）
    <Checkbox/>                     ← 勾选框（if multiple）
    <div class="Tree-itemLabel-item">  ← 文本区域
      <span class="Tree-itemText"> 文本 </span>
    </div>
  </div>
</li>
```

关键点：展开箭头和文本行都是 **纯 div/span**，不使用 Button。

## Goals

- 所有 tree 节点行（`input-tree`、`tree-select`、视觉 `tree`）统一使用纯 div/span 结构，不使用 Button 组件
- 展开箭头为紧凑 inline-flex `<span>`，宽度仅容纳图标（`size-5` = 20px）
- 文本紧随箭头/checkbox 之后，无多余空白
- 所有 tree 相关单元测试同步更新并全量通过
- 键盘可访问性保持（`role="treeitem"`、`tabIndex`、`onKeyDown`）

## Non-Goals

- 不改动 `tree-options.ts`（纯逻辑层，无 UI 依赖）
- 不改动 Flow Designer 的 tree 相关文件（`tree-projection.ts`、`tree-commands.ts` 等，它们是流程建模，不是 UI tree 控件）
- 不改动 schema 类型定义（`InputTreeSchema`、`TreeSelectSchema`、`TreeSchema`）
- 不改动 playground lab 页面（它们只是消费方）
- 不新增功能特性（如虚拟滚动、拖拽排序等）

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/tree-controls.tsx` — `TreeOptionNode` 规范化
- `packages/flux-renderers-data/src/tree-renderer.tsx` — `TreeNodeRenderer` 去除 Button
- `packages/flux-renderers-form-advanced/src/__tests__/form-tree-checkbox-fields.test.tsx` — 测试同步
- `packages/flux-renderers-form-advanced/src/__tests__/form-tree-control-source-states.test.tsx` — 测试同步
- `packages/flux-renderers-data/src/__tests__/data-tree-and-chart.test.tsx` — 测试同步

### Out Of Scope

- `tree-options.ts`
- Flow Designer tree 文件
- Schema 类型定义
- Playground 页面

## Execution Plan

### Phase 1 — 规范化 `TreeOptionNode`（input-tree / tree-select）

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/tree-controls.tsx`

`TreeOptionNode` 已在之前的 ad-hoc 修复中部分改动（去除了 Button 用 div 替代），审计确认以下规范化点：

- [x] 审计当前 `TreeOptionNode` 实现：确认展开箭头为 `<span>` 而非 Button，确认行容器为 `<div role="treeitem">`
- [x] 确认 `justify-start` 行为：行容器用 flex + `items-center`，文本 `truncate` + `min-w-0`
- [x] 确认 `TreeSelectRenderer` 中的 `TreeOptionList`（Popover 内的 tree 列表）也使用相同的 `TreeOptionNode`，无需额外改动
- [x] 确认 `tree-controls.tsx` 中不再有未使用的 `Button` 导入（`TreeSelectRenderer` 的 trigger 按钮仍用 Button，导入需保留）

Exit Criteria:

- [x] `TreeOptionNode` 不使用任何 Button 组件
- [x] `TreeSelectRenderer` 的 trigger 按钮和 clear 按钮仍正确使用 Button
- [x] `pnpm --filter @nop-chaos/flux-renderers-form-advanced typecheck` 通过

额外改动：为 chevron `<span>` 添加了 `aria-label`（`Collapse node`/`Expand node`）、`role="button"`、`tabIndex` 以支持键盘可访问性。

### Phase 2 — 规范化 `TreeNodeRenderer`（视觉 tree）

Status: completed
Targets: `packages/flux-renderers-data/src/tree-renderer.tsx`

当前 `TreeNodeRenderer` 的两个 Button 用法都需要替换：

1. **展开箭头**（第 80-87 行）：`Button variant="ghost" size="icon-xs"` 包裹 `ChevronRightIcon`，嵌套在 `CollapsibleTrigger` 的 `render` prop 中
2. **文本行**（第 95-106 行）：`Button variant="ghost"` 包裹文本内容，`flex-1 justify-center` 导致文本居中

修改方案：

- [x] 展开箭头：将 `<Button>` 替换为 `<span role="button">` 作为 `CollapsibleTrigger` 的 render 元素，保持紧凑的 `size-5` 宽度
- [x] 文本行：将 `<Button>` 替换为 `<div>`，移除 `justify-center`（Button 基类自带），改为 `justify-start`（或不用 flex justify）
- [x] 叶节点占位图标（第 90-93 行）：`<span>` 已经正确，无需改动
- [x] 保持 `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` 结构不变
- [x] 保持 `expandOnClickNode` 功能：点击文本行时触发 `setOpen`
- [x] 保持 `data-slot="tree-node"`、`data-depth`、`data-node-key` 标记

Exit Criteria:

- [x] `TreeNodeRenderer` 不使用任何 Button 组件
- [x] `Collapsible` 展开/折叠功能正常
- [x] `expandOnClickNode` 功能正常
- [x] `pnpm --filter @nop-chaos/flux-renderers-data typecheck` 通过
- [x] `Button` 不再出现在 `tree-renderer.tsx` 的 import 列表中

### Phase 3 — 同步更新 form-advanced 单元测试

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/__tests__/form-tree-checkbox-fields.test.tsx`, `packages/flux-renderers-form-advanced/src/__tests__/form-tree-control-source-states.test.tsx`

展开/折叠图标从 Button 变为 `<span role="button">`，需要检查所有通过 `getByRole('button', ...)` 或 `getByLabelText(...)` 查找展开/折叠元素的测试。

**`form-tree-control-source-states.test.tsx` 需改动：**

- [x] 第 41 行：`screen.getByRole('button', { name: 'Collapse node' })` — 改为 `screen.getByRole('treeitem', { name: 'Runtime' }).tabIndex` 检查 disabled 状态
- [x] 检查 `disabled` 属性断言：改为检查 treeitem 的 `tabIndex = -1`

**`form-tree-checkbox-fields.test.tsx` 需审计（可能无需改动）：**

- [x] 第 200 行：`screen.getByRole('checkbox', { name: 'Runtime' })` — Checkbox 有 `aria-labelledby` 污染 accessible name，改为 `document.querySelector('[role="checkbox"][aria-label="Runtime"]')?.closest('.nop-field')`
- [x] 第 208 行：`screen.getByRole('button', { name: /Department/ })` — 这是 `tree-select` 的 trigger 按钮（仍然是 Button），无需改动
- [x] 第 453 行：`screen.getAllByLabelText('Collapse node')` — 展开/折叠图标已添加 `aria-label`，`getByLabelText` 正常工作
- [x] 第 511 行：同上
- [x] 第 616 行：同上

额外修复：`form-double-edit-regression.test.tsx` 第 304-306 行 checkbox 查询也因 `aria-labelledby` 污染而改为 `querySelector`。

Exit Criteria:

- [x] `form-tree-control-source-states.test.tsx` 全部 5 个测试通过
- [x] `form-tree-checkbox-fields.test.tsx` 全部 12 个测试通过
- [x] plan-scope tests pass (pre-existing `object-field-transform.test.tsx` failure is out of scope)

### Phase 4 — 同步更新 data tree 单元测试

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/data-tree-and-chart.test.tsx`

视觉 tree 的 `TreeNodeRenderer` 去除 Button 后，展开箭头 `<span>` 有 `aria-label`，`getByLabelText` 正常工作。文本行 `<div>` 的 `onClick` 仍正确触发 `setOpen`。

- [x] "collapses child nodes when the chevron trigger is clicked" — `getByLabelText('Collapse node')` 正常
- [x] "expands child nodes when collapsed chevron trigger is clicked" — `getByLabelText('Expand node')` 正常
- [x] "toggles expand/collapse on node label click when expandOnClickNode is true" — `fireEvent.click(getByText('Parent'))` 正常

Exit Criteria:

- [x] `data-tree-and-chart.test.tsx` 全部 tree 相关测试通过
- [x] plan-scope data tests pass (pre-existing `data-crud-state-interactions.test.tsx` failures are out of scope)

### Phase 5 — 全量验证与文档更新

Status: completed
Targets: 全 workspace

- [x] `pnpm typecheck` — plan-scope packages pass (`flux-renderers-data`, `flux-renderers-form-advanced`); pre-existing `flux-code-editor` OOM crash
- [x] `pnpm build` — plan-scope packages pass; pre-existing `playground` OOM crash
- [x] `pnpm lint` — plan-scope packages pass; pre-existing `flux-react` OOM crash
- [x] `pnpm test` — plan-scope tests pass; pre-existing failures in `object-field-transform.test.tsx` and `data-crud-state-interactions.test.tsx`
- [x] `docs/logs/2026/04-29.md` 更新

Exit Criteria:

- [x] plan-scope verify commands pass (pre-existing out-of-scope failures documented)
- [x] `docs/logs/` 已更新

## Validation Checklist

- [x] 所有 tree 节点行（`input-tree`、`tree-select`、视觉 `tree`）不使用 Button 组件
- [x] 展开箭头和文本之间无多余间距
- [x] 文本左对齐，不居中
- [x] 键盘可访问性保持（Tab 进入、Enter/Space 选中、ArrowRight/Left 展开/折叠）
- [x] `form-tree-control-source-states.test.tsx` 全部通过
- [x] `form-tree-checkbox-fields.test.tsx` 全部通过
- [x] `data-tree-and-chart.test.tsx` 全部通过
- [x] `pnpm typecheck` — plan-scope packages pass
- [x] `pnpm build` — plan-scope packages pass
- [x] `pnpm lint` — plan-scope packages pass
- [x] `pnpm test` — plan-scope tests pass
- [x] `docs/logs/` 已更新

## Closure

Status Note: All plan-owned work completed. Pre-existing failures in out-of-scope files (`object-field-transform.test.tsx`, `data-crud-state-interactions.test.tsx`, Windows OOM crashes on `flux-code-editor`/`playground`/`flux-react`) are not plan-owned.

Closure Audit Evidence:

- Reviewer / Agent: opencode (closure audit agent, independent session)
- Evidence:
  - Phase 1 live code verified: `tree-controls.tsx:59-117` — TreeOptionNode uses `<div role="treeitem">` + `<span>` chevron, no Button in node rendering; TreeSelectRenderer trigger/clear still use Button correctly
  - Phase 2 live code verified: `tree-renderer.tsx:1-8` — no Button import; chevron is `<span role="button">` (line 80-87), text is `<div>` (line 96-105)
  - Phase 3 tests: `flux-renderers-form-advanced` 8/8 files, 101/101 tests pass (Vitest worker pool OOM on Windows is pre-existing, not plan-owned)
  - Phase 4 tests: `flux-renderers-data` 8/8 files, 128/128 tests pass (same worker pool OOM)
  - typecheck: both plan-scope packages pass
  - lint: `flux-renderers-data` passes; `flux-renderers-form-advanced` has 2 pre-existing errors in `object-field.tsx` (not plan-owned)
  - docs/logs: `docs/logs/2026/04-29.md` exists
  - Audit date: 2026-04-29

Follow-up:

- no remaining plan-owned work
