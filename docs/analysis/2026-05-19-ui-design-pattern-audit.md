# UI 设计模式审计 — 2026-05-19

全面审计所有渲染器组件的视觉设计，查找不符合常规 UX 设计模式的问题。

## 汇总

| 严重度   | 数量   |
| -------- | ------ |
| HIGH     | 6      |
| MEDIUM   | 13     |
| LOW      | 6      |
| **总计** | **25** |

---

## 1. 图标不一致

### 1.1 Multi-select 移除标签使用文本字符而非图标 [LOW]

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:198`
- **现状**: `{opt?.label ?? v} ×` — 使用文本乘号字符
- **规范**: 其他组件的移除操作使用 `XIcon` 或 `Trash2Icon`，文本字符视觉上偏弱且不统一

### 1.2 表格筛选图标使用 ChevronDown 而非漏斗图标 [MEDIUM]

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:189`
- **现状**: 筛选下拉触发器使用 `<ChevronDownIcon />`
- **规范**: 行业标准是使用 `ListFilterIcon` 或 `FilterIcon`（漏斗图标）。ChevronDown 与排序/展开图标视觉混淆

---

## 2. 按钮样式不一致

### 2.1 删除按钮 variant 在不同组件间不统一 [MEDIUM]

| 组件                      | variant                            | 图标               |
| ------------------------- | ---------------------------------- | ------------------ |
| `key-value.tsx:189`       | `destructive`（红色背景）          | 无（纯文本"删除"） |
| `condition-item.tsx:153`  | `ghost` + `hover:text-destructive` | `Trash2Icon`       |
| `condition-group.tsx:311` | `ghost` + `hover:text-destructive` | `Trash2Icon`       |

- **规范**: 同一语义操作（删除行/条目）应使用统一的视觉处理。推荐：`ghost` + `Trash2Icon` + `hover:text-destructive`

### 2.2 "新增"按钮 variant 不统一 [LOW]

| 组件                      | variant                            |
| ------------------------- | ---------------------------------- |
| `key-value.tsx:418`       | `outline` + `size="sm"`            |
| `condition-group.tsx:330` | `ghost` + `size="xs"` + `PlusIcon` |

- **规范**: 新增操作应有统一的视觉权重

### 2.3 WrappedFieldAction 按钮尺寸与基础 Button 不一致 [HIGH]

- **文件**: `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx:18-56`
- **现状**: `getWrappedFieldActionClasses` 手动重建 variant/size class，`icon-xs` 解析为 `size-8`
- **对比**: `packages/ui/src/components/ui/button.tsx` 中 `icon-xs` 解析为 `size-6`
- **影响**: 同一个 `size="icon-xs"` prop，WrappedFieldAction 渲染的按钮比基础 Button 大 33%
- **规范**: 样式覆写应通过 `className` 增量叠加，不应重新实现基础样式

---

## 3. 缺失视觉反馈

### 3.1 表格排序头缺少 focus 样式 [HIGH]

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:143-156`
- **现状**: `<span className="cursor-pointer hover:text-primary" role="button" tabIndex={0}>` — 无 focus ring
- **规范**: 可聚焦交互元素必须有可见的 focus 指示器。基础 Button 包含 `focus-visible:border-ring focus-visible:ring-3`

### 3.2 Tree 节点缺少 focus 样式 [MEDIUM]

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:52-66`
- **现状**: `<div tabIndex={0}>` 只有 `hover:bg-muted`，无 `focus-visible` ring
- **规范**: 可聚焦的 tree item 需要可见的 focus 指示器

---

## 4. 非标准表单模式

