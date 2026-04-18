# [维度06] 异步模式与取消安全 — 初审报告

## 发现清单

### [维度06-F01] withRetry 的 setTimeout 延迟不可取消

- **文件**: `packages/flux-runtime/src/operation-control.ts:119-121,136-137`
- **严重程度**: P2
- **竞态场景**: 组件卸载后 retry 继续执行，可能写入已销毁 store
- **建议**: 接受 AbortSignal 参数，使用可中断 sleep

### [维度06-F02] withTimeout 的 AbortController 未与外层 signal 联动

- **文件**: `packages/flux-runtime/src/operation-control.ts:38-72`
- **严重程度**: P2
- **竞态场景**: 外层 abort 后内部 controller 不受影响
- **建议**: 接受可选外层 AbortSignal，abort 时联动内部 controller

### [维度06-F03] Reaction debounceTimer 清理

- **文件**: `packages/flux-runtime/src/reaction-runtime.ts:218-228`
- **严重程度**: P3（已被 disposed 标记充分保护）
- **结论**: 不构成实际缺陷

### [维度06-F04] Report Designer refreshDerivedState 并发无序列化

- **文件**: `packages/report-designer-core/src/core.ts:142-201`
- **严重程度**: P2
- **竞态场景**: 快速切换选区时两次 refresh 交错
- **建议**: 引入请求序列化或 generation counter

### [维度06-F05] Report Designer 预览命令无取消机制

- **文件**: `packages/report-designer-core/src/core-dispatch.ts:182-226`
- **严重程度**: P2
- **竞态场景**: 两次预览结果交错
- **建议**: 维护 preview AbortController，新请求 cancel 旧的

### [维度06-F06] Spreadsheet/Report Designer dispatch 无并发保护

- **文件**: spreadsheet-core/src/core.ts:54-56, report-designer-core/src/core.ts:235-237
- **严重程度**: P3
- **建议**: 并发概率低，可后续处理

### [维度06-F07] Formula DataSource start() 微任务无取消检查

- **文件**: `packages/flux-runtime/src/data-source-runtime.ts:324-326`
- **严重程度**: P3（已被 stopped 检查保护）
- **结论**: 不构成实际缺陷

### [维度06-F08] ELK 布局调用无取消机制

- **文件**: flow-designer-core/src/elk-layout.ts:12-64, tree-layout.ts:100-119
- **严重程度**: P3
- **建议**: 接受可选 AbortSignal

### [维度06-F09] defaults.ts 默认 fetcher 忽略 signal

- **文件**: `packages/flux-react/src/defaults.ts:10-23`
- **严重程度**: P3
- **建议**: 签名接受 ctx 参数保持一致性

## 已确认安全的关键路径

1. Submit 并发保护 — getIsSubmitting() + isSubmittingInternal 入口检查
2. 请求去重 — cancel-previous/ignore-new/parallel 三种策略
3. AbortSignal 传递链 — submit → submitApi → executeApiSchema → fetcher
4. DataSource 轮询清理 — stop() 清理 timer + abortController
5. React 层 useEffect AbortController — useNodeImports, useSourceValue 等
6. Validation cancellation — validationRuns 计数器
