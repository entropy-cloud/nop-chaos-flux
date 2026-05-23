# 维度 06：异步模式与取消安全

## 初审概览

- 初审候选：4
- 维度复核：2 条保留，2 条降级

## 条目复核

### [保留] retry/backoff 不感知 abort

- **关键文件**: `packages/flux-runtime/src/operation-control.ts`, `packages/flux-runtime/src/request-runtime.ts`
- **说明**: `withRetry()` 不接收 `AbortSignal`，abort 后仍可能等待并重试。

### [降级] Inspector panel submit 缺少充分的并发/归属保护

- **关键文件**: `packages/report-designer-renderers/src/inspector-shell-renderer.tsx:36-37,80-91,110-122`
- **说明**: 问题真实，但更准确是中等强度的 stale/guard 缺口。

### [降级] 多处 source 驱动异步只 stale-ignore，不真正 abort 旧执行

- **关键文件**: `packages/flux-code-editor/src/source-resolvers.ts:73-119`, `packages/flux-react/src/useSourceValue.ts:37-62`, `packages/flux-react/src/node-source-prop-controller.ts:57-135`
- **说明**: 旧执行通常不会写错最新 UI，但后台工作仍继续运行。

### [保留] word count Promise 缺少 rejection 处理

- **关键文件**: `packages/word-editor-renderers/src/EditorCanvas.tsx:118`, `packages/word-editor-renderers/src/preview/DocPreviewPage.tsx:46`, `packages/word-editor-core/src/canvas-editor-bridge.ts:123`
- **说明**: bridge 一旦 reject，会形成未处理的异步错误。
