# 维度03：API 表面积与契约一致性

- 审核日期：2026-04-17
- 初审发现：4
- 维度复核结论：保留 4，降级 2，驳回 1

## 已通过独立复核

### [维度03-01] `flow-designer-renderers` 根入口暴露 XYFlow 细节和默认面板

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flow-designer-renderers/src/index.tsx`, `designer-xyflow-canvas/index.ts`, `docs/architecture/flow-designer/api.md`
- 建议：收敛到注册面、manifest、bridge；内部 UI 和 XYFlow 细节转子路径或内部模块。

### [维度03-02] `flow-designer-renderers` 根入口额外暴露 `DesignerContext` 系列 hook/context

- 严重程度：P3
- 复核判定：保留
- 文件：`packages/flow-designer-renderers/src/index.tsx`, `designer-context.ts`
- 建议：从根入口移除，或转为明确的非稳定子路径。

### [维度03-03] `report-designer-renderers` 根入口暴露 host-data builders/hooks

- 严重程度：P3
- 复核判定：保留
- 文件：`packages/report-designer-renderers/src/index.ts`, `host-data.ts`, `docs/architecture/report-designer/api.md`
- 建议：将 host-data builder/hook 收回内部，或显式标注为 unstable 子路径。

### [维度03-04] `report-designer-renderers` 根入口暴露 toolbar helpers/defaults

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/report-designer-renderers/src/index.ts`, `report-designer-toolbar-helpers.ts`, `report-designer-toolbar-defaults.ts`
- 建议：仅保留稳定 toolbar 配置面，内部 helper 不进根入口。

### [维度03-05] `flux-react` 根入口暴露过多低层 wiring helper

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/flux-react/src/index.tsx`, `helpers.tsx`, `hooks.ts`
- 建议：根入口聚焦 hooks/props 契约，低层装配 helper 迁移到内部或非稳定子路径。

## 降级项

### [维度03-D1] `flux-react` 原始 Context 根导出问题

- 复核判定：降级
- 原因：`FormContext` / `ScopeContext` 等在 advanced renderer 中确有合法用法；真正多余的是 `useRequiredContext` 与部分低层 helper。

### [维度03-D2] `report-designer-renderers` “fallback canvas” 暴露问题

- 复核判定：降级
- 原因：当前主问题是 host-data 与 toolbar helper 暴露；初审对 fallback canvas 的表述过宽。

## 复核后排除

### [维度03-X1] `word-editor-renderers` 根入口导出大量内部件

- 复核判定：驳回
- 原因：该包文档定位本来就是 React rendering layer and UI components，不能仅凭导出数量判为契约不一致。
