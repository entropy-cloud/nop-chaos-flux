# 维度02：模块职责与文件边界

- 审核日期：2026-04-17
- 初审发现：2
- 维度复核结论：保留 1，驳回 1，补充 1

## 已通过独立复核

### [维度02-01] `flow-designer-renderers` 根入口暴露过多内部实现

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flow-designer-renderers/src/index.tsx`, `docs/architecture/flow-designer/api.md`
- 现状：根入口直接导出页面壳、context、canvas bridge、XYFlow 细节。
- 风险：内部页面拆分与底层画布实现被抬升为包级公共面。
- 建议：根入口收敛到 renderer 注册、manifest、bridge 等稳定契约。

### [维度02-02] `designer-page.tsx` 超过 500 行且职责偏厚

- 严重程度：P3
- 复核判定：保留
- 文件：`packages/flow-designer-renderers/src/designer-page.tsx`
- 现状：约 520 行，同时承担模式分流、快捷键、状态发布、弹窗、shell 组装。
- 风险：继续演化时更容易重新膨胀。
- 建议：优先评估拆出弹窗、状态发布和 shell 组装。

## 复核后排除

### [维度02-X1] `word-editor-renderers` 根入口导出内部件

- 复核判定：驳回
- 原因：这更像 API 表面积偏宽，不足以单列为模块职责违规；该包文档本身就把 UI components 作为职责范围。

## 备注

- 本次未发现 `>700` 行的必须拆分文件。
