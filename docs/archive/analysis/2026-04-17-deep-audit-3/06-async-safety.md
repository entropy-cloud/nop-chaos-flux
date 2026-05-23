# 维度 06：异步模式与取消安全

## 发现清单

### [维度06] refreshDerivedState 缺乏取消机制

- **文件**: packages/report-designer-core/src/core.ts:142-201
- **严重程度**: P2
- **异步操作**: `refreshDerivedState()` 异步函数调用 `loadFieldSources()` 和 `resolveInspectorPanelsForTarget()`
- **竞态场景**:
  1. 用户选择目标 A → `refreshDerivedState` 开始加载
  2. 用户快速选择目标 B → 新的 `refreshDerivedState` 开始
  3. A 的响应晚于 B 到达 → A 的结果覆盖 B
- **用户可见故障**: 选择节点 A → 快速切换到 B → UI 显示 A 的检查器面板而非 B
- **建议**:
  1. 添加请求序号或 AbortController
  2. 在响应回来时检查当前 selectionTarget 是否仍匹配
- **复核状态**: 保留

### [维度06] WordEditorPage setTimeout 未清理

- **文件**: packages/word-editor-renderers/src/WordEditorPage.tsx:132
- **严重程度**: P3
- **异步操作**: `setTimeout(() => setSaveMessage(null), 2000)`
- **风险**: 组件卸载后可能调用 setState
- **建议**: 将 setTimeout 移入 useEffect 并在清理函数中 clearTimeout

### [维度06] form-runtime-values void 调用

- **文件**: packages/flux-runtime/src/form-runtime-values.ts:94-96
- **严重程度**: P3
- **异步操作**: `void revalidateDependents(changedPath)`
- **风险**: 异常会被静默吞掉
- **建议**: 在 revalidateDependents 内部捕获并处理异常

### [维度06] nop-debugger waitForEvent 潜在泄漏

- **文件**: packages/nop-debugger/src/controller.ts:116-144
- **严重程度**: P3
- **风险**: 如果调用方不等待 Promise 完成，unsubscribe 永远不会被调用
- **建议**: 考虑返回带有 cancel 方法的对象

---

## 已收敛的模式

### submit 并发保护

- **文件**: packages/flux-runtime/src/form-runtime-submit-flow.ts:40-223
- 第 58-64 行检查 `getIsSubmitting()` 并返回 cancelled
- 第 66-68 行检查 `disposed` 状态
- 第 70-72 行检查 `signal?.aborted`

### request-runtime 请求去重

- **文件**: packages/flux-runtime/src/request-runtime.ts:319-390
- 支持三种去重策略：`cancel-previous`、`ignore-new`、`parallel`
- 使用 Map 追踪 activeControllers 和 activePromises

### data-source-runtime 轮询管理

- **文件**: packages/flux-runtime/src/data-source-runtime.ts:381-639
- 使用 `abortController` 取消进行中的请求
- `stop()` 方法正确清理 pollTimer 和 abortController

### action-runtime debounce 取消

- **文件**: packages/flux-runtime/src/action-runtime.ts:183-207
- 使用 `cancelPendingDebounce` 取消前一个 debounced 操作

### React hooks AbortController

- **文件**: packages/flux-react/src/useNodeImports.ts, useSourceValue.ts
- 正确在 useEffect 中创建 AbortController，在清理函数中调用 abort()

---

## 总结

| 严重程度 | 数量 |
| -------- | ---- |
| P0       | 0    |
| P1       | 0    |
| P2       | 1    |
| P3       | 3    |
| 已收敛   | 10   |

**项目整体评估**: 核心运行时（flux-runtime）中建立了成熟的异步取消架构，主要风险集中在设计器包和渲染器包的边缘场景。
