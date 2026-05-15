# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] submit abort 没有贯穿到 form validation，取消时会把提交卡在 `validating/submitting` 直到校验自己跑完

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-submit-flow.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-owner.ts`
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-validation.ts`
- **证据片段**:
  ```ts
  const validationResult = await contract.triggerValidation();
  // validateForm/validateField 没有外部 AbortSignal 入参
  // executeFormSubmit() 的 finally 只有在 validateForm() 返回后才会清理 submitting
  ```
- **严重程度**: P1
- **现状**: submit flow 直接等待校验完成，没有把 `options.signal` 传进 validation 层；异步校验只会在被更新 run 覆盖时取消，不会因为 submit 调用方 abort 而停。
- **风险**: 用户在提交过程中离开页面、父 action 取消或上层超时后，提交 promise 仍会挂住到异步校验结束；`submitting` 持续为真，重复提交会被并发保护挡住，形成可见的“按钮一直转 / 不能再提”的卡住状态。
- **建议**: 把 submit signal 贯穿到 validation owner 层，统一用 `AbortController/AbortSignal` 驱动提交期校验取消，并确保 abort 时及时清理 `submitting/validating` 状态。
- **为什么值得现在做**: 这是主提交流程的取消安全缺口，会直接影响用户交互和恢复路径。
- **误报排除**: 这不是已由 bug 07 覆盖的重复提交问题；07 修的是并发 guard，不是 abort 贯穿 validation。
- **历史模式对应**: 对应异步 owner 路径未统一传递 `AbortSignal` 的真实 residual。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/bugs/07-submit-concurrent-guard.md`
- **复核状态**: 未复核

### [维度06-02] spreadsheet toolbar 和 page-body 把 `dispatch()` 的结构化失败结果静默吞掉，Undo/Redo 可稳定复现无反馈失败

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\default-page-body.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-sheet-commands.ts`
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-toolbar\toolbar-groups.tsx`
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-toolbar\types.ts`
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\core-dispatch.ts`
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\command-handlers\history-handlers.ts`
- **证据片段**:
  ```ts
  const result = await bridge.dispatch({ type: 'undo' });
  // handler 未检查 result.ok
  // core 在空历史时返回 { ok:false, error:'Nothing to undo/redo' }
  ```
