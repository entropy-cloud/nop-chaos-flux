# 维度 16：文档-代码一致性

- 初审发现：4
- 维度复核：完成
- 子项复核：建议继续围绕 active docs 的 `App.tsx` 路径漂移和 completed plan hygiene 展开

## 保留

1. [维度复核通过] `AGENTS.md` 的 workspace package 清单与依赖流未同步 `flux-compiler`、`flux-action-core`。
2. [已修复] active docs 中命中的 `apps/playground/src/App.tsx` 引用已更新为 live 路径 `apps/playground/src/app.tsx`。
3. [维度复核通过] `docs/references/terminology.md` 对 `RendererComponentProps` 的字段说明不完整，缺 `id/path/templateNode`。
4. [维度复核通过] 至少一份已标 `completed` 的计划仍保留未完成 validation checklist；`docs/plans/133-...md` 是直接命中，`18-...md`、`27-...md` 也应继续复查。

## 复核摘要

- 保留：4
- 降级：0
- 驳回：0
