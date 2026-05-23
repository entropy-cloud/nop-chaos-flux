# 维度 19：错误传播保真度

## 第 1 轮（初审）

### [维度19-01] Form submit follow-up handler 会覆盖原始校验/提交失败且可能把 validate failure 误路由成 submit error

- **文件**: `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- **证据片段**:

  ```ts
  if (!validation.ok) {
    const validationFailure = {
      ok: false,
      error: validation.errors,
      data: validation.fieldErrors,
    } as const;

    const lifecycleResult = lifecycleHandlers?.onValidateError
      ? await lifecycleHandlers.onValidateError(validationFailure, options)
      : undefined;
  }
  ```

- **严重程度**: P2
- **类别**: 错误替换
- **影响**: `onValidateError` / `onSubmitError` 自身一旦抛错，原始 validation failure 或 submit failure 会被 handler 异常替换；`onValidateError` 抛错还会落入外层 `catch`，随后再走 `onSubmitError`，把校验失败误升级成提交失败分支。
- **修复建议**: 将 `onValidateError` 与 `onSubmitError` 各自包入独立 `try/catch`；主失败结果保持为原始结果，handler 异常只作为附加诊断保留。
- **为什么值得现在做**: 这是 form owner 的核心生命周期边界；若副作用 hook 可以覆盖主失败原因，schema action 分支和运维诊断都会失真。
- **误报排除**: 不是“hook 可以自由抛错”的普通设计选择；问题在于 runtime 已拿到原始 `ActionResult`，却让 follow-up await 越权覆盖主失败。
- **历史模式对应**: failure follow-up 覆盖 primary failure；分支语义漂移。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/action-scope-and-imports.md`, `docs/components/form/design.md`
- **复核状态**: 未复核

### [维度19-02] HTTP `ok:false` 最终失败被压缩成 message-only Error，最终响应对象与软失败原因未保留

- **文件**: `packages/flux-runtime/src/async-data/request-runtime.ts`; `packages/flux-action-core/src/operation-control.ts`
- **证据片段**:
  ```ts
  if (!response.ok) {
    const responseData = response.data;
    const retryMetadata = {
      attempts: execution.retry.attempts,
      failureCount: execution.retry.failureCount,
      lastFailureReason: execution.retry.lastFailureReason,
    };
  }
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: ajax、submit、data-source、async validation 等关键路径最终只能拿到被压缩后的 Error 文本，拿不到真正的最终响应体、状态码、headers 或完整失败对象。
- **修复建议**: 在软失败路径同步设置 `lastFailureReason = lastResult`；`executeApiSchema` 构造失败时保留最终响应对象作为 `cause` 或结构化字段。
- **为什么值得现在做**: 这是 runtime 共用请求底座；一旦错误上下文在这里被压缩，上层全部只能看到弱化后的错误文本。
- **误报排除**: 不是“failureCount 完全没统计”的旧问题；当前缺陷是 final soft-failure object 没进入 `lastFailureReason`，且最终 Error 也没有保留响应上下文。
- **历史模式对应**: `ok:false` 非抛出失败被 message-only Error 替换；共享请求底座丢失最终失败对象。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-03] `onActionError` / plugin `onError` 诊断回调在 catch 路径里可再次抛错并覆盖原始失败

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- **证据片段**:

  ```ts
  } catch (error) {
    if (isAbortError(error)) {
      ...
    }

    ctx.onActionError?.(error, activeCtx);

    for (const plugin of ctx.plugins ?? []) {
      plugin.onError?.(error, {
        phase: 'action',
        error,
  ```

- **严重程度**: P2
- **类别**: 错误替换
- **影响**: 诊断/插件回调若在 catch 路径里再抛错，会直接中断当前收尾逻辑并覆盖原始失败，形成“监控自身故障覆盖业务失败”。
- **修复建议**: 将 `ctx.onActionError` 和每个 `plugin.onError` 都包进独立 `try/catch`；主失败始终保持为原始 `error`。
- **为什么值得现在做**: 观测层本应 fail-safe，当前却能反向破坏主错误链。
- **误报排除**: 这不是旧的 `onActionStart` 问题，而是“已经进入错误处理路径之后”诊断回调仍可覆盖主失败。
- **历史模式对应**: secondary diagnostic callback replaces primary failure
- **参考文档**: `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度19-01]: 保留 (P2)。form submit follow-up handler 仍可能覆盖原始失败并误路由 validate failure。
- [维度19-02]: 保留 (P2)。HTTP `ok:false` 仍被压缩成 message-only Error，最终响应对象与软失败原因未保留。
- [维度19-03]: 保留 (P2)。`onActionError` / plugin `onError` 诊断回调仍可在 catch 路径里覆盖原始失败。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                           |
| ----- | -------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| 19-01 | P2       | `packages/flux-runtime/src/form-runtime-submit-flow.ts`               | submit follow-up handler 仍可能覆盖原始校验/提交失败 |
| 19-02 | P2       | `packages/flux-runtime/src/async-data/request-runtime.ts`             | HTTP `ok:false` 仍被压缩成 message-only Error        |
| 19-03 | P2       | `packages/flux-action-core/src/action-dispatcher/action-execution.ts` | 诊断回调在 catch 路径里仍可覆盖主错误                |
