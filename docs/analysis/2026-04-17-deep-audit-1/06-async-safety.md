# 维度06：异步模式与取消安全

- 审核日期：2026-04-17
- 初审发现：2
- 维度复核结论：保留 2，补充 2

## 已通过独立复核

### [维度06-01] `DynamicRenderer` 缺 abort/stale guard，旧响应可覆盖新 schema

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/flux-renderers-basic/src/dynamic-renderer.tsx`, `packages/flux-runtime/src/request-runtime.ts`

### [维度06-02] report designer 选择切换后的异步派生缺 stale guard

- 严重程度：P1
- 复核判定：保留
- 文件：`packages/report-designer-core/src/core.ts`, `runtime/inspector-panels.ts`, `runtime/field-sources.ts`

### [维度06-03] report designer preview/stopPreview 缺取消与 stale guard

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/report-designer-core/src/core-dispatch.ts`, `adapters.ts`

### [维度06-04] `word-editor-renderers` 仍在 async effect 中使用 bare boolean cancel flag

- 严重程度：P2
- 复核判定：保留
- 文件：`packages/word-editor-renderers/src/preview/DocPreviewPage.tsx`, `EditorCanvas.tsx`
