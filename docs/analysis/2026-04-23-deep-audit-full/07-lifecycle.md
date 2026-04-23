# 维度 07：生命周期与副作用归属

- 初审发现：2
- 维度复核：完成
- 子项复核：建议后续针对 owner summary / scope export 统一机制继续展开

## 结论

1. [维度复核通过] `form`、`tree`、`designer-page`、`spreadsheet-page`、`report-designer-page`、`word-editor-page` 等多处 `statusPath` 发布 effect 缺少卸载清理，可能遗留陈旧 owner summary。

2. [已降级] `packages/flux-renderers-data/src/crud-renderer.tsx` 里的 `$crud` 通道本身不是误植，但当前实现把只读 owner export 落成了 renderer effect 直接写 ambient scope，且无 cleanup，属于落地机制不一致。

## 复核摘要

- 保留：1
- 降级：1
- 驳回：0
