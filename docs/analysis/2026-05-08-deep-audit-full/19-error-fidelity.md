# 19 Error Fidelity

- 深挖轮次: 1
- 深挖发现数: 3

## 第 1 轮初审

### [维度19-01] Flow Designer 复合插入事务缺少 try/finally 回滚保护

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-command-adapter.ts:282-306,331-350,376-416`
- **行号范围**: `282-306`
- **证据片段**:

  ```ts
  core.beginTransaction('insert-chain-node');

  const newNode = core.addNode(
    command.nodeType,
    { x: sourceNode.position.x, y: sourceNode.position.y + 100 },
    command.data,
  );
  if (!newNode) {
    core.rollbackTransaction();
    return createFailure(core, 'Unable to add node.', 'constraint');
  }
  ```

- **严重程度**: P1
- **类别**: 状态泄漏
- **影响**: `insertChainNode`、`insertChainNodeAtMerge`、`insertBranchPair` 在 `beginTransaction()` 后执行多步图变更，但只有显式失败分支调用 `rollbackTransaction()`；如果 `deleteEdge`、`addEdge`、`reconnectEdge`、`relayoutAfterTreeMutation` 或后续代码抛错，事务栈可能保持未关闭状态，导致后续历史记录、undo/redo、dirty 状态和事务事件被错误归类到悬挂事务中。
- **修复建议**: 将每个复合事务包进 `try/catch/finally` 或专用 `withTransaction` helper；成功路径 `commitTransaction()`，失败路径 `rollbackTransaction()` 后返回带原始 `error`/`cause` 的失败结果，确保异常路径不会泄漏事务状态。
- **为什么值得现在做**: 该路径是 Flow Designer 结构编辑核心能力，事务泄漏会污染后续用户操作，而不是单次命令失败；修复范围集中在一个 adapter 文件，ROI 高。
- **误报排除**: 这不是手动暴露给 schema 的 `beginTransaction`/`commitTransaction` 长事务 API，而是 adapter 内部为单个复合命令临时开启的事务，按维度 19 的“保存-修改-恢复”模式应在异常路径保证恢复。本项也不同于今日 plan 229 已收口的 Flow create confirm same-tick guard。
- **历史模式对应**: try/finally 保存恢复缺失；运行时状态异常路径泄漏。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-02] Value adapter transform 失败重新包装 Error 时丢失 ActionResult.error cause

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-core\src\value-adapter.ts:110-123,251-264,274-288`
- **行号范围**: `251-264`
- **证据片段**:

  ```ts
  const result = await runAction(
    transformInAction,
    {
      value,
      readOnly: ctx.readOnly,
      ...(ctx.name !== undefined ? { name: ctx.name } : {}),
    },
    ctx,
    dispatch,
  );

  if (!result?.ok) {
    throw new Error(toActionFailureMessage('transformIn', result));
  }
  ```

- **严重程度**: P2
- **类别**: 错误替换
- **影响**: `transformInAction` / `transformOutAction` 返回 `{ ok:false, error: originalError }` 时，adapter 抛出新的 `Error`，只把原错误字符串化到 message，未设置 `{ cause: result.error }`。上层 detail/object/variant value-adaptation 只能看到包装后的文本，调试器、日志和调用方无法可靠追溯原始异常对象、stack 或结构化错误。
- **修复建议**: 当 `result.error instanceof Error` 时使用 `new Error(message, { cause: result.error })`；非 Error 的结构化错误可放入自定义属性或保留到 adapter failure object，避免只做 `String(...)`。
- **为什么值得现在做**: value adapter 是跨 `flux-core`、runtime dispatch、表单高级控件的通用失败边界；修复一次可提升所有 transform action 的诊断保真度。
- **误报排除**: 这不是 plan 229 已修的 reaction/validation `ok:false` 传播，也不是 submitForm registry cause；当前 residual 位于 `flux-core` 的通用 value adapter transform 路径，live code 仍在替换原始 cause。
- **历史模式对应**: catch/new Error cause 丢失；跨层 ActionResult.error 被弱化为普通 message。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度19-03] Flow createDialog submitAction 的 ok:false 结果被折叠为空失败

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page-helpers.tsx:198-207`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page-body.tsx:171-185`
- **行号范围**: `198-207`
- **证据片段**:

  ```ts
  const result = await args.helpers.dispatch(submitAction, {
    scope: args.designerScope,
    actionScope: args.actionScope,
  });

  if (!result.ok) {
    return { ok: false as const };
  }
  ```

