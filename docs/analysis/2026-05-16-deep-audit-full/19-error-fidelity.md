# 维度 19：错误传播保真度

## 第 1 轮（初审）

### [维度19-01] `onError` 分支内抛错只做 side-effect 记录，不会把 secondary failure 结构化挂回返回结果

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:494-522`
- **证据片段**:
  ```ts
  try {
    previous = await dispatch(...normalizedAction.onError...);
  } catch (error) {
    reportActionError(ctx, error, currentActionCtx);
    const message = error instanceof Error ? error.message : String(error);
    ctx.getEnv().notify('error', message);
  }
  ```
- **严重程度**: P2
- **现状**: `onSettled` 会把 nested failure 挂到 `settledError`，但 `onError` 自身抛错时没有等价结构化出口。
- **风险**: 调用方只能看到原始 failure，看不到 recovery branch 自己也失败了。
- **建议**: 为 `onError` 失败增加类似 `settledError` 的结构化附着字段。
- **为什么值得现在做**: 复核确认这是 narrower gap，不应再表述为“错误完全丢失”。
- **误报排除**: 不是说所有 `onError` 结果都丢失；只有 throw path 没被结构化附着。
- **历史模式对应**: secondary branch failure not attached.
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-02] import-stack 失败回滚未释放自动创建的 owned `ActionScope`

- **文件**: `packages/flux-runtime/src/import-stack.ts:296-299,340-342`
- **证据片段**:
  ```ts
  const actionScope =
    args.actionScope ??
    (ownedActionScope ??=
      input.getRuntime().createActionScope({ id: `${frameId}:${spec.as}:action-scope` }));
  ...
  } catch (error) {
    rollbackPartialFrameInstall({ releaseMap, controllerMap });
    throw error;
  }
  ```
- **严重程度**: P1
- **现状**: rollback 只处理 namespace/controller，不处理 `ownedActionScope`。
- **风险**: 失败的 import install 会留下 scope owner 残留，且错误恢复路径不完整。
- **建议**: 在 rollback 中显式 `runtime.releaseActionScope(ownedActionScope)`。
- **为什么值得现在做**: 这是错误路径 rollback 不完整的真实生命周期泄漏。
- **误报排除**: 不是重复报告普通 pop/dispose；问题只出在 install failure rollback。
- **历史模式对应**: rollback misses owned resource release。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度19-03] report-designer host action provider 把异常本地扁平化成 `{ ok:false }`，削弱 dispatcher diagnostics

- **文件**: `packages/report-designer-renderers/src/host-action-provider.ts:57-71`
- **证据片段**:
  ```ts
  try {
    const result = await dispatch({
      type: `report-designer:${method}`,
      ...args,
    } as ReportDesignerCommand);
    return toReportDesignerActionResult(result);
  } catch (error) {
    console.warn(`[report-designer] action ${method} failed`, error);
    return { ok: false, error: toActionError(error) } satisfies ActionResult;
  }
  ```
- **严重程度**: P2
- **现状**: throw 被 provider 本地吃掉并转成普通失败结果，dispatcher-level thrown-error 诊断链不会触发。
- **风险**: structured command failure 与 unexpected throw failure 在 observability 上被混成同一层次。
- **建议**: 让 unexpected throw 继续上抛，或至少保留 `cause` 并接入 runtime diagnostics。
- **为什么值得现在做**: 复核已把它降成 observability inconsistency，而非核心 action semantics break。
- **误报排除**: 正常 command `{ ok:false }` 模式本身没问题；问题在 thrown exception 的本地扁平化。
- **历史模式对应**: thrown failure flattened at adapter boundary。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度19-01]：降级为 P2。只保留 `onError` throw path 的结构化附着缺口。
- [维度19-02]：保留 (P1)。rollback miss owned scope release 成立。
- [维度19-03]：降级为 P2。主要是 observability inconsistency。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                          | 一句话摘要                                                |
| ----- | -------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| 19-02 | P1       | `packages/flux-runtime/src/import-stack.ts:296-299`                           | import-stack 失败回滚未释放自动创建的 owned `ActionScope` |
| 19-01 | P2       | `packages/flux-action-core/src/action-dispatcher/action-execution.ts:494-522` | `onError` 分支抛错不会被结构化挂回返回结果                |
| 19-03 | P2       | `packages/report-designer-renderers/src/host-action-provider.ts:57-71`        | host action provider 把异常本地扁平化成 `{ ok:false }`    |
