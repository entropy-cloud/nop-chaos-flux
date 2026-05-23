# 维度 11: UI 组件使用合规性

## 第 1 轮（初审）

### [维度11-Z0] 初审零发现结论

- **检查范围**: `packages/ui/src/index.ts` 组件清单；packages 下 raw `<button>/<input>/<select>` grep 结果去除测试文件后的人工作业抽样；`word-editor-renderers` 的 `input[type=file]` 特例。
- **读取文档**: `AGENTS.md` UI Component Usage、`docs/references/deep-audit-calibration-patterns.md` pattern 3。
- **现状**: 本轮抽样未发现“已有等价 `@nop-chaos/ui` 组件却仍在 live renderer 主路径使用原生控件”的明确违约；`input[type=file]` 与 xyflow/spreadsheet 之类 host-specialized surface 命中的是校准文档里的合理例外。
- **复核前结论**: 本维度暂无需保留问题。

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度11-Z0]: 维度复核通过。抽样命中均落在测试代码、浏览器原生能力控件或 host-specialized surface 例外中。

## 子项复核结论

- 本维度无保留项，无需逐条子项复核。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要                   |
| ---- | -------- | ---- | ---------------------------- |
| 无   | -        | -    | 本维度经复核未发现需报告问题 |
