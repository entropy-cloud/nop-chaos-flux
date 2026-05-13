# 维度 11：UI 组件使用合规性

## 第 1 轮（初审）

### [维度11-01] `flux-code-editor` toolbar primitive 仍用 `span role="button"` 重造按钮语义

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx:27-52`
- **证据片段**:
  ```tsx
  return (
    <span
      role="button"
      tabIndex={0}
      className={cn(
        'cursor-pointer select-none text-muted-foreground hover:text-foreground hover:bg-accent',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        'transition-colors',
  ```
- **严重程度**: P3
- **原生元素**: `<span role="button">`
- **应替换为**: `Button`
- **所在层**: 渲染器 / `@nop-chaos/flux-code-editor`
- **替换可行性**: 中
- **现状**: `ToolbarButton` 手工复制了按钮语义、键盘激活、焦点样式和尺寸体系，而 `@nop-chaos/ui` 已提供可覆盖该场景的 `Button`。
- **建议**: 将 `ToolbarButton` 收敛为对 `@nop-chaos/ui` `Button` 的包装；如个别 `PopoverTrigger` 入口确需非 button host，只保留局部例外。
- **为什么值得现在做**: 共享 Button 的可访问性、focus ring、disabled、theme 行为修复不会自动覆盖 code-editor toolbar；当前平行 primitive 已扩散到多个面板。
- **误报排除**: 这不是 ui 包内部实现，不是原生能力控件，也不是 spreadsheet/grid 类高性能宿主表面；仓库内已有等价 `Button` 抽象。
- **历史模式对应**: 现有 UI 抽象之外的平行 button primitive。
- **参考文档**: `AGENTS.md`, `packages/ui/src/index.ts`, `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 已检查但未保留的候选

- `packages/nop-debugger/src/panel/json-viewer.tsx` 已改用 `Button`
- `packages/flow-designer-renderers/src/designer-inspector.tsx` 为可点击卡片容器，不是明确 `Button` 等价场景
- `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx` 的 `Badge role="button"` 替换收益不足
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 属于高性能宿主表面
- `packages/word-editor-renderers/src/toolbar/insert-controls.tsx` 的 `input[type=file]` 属原生能力控件

## 维度复核结论

- [维度11-01]: 保留 (P3)。`flux-code-editor` toolbar primitive 仍用 `span role="button"` 重造共享 `Button` 语义，且已扩散到多个 panel/toolbar。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                          | 一句话摘要                                               |
| ----- | -------- | ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| 11-01 | P3       | `packages/flux-code-editor/src/code-editor-renderer/toolbar-button.tsx:27-52` | toolbar primitive 仍用 `span role="button"` 重造按钮语义 |
