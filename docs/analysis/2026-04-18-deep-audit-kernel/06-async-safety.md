# 维度06：异步模式与取消安全 — 初审报告

**审核日期**: 2026-04-18
**审核范围**: flux-core、flux-formula、flux-runtime、flux-react

---

## 总体评价

代码库的异步安全基线显著高于同类项目平均水平。AbortController 已在三层全面采用；提交并发保护有专门回归测试；数据源轮询采用 setTimeout 链式调度；reaction 的 dispose 竞态有专门测试。

---

## 发现清单

### [维度06-01] submitApi 在 HTTP 非 ok 响应时抛出异常，绕过 onSubmitError 生命周期

- **文件**: `packages/flux-runtime/src/form-runtime-submit-flow.ts:191-209` + `packages/flux-runtime/src/runtime-factory.ts:160-179`
- **严重程度**: P2
- **异步操作**: executeFormSubmit → submitApiCall → executeApiSchema → fetcher
- **竞态场景**: API 返回非 ok → executeApiSchema 抛出异常 → 异常跳过 onSubmitError 处理器 → 用户自定义错误处理逻辑失效
- **用户可见故障**: 配置的 lifecycle.onSubmitError 处理器永远不会被调用
- **建议**: 在 executeFormSubmit 的 try 块中添加 catch 分支

### [维度06-02] 异步验证规则 API 调用缺少 AbortSignal

- **文件**: `packages/flux-runtime/src/runtime-action-helpers.ts:35-38`
- **严重程度**: P2
- **异步操作**: executeRuntimeValidationRule → executeApiSchema → fetcher
- **竞态场景**: 用户快速修改字段 → 验证 runId 递增 → 过时结果被丢弃但 HTTP 请求仍在飞行
- **用户可见故障**: 高频输入下产生大量无用 HTTP 请求，可能导致服务端负载升高
- **建议**: 将 AbortSignal 穿透到 executeRuntimeValidationRule

### [维度06-03] Reaction runReaction 的 fire-and-forget 可导致未处理的 Promise 拒绝

- **文件**: `packages/flux-runtime/src/reaction-runtime.ts:108-187` + `:220,225`
- **严重程度**: P2
- **异步操作**: scheduleReaction → void runReaction → evaluateWatchValue / compiledWhen.exec
- **竞态场景**: 表达式运行时错误 → runReaction Promise 被 reject → void 前缀无人处理
- **用户可见故障**: 浏览器控制台产生 Unhandled Promise Rejection 警告
- **建议**: 在 runReaction 入口添加顶层 try/catch

### [维度06-04] executeSource API 缺少 AbortSignal 支持

- **文件**: `packages/flux-runtime/src/data-source-runtime.ts:678` + `packages/flux-react/src/node-source-prop-controller.ts:94`
- **严重程度**: P3
- **异步操作**: node-source-prop-controller → runtime.executeSource → fetcher
- **竞态场景**: scope 变更 → controller.run() abort 旧 controller → 但旧 executeSource 内部 HTTP 请求仍在飞行
- **用户可见故障**: 不会产生数据错误，但在 props 高频变化下浪费网络资源
- **建议**: 扩展 executeSource 签名以接受可选 signal 参数

### [维度06-05] Import 模块加载不支持取消

- **文件**: `packages/flux-runtime/src/imports.ts:158` + `:387-405`
- **严重程度**: P3
- **异步操作**: loadModule → loader.load(spec)
- **竞态场景**: dispose 后加载完成 → 注册被跳过但资源已消耗
- **用户可见故障**: 无用户可见故障，仅在极端情况下浪费资源
- **建议**: 为 ImportedLibraryLoader.load 签名添加可选 AbortSignal

---

## 确认安全的模式

| 模式             | 文件                                                                 | 验证结果                                      |
| ---------------- | -------------------------------------------------------------------- | --------------------------------------------- |
| 提交并发保护     | form-runtime-submit-flow.ts:58-64                                    | isSubmittingInternal 同步守卫 + 回归测试      |
| 请求去重/取消    | request-runtime.ts:323-381                                           | 三策略（cancel-previous/ignore-new/parallel） |
| 轮询 cleanup     | data-source-runtime.ts:637-660                                       | setTimeout 链 + abort                         |
| 验证防过时       | form-runtime-validation.ts:107-112                                   | validationRuns 递增计数器                     |
| Reaction dispose | reaction-runtime.ts:189-228                                          | disposed 双重检查 + 专项测试                  |
| DataSource abort | data-source-runtime.ts:463-465                                       | 每个 runRequest 新建 AbortController          |
| React 层 abort   | useNodeImports.ts, useSourceValue.ts, node-source-prop-controller.ts | 三处均用 AbortController 守卫                 |

---

## 复核结论

| 发现                              | 维度复核 | 子项复核                                  | 最终严重程度 |
| --------------------------------- | -------- | ----------------------------------------- | ------------ |
| 06-01: submitApi绕过onSubmitError | 保留P2   | **成立P2**                                | P2           |
| 06-02: 异步验证缺少AbortSignal    | 保留P2   | **成立P2**                                | P2           |
| 06-03: Reaction未处理rejection    | 降级P3   | **成立P3**                                | P3           |
| 06-04: executeSource缺少signal    | 保留P3   | **降级为可改进项**（signal可通过ctx传递） | Info         |
| 06-05: Import加载不支持取消       | 保留P3   | **成立P3**                                | P3           |
