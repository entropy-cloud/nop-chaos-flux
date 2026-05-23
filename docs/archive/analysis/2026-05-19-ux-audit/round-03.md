# UI/UX 设计合规性审查 — Round 03（继续递归扩展）

> 审查日期：2026-05-19
> 基于 R01 + R02 的 7 条发现，继续深挖

---

## 新发现

### [视角9-2] fieldset 可折叠 legend 缺少 focus-visible 指示器

- **文件**: `packages/flux-renderers-form/src/renderers/fieldset.tsx:54-66`
- **证据片段**:
  ```tsx
  <legend
    data-slot="fieldset-title"
    className={cn(
      collapsible && 'flex items-center gap-1',
      slotProps.titleClassName,
    )}
    onClick={toggle}
    onKeyDown={collapsible ? handleKeyDown : undefined}
    tabIndex={collapsible ? 0 : undefined}
    role={collapsible ? 'button' : undefined}
    aria-expanded={collapsible ? !collapsed : undefined}
    aria-controls={collapsible ? `${props.meta.cid}-body` : undefined}
    style={collapsible ? { cursor: 'pointer' } : undefined}
  >
  ```
- **严重程度**: MEDIUM
- **现状**: 可折叠 fieldset 的 `<legend>` 元素设置了 `tabIndex={0}`、`role="button"`、`onClick` 和 `onKeyDown`，使其成为完整的可交互元素。但唯一的可见交互提示是内联 `style` 的 `cursor: pointer`，没有任何 focus-visible 环或背景变化。键盘用户 Tab 到 legend 时无法感知焦点位置。
- **行业惯例**: shadcn/ui 的 Button、AccordionTrigger 等所有可交互组件均内置 `focus-visible:ring-2 focus-visible:ring-ring`。Ant Design Collapse header 有 outline 和 box-shadow 焦点环。WAI-ARIA APG 要求所有 `role="button"` 元素必须有可见焦点指示器。
- **用户影响**: 键盘用户在折叠/展开 fieldset 时无法辨别当前焦点是否在 legend 上，无法确定按 Enter/Space 是否会生效。对依赖键盘导航的用户造成障碍。
- **建议**: 在 `className` 中添加 `focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm outline-none`：
  ```tsx
  className={cn(
    collapsible && 'flex items-center gap-1',
    collapsible && 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:rounded-sm outline-none',
    slotProps.titleClassName,
  )}
  ```
- **复核状态**: 未复核

---

### [视角9-3] Table 交互行缺少 focus-visible 指示器

- **文件**: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:108-127`
- **证据片段**:
  ```tsx
  <TableRow
    data-slot="table-row"
    data-interactive={isRowInteractive || undefined}
    data-expanded={isExpanded || undefined}
    data-striped={isStriped && isEven ? true : undefined}
    aria-expanded={expandRowByClick ? isExpanded : undefined}
    tabIndex={isRowInteractive ? 0 : undefined}
    onClick={isRowInteractive ? handleRowActivate : undefined}
    onKeyDown={
      isRowInteractive
        ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleRowActivate(event);
            }
          }
        : undefined
    }
  >
  ```
- **严重程度**: MEDIUM
- **现状**: 当表格行可交互（`onRowClick` 或 `expandRowByClick` 为真）时，`<TableRow>` 被赋予 `tabIndex={0}`、`onClick` 和 `onKeyDown`。底层 `TableRow` 组件（`packages/ui/src/components/ui/table.tsx`）默认使用 `hover:bg-...` 样式但不含任何 focus-visible 样式。键盘用户 Tab 到可点击行时无可见焦点环。
- **行业惯例**: Ant Design Table 可点击行有蓝色聚焦指示；Material UI DataGrid 行聚焦时有明显的 ring/outline。shadcn/ui 的交互行模式（如 combobox option、command item）均有 `focus:bg-accent` 或 `focus-visible:ring`。
- **用户影响**: 键盘用户无法识别当前焦点在哪一行，按 Enter 展开或点击行时没有视觉反馈。对依赖键盘导航的用户造成障碍。
- **建议**: 给交互行的 `TableRow` 传入 `className`，加入 `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none`：
  ```tsx
  <TableRow
    className={isRowInteractive ? 'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-none' : undefined}
    ...
  >
  ```
- **复核状态**: 未复核

---

### [视角9-4] tree-renderer CollapsibleTrigger 缺少 focus-visible 指示器

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:190-204`
- **证据片段**:
  ```tsx
  <CollapsibleTrigger
    aria-label={open ? t('flux.common.collapse') : t('flux.common.expand')}
    className="inline-flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-accent"
    tabIndex={-1}
    onMouseDown={(event) => {
      event.preventDefault();
    }}
    onClick={() => {
      focusNode(treeNodeId);
    }}
  >
  ```
- **严重程度**: LOW
- **现状**: `CollapsibleTrigger`（展开/折叠箭头按钮）有 `hover:bg-accent` 但没有 `focus-visible` 样式。此元素 `tabIndex={-1}`，不参与 Tab 序列，焦点由 treeitem 的键盘导航程序化管理。但程序化聚焦到此按钮时用户看不到焦点位置。
- **行业惯例**: WAI-ARIA TreeView 模式中展开/折叠控制通常嵌入在 treeitem 内部，焦点由 treeitem 统一管理。shadcn/ui 的 CollapsibleTrigger 通常继承 Button 的 focus-visible 样式。
- **用户影响**: 当前 Tab/键盘导航路径不直接聚焦此元素（ArrowRight/Left 在 treeitem 层面操作），实际影响较小。但如果未来有代码将焦点移到此 trigger 上，用户会看不到焦点。
- **建议**: 添加 `focus-visible:bg-accent` 到 className，成本极低：
  ```tsx
  className =
    'inline-flex size-5 shrink-0 items-center justify-center rounded-sm hover:bg-accent focus-visible:bg-accent';
  ```
- **复核状态**: 未复核

---

## 零发现说明

以下维度经检查后未发现新问题：

- **loading 状态**：table-renderer 的 TableLoadingOverlay 已正确使用 `role="status"` + `aria-live="polite"` + `Spinner`。CRUD 委托给子 Table。tree 和 data-source 无 loading 概念。
- **空状态**：tree-renderer、table-renderer、chart-renderer、CRUD 渲染器都有空状态处理。tag-list 为切换按钮组，空 tags 是正确行为。
- **dialog/drawer**：均委托给 shadcn/ui Dialog/Drawer，自带关闭按钮、Escape 关闭和焦点陷阱。
- **颜色使用**：chart-renderer 使用 `hsl(var(--chart-N))` CSS 变量。其他组件使用 Tailwind 语义 token。无硬编码违规。
- **新增按钮一致性**：各组件添加按钮整体一致（`variant="outline" size="sm"`）。
