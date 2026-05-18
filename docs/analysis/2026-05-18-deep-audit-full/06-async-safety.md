# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] report-designer host action provider 丢弃外层 `AbortSignal`，导致 preview 不能随父 action 或 teardown 取消

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\host-action-provider.ts:57-64`
- **证据片段**:
  ```ts
  async invoke(method, payload) {
    const args = isCommandRecord(payload) ? payload : {};
    try {
      const result = await dispatch({
        type: `report-designer:${method}`,
        ...args,
      } as ReportDesignerCommand);
  ```
- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: `report-designer:preview` 等 host command 经 `dispatch()` 进入 report-designer core 的异步 preview 流程。
- **竞态场景或吞掉路径**: action dispatcher 已把 `ctx.signal` 传到 namespaced action 边界，但 host provider 的 `invoke()` 完全不接收或转发 `ctx`；因此父级 timeout、runtime dispose、surface close、上层取消都无法中断 preview，preview 只受 report core 自己的内部 controller 管理。
- **用户可见故障**: 用户离开页面、关闭宿主 surface、或父 action 已取消后，preview 仍可继续运行并晚到回写 `preview.running` 或 `lastResult`；调用方 `await dispatch(...)` 也会继续挂到 preview 完成，而不是及时得到 `cancelled`。
- **建议**: 给 `createReportDesignerActionProvider()` 的 `invoke()` 增加 `ctx` 入参处理，并把 `ctx.signal` 桥接到 report-designer command 或 preview adapter；至少先补齐 `preview` 与 `stopPreview` 路径。
- **为什么值得现在做**: 这是 shared action system 到 report-designer host owner 的单一取消断点，修一处即可恢复整条 owner 路径的 teardown 与 timeout 一致性。
- **误报排除**: 不是在重复报告 preview 自己完全没有取消机制；`report-designer-core` 内部已有 latest-wins 或 stopPreview 逻辑，真实缺口是外层 action `AbortSignal` 在 host provider 处被截断。
- **历史模式对应**: 对应真实 async owner 未贯穿 `AbortSignal` 的主路径取消缺口。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/report-designer/design.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度06-02] `refreshSource` 只返回找没找到 source，真实 refresh 失败会被误报成成功

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-adapter.ts:305-314`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\source-registry.ts:337-349`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\api-data-source-controller-runtime.ts:371-383`
- **证据片段**:

  ```ts
  const refreshed = await runtime.refreshDataSource({
    id: sourceId,
    scope: ctx.scope,
  });

  return {
    ok: refreshed,
    data: refreshed,
    error: refreshed ? undefined : new Error(`Source not found: ${sourceId}`),
  };
  ```

- **严重程度**: P2
- **问题类别**: 异常吞掉
- **异步操作**: built-in `refreshSource` -> source registry -> data-source controller `refresh()` / `runRequest()`。
- **竞态场景或吞掉路径**: `source-registry.refreshDataSource()` 只返回布尔值表示是否找到 entry；而 API data-source 的 `runRequest()` 在失败分支里只更新 error state 或上报 host issue，不再向上抛错，所以 `await entry.controller.refresh()` 仍会正常 resolve，最终 action adapter 把 source 存在当成 `ok:true`。
- **用户可见故障**: schema 的 `then` / `onError` 分支、按钮反馈、monitor 与 debugger 都会看到刷新成功，但真实 source 已进入 error 或 stale 状态；用户会遇到数据没刷新、却没有走错误路径的误导性行为。
- **建议**: 把 `refreshDataSource()` 与 `controller.refresh()` 升级为返回结构化结果，而不是 found 或 not-found 布尔值；至少让 refresh 失败透传成 `ActionResult.ok:false`。
- **为什么值得现在做**: `refreshSource` 是 runtime-owned source refresh 的统一入口，当前合同失真会污染所有上层 action 链与 host UI 判断。
- **误报排除**: 不是在说 missing source id 场景；缺陷点是 source 找到了、底层请求也确实失败了，但 action 结果仍被报成成功。
- **历史模式对应**: 对应内部 catch 更新状态但不把失败返回调用方的典型 owner-contract 漂移。
- **参考文档**: `docs/architecture/api-data-source.md`; `docs/architecture/action-scope-and-imports.md`; `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度06-03] report-designer toolbar 把正常 preview 取消当成 warning 失败上报

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-designer-toolbar.tsx:33-53`; `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\host-action-provider.ts:40-45`; `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\core-dispatch.ts:223-225`
- **证据片段**:

  ```ts
  const result = await props.helpers.dispatch(command);
  if (result.ok) {
    return;
  }

  reportRuntimeHostIssue({
    env: runtime.env,
    level: 'warning',
    message:
      result.error instanceof Error && result.error.message
        ? result.error.message
        : 'Report toolbar action failed',
  ```

- **严重程度**: P2
- **问题类别**: 取消安全
- **异步操作**: toolbar 按钮通过 `props.helpers.dispatch(command)` 触发 `report-designer:preview`；host provider 会保留 `cancelled`，而 core preview 在 `AbortError` 时显式返回 `{ ok: false, cancelled: true }`。
- **竞态场景或吞掉路径**: 用户点击预览后又触发 `stopPreview`、启动新 preview 覆盖旧 preview、或 teardown 或 abort 命中 preview 时，`core-dispatch.ts` 会把这类正常取消解析成结构化结果而不是抛错；但 toolbar 只判断 `result.ok`，对所有 `ok:false` 一律走 `reportRuntimeHostIssue(... level:'warning' ...)`，把 `cancelled:true` 当成失败告警。
- **用户可见故障**: 正常取消 preview 时，界面或宿主监控会出现 Report toolbar action failed 一类 warning；用户会把主动停止、切换预览、或 latest-wins supersede 误认为真实失败，污染诊断与告警信号。
- **建议**: 在 `report-designer-toolbar.tsx` 先分支处理 `result.cancelled === true`；对取消直接静默返回，或降级为非 warning 的 cancelled 或 neutral 路径，不要复用失败上报。
- **为什么值得现在做**: 这是 report designer 的保留 toolbar 主入口；当前会把合法取消批量误记成失败，直接降低 preview 诊断可信度，也与仓库其余 owner 对 cancellation 的统一语义相冲突。
- **误报排除**: 不是把真实异常误判成取消。live code 已确认 `host-action-provider.ts` 会透传 `cancelled`，且 `core-dispatch.ts` 在 `isAbortError(err)` 分支明确返回 `{ ok:false, cancelled:true }`；问题只发生在 toolbar 消费结果时未区分 cancelled 与 failed。
- **历史模式对应**: 对应未区分 resolved cancelled 与 resolved failure 的 host command surface 残留模式，这次出现在 report-designer toolbar 上。
- **参考文档**: `docs/architecture/renderer-runtime.md:57-59`; `docs/architecture/form-validation.md:989-995`; `docs/architecture/report-designer/design.md:84-109`
- **复核状态**: 未复核

## 维度复核结论

- [维度06-01]: 保留 (P2)。`packages/report-designer-renderers/src/host-action-provider.ts` 的 `invoke(method, payload)` 仍忽略 `ctx`，父级 `ctx.signal` 没有桥接到 preview，report designer 内部 controller 不能覆盖父 action timeout、dispose、teardown 的取消链路。
- [维度06-02]: 保留 (P2)。`packages/flux-runtime/src/action-adapter.ts` 的 `refreshSource` 仍把 `runtime.refreshDataSource()` 的布尔值直接映射成 `ActionResult.ok`；source 存在但 refresh 失败时，action 链仍拿到 `ok: true`。
- [维度06-03]: 保留 (P2)。`packages/report-designer-renderers/src/report-designer-toolbar.tsx` 仍只判断 `result.ok`，把 `{ ok:false, cancelled:true }` 的正常 preview 取消按 warning failure 上报。

## 子项复核结论

- 无。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                       | 一句话摘要                                             |
| ----- | -------- | -------------------------------------------------------------------------- | ------------------------------------------------------ |
| 06-01 | P2       | `packages/report-designer-renderers/src/host-action-provider.ts:57-64`     | report-designer host provider 未桥接父级 `AbortSignal` |
| 06-02 | P2       | `packages/flux-runtime/src/action-adapter.ts:305-314`                      | `refreshSource` 会把真实 refresh 失败误报为成功        |
| 06-03 | P2       | `packages/report-designer-renderers/src/report-designer-toolbar.tsx:33-53` | toolbar 把正常 preview 取消当成 warning 失败           |
