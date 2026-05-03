# 维度 17：命名与术语一致性

## 初审摘要

- 初审发现 3 条真实术语冲突：局部 `scopeRef` DOM ref 命名噪音、`flux-code-editor` 仍暴露 `dataPath`、`action-payload-matrix.md` 仍描述 action `dataPath`。

## 维度复核结论

- `scopeRef` 作为 DOM ref 的命名冲突降级为局部噪音。
- `flux-code-editor` 的 author-facing `dataPath` 与 action 文档中的 `dataPath` 残留均保留。

## 归档说明

- 本维度已完成独立维度复核。
- `dataPath` 相关结论仍需补做文档/示例/包导出面的子项复核后再纳入 summary。
