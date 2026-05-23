# 维度 19：错误传播保真度

## 第 1 轮（初审）

### [维度19-01] `monitor.onActionEnd` 调用链仍非 fail-safe，监控回调抛错可反向污染主 action dispatch

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-runners.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- **证据片段**:
  ```ts
  ctx.getEnv().monitor?.onActionEnd?.({
    ...enrichedPayload,
    durationMs: Date.now() - startedAt,
    result,
  });
  ```
  ```ts
  ctx
    .getEnv()
    .monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
  ```
- **严重程度**: P2
- **现状**: `reportActionError()` 会保护 `onActionError` 与 plugin `onError`，但 `onActionEnd` 在 success、cancelled、caught-error 路径都直接调用，没有 best-effort guard。
- **风险**: 第三方 monitor/analytics 回调自身抛错时，会把诊断层失败升级成 action dispatch 主链失败，破坏错误边界与返回结果稳定性。
- **建议**: 为 `onActionEnd` 增加与 `reportActionError()` 同级的 try/catch 保护，并保证监控层异常不能替代原始 action result。
- **误报排除**: 不是重复 `onActionStart` 的旧问题；本条针对结束态路径。
- **复核状态**: 未复核

### [维度19-02] 当 action 返回 failure-class 且未声明 `onError` 时，dispatcher 仍缺少默认可观测失败出口

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `docs/architecture/action-algebra-formal-spec.md`
- **证据片段**:

  ```ts
  } else if (resultClass === 'failure' && normalizedAction.onError) {
    ...
  }

  if (resultClass === 'failure' && !normalizedAction.control?.continueOnError) {
    return result;
  }
  ```

  ```md
  If no explicit `onError` handles a `failure-class` result, the framework should provide a default observable failure path.
  ```

- **严重程度**: P2
- **现状**: live dispatch 对“正常返回的 failure-class `ActionResult`”只做链路分支与 return，不做 `notify`、`reportActionError`、monitor fallback 或其他默认可观测报告。
- **风险**: provider 或 built-in action 明明已产生业务失败，但若调用方未显式消费 Promise 结果，就会形成“失败已发生、框架无默认观察面”的静默降级。
- **建议**: 在 failure-class 且无 `onError` 的路径补统一 fallback，同时保持 `onError` 存在时不重复噪声上报。
- **误报排除**: 不是要求所有失败都自动 toast；问题仅限 formal spec 已要求 default observable failure path。
- **复核状态**: 未复核

## 维度复核结论

- [维度19-01]: 保留为 P2。
- [维度19-02]: 保留为 P2。

## 子项复核结论

- 无需额外子项复核。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                  | 一句话摘要                                                          |
| ----- | -------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 19-01 | P2       | `packages/flux-action-core/src/action-dispatcher/action-runners.ts`   | `monitor.onActionEnd` 仍非 fail-safe，监控回调抛错会污染主 dispatch |
| 19-02 | P2       | `packages/flux-action-core/src/action-dispatcher/action-execution.ts` | failure-class 且无 `onError` 时仍缺默认 observable failure fallback |