### 4.1 CheckboxRenderer 标签未关联控件 [MEDIUM]

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:238-265`
- **现状**: checkbox 标签渲染为 `<span data-slot="checkbox-label">`，未使用 `<Label htmlFor={id}>`
- **对比**: RadioGroupRenderer 正确使用 `<Label>` 包裹
- **规范**: 点击标签应能切换 checkbox 状态

### 4.2 SwitchRenderer 标签未关联控件 [MEDIUM]

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:267-295`
- **现状**: switch 标签渲染为 `<span data-slot="switch-label">`，无 `htmlFor` 或 Label 包裹
- **规范**: 同 checkbox，标签应可点击

### 4.3 表格"全选"checkbox 无半选状态 [MEDIUM]

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-header-row.tsx:79-84`
- **现状**: `checked={allSelected && selectedRowCount === sourceLength && sourceLength > 0}`，部分选中时显示为未选中
- **规范**: 部分选中应显示 indeterminate 状态（横线/短划线），这是所有数据表格的标准做法

### 4.4 表格单选使用 Checkbox + shape="circle" 代替 Radio [MEDIUM]

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:161-167`
- **现状**: `rowSelection.type === 'radio'` 时渲染 `<Checkbox shape="circle">`
- **规范**: 单选应使用真正的 radio 语义（`role="radio"`, `aria-checked`, radio group）以传达互斥性

---

## 5. 间距/对齐问题

### 5.1 InputNumber suffix 与 stepper 可能重叠 [MEDIUM]

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:499-569`
- **现状**: suffix 定位 `right-3`，stepper 定位 `right-1`；当两者同时存在时，padding 为 `pr-16`（仅够 stepper），suffix 会与 stepper 重叠
- **规范**: 两个装饰元素同时存在时 padding 应容纳两者，或 stepper 应左移

---

## 6. 缺失 Loading/Empty 状态

### 6.1 SelectRenderer loading 无 spinner [MEDIUM]

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:195-199`
- **现状**: 仅渲染文本 `{t('flux.common.loading')}`
- **对比**: RadioGroupRenderer / CheckboxGroupRenderer 正确使用 `<Spinner>` + 文本
- **规范**: 所有表单控件 loading 状态应使用统一的 spinner + 文本

### 6.2 ChartRenderer loading 无 spinner [LOW]

- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:306-316`
- **现状**: 仅显示加载文本
- **规范**: 应使用 `Spinner` 组件保持视觉一致性

### 6.3 TreeControls loading 无 spinner [LOW]

- **文件**: `packages/flux-renderers-form-advanced/src/tree-controls.tsx:233-237, 340-342`
- **现状**: 仅渲染文本
- **规范**: 应包含 `Spinner`

### 6.4 VirtualBody 空状态渲染空字符串 [HIGH]

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx:260-274`
- **现状**: 虚拟化表格无数据时渲染 `<div style={{ height: 200 }}>{''}</div>` — 200px 空白区域
- **对比**: NonVirtualBody 正确渲染 `{emptyContent}`
- **规范**: 虚拟化路径应显示与非虚拟化路径相同的空状态内容

---

## 7. 颜色使用不规范

### 7.1 NOT 切换使用硬编码橙色而非设计令牌 [MEDIUM]

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/condition-group.tsx:297-300`
- **现状**: `'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-600 dark:bg-orange-950 dark:text-orange-300'`
- **规范**: 应使用 CSS 自定义属性（设计令牌）如 `bg-warning`, `text-warning-foreground`，以确保主题兼容

### 7.2 KeyValue 删除使用全红 destructive variant [LOW]

- **文件**: `packages/flux-renderers-form-advanced/src/key-value.tsx:189`
- **现状**: `<Button variant="destructive">` 每行显示红色背景删除按钮
- **规范**: 行级删除应使用 ghost + hover:text-destructive，永久红色造成视觉噪音

---

## 8. 非标准对话框/下拉行为

### 8.1 快速编辑按钮 fallback 文案为"保存" [MEDIUM]

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:142`
- **现状**: 无 label 时 fallback 为 `t('flux.common.save')`
- **规范**: 打开编辑对话框的按钮应显示"编辑"或列标签，"保存"暗示立即执行操作

