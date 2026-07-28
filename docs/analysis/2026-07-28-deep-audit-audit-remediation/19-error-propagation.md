# Dimension 19: Error Propagation Fidelity

## 第 1 轮（初审）

### [D19-01] reportActionError/reportActionEnd 用裸 `catch {}` 吞吃插件/监控器错误

- **文件**: packages/flux-action-core/src/action-dispatcher/action-execution.ts:140-165, 167-183
- **严重程度**: P1
- **类别**: 错误吞吃
- **证据**: `} catch { // Diagnostic hooks must not replace the primary action failure. }`
- **影响**: 如果 `ctx.onActionError` 或插件 `onError` 抛出，或 `monitor.onActionEnd` 抛出，错误被完全吞吃且无诊断跟踪。有 bug 的监控插件完全静默中断诊断管道。
- **建议**: 替换为 `catch (e) { console.warn('[flux] onActionError callback threw', e); }`。

### [D19-02] action-runners.ts finishAction 吞吃监控 onActionEnd 错误

- **文件**: packages/flux-action-core/src/action-dispatcher/action-runners.ts:58-68
- **严重程度**: P2
- **类别**: 错误吞吃
- **影响**: 与 D19-01 相同模式。所有经过 `finishAction` 的 action 中，抛出的 `onActionEnd` 监视器回调完全不可见。
- **建议**: 在非生产构建的 catch 块中添加 console 诊断。

### [D19-03] reportUnhandledFailureClass 在 onActionError 未定义时静默跳过 caughtFailureResults

- **文件**: packages/flux-action-core/src/action-dispatcher/action-execution.ts:185-225
- **严重程度**: P1
- **类别**: 错误吞吃
- **影响**: 当 `onActionError` 已提供但无插件时，`hasDiagnosticChannel` 为 true 且 caught 失败被抑制通知。宿主无法区分"失败已通知"和"失败静默被吞"。
- **建议**: 使 `hasDiagnosticChannel` 检查更具体，或除非 action 有显式 `onError` 处理器否则始终通知。

### [D19-04] withRetry 计数不抛出的 ok:false 结果为失败但无上游消费

- **文件**: packages/flux-action-core/src/operation-control.ts:190-237
- **严重程度**: P1
- **类别**: 计数遗漏
- **影响**: `runSingleActionWithRetry` 只检查结果 `result.ok`。无逻辑检查 `failureCount` vs `attempts`。如果 3 次重试都返回 `ok: false`，`failureCount` 为 4 但调用者不通过诊断渠道上报。
- **建议**: 在 `runSingleActionWithRetry` 中，检测 `failureCount > 0 && result.ok === false` 的场景。

### [D19-05] action-adapter.ts resolveSurfaceValidationPlan 仅 console.error，丢失位置上下文

- **文件**: packages/flux-runtime/src/action-adapter.ts:74-91
- **严重程度**: P2
- **类别**: 错误吞吃
- **影响**: 表面验证计划编译错误仅记录为 `console.error`，未通过 `reportRuntimeHostIssue` 路由。后备通用错误消息丢失原始 cause。
- **建议**: 使用 `reportRuntimeHostIssue` 替换 `console.error`，对后备 Error 添加 `{ cause: error }`。

### [D19-06] form-runtime-owner.ts validateFormPath 创建硬编码通用错误消息，丢失原始 cause

- **文件**: packages/flux-runtime/src/form-runtime-owner.ts:371-401
- **严重程度**: P1
- **类别**: 错误替换
- **影响**: 验证器抛出时，用户可见的验证错误消息始终为 `'Validation failed due to an internal error'`。原始消息（如"网络请求失败 503"）隐藏在 `.cause` 后。监控 UI 只读顶层消息时丢失诊断价值。
- **建议**: 在表单级消息中包含原始错误消息：`'...: ' + (error instanceof Error ? error.message : String(error))`。

### [D19-07] defaultReportDependentRevalidationFailure 仅用 console.warn — 生产中不可见

- **文件**: packages/flux-runtime/src/form-runtime-values.ts:21-23
- **严重程度**: P2
- **类别**: 错误吞吃
- **影响**: 当宿主未提供 `reportDependentRevalidationFailure` 时，依赖重验证失败仅通过 `console.warn` 可见。生产中完全不可见。
- **建议**: 在默认函数中调用 `env.notify('error', message)` 或 `reportRuntimeHostIssue`。

### [D19-08] surface-runtime.ts close()/closeTop() 以 fire-and-forget 方式触发 onClose hooks，仅 console.warn

- **文件**: packages/flux-runtime/src/surface-runtime.ts:188-210, 212-230
- **严重程度**: P2
- **类别**: 错误吞吃
- **影响**: onClose 生命周期 hooks 被 fire-and-forget dispatch。如果 hook action 抛出，错误仅通过 `console.warn` 可见。
- **建议**: 替换 `.catch` 以调用 `env.monitor?.onError?.(...)` 和 `env.notify('error', message)`。

### [D19-09] executeApiSchema 响应适配器在非 OK 响应上的错误被吞吃（仅 console.warn）