- **严重程度**: P2
- **类别**: 错误替换
- **影响**: 节点创建弹窗的 `submitAction` 返回 `{ ok:false, error }` 时，helper 只返回 `{ ok:false }`，丢弃 `error`、`cancelled`、`timedOut`、`failureCount` 等上下文；调用方只检查 `result.ok && result.result.ok`，失败时既不展示也不记录原始原因，用户看到弹窗不关闭但不知道失败原因。
- **修复建议**: 让 `confirmCreateDialog` 返回 `{ ok:false, error: result.error, result }` 或直接返回标准 `ActionResult` 形态；调用方在失败时通过 `env.notify` / local error state / monitor 保留并呈现原始失败原因。
- **为什么值得现在做**: create dialog 是 schema-driven host action 的典型跨层入口；保留失败原因可避免表单校验、远程创建前置检查、权限检查等 submitAction 失败被静默化。
- **误报排除**: 这不是今日 plan 229 已修的 Flow create confirm 同步门闩；门闩解决重复点击，本项是 live code 仍然丢弃 `submitAction` 的失败上下文。也不是 reaction/validation `ok:false` 已修路径。
- **历史模式对应**: ok:false 错误上下文丢失；非抛出型失败被弱化为空失败。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度19-04] Dialog/Drawer 表单验证计划编译失败被裸 catch 静默降级为无验证

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-adapter.ts`
- **行号范围**: `43-52`, `220-229`, `270-279`
- **证据片段**:
  ```ts
  try {
    const compiled = runtime.compile({
      type: 'page',
      body,
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    return root?.validationPlan;
  } catch {
    return undefined;
  }
  ```
- **严重程度**: P2
- **类别**: 错误吞没 / 诊断禁用
- **影响**: `openDialog` / `openDrawer` 会把 `resolveSurfaceValidationPlan(...)` 的结果作为 surface `validationPlan`。如果 dialog/drawer body 编译验证计划时抛错，当前代码直接返回 `undefined`，随后 surface 仍会打开，但表单验证计划被静默移除。用户看到的是弹层可用但校验不生效；调试器和 monitor 也看不到原始编译错误、schema path 或 cause。
- **修复建议**: 裸 catch 中至少通过 runtime env monitor / `reportRuntimeHostIssue` 上报，并返回结构化失败或在 strict/dev 模式下阻止 surface 打开；若为了兼容必须降级，应保留原始 `error`、surface kind、action node/path，并让调用方可感知“validationPlan unavailable”的诊断。
- **为什么值得现在做**: 这是 action adapter 的跨层边界，直接影响 schema-driven dialog/drawer 的验证保真度；修复点集中，且能避免“弹层打开成功但验证消失”的隐性失败。
- **误报排除**: 这不是允许的“诊断试探性编译”场景；该函数结果被正式传入 `ctx.surfaceRuntime.open(... options.validationPlan ...)`，失败会改变运行时行为而不仅是跳过可选优化。
- **历史模式对应**: bare catch 丢 cause；关键路径诊断被静默禁用。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/action-scope-and-imports.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度19-05] Form submit 失败处理器抛错时会替换原始提交失败

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\form-runtime-submit-flow.ts`
- **行号范围**: `272-288`
- **证据片段**:

  ```ts
  if (resultClass === 'failure') {
    return lifecycleHandlers?.onSubmitError
      ? await lifecycleHandlers.onSubmitError(result, options)
      : result;
  }

  return result;
  } catch (error) {
  const failureResult = toSubmitFailureResult(error);
  ```

- **严重程度**: P2
- **类别**: 错误替换
- **影响**: `submitAction` 返回失败结果时会进入 `onSubmitError(result, options)`；如果 `onSubmitError` 自身抛错/拒绝，原始 `result.error` 不会作为 `cause` 或 `settledError` 保留，而是由外层 action dispatcher 捕获 handler 的错误。抛出型提交失败同理：catch 中构造 `failureResult` 后再次 await `onSubmitError`，handler 失败会替换原始 submit 异常。
- **修复建议**: 将 `onSubmitError` 调用包入独立 `try/catch`；handler 失败时返回 `{ ok:false, error: handlerError, cause/originalError: failureResult.error, settledError: handlerError }` 或至少用 `new Error(..., { cause: failureResult.error })` 保留原始提交失败。
- **为什么值得现在做**: 表单提交是核心 action 边界；错误处理器通常用于 toast、埋点、回滚等非主路径逻辑，不应让这些副作用错误覆盖真正的提交失败原因。
- **误报排除**: 这不是普通 lifecycle hook 可自行抛错的设计自由；当前函数承诺返回 `ActionResult`，但 handler 抛错会让上层看到另一个错误并丢失原始失败上下文，属于错误传播保真度问题。
- **历史模式对应**: catch/new failure handler 替换原始 cause；失败分支副作用覆盖主失败。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-06] HTTP ok:false 重试耗尽后只抛通用 Error，响应体与失败原因未保留

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\request-runtime.ts`; `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\operation-control.ts`
- **行号范围**: `request-runtime.ts:298-315`; `operation-control.ts:217-226`
- **证据片段**:

  ```ts
  if (!response.ok) {
    const responseData = response.data;
    const retryMetadata = {
      attempts: execution.retry.attempts,
      failureCount: execution.retry.failureCount,
      lastFailureReason: execution.retry.lastFailureReason,
    };
  ```

  ```ts
  if (shouldStop(lastResult)) {
    return { result: lastResult, attempts, failureCount, lastFailureReason };
  }

  failureCount += 1;
  options.onFailedAttempt?.(failureCount, lastResult);
  ```

- **严重程度**: P2
- **类别**: ok:false 上下文丢失 / 计数上下文遗漏
- **影响**: `withRetry` 对非抛出型失败会递增 `failureCount`，但不会把失败的 `lastResult` 写入 `lastFailureReason`。随后 `executeApiSchema` 在最终 `response.ok === false` 时只抛 `new Error(message/status)` 并附带 retry metadata；对于 HTTP 4xx/5xx 的响应体、status、headers 或最终失败响应对象，上层 action 只能看到通用 Error 和可能为空的 `lastFailureReason`。
- **修复建议**: 在 `withRetry` 的非抛出型失败分支同步设置 `lastFailureReason = lastResult`；`executeApiSchema` 抛错时保留 `response`、`status`、`data`、`attempts`、`failureCount`，或返回标准 `{ ok:false, error, data }` 形态供 action 链和 debugger 使用。
- **为什么值得现在做**: ajax、data-source、submitAction 都共用该请求通道；保留最终 HTTP 失败响应能显著提升 retry / backoff / onError 分支的可诊断性。
- **误报排除**: 这不是“失败计数完全没有统计”的已修路径；`failureCount` 确实递增，但非抛出型失败的实际失败对象没有进入 `lastFailureReason`，最终错误也没有携带响应上下文。
- **历史模式对应**: ok:false 非抛出失败被压缩为 Error message；retry metadata 不完整。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度19-07] Flow Designer 生命周期 hook 异常被 String 化后原始 Error 丢失

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-node-commands.ts`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-edge-commands.ts`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\types.ts`
- **行号范围**: `core-node-commands.ts:42-53`; `core-edge-commands.ts:69-88`; `types.ts:325-328`
- **证据片段**:
  ```ts
  try {
    const result = ctx.normalizedConfig.hooks.beforeCreateNode({ type, position, data });
    if (result === false) {
      return null;
    }
    type = result.type;
    position = result.position;
    data = result.data;
  } catch (err) {
    ctx.emit({ type: 'lifecycleHookError', hook: 'beforeCreateNode', error: String(err) });
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **影响**: `beforeCreateNode`、`beforeDelete`、`beforeConnect` 等 host lifecycle hook 抛出的 Error 被转换成 `String(err)` 并通过 `lifecycleHookError` 事件发布；`DesignerEvent` 类型也只允许 `error: string`。调用方无法取得原始 Error、stack、cause 或结构化字段，只能看到文本，复杂 host hook / tenant hook 故障难以定位。
- **修复建议**: 扩展 `lifecycleHookError` 事件为 `{ error: unknown; message: string }` 或 `{ error: Error; message: string }`，兼容保留 `message` 字段；命令返回失败时也可携带原始 cause，避免只依赖事件字符串。
- **为什么值得现在做**: Flow Designer hook 是宿主扩展边界，错误通常来自业务插件或外部集成；保留原始错误对象能显著降低扩展调试成本。
- **误报排除**: 这不是普通 UI 文案格式化；异常发生在 domain core lifecycle hook 边界，当前实现主动丢弃 Error 对象，并且类型层把后续保真传播封死为 string。
- **历史模式对应**: catch 丢 cause；跨 host 扩展边界错误被字符串化。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核
