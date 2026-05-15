# 维度 11：UI 组件使用合规性

## 第 1 轮（初审）

未发现需报告问题。

## 检查范围

- 已阅读：`docs/index.md`、`AGENTS.md`、`docs/references/audit-tooling.md`、`docs/references/deep-audit-calibration-patterns.md`、`docs/references/reopened-design-decisions-and-audit-adjudications.md`、`packages/ui/src/index.ts`
- 复核范围：`packages/*/src`、`apps/*/src`
- 已核对生产候选点：
  - `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
  - `packages/word-editor-renderers/src/toolbar/insert-controls.tsx`
  - `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx`
  - `apps/playground/src/component-lab/component-lab-page.tsx`

## 零发现结论

- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 中 raw `table/thead/tbody/tr/th/td` 属 spreadsheet/grid 主机化高性能表面，属于合理例外。
- `packages/word-editor-renderers/src/toolbar/insert-controls.tsx` 中 raw `input type="file"` 属浏览器原生能力控件合理例外。
- `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx` 中 raw spacer `<tr aria-hidden ... />` 用于虚拟滚动占位，当前未见一致性、可访问性或维护问题。
- `apps/playground/src/component-lab/component-lab-page.tsx` 中 raw `aside/nav` 属合理语义地标，不构成 UI 组件使用违约。

## 维度复核结论

- 零发现保留。独立复查后，生产代码中的 raw HTML 命中点仍都属于 owner 文档支持的合理例外或语义地标用法。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度无通过独立复核的保留项 |
