# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06] validateField 的 void 返回值丢弃了异步验证异常

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:111`
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: `currentForm.validateField(name)` — 异步字段校验
- **吞掉路径**: `void currentForm.validateField(name)` 丢弃 promise。如果 validatePath 内部在 catch/finally 之前抛出未预期异常，变成 unhandled rejection
- **用户可见故障**: 极端情况下浏览器 unhandled rejection
- **建议**: 改为 `.catch(() => undefined)` 与 onChange 路径保持一致

### [维度06] source-registry 中 scope change 触发的 refresh 仅 console.warn

- **文件**: `packages/flux-runtime/src/async-data/source-registry.ts:204-207`
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: `controller.refresh()` — 数据源刷新
- **吞掉路径**: `.catch((error) => { console.warn(...) })` 仅打印警告，asyncGovernance 不会收到失败状态
- **用户可见故障**: 数据源刷新失败后 UI 显示陈旧数据，无错误指示
- **建议**: 通过 reportRuntimeHostIssue 上报

### [维度06] report-designer-core refreshDerivedState 错误被完全丢弃

- **文件**: `packages/report-designer-core/src/core.ts:349`
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: `refreshDerivedState()` — 设计器初始化
- **吞掉路径**: `void refreshDerivedState().catch(() => undefined)` 完全吞掉
- **用户可见故障**: 设计器 inspector 永远显示 loading 状态
- **建议**: 写入 store 的 inspector.error 字段

### [维度06] flow-designer auto-layout ELK 请求未使用 AbortController

- **文件**: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:92-114`
- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: `layoutTreeWithElk()` — ELK 自动布局计算
- **竞态场景**: 快速切换 documentMode 时多次并行计算，但 requestId stale check 生效
- **用户可见故障**: 快速切换时短暂卡顿
- **建议**: 当前 stale check 已足够，P2 维护成本

### [维度06] variant-field variant switch 缺少 AbortController

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:216-271`
- **严重程度**: P3
- **问题类别**: 取消安全
- **异步操作**: `handleVariantSwitch()` — 异步变体切换
- **竞态场景**: 使用 mountedRef + requestId 做过期检查，功能正确但与 object-field 的 AbortController 模式不一致
- **建议**: P3 观察项，未来统一迁移到 AbortController

### [维度06] field-handlers onChange async IIFE 无取消机制

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:70-78`
- **严重程度**: P3
- **问题类别**: 取消安全
- **异步操作**: `setValue` + `validateField` — 快速连续输入
- **竞态场景**: validateField 内部通过 validationAbortController 管理，最终结果正确
- **建议**: P3 观察项

### [维度06] form initAction 异常被静默吞掉

- **文件**: `packages/flux-renderers-form/src/renderers/form.tsx:271-273`
- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: `initAction()` — 表单初始化
- **吞掉路径**: `.catch(() => undefined)` 完全吞掉
- **用户可见故障**: 表单初始化失败时无错误提示
- **建议**: 改为 `.catch((error) => { if (!signal.aborted) reportRuntimeHostIssue(...) })`

### [维度06] import-stack 中 pending module 加载失败后静默重试

- **文件**: `packages/flux-runtime/src/import-stack.ts:94-98`
- **严重程度**: P3
- **问题类别**: 异常吞掉
- **异步操作**: `await existing` — 等待 pending 模块
- **吞掉路径**: catch 块静默移除 pending 条目然后重试
- **建议**: P3 观察项，添加 console.warn 帮助调试

---

## 已确认安全的关键路径

1. submit 并发防护 — isSubmittingInternal + AbortSignal
2. API 请求去重 — cancel-previous/ignore-new/parallel 策略
3. DataSource 控制器 — requestSequence + activeController
4. Reaction 运行时 — AbortController + cascade depth
5. 表单验证 — per-path AbortController + validationRuns
6. withTimeout/withRetry — AbortController + settled
7. schema-renderer — AbortController + error reporting

## 总结

| 严重程度 | 数量 |
|---------|------|
| P0 | 0 |
| P1 | 0 |
| P2 | 5 |
| P3 | 3 |
