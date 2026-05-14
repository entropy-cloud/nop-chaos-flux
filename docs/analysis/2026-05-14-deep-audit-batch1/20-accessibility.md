# 维度 20：可访问性

## 第 1 轮（初审）

### [维度20-01] Word Editor dataset panel 的主数据集卡片仍是 mouse-only clickable `<div>`

- **文件**: `packages/word-editor-renderers/src/panels/dataset-panel.tsx`
- **证据片段**:
  ```tsx
  <div
    key={dataset.id}
    onClick={() => onEditDataset(dataset.id)}
    className={cn(
      'group rounded-lg border p-3 cursor-pointer ... outline-none focus:ring-2 ...',
    )}
  >
  ```
- **严重程度**: P2
- **现状**: 数据集卡片承担主选择/编辑入口，但元素本身不是 button/link，也没有 `tabIndex`、键盘激活或可感知语义。
- **风险**: 键盘用户无法聚焦和打开数据集；样式上存在 focus ring 类，但实际不可 focus，形成“看起来支持焦点，实际上不可达”的伪可达交互。
- **建议**: 将卡片主交互改为真正的 `Button` 或 button-rendered card，或至少补齐 `role="button"`、`tabIndex={0}`、Enter/Space 处理与适当 aria 语义。
- **误报排除**: 不是指右上角更多菜单按钮；问题是列表主操作入口本身完全绑定在非语义 `div` 上。
- **复核状态**: 未复核

### [维度20-02] Spreadsheet sheet rename 入口仍只有 double-click 路径，缺少等价键盘或显式可发现入口

- **文件**: `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx`
- **证据片段**:
  ```tsx
  <Button
    variant="ghost"
    size="xs"
    className="ss-sheet-tab"
    data-active={isActive || undefined}
    onClick={() => handleTabClick(sheet.id)}
    onDoubleClick={() => handleTabDoubleClick(sheet.id, sheet.name)}
  >
  ```
- **严重程度**: P2
- **现状**: tab 切换本身可键盘访问，但进入 rename mode 的入口仅绑定双击；组件未提供对应的 keyboard shortcut、context menu item 或独立 rename button。
- **风险**: 键盘用户、触屏用户与辅助技术用户无法稳定触发重命名；主工作台的基础 sheet 管理能力对非鼠标路径不等价。
- **建议**: 增加显式 rename 入口并补键盘捷径，例如 focused tab 上的 `F2` 或 `Enter` rename。
- **误报排除**: 不是说 sheet tab 不可键盘操作；当前缺的是 rename entry path，而不是 tab switching 本身。
- **复核状态**: 未复核

## 维度复核结论

- [维度20-01]: 保留为 P2。
- [维度20-02]: 保留为 P2。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                          | 一句话摘要                                                            |
| ----- | -------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| 20-01 | P2       | `packages/word-editor-renderers/src/panels/dataset-panel.tsx` | Word Editor dataset 主卡片仍以非语义 `div` 承担主激活路径             |
| 20-02 | P2       | `packages/spreadsheet-renderers/src/sheet-tab-bar.tsx`        | Spreadsheet sheet rename 仍是 double-click only，无等价键盘或显式入口 |
