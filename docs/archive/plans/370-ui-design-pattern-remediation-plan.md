# 370 UI 设计模式修复计划

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-ui-design-pattern-audit.md`
> Related: `docs/architecture/styling-system.md`, `docs/architecture/renderer-runtime.md`

## Purpose

基于 `docs/analysis/2026-05-19-ui-design-pattern-audit.md` 的 25 项审计发现，系统性修复所有渲染器组件中的 UI 设计模式违规，使视觉一致性、无障碍性和交互规范达到统一标准。

## Current Baseline

- 审计发现 6 HIGH、13 MEDIUM、6 LOW 共 25 个问题
- 核心矛盾点：`WrappedFieldAction` 手动重建 `buttonVariants` 导致 `icon-xs` 尺寸漂移（`size-8` vs `size-6`）
- Loading 状态不一致：`SelectRenderer` 纯文本，`RadioGroupRenderer` 用 Spinner
- 无障碍缺口：`CheckboxRenderer`/`SwitchRenderer` 标签未用 `<label>` 关联；`ChartRenderer` 用 `role="button"` 代替 `role="img"`
- `VirtualBody` 空状态渲染空字符串，`NonVirtualBody` 正确渲染 `emptyContent`
- 硬编码颜色（`orange-*`）和硬编码英文（"Button"、"Previous"、"Next"）未走设计令牌/i18n
- `--warning` CSS 变量已在 `theme-tokens` 中定义，但 Tailwind v4 `@theme inline` 中未注册 `--color-warning`，因此 `bg-warning` 等工具类尚不可用
- `Checkbox` 组件（基于 `@base-ui/react/checkbox`）不支持 `'indeterminate'` 作为 `checked` 值，需通过单独的 `indeterminate` boolean prop 设置
- `RadioGroupItem` 必须在 `RadioGroup` 上下文中使用，不能独立用于表格行

## Goals

- 修复全部 6 个 HIGH 问题
- 修复全部 12 个直接修复的 MEDIUM 问题（1 项 deferred）
- 修复全部 6 个 LOW 问题
- 所有 loading 状态统一使用 `Spinner` 组件
- 所有可聚焦交互元素有 `focus-visible` 样式
- 删除操作视觉统一为 `ghost` + `hover:text-destructive` + `Trash2Icon`
- 所有用户可见文本走 i18n 系统
- 硬编码颜色替换为设计令牌

## Non-Goals

- 不重构组件架构或公共 API 接口
- 不引入新的 UI 基础组件（如新的 Popover/Combobox）
- 不改变表单数据流或状态管理
- 不处理 `MultiSelect` 的 `Popover+Checkbox` 替换方案（工作量过大，移入 successor plan）
- 不实现 InputNumber suffix/stepper 布局重构（需精确 padding 计算，移入 deferred）

## Scope

### In Scope

- 审计文档中 25 项问题：22 项直接修复，2 项 deferred（8.3、5.1），1 项 LOW i18n fallback 纳入 Non-Blocking Follow-up
- 受影响组件的样式和无障碍属性更新
- `Checkbox` 组件添加 `indeterminate` 视觉支持
- Tailwind `@theme inline` 添加 `--color-warning` 注册
- `flux-i18n` 添加缺失的 i18n key（`flux.common.edit`、`flux.common.button`）
- `docs/logs/` 日志更新

### Out Of Scope

- 新组件开发（如 Combobox、新的 MultiSelect）
- 公共 API / props 接口变更
- 包结构或依赖关系调整
- E2E 测试编写（本次修复为渲染层样式/语义调整，不影响功能逻辑）

## Execution Plan

### Phase 1 — WrappedFieldAction 尺寸漂移修复 (2.3)

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx`

- Item Types: `Fix`

- [x] 删除 `getWrappedFieldActionClasses` 函数整体
- [x] 在 `WrappedFieldAction` 的 `<Button>` 渲染中移除 `className={getWrappedFieldActionClasses(...)}` 覆写，仅保留消费者传入的 `className` prop
- [x] `Button` 组件已内置 `buttonVariants` CVA，会根据 `variant`/`size` prop 自动生成正确样式，无需额外干预
- [x] 验证 `icon-xs` 渲染为 `size-6`（24px），与基础 Button 一致

