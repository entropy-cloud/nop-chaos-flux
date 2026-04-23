# 维度 06：异步模式与取消安全

- 初审发现：4
- 维度复核：完成
- 子项复核：1 组（`source-resolvers.ts`）

## 保留

1. [维度复核通过] `packages/flux-renderers-form/src/field-utils.tsx` 中 `adapter.out(...)` 的异步写回缺少 sequence/latest-only guard，旧结果可能覆盖新输入。

2. [维度复核通过] `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx` 的 async `transformOutAction` 缺少 stale-result guard。

3. [维度复核通过] `packages/word-editor-renderers/src/editor-canvas.tsx` 与 `preview/doc-preview-page.tsx` 对 `getWordCount()` 只有 `.then(...)`，缺少 rejection 收尾。

## 降级

1. [已降级] `packages/flux-code-editor/src/source-resolvers.ts` 自建 `AbortController` 但未把 `signal` 透传给 `dispatch(action, { signal })`，导致它自己的 cleanup 不能真正取消 API 分支的在途请求；不过 runtime 全局取消链路并非完全缺失。

## 复核摘要

- 保留：3
- 降级：1
- 驳回：0
