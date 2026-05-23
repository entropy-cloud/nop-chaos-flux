# 维度 11：UI 组件使用合规性

## 初审摘要

- 初审发现 1 条明确问题：playground report designer demo 使用原生 `<button>`。
- 初审同时确认 spreadsheet host surface、`input[type=file]`、`input[type=color]` 等原生元素使用属于合理特例。

## 维度复核结论

- `apps/playground/src/pages/report-designer-demo.tsx` 的原生 `<button>` 保留。
- 复核额外发现 `packages/ui/src/components/ui/sidebar-layout.tsx` 的 `SidebarRail` 也仍是原生 `<button>`；这一条作为新增待进一步处理的线索记录在案。

## 归档说明

- 本维度已完成独立维度复核。
- 由于复核中新增了 `SidebarRail` 线索，后续应按文件补做 UI usage 子项复核后再一并收口。