- **文件**: packages/flux-runtime/src/async-data/request-runtime.ts:435-470
- **严重程度**: P1
- **类别**: 错误吞吃
- **影响**: 当 `responseAdaptor` 在错误响应上抛出时，适配器错误被上报到 `monitor.onError` 但传播的 `createApiResponseError` 仅携带原始响应体——适配器故障消息完全缺失。
- **建议**: 将适配器错误附加到抛出的错误，或将其消息合并到响应错误消息中。

### [D19-10] executeSetValues 使用 fire-and-forget 依赖重验证，返回 `Promise<void> | void`

- **文件**: packages/flux-runtime/src/form-runtime-values.ts:49-61, 147-153
- **严重程度**: P2
- **类别**: 计数遗漏
- **影响**: `executeSetValues` 完成同步执行而不等待依赖重验证完成。如果重验证失败，错误通过 `.catch()` 异步上报，可能在调用者已收到成功响应后。
- **建议**: 等待 `revalidateDependents` 或显式记录 fire-and-forget 语义。

### [D19-11] attachThrownMetadata 用 Object.assign 原位错误突变，造成跨调用者污染

- **文件**: packages/flux-action-core/src/action-dispatcher/action-runners.ts:29-41
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: 当抛出的错误是非 Error 对象时，`Object.assign` 原位突变它，附加 action 元数据。如果同一错误对象被缓存或跨多个调用者共享，一条 dispatch 可能污染另一条。
- **建议**: 赋值元数据前克隆错误。

### [D19-12] renderer-reaction-handle.ts 返回硬编码 'ReactionHandle disposed' Error，无标识符

- **文件**: packages/flux-runtime/src/renderer-reaction-handle.ts:158-163, 214-219
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: 当被释放的 ReactionHandle 被调用时，返回的错误消息无引用是哪个 handle、node 或 action。`input.id` 可用但未包含。
- **建议**: 包含反应 handle id：`new Error('ReactionHandle disposed: ' + input.id)`。

### [D19-13] action-adapter.ts invokeComponentAction catch 创建无原始 cause 的 resolveError

- **文件**: packages/flux-runtime/src/action-adapter.ts:423-427
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: 当 `componentRegistry.resolve` 抛出非 Error 值时，原始抛出值完全丢失。`resolveError` 设置为 `new Error('Component handle resolution failed')` 无 `{ cause: e }`。
- **建议**: 对于非 Error 抛出的后备，通过 `cause` 保留。

### [D19-14] form-store.ts 诊断默认 enabled: false，需显式激活

- **文件**: packages/flux-runtime/src/form-store.ts:142-151, 612-618
- **严重程度**: P2
- **类别**: 诊断禁用
- **影响**: 表单 store 诊断（提交追踪、快照历史）通过 `startDiagnosticsSession` 选择加入。无机制在开发/strict 模式自动启用。
- **建议**: 在非生产模式或 `strictMode: true` 时自动启用诊断。

### [D19-15] schema-renderer.tsx createSchemaRenderer catch 存储错误但返回强制转换为 Runtime 类型的 undefined

- **文件**: packages/flux-react/src/schema-renderer.tsx:134-163, 169-179
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: `rootActionScope` 的 `useMemo`（第 255 行）在调用 `runtime.createActionScope(...)` 前不检查 `creationErrorRef.current`。如果 `creationErrorRef` 已设置，将变为 `undefined.createActionScope(...)`。
- **建议**: 在所有依赖的 `useMemo` 调用中添加 `creationErrorRef.current` 检查，包括 `rootActionScope`。

### [D19-16] CompiledSchemaTree 非 strict 模式下禁用诊断，无宿主选择加入

- **文件**: packages/flux-react/src/schema-renderer.tsx:55-70, 414
- **严重程度**: P2
- **类别**: 诊断禁用
- **影响**: 编译器诊断仅在 `strictValidation` 启用时收集。当禁用时，所有 schema shape 诊断（未知属性、无效类型）被静默丢弃。
- **建议**: 默认在开发模式下启用诊断，或添加 `schemaDiagnostics` prop。

### [D19-17] api-data-source-controller-runtime.ts silent:true 禁用数据源错误的 reportRuntimeHostIssue

- **文件**: packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:444-450
- **严重程度**: P1
- **类别**: 诊断禁用
- **影响**: 当数据源配置了 `silent: true`，所有 AJAX 请求错误完全不可见给 `reportRuntimeHostIssue`。没有 `env.monitor.onError`，没有 `env.notify('error', ...)`。如果监控基础设施依赖 `reportRuntimeHostIssue`，静默数据源创建盲点。
- **建议**: 即使静默时也至少以 `level: 'debug'` 调用 `reportRuntimeHostIssue`。

### [D19-18] CompiledSchemaTree 不捕获编译错误 — 作为 React 渲染崩溃传播

