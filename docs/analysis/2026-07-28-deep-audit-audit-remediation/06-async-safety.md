# Dimension 06: Async Patterns & Cancellation Safety

## 第 1 轮（初审）

### [D06-01] form.tsx loadAction Effect — 无 AbortController，无陈旧响应守卫，静默吞吃

- **文件**: packages/flux-renderers-form/src/renderers/form.tsx:443-466
- **严重程度**: P0
- **问题类别**: 竞态 / promise 吞吃
- **异步操作**: dispatch `loadAction` 以获取初始表单数据。
- **竞态场景**: effect 无 `AbortController`。如果组件卸载或 activationKey 改变，promise 继续执行，`.then` 在陈旧/不正确的实例上调用 `setValues`。`.catch(() => {})` 静默吞吃错误。
- **用户可见故障**: 导航离开并返回后显示陈旧表单数据；表单加载静默失败。
- **建议**: 添加 per-invocation `AbortController`，传递 `signal`，在 cleanup 中 abort，替换空 `.catch`。

### [D06-02] markdown.tsx MarkdownRenderer — 无 AbortController 的裸 Boolean cancelled

- **文件**: packages/flux-renderers-content/src/markdown.tsx:35-55
- **严重程度**: P0
- **问题类别**: 取消 (P5 违规)
- **异步操作**: `fetch(src)` 加载 markdown 内容。
- **竞态场景**: 使用 `let cancelled = false` 裸 boolean 替代 `AbortController`。`fetch` 收到无 signal，HTTP 请求在卸载后继续完成。
- **用户可见故障**: 陈旧 markdown 获取的网络流量浪费；组件较多时复合性问题。
- **建议**: 替换为 `AbortController` 模式：`fetch(src, { signal })`，在 cleanup 中 abort。

### [D06-03] qrcode.tsx QrCodeRenderer — 无 AbortController 的裸 Boolean cancelled

- **文件**: packages/flux-renderers-content/src/qrcode.tsx:54-74
- **严重程度**: P1
- **问题类别**: 取消 (P5 违规)
- **异步操作**: `QRCode.toCanvas(...)` — 异步二维码渲染。
- **竞态场景**: 裸 `cancelled` boolean，无 AbortController。陈旧渲染错误可能对错误的值/key 组合设置 `failed=true`。
- **用户可见故障**: 快速属性变化后，对有效值显示错误状态。
- **建议**: 添加 AbortController 守卫或 generationRef 计数器。

### [D06-04] value-input.tsx FormulaPreview — 无 AbortController 的裸 Boolean cancelled

- **文件**: packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:176-191
- **严重程度**: P1
- **问题类别**: 取消 (P5 违规)
- **异步操作**: `evaluateFormula(formulaStr)` — 异步公式求值。
- **竞态场景**: 裸 `cancelled` boolean，无 AbortController。公式求值在组件卸载或字符串更改后继续。
- **用户可见故障**: 快速编辑后为错误公式字符串显示陈旧公式预览。
- **建议**: 如果支持则传递 `AbortSignal`，或使用 generationRef token。

### [D06-05] use-dict-options.ts useDictOptions — 无 AbortController 的裸 Boolean cancelled

- **文件**: packages/flux-renderers-form/src/renderers/use-dict-options.ts:23-46
- **严重程度**: P2
- **问题类别**: 取消 (P5 违规)
- **异步操作**: `loadDict(dictName)` — 宿主提供的异步回调。
- **竞态场景**: 裸 `cancelled` boolean。`loadDict` 收到无 AbortSignal，宿主操作在卸载后继续。
- **用户可见故障**: 快速 prop 变化后为错误的 `dictName` 设置陈旧字典选项。
- **建议**: 考虑扩展接口以接受 AbortSignal 或添加 generationRef。

### [D06-06] crud-renderer-state.ts useCrudLoadReaction — 无 AbortController 的裸 Boolean cancelled

- **文件**: packages/flux-renderers-data/src/crud-renderer-state.ts:608-672
- **严重程度**: P0
- **问题类别**: 取消 / 竞态
- **异步操作**: `loadReaction.dispatch({ evaluationBindings })` — 主要 CRUD 数据加载。
- **竞态场景**: 裸 `cancelled` boolean。`loadReaction.dispatch` 收到无 AbortSignal。当分页/查询改变时，旧 dispatch 未被中止。如果旧 promise 在新之后 resolve，`.then` 用陈旧数据调用 `setRows`/`setTotal`。
- **用户可见故障**: 快速分页/筛选变化后 CRUD 表显示错误数据；陈旧响应覆盖正确数据。
- **建议**: 创建 per-invocation `AbortController`，传递 `signal`，检查 `signal.aborted` 后再更新。

### [D06-07] use-infinite-scroll.ts — 卸载后不受控 setTimeout 导致陈旧 setState

