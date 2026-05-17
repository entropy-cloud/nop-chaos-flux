# 维度 06：异步模式与取消安全 — 审计报告

## 第 1 轮（初审）

### [维度06-01] 报告设计器工具栏缺少并发操作防护 (P2)

- **文件**: `packages/report-designer-renderers/src/report-designer-toolbar.tsx:129,151`
- **严重程度**: P2
- **问题类别**: 竞态 / 并发防护
- **竞态场景**: 用户在工具栏按钮上快速点击两次 → 两次 `void handleButtonClick(item)` 独立调度 `dispatch()` → 多个操作同时执行
- **用户可见故障**: 重复 API 调用、状态损坏风险、toast 重叠
- **建议**: 使用 `isProcessingRef` 防护或 AbortController，在调度之前拒绝重叠调用

### [维度06-02] 电子表格默认页面缺少并发工具栏操作防护 (P3)

- **文件**: `packages/spreadsheet-renderers/src/default-page-body.tsx:134-220`（26 处 `void handleXxx()`）
- **严重程度**: P3
- **问题类别**: 竞态 / 并发防护
- **竞态场景**: 用户在变异操作（insertRow, deleteRow）上快速点击两次
- **建议**: 为变异操作添加 `isProcessingRef`，非变异操作允许并发

### [维度06-03] import-stack 模块缓存静默错误丢失 (P3)

- **文件**: `packages/flux-runtime/src/import-stack.ts:120`
- **严重程度**: P3
- **问题类别**: 异常吞掉
- **建议**: 至少使用 `console.warn` 或 `reportImportFailure` 在允许重试前记录原始错误

### [维度06-04] 设计器自动布局初始 useEffect 缺少 AbortController (P3)

- **文件**: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:77-128`
- **严重程度**: P3
- **问题类别**: 取消安全
- **风险**: 组件卸载后来自先前调用栈的 React 警告或过时状态更新
- **建议**: 添加 AbortController + 清理函数

### [维度06-05] 流程设计器核心同步生命周期钩子 catch 导致错误细节丢失 (P3)

- **文件**: `core-node-commands.ts:51`, `core-edge-commands.ts:86,215`
- **严重程度**: P3
- **问题类别**: 异常吞掉
- **建议**: 使用结构化错误记录转发完整错误

### [维度06-06] word-editor-save 缺少并发间隙防护 (P2)

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-save.ts:41-98`
- **严重程度**: P2
- **问题类别**: 竞态 / 取消安全
- **竞态场景**: 快速连击保存时，第 2 个调用覆盖 `saveAbortRef.current` 并中止第 1 个调用的信号 → 第 1 个保存静默丢失
- **建议**: 将 `saveAbortRef.current?.abort()` 移到 `isSavingRef.current` 检查之后

### P5 合规性总结

- **通过**: schema-renderer.tsx, dynamic-renderer.tsx, form-renderer.tsx, word-editor-save.ts, source-observer.ts, api-data-source-controller.ts, request-runtime.ts, form-runtime-submit-flow.ts, form-runtime-validation.ts, reaction-runtime.ts, debounce.ts
- **未通过**: use-designer-auto-layout.ts, report-designer-toolbar.tsx, spreadsheet default-page-body.tsx

## 深挖第 2 轮追加

### [维度06-07] useNodeLifecycleActions onMount dispatch 缺少取消信号 (P2)

- **文件**: `packages/flux-react/src/node-renderer-effects.ts:85-107`
- **保留**: P2 — 缺少 dispatch 的取消机制

### [维度06-08] use-source-value observer.run 缺少清理 (P3)

- **文件**: `packages/flux-react/src/use-source-value.ts:28-39`
- **保留**: P3 — input 变化时无取消前次运行

### [维度06-09] report-designer-page core.initialize() 缺少 AbortController (P2)

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:381-398`
- **保留**: P2 — initialize() 无法取消

### [维度06-10] use-designer-auto-layout 第二个 useEffect 缺 AbortController (P3)

- **文件**: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:77-128`
- **保留**: P3 — requestId 模式不中断计算

### [维度06-11] form-runtime setValues 触发依赖重新验证缺少 dispose 防护 (P2)

- **文件**: `packages/flux-runtime/src/form-runtime-values.ts:147-153`、`form-runtime-owner.ts:120-191`
- **保留**: P2 — dispose 后仍写入共享状态

### [维度06-12] editor-canvas bridge.getWordCount() 竞态 (P3)

- **文件**: `packages/word-editor-renderers/src/editor-canvas.tsx:148-155`
- **保留**: P3 — 桥接 Promise 无可取消路径

## 维度复核结论

| 编号  | 原定 | 结果        | 理由               |
| ----- | ---- | ----------- | ------------------ |
| 06-01 | P2   | **保留 P2** | 缺少并发防护       |
| 06-02 | P3   | **保留 P3** | 缺少并发防护       |
| 06-03 | P3   | **保留 P3** | 错误丢失           |
| 06-04 | P3   | **保留 P3** | 缺 AbortController |
| 06-05 | P3   | **保留 P3** | 错误细节丢失       |
| 06-06 | P2   | **保留 P2** | 确认防护存在       |
| 06-07 | P2   | **保留 P2** | 缺取消信号         |
| 06-08 | P3   | **保留 P3** | 缺清理             |
| 06-09 | P2   | **保留 P2** | 缺 AbortController |
| 06-10 | P3   | **保留 P3** | 缺中断             |
| 06-11 | P2   | **保留 P2** | 缺 dispose 防护    |
| 06-12 | P3   | **保留 P3** | 不可取消 Promise   |

## 最终保留项

| 编号  | 程度 | 文件                                  | 摘要               |
| ----- | ---- | ------------------------------------- | ------------------ |
| 06-01 | P2   | `report-designer-toolbar.tsx:129,151` | 缺并发防护         |
| 06-06 | P2   | `use-word-editor-save.ts:41-98`       | 间隙防护           |
| 06-07 | P2   | `node-renderer-effects.ts:85-107`     | 缺取消信号         |
| 06-09 | P2   | `page-renderer.tsx:381-398`           | 缺 AbortController |
| 06-11 | P2   | `form-runtime-values.ts:147-153`      | 缺 dispose 防护    |
| 06-02 | P3   | `default-page-body.tsx:134-220`       | 缺并发防护         |
| 06-03 | P3   | `import-stack.ts:120`                 | 错误丢失           |
| 06-04 | P3   | `use-designer-auto-layout.ts:77-128`  | 缺 AbortController |
| 06-05 | P3   | `core-node-commands.ts:51`            | 错误细节丢失       |
| 06-08 | P3   | `use-source-value.ts:28-39`           | 缺清理             |
| 06-10 | P3   | `use-designer-auto-layout.ts:77-128`  | 缺中断             |
| 06-12 | P3   | `editor-canvas.tsx:148-155`           | 不可取消 Promise   |