- **严重程度**: P1
- **现状**: `SpreadsheetCore.dispatch()` 经常以 resolved `{ ok:false, error }` 表达失败，不靠 rejection；但 toolbar 与 page-body 侧多处只防 rejection，不处理 resolved failure result。
- **风险**: 用户在无历史时点击 Undo/Redo，会得到“无反馈死点击”；同类路径也会吞掉其他结构化失败结果，导致操作失败无诊断、无提示、无状态恢复。
- **建议**: 所有 toolbar 或 page-body command handler 都应统一处理 `result.ok === false`，给出结构化错误反馈或禁用态，不应只依赖 promise rejection。
- **为什么值得现在做**: 这是用户可稳定触发的 live defect，不是抽象的异常处理风格问题。
- **误报排除**: `report-designer-toolbar.tsx` 已对 `dispatch()` 失败结果和异常做结构化处理，本条只针对 spreadsheet 路径的真实遗漏。
- **历史模式对应**: 对应“非抛出型失败被当成成功路径忽略”的错误传播与 async safety 交叉问题。
- **参考文档**: `docs/references/audit-tooling.md`、`docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 检查范围

- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- `packages/flux-runtime/src/form-runtime-owner.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/async-data/*`
- `packages/report-designer-renderers/src/report-designer-toolbar.tsx`
- `packages/spreadsheet-renderers/src/default-page-body.tsx`
- `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-interactions/*`
- `packages/flux-react/src/lazy-renderer-component.tsx`

### 初审排除项

- `packages/flux-react/src/lazy-renderer-component.tsx`：失败会走 React lazy/error boundary 路径，不单独报。
- `packages/report-designer-renderers/src/report-designer-toolbar.tsx`：内部已完整处理 `result.ok === false` 和 throw。
- data source / polling 复核未见新增 live defect；`AbortController`、stale-drop、poll stop 已有实装与测试覆盖。

## 深挖第 2 轮追加

### [维度06-03] `refreshSource` 只区分“是否找到 source”，不会把真实 refresh 失败返回给 action 链

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-adapter.ts:298-314`
  - `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\source-registry.ts:337-349`
  - `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\runtime.ts:275-280`
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
- **现状**: `refreshSource` 的返回值只表示 registry 里有没有找到 entry；只要 entry 存在，就算底层请求失败，action 结果仍会表现成成功。
- **风险**: schema `then/onError` 分支、调用方按钮反馈、monitor/debug 看到的都是“刷新成功”，但真实 data-source 已进入 error/stale 状态，形成静默错误和误导性控制流。
- **建议**: 把 `controller.refresh()` 或 `runtime.refreshDataSource()` 升级为可返回结构化结果，而不是仅返回 found/not-found 布尔值；至少把 refresh 失败透传成 `ActionResult.ok:false`。
- **为什么值得现在做**: 这是 runtime-owned source refresh 的统一入口，修一次即可覆盖 action dispatcher、host UI 和未来所有 `refreshSource` 调用点。
- **误报排除**: 这不是已有“missing source id”测试覆盖的问题，也不是先前 `stopWhen` zombie source 结论；这里是“source 找到了，但刷新失败仍被上报为成功”的 live 合同漏洞。
- **历史模式对应**: 对应本轮已有“resolved failure result 被上层吞掉”的模式，只是这里发生在 `action adapter -> data source controller` 边界。
- **参考文档**: `docs/architecture/api-data-source.md`、`docs/architecture/action-algebra-formal-spec.md`、`docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

### [维度06-04] report-designer host action provider 丢弃调用方 `AbortSignal`，`preview` 无法随父 action 取消

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\host-action-provider.ts:57-64`
  - `C:\can\nop\nop-chaos-flux\packages\report-designer-core\src\core-dispatch.ts:170-203`
- **证据片段**:
  ```ts
  async invoke(method, payload) {
    const args = isCommandRecord(payload) ? payload : {};
    const result = await dispatch({
      type: `report-designer:${method}`,
      ...args,
    } as ReportDesignerCommand);
    return toReportDesignerActionResult(result);
  }
  ```
- **严重程度**: P2
- **现状**: host action provider 的 `invoke()` 根本不读 `ctx`，所以 action dispatcher 传下来的 `ctx.signal` 无法进入 report preview 链；preview 只受 report core 自己的内部 controller 管理。
- **风险**: 外层 timeout、surface close、父级 action abort 后，report preview 仍可继续跑完并回写 `preview.running/lastResult`，形成取消失效和 stale completion。
- **建议**: 给 report-designer host command 边界补 `signal` 透传方案；至少让 `preview` 能接收并桥接外层 `ctx.signal`。
- **为什么值得现在做**: 这是 shared action system 到 report-designer host family 的单一接口缺口，修复面集中，且直接补齐维度 06 的取消语义。
- **误报排除**: 这不是已有的 toolbar `void dispatch` 问题；即使调用方正确 `await` 并检查 `ok`，当前边界仍然无法取消，因为 `signal` 在 host provider 处已经被丢掉。
- **历史模式对应**: 对应维度 06 一贯要求的“AbortSignal 必须贯穿真实异步 owner”。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/architecture/report-designer/design.md`、`docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度06-05] flow designer toolbar 的 back 路径只捕获 reject，不处理 resolved `ok:false`

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-toolbar.tsx:115-126`
  - `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-toolbar.tsx:219-221`
- **证据片段**:
  ```ts
  const invokeAction = useCallback(
    async (action: string) => {
      const resolved = actionScope?.resolve(action);
      if (!resolved) {
        return;
      }
      await resolved.provider.invoke(resolved.method, undefined, {
        runtime,
        scope,
        actionScope,
      });
    },
  ```
- **严重程度**: P2
- **现状**: back 按钮只在 promise reject 时走 `handleActionFailure()`；如果上游 provider 按 `ActionResult` 合同返回 `{ ok:false, error }`，toolbar 会静默当成功处理。
- **风险**: 宿主导航拒绝、权限拦截、业务阻止返回等结构化失败对用户完全不可见，形成无反馈点击。
- **建议**: `invokeAction()` 应显式读取 `ActionResult`，对 `ok:false/cancelled` 做区分处理，而不是只依赖异常分支。
- **为什么值得现在做**: 这是 flow designer 默认 toolbar 的主交互入口之一，修复成本小，但能补上 host action 失败可见性。
- **误报排除**: 这不是重复已有 spreadsheet toolbar/page-body 条目；本项是 flow designer toolbar 的 namespaced back owner 路径，问题点是 resolved failure 未检查。
- **历史模式对应**: 对应本轮已确认的“resolved failure result 不能被 UI owner 吞掉”模式。
- **参考文档**: `docs/architecture/flow-designer/collaboration.md`、`docs/architecture/action-scope-and-imports.md`、`docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 2 轮说明

- 第 2 轮未发现新的高价值问题之外，已确认本轮新增条目集中在 action result 语义与 signal 贯穿缺口，深挖收敛结束。

## 维度复核结论

- [维度06-01]：保留 (P1)。submit abort 未贯穿到 validation owner。
- [维度06-02]：保留 (P1)。spreadsheet Undo/Redo 路径吞掉 resolved `ok:false`。
- [维度06-03]：保留后经子项复核降级为 P2。仅 API source 失败会被 controller 内部吞掉并误判成功。
- [维度06-04]：保留后经子项复核降级为 P2。问题是缺外层 abort 桥接，而非 preview 自身取消机制整体失效。
- [维度06-05]：保留 (P2)。flow designer back 路径未处理 resolved `ok:false/cancelled`。

## 子项复核结论

- [维度06-01]：成立。校验链缺少外部 `AbortSignal` 贯穿。
- [维度06-02]：成立。Undo/Redo 的无反馈失败仍可稳定复现。
- [维度06-03]：降级。不是所有 refresh 失败都会被上报成成功，仅 API source 成立。
- [维度06-04]：降级。父 action signal 丢失成立，但 preview 内部 latest-wins/stopPreview 仍有效。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                | 一句话摘要                                      |
| ----- | -------- | ----------------------------------------------------------------------------------- | ----------------------------------------------- |
| 06-01 | P1       | `packages/flux-runtime/src/form-runtime-submit-flow.ts`                             | submit abort 未贯穿 validation owner            |
| 06-02 | P1       | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts` | Undo/Redo resolved failure 被静默吞掉           |
| 06-05 | P2       | `packages/flow-designer-renderers/src/designer-toolbar.tsx`                         | back 路径只处理 reject，不处理 resolved failure |