### 8.2 DetailSurface / QuickEdit 对话框禁用了关闭按钮 [MEDIUM]

- **文件**:
  - `packages/flux-renderers-form-advanced/src/detail-view/detail-surface.tsx:127`
  - `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:144`
- **现状**: `<DialogContent showCloseButton={false}>`
- **规范**: 标准对话框应在右上角包含可见的关闭按钮（X），隐藏它迫使用户寻找底部的取消按钮

### 8.3 MultiSelect 使用不可见的原生 select 作为下拉触发 [HIGH]

- **文件**: `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:207-233`
- **现状**: `<NativeSelect className="absolute inset-0 w-full opacity-0">` 覆盖在 Badge 上
- **规范**: 多选应使用 popover + checkbox 或 combobox + tag 模式。不可见的原生 select 无视觉提示

---

## 9. 无障碍性问题

### 9.1 Chart 使用 role="button" 而非 role="img" [HIGH]

- **文件**: `packages/flux-renderers-data/src/chart-renderer.tsx:286-297`
- **现状**: 图表容器 `role="button" tabIndex={0}`
- **规范**: 图表是数据可视化，语义角色应为 `role="img"` + `aria-label`。`role="button"` 导致屏幕阅读器将图表播报为按钮

### 9.2 ButtonRenderer 无 label 时显示字面文本"Button" [MEDIUM]

- **文件**: `packages/flux-renderers-basic/src/button.tsx:25`
- **现状**: `{String(label ?? 'Button')}` — 无 label 时显示文本 "Button"
- **规范**: 无 label 的按钮应提供 `aria-label` 或隐藏，显示字面"Button"对用户无意义

### 9.3 CheckboxRenderer 无 label 时缺少可访问名称 [HIGH]

- **文件**: `packages/flux-renderers-form/src/renderers/input.tsx:258`
- **现状**: `aria-label={optionLabel}` — optionLabel 为 undefined 时无可访问名称
- **规范**: 每个表单控件必须有可访问名称，应 fallback 到字段名

---

## 10. 排序/分页/筛选 UI 不一致

### 10.1 CRUD toolbar 分页与 Table 分页不一致 [MEDIUM]

| 组件                                | 样式                                                   |
| ----------------------------------- | ------------------------------------------------------ |
| `crud-renderer-toolbar.tsx:109-137` | 简单的 prev/next 按钮 + 页码文本                       |
| `table-pagination-bar.tsx:78-148`   | 完整的 Pagination 组件带页码链接、省略号、aria-current |

- **规范**: 同一 CRUD 表格的分页 UI 应保持一致

### 10.2 Pagination 组件硬编码英文文本 [LOW]

- **文件**: `packages/ui/src/components/ui/pagination.tsx:59,77`
- **现状**: `'Previous'` / `'Next'` 硬编码英文
- **规范**: 所有用户可见文本应通过 i18n 系统

---

## 修复优先级建议

### 第一批 — HIGH（6 项）

| #   | 问题                             | 预估工作量 |
| --- | -------------------------------- | ---------- |
| 2.3 | WrappedFieldAction 尺寸漂移      | 中         |
| 3.1 | 排序头缺少 focus ring            | 小         |
| 6.4 | VirtualBody 空状态为空白         | 小         |
| 8.3 | MultiSelect 不可见原生 select    | 大         |
| 9.1 | Chart role="button" → role="img" | 小         |
| 9.3 | Checkbox 无可访问名称 fallback   | 小         |

### 第二批 — MEDIUM（13 项）

聚焦：loading 状态统一 (6.1)、表单标签关联 (4.1, 4.2)、图标替换 (1.2)、颜色令牌 (7.1)、半选状态 (4.3)、radio 语义 (4.4)、分页统一 (10.1)

### 第三批 — LOW（6 项）

视觉打磨：图标字符 vs 组件 (1.1)、硬编码英文 (10.2)、destructive 按钮权重 (7.2)