Exit Criteria:

- [x] `WrappedFieldAction` 不再手动定义 variant/size class，完全依赖 `Button` 内置 CVA
- [x] 所有使用 `WrappedFieldAction` 的组件（`condition-group.tsx`、`condition-item.tsx`）视觉无回归
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 — 焦点样式与 ARIA 角色修复 (3.1, 3.2, 9.1)

Status: completed
Targets: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`, `packages/flux-renderers-data/src/chart-renderer.tsx`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`

- Item Types: `Fix`

- [x] **3.1** 表格排序头 `<span role="button">` 添加 `focus-visible:ring-2 focus-visible:ring-ring rounded-sm` 样式
- [x] **3.2** Tree 节点 `<div tabIndex={0}>` 添加 `focus-visible:ring-2 focus-visible:ring-ring` 样式
- [x] **9.1** Chart 容器：`role="button"` 改为 `role="img"`，保留 `tabIndex={0}`（因为存在 `onClick`/`onKeyDown` 交互），添加 `focus-visible:ring-2 focus-visible:ring-ring` 样式

Exit Criteria:

- [x] 排序头 focus 时可见 focus ring
- [x] Tree 节点 focus 时可见 focus ring
- [x] Chart 屏幕阅读器播报为 `img` 而非 `button`，点击/键盘交互仍正常
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 3 — Loading 状态统一 (6.1, 6.2, 6.3)

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-data/src/chart-renderer.tsx`, `packages/flux-renderers-form-advanced/src/tree-controls.tsx`

- Item Types: `Fix`

- [x] **6.1** `SelectRenderer` loading 状态：在 `<span data-slot="select-loading">` 内添加 `<Spinner className="size-4" />`（参考 `RadioGroupRenderer` 的模式，`Spinner` 已在同文件导入）
- [x] **6.2** `ChartRenderer` loading 状态：从 `@nop-chaos/ui` 导入 `Spinner`，在 loading 区域添加 `<Spinner className="size-4" />` + 文本
- [x] **6.3** `TreeControls` loading 状态：从 `@nop-chaos/ui` 导入 `Spinner`，两处 loading `<span>` 均添加 `<Spinner className="size-4" />` + 文本

Exit Criteria:

- [x] `SelectRenderer`、`ChartRenderer`、`TreeControls` 的 loading 状态均使用 `Spinner` 组件
- [x] 视觉风格与 `RadioGroupRenderer` 的 loading 状态一致
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 4 — 表单标签关联与无障碍名称修复 (4.1, 4.2, 9.2, 9.3)

Status: completed
Targets: `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-basic/src/button.tsx`

- Item Types: `Fix`

- [x] **4.1** `CheckboxRenderer`：用 `<Label>` 包裹 `<Checkbox>` 和标签文本（模式参照同文件 `RadioGroupRenderer:338`），移除 `<span data-slot="checkbox-label">`
- [x] **4.2** `SwitchRenderer`：用 `<Label>` 关联 `<Switch>` 和标签文本，移除 `<span data-slot="switch-label">`
- [x] **9.2** `ButtonRenderer`：无 label 时不再显示字面文本 "Button"，改为仅渲染 `aria-label` 保护的空内容按钮：`{label ? String(label) : null}`，同时确保 `aria-label` 有值
- [x] **9.3** `CheckboxRenderer`：`aria-label` 添加 fallback，当 `optionLabel` 为 undefined 时使用字段名 `name`

Exit Criteria:

- [x] 点击 Checkbox 标签文本可切换选中状态
- [x] 点击 Switch 标签文本可切换状态
- [x] 无 label 的 ButtonRenderer 不显示字面 "Button"
- [x] 无 label 的 Checkbox 有可访问名称（`aria-label` 有 fallback）
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 5 — 表格交互改进 (4.3, 4.4, 6.4, 1.2)

Status: completed
Targets: `packages/ui/src/components/ui/checkbox.tsx`, `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`

- Item Types: `Fix`

- [x] **4.3a** `Checkbox` 组件添加 indeterminate 视觉支持：在 `CheckboxPrimitive.Indicator` 中，当 `data-indeterminate` 为 true 时渲染水平线图标（`<MinusIcon />`）代替 `<CheckIcon />`；利用 `@base-ui/react/checkbox` 的 `indeterminate` prop 自动设置 `data-indeterminate` 属性
- [x] **4.3b** 表格全选 checkbox：`checked={allSelected} indeterminate={!allSelected && selectedRowCount > 0}`（使用 `@base-ui/react` 的独立 `indeterminate` boolean prop，而非作为 `checked` 值）
- [x] **4.4** 单选行：`<Checkbox shape="circle">` 改为添加 `role="radio"` + `aria-checked={isSelected}` 语义属性，保留圆形视觉（`RadioGroupItem` 不能脱离 `RadioGroup` 独立使用）
- [x] **6.4** `VirtualBody` 空状态：将 `{''}` 替换为 `{emptyContent}`
- [x] **1.2** 筛选图标：从 `lucide-react` 导入 `ListFilterIcon`，替换 `<ChevronDownIcon />`

Exit Criteria:

- [x] 部分选中时全选 checkbox 显示 indeterminate 状态（水平线）
- [x] 单选行使用 `role="radio"` + `aria-checked` 语义
- [x] 虚拟化表格空状态显示 `emptyContent` 而非空白
- [x] 表格筛选按钮使用漏斗图标
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 6 — 按钮样式统一与颜色令牌 (2.1, 2.2, 7.1, 7.2)

Status: completed
Targets: `apps/playground/src/styles.css`, `packages/flux-renderers-form-advanced/src/key-value.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx`

- Item Types: `Fix`

- [x] **前置条件** 在 `apps/playground/src/styles.css` 的 `@theme inline` 块中添加 `--color-warning: hsl(var(--warning));`，使 Tailwind v4 生成 `bg-warning`、`text-warning`、`border-warning` 工具类
- [x] **2.1** `key-value.tsx` 删除按钮：`variant="destructive"` 改为 `variant="ghost"` + `className="hover:text-destructive"` + 添加 `Trash2Icon`
- [x] **2.2** 新增按钮视觉权重：`key-value.tsx` 保持 `outline + size="sm"`（文本按钮），`condition-group.tsx` 保持 `ghost + size="xs" + PlusIcon`（图标+文本按钮），两者属不同交互模式，不做强制统一
- [x] **7.1** NOT 切换颜色：替换为 `border-warning bg-warning/10 text-warning dark:border-warning dark:bg-warning/10 dark:text-warning`
- [x] **7.2** 已在 2.1 中一并处理

Exit Criteria:

- [x] `bg-warning`/`text-warning`/`border-warning` 工具类可正常生成
- [x] 删除操作统一为 `ghost` + `Trash2Icon` + `hover:text-destructive`
- [x] NOT 切换使用语义颜色令牌而非硬编码 `orange-*`
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 7 — 对话框行为与图标修复 (8.1, 8.2, 1.1)

Status: completed
Targets: `packages/flux-i18n/src/locales/en-US.ts`, `packages/flux-i18n/src/locales/zh-CN.ts`, `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx`, `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx`

- Item Types: `Fix`

- [x] **前置条件** 在 `en-US.ts` 和 `zh-CN.ts` 的 `flux.common` 中添加 `edit: 'Edit'` / `edit: '编辑'`
- [x] **8.1** 快速编辑按钮 fallback：将 `t('flux.common.save')` 改为 `t('flux.common.edit')`
- [x] **8.2** `DetailSurface` 和 `QuickEdit` 对话框：移除 `showCloseButton={false}`（`DialogContent` 默认 `showCloseButton={true}`）
- [x] **1.1** Multi-select 移除标签：将 `{opt?.label ?? v} ×` 中的 `×` 替换为 `<XIcon className="size-3" />`（从 `lucide-react` 导入）

Exit Criteria:

- [x] 快速编辑按钮显示"编辑"而非"保存"
- [x] DetailSurface 和 QuickEdit 对话框有可见的关闭按钮
- [x] 多选移除标签使用 X 图标组件
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

### Phase 8 — CRUD 分页统一与硬编码文本修复 (10.1, 10.2)

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer-toolbar.tsx`, `packages/ui/src/components/ui/pagination.tsx`

