# 维度 14：测试覆盖与质量

- 初审发现：2
- 维度复核：完成
- 子项复核：1

## 保留

1. [子项复核通过] `useSpreadsheetInteractions()` 是公开且被跨包消费的大型交互 surface，但直接测试仍主要覆盖 selection 与 fill-handle 一小部分路径。
   文件：`packages/spreadsheet-renderers/src/index.ts:29-36`、`packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:29-128,295-377`
   现有测试：`packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx:8-18`、`context-menu-operations.test.tsx:8-18`
   相关消费方：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:39-76`
   严重程度：P2

## 降级

1. [已降级] `flux-i18n` 包的直接 contract 测试仍偏薄，但已有较多下游 smoke/integration 间接覆盖。
   文件：`packages/flux-i18n/src/i18n.ts:33-103`、`packages/flux-i18n/src/i18n.test.ts:1-16`

## 复核摘要

- runtime / react / compiler / form/data renderer 的主热点测试整体仍较强。
- 本轮保留的问题集中在一个公开 hook 的宽返回面与窄直接覆盖之间的落差。