- **文件**: packages/flux-react/src/schema-renderer.tsx:55-79
- **严重程度**: P2
- **类别**: 错误吞吃
- **影响**: 如果 `schemaCompiler.compile` 抛出，异常通过 React 渲染周期传播。`SchemaRootErrorBoundary` 捕获它并显示 `SchemaRootFallback`，但原始编译错误未被存储供诊断访问。
- **建议**: 将编译调用包装在 try-catch 中，存储错误，并通过 `reportRuntimeHostIssue` 上报。

### [D19-20] refreshNearest 当 notFound:'silent' 时静默返回 {ok:true, data:{found:false}}

- **文件**: packages/flux-runtime/src/refresh-nearest.ts:97-101
- **严重程度**: P2
- **类别**: 错误吞吃
- **影响**: 当 `refreshNearest` 找不到可刷新的目标且 `notFound` 为 `'silent'`（默认）时，返回 `{ ok: true, data: { found: false } }`。仅检查 `result.ok` 的调用者相信刷新成功。
- **建议**: 更改默认为 `'error'` 或添加 console 警告。

## 维度复核结论

- [D19-01]: 保留 P1。每个 action dispatch 路径的核心路径——有 bug 的插件可静默杀死诊断链。
- [D19-03]: 保留 P1。可观察性盲点。
- [D19-04]: 保留 P1。重试计数不作为诊断上报。
- [D19-06]: 保留 P1。每个验证器抛出产生通用"内部错误"。
- [D19-09]: 保留 P1。适配器错误在传播的错误中不可见。
- [D19-17]: 保留 P1。静默数据源绕过所有诊断通道。
- [D19-02]: 保留 P2。监控器错误不可见。
- [D19-05]: 保留 P2。仅 console 日志，丢失 cause。
- [D19-07]: 保留 P2。仅 console.warn，生产中不可见。
- [D19-08]: 保留 P2。fire-and-forget 生命周期 hooks。
- [D19-10]: 保留 P2。fire-and-forget 重验证。
- [D19-11]: 保留 P2。原位错误突变。
- [D19-12]: 保留 P2。错误消息无标识符。
- [D19-13]: 保留 P2。后备错误丢失原始 cause。
- [D19-14]: 保留 P2。诊断需要显式激活。
- [D19-15]: 保留 P2。渲染崩溃路径中可能为 undefined。
- [D19-16]: 保留 P2。诊断默认关闭。
- [D19-18]: 保留 P2。编译错误不通过诊断通道。
- [D19-20]: 保留 P2。成功 no-op 冒充成功。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                        | 一句话摘要                      |
| ----- | -------- | --------------------------------------------------------------------------- | ------------------------------- |
| 19-01 | P1       | `flux-action-core/src/action-dispatcher/action-execution.ts:140-183`        | 裸 catch {} 吞吃插件/监控器错误 |
| 19-03 | P1       | `flux-action-core/src/action-dispatcher/action-execution.ts:185-225`        | hasDiagnosticChannel 区分含混   |
| 19-04 | P1       | `flux-action-core/src/operation-control.ts:190-237`                         | withRetry ok:false 不触发诊断   |
| 19-06 | P1       | `flux-runtime/src/form-runtime-owner.ts:371-401`                            | 验证错误通用消息丢失原因        |
| 19-09 | P1       | `flux-runtime/src/async-data/request-runtime.ts:435-470`                    | 适配器错误在响应错误中丢失      |
| 19-17 | P1       | `flux-runtime/src/async-data/api-data-source-controller-runtime.ts:444-450` | silent:true 绕过诊断管线        |
| 19-02 | P2       | `flux-action-core/src/action-dispatcher/action-runners.ts:58-68`            | 监控错误不可见                  |
| 19-05 | P2       | `flux-runtime/src/action-adapter.ts:74-91`                                  | 仅 console.error 编译失败       |
| 19-07 | P2       | `flux-runtime/src/form-runtime-values.ts:21-23`                             | 依赖重验证仅 console.warn       |
| 19-08 | P2       | `flux-runtime/src/surface-runtime.ts:188-230`                               | onClose hooks fire-and-forget   |
| 19-10 | P2       | `flux-runtime/src/form-runtime-values.ts:49-61`                             | setValues 不等待重验证          |
| 19-11 | P2       | `flux-action-core/src/action-runners.ts:29-41`                              | Object.assign 原位错误突变      |
| 19-12 | P2       | `flux-runtime/src/renderer-reaction-handle.ts:158-163`                      | 错误无反应 handle id            |
| 19-13 | P2       | `flux-runtime/src/action-adapter.ts:423-427`                                | 分辨率后备错误丢失 cause        |
| 19-14 | P2       | `flux-runtime/src/form-store.ts:142-151`                                    | 诊断默认关闭                    |
| 19-15 | P2       | `flux-react/src/schema-renderer.tsx:134-163`                                | 渲染崩溃可能为 undefined        |
| 19-16 | P2       | `flux-react/src/schema-renderer.tsx:55-70`                                  | 编译器诊断非 strict 时关闭      |
| 19-18 | P2       | `flux-react/src/schema-renderer.tsx:55-79`                                  | 编译错误不通过诊断通道          |
| 19-20 | P2       | `flux-runtime/src/refresh-nearest.ts:97-101`                                | 静默 no-op 冒充成功             |
