# 维度 16：文档-代码一致性

- 初审发现：2
- 维度复核：完成
- 子项复核：1 组

## 保留

1. [子项复核通过] 多个 active architecture / routing doc 仍指向已归档的 `docs/plans/*` 路径。
   文件：`docs/architecture/debugger-runtime.md:18-19`、`docs/architecture/performance-design-requirements.md:88-89`、`docs/architecture/report-designer/design.md:479`、`docs/architecture/frontend-baseline.md:179`
   实际路径：对应文件均已迁至 `docs/archive/plans/*`
   严重程度：P3

2. [子项复核通过] `word-editor` active docs 仍包含缺失的 component/plan 路径。
   文件：`docs/architecture/word-editor/design.md:171-172`、`docs/components/word-editor-page/design.md:153`
   现状：`docs/components/word-editor-page/README.md` 不存在；`24-word-editor-development-plan.md` 已归档到 `docs/archive/plans/`
   严重程度：P3

## 复核摘要

- 这些都是 active owner doc / active routing doc 的坏链接，不属于 draft 或历史材料噪音。
