# 维度 11：UI 组件使用合规性

- 初审发现：1
- 维度复核：完成
- 子项复核：1

## 保留

- 无。

## 降级

1. [已降级] `apps/playground/src/pages/report-designer-demo.tsx:401-408` 的 panel toggle 仍使用原生 `<button>`，但这是 playground 层的小型控件，证据不足以升级为主问题。
2. [已降级] `packages/ui/src/components/ui/sidebar-layout.tsx:140-162` 的 `SidebarRail` 仍使用原生 `<button>`；它更像 UI 库内部低层 rail affordance，未越过校准文档对 raw HTML 的更高证据门槛。

## 复核摘要

- `input[type=file]`、`input[type=color]`、spreadsheet/grid 宿主表面等例外已排除。
- 本轮未保留需要立即整改的维度 11 问题。