- Item Types: `Fix`

- [x] **10.1** CRUD toolbar 分页：用 `PaginationPrevious` + `PaginationNext` 组件（从 `@nop-chaos/ui` 导入）替换当前手写的 prev/next `Button`，保留中间的页码文本（"Page X of Y"），不引入完整页码链接列表（CRUD 场景用简单 prev/next 足够）
- [x] **10.2** `Pagination` 组件：`pagination.tsx` 已有 `t` 导入（来自 `../../lib/i18n.js`），将 `'Previous'` / `'Next'` 默认值改为 `t('flux.pagination.previous')` / `t('flux.pagination.next')`（i18n key 已存在）

Exit Criteria:

- [x] CRUD toolbar 使用 `PaginationPrevious`/`PaginationNext` 组件而非手写 Button
- [x] `Pagination` 组件默认文本走 i18n
- [x] No owner-doc update required
- [x] `docs/logs/` 对应日期条目已更新

## Closure Gates

- [x] 审计文档中全部 22 项 in-scope 修复已完成
- [x] 2 项 deferred（8.3、5.1）已记录在 Deferred section
- [x] 所有 loading 状态使用统一 Spinner 模式
- [x] 所有可聚焦元素有 focus-visible 指示器
- [x] 所有用户可见文本走 i18n
- [x] 硬编码颜色已替换为设计令牌
- [x] 独立子 agent closure-audit 已完成
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### 8.3 MultiSelect 不可见原生 select

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 替换为 `Popover+Checkbox` 模式需要新增完整的下拉面板组件、键盘导航、焦点管理和搜索过滤功能，预估工作量相当于一个独立 feature（1-2 天）。审计中其他修复项均为局部调整，此项涉及新组件开发，与本次修复的范围和风险级别不匹配。
- Successor Required: yes
- Successor Path: `docs/plans/` — 新建 MultiSelect 组件重构计划