- **文件**: packages/flux-renderers-data/src/use-infinite-scroll.ts:149
- **严重程度**: P1
- **问题类别**: 竞态 / 取消
- **异步操作**: `setTimeout(triggerLoad, 0)` 在加载稳定后进行。
- **竞态场景**: cleanup 运行时 `setTimeout` 已排队但未被清除。计时器在 cleanup 后触发，调用已卸载组件上的 `setLoading`/`setError`。
- **用户可见故障**: 罕见计时条件下无限滚动在分离的组件上触发陈旧加载。
- **建议**: 存储 `setTimeout` 返回的 timer ID 并在 cleanup 中清除。

### [D06-08] form.tsx loadAction Effect — Dep 变化时的陈旧响应竞态（D06-01 的配套 P0）

- **文件**: packages/flux-renderers-form/src/renderers/form.tsx:443-466
- **严重程度**: P0
- **问题类别**: 竞态
- **异步操作**: 与 D06-01 相同。当 `activationKey` 变化时，旧的 promise 继续。如果旧的 promise 在新的之后 resolve，使用陈旧数据调用 `setValues`。
- **竞态场景**: 无 generation 守卫（无 requestId 计数器如 `schema-renderer.tsx` 第 358 行所用）。
- **用户可见故障**: 切换记录后表单显示之前实例的数据；用户编辑被陈旧数据覆盖。
- **建议**: 添加 `loadRequestIdRef` counter，在 `.then` 处理器中检查 identity。

### [D06-09] useCrudPolling — cleanup 与新 effect 间 handleRef 覆盖竞态

- **文件**: packages/flux-renderers-data/src/use-crud-polling.ts:106-136
- **严重程度**: P2
- **问题类别**: 竞态
- **异步操作**: CRUD 轮询切换。
- **竞态场景**: 当 `effectiveEnabled` 在同一渲染周期内 `true → false → true` 时，`lastActionRef` state 变为 `'start'`，即使基础轮询在 `false` 间隔期间已被取消。
- **用户可见故障**: 快速轮询切换下，数据可能因轮询未完全重启而无法以预期间隔刷新。
- **建议**: 用局部变量守卫 `handleRef.current` 写入，防止跨 effect 污染。

### [D06-10] renderer-reaction-handle.ts — dispose() 中冗余的双重 abort

- **文件**: packages/flux-runtime/src/renderer-reaction-handle.ts:272-284
- **严重程度**: P2
- **问题类别**: 竞态 / 取消
- **现状**: `dispose()` 调用 `lifecycleController.abort()`（已传播到 in-flight controller via composeAbortSignals），然后调用 `inFlightController?.abort()`（冗余但安全）。
- **风险**: 低。双重 abort 安全，因为第二次 abort 在已 abort 的信号上是空操作。
- **建议**: 添加注释说明二次 abort 的安全冗余性。无需代码变更。

## 维度复核结论

- [D06-01]: 保留 P0。阻塞性：主要表单加载路径缺少所有异步守卫。
- [D06-02]: 保留 P0。阻塞性：fetch 无 AbortController，违反 P5 红线。
- [D06-03]: 保留 P1。裸 cancelled 模式，但二维码渲染本质上是幂等的。
- [D06-04]: 保留 P1。公式求值路径无取消机制。
- [D06-05]: 保留 P2。字典加载是相对冷的路径。
- [D06-06]: 保留 P0。阻塞性：CRUD 主数据加载路径无 AbortController。
- [D06-07]: 保留 P1。超时未清除是真实竞态条件。
- [D06-08]: 保留 P0。阻塞性：陈旧响应覆盖表单数据。
- [D06-09]: 保留 P2。低风险竞态条件。
- [D06-10]: 保留 P2。双重 abort 安全，值得记录。

## 最终保留项

| 编号  | 严重程度 | 文件                                                          | 一句话摘要                                 |
| ----- | -------- | ------------------------------------------------------------- | ------------------------------------------ |
| 06-01 | P0       | `flux-renderers-form/src/renderers/form.tsx:443-466`          | loadAction 无 AbortController + 静默 catch |
| 06-02 | P0       | `flux-renderers-content/src/markdown.tsx:35-55`               | fetch 无 AbortController                   |
| 06-03 | P1       | `flux-renderers-content/src/qrcode.tsx:54-74`                 | 裸 cancelled boolean                       |
| 06-04 | P1       | `form-advanced/src/condition-builder/value-input.tsx:176-191` | 公式求值无取消机制                         |
| 06-05 | P2       | `flux-renderers-form/src/renderers/use-dict-options.ts:23-46` | 字典加载无 AbortController                 |
| 06-06 | P0       | `flux-renderers-data/src/crud-renderer-state.ts:608-672`      | CRUD 加载无 AbortController                |
| 06-07 | P1       | `flux-renderers-data/src/use-infinite-scroll.ts:149`          | 卸载后 setTimeout 未清除                   |
| 06-08 | P0       | `flux-renderers-form/src/renderers/form.tsx:443-466`          | loadAction 陈旧响应竞态                    |
| 06-09 | P2       | `flux-renderers-data/src/use-crud-polling.ts:106-136`         | handleRef 覆盖竞态                         |
| 06-10 | P2       | `flux-runtime/src/renderer-reaction-handle.ts:272-284`        | dispose() 中冗余双重 abort                 |