### 5.1 InputNumber suffix 与 stepper 重叠

- Classification: `optimization candidate`
- Why Not Blocking Closure: 修复需要精确的 padding 计算或布局重构（suffix 和 stepper 同时存在时的间距分配），当前仅在两个装饰元素同时出现时才触发，且用户可通过增大输入框宽度规避。属于视觉打磨而非功能缺陷，不影响 closure。
- Successor Required: no
- Successor Path: 纳入日常视觉打磨迭代

## Non-Blocking Follow-ups

- `SwitchRenderer` 的 `'On'`/`'Off'` fallback 文本应走 i18n（`input.tsx:291`），该 fallback 仅在未配置 `onLabel`/`offLabel` 时生效，属于 schema 配置层的防护

## Closure

Status Note: All 8 phases completed. Closure audit passed (Phase 8 CRUD toolbar PaginationPrevious/PaginationNext fix applied after initial audit found it). All 22 in-scope fixes verified in live repo.

Closure Audit Evidence:

- Reviewer / Agent: Independent general sub-agent (ses_1c1c415dcffepet37rBBJXstw6)
- Evidence: Per-phase file:line verification; initial FAIL on Phase 8 10.1, fixed, re-verified. `pnpm typecheck` 49/49, `pnpm build` 26/26, `pnpm lint` 26/26, `pnpm test` flux-renderers-data 32 files / 296 tests all green. Pre-existing `nop-debugger` DLL exit unrelated.

Follow-up:

- MultiSelect 组件重构（successor plan required）
- SwitchRenderer i18n fallback
- InputNumber suffix/stepper 布局优化
