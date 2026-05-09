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

## 深挖第 3 轮追加

### [维度19-08] Formula data source publish 失败后 async run 不会 settle

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\formula-data-source-controller.ts`
- **行号范围**: `75-100`, `126-140`, `172-184`, `194-196`
- **证据片段**:
  ```ts
  const run =
    asyncOwnerId && input.asyncGovernance
      ? input.asyncGovernance.beginRun({
          ownerKind: 'data-source',
          ownerId: asyncOwnerId,
          scopeId: input.scope.id,
          cause: started ? 'refresh' : 'start',
        })
      : undefined;
  ```
  ```ts
  void Promise.resolve()
    .then(() => {
      publish();
    })
    .catch((error: unknown) => {
      updateState((current) => ({
        ...current,
        status: 'error',
        fetchStatus: 'idle',
        error,
        failureCount: current.failureCount + 1,
  ```
- **严重程度**: P2
- **类别**: 状态泄漏 / 计数遗漏
- **现状**: `publish()` 在开始处 `beginRun(...)`，但表达式求值、resultMapping、`writeDataToScope` 或状态写入任一步抛错时，没有 `try/catch/finally` 在同一作用域内 `settleRun(... outcome: 'failed')`。`start()` 外层 `.catch()` 只更新 `DataSourceState`，无法访问已经创建的 `run`；`refresh()` 直接调用 `publish()`，同样没有 settle 保护。
- **影响**: formula data source 的可见状态会变为 error，但 async governance/debug snapshot 中对应 run 可能长期保持 running/in-flight，导致调试器、状态摘要和后续 stale-run 判断看到错误的异步状态。
- **修复建议**: 将 `publish()` 内部的 `beginRun` 到成功写入全过程包进 `try/catch/finally`；失败时调用 `input.asyncGovernance.settleRun(run, { outcome: 'failed', error })` 后再更新 error state，取消时使用 cancelled 语义。
- **为什么值得现在做**: data-source async governance 是调试与运行时状态摘要核心，run 泄漏会让错误路径观测失真。
- **误报排除**: 这不是第 2 轮已覆盖的 HTTP retry metadata 或 action-backed request runtime；这里是 formula data source 本地同步 publish 路径。代码已经显式维护 `asyncGovernance` run，因此缺少失败 settle 会造成真实诊断状态泄漏。
- **历史模式对应**: begin/save 状态后缺少 finally settle，导致异常路径状态泄漏。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-09] Reaction 在 when/dispatch 失败前提前提交 previousValue，异常后同值变化不会重试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\reaction-runtime.ts`
- **行号范围**: `173-179`, `187-199`, `293-317`
- **证据片段**:

  ```ts
  const nextValue = evaluateWatchValue();
  const changed = force || !initialized || !Object.is(previousValue, nextValue);
  const prev = previousValue;

  previousValue = nextValue;
  initialized = true;

  if (!changed) {
  ```

  ```ts
  const whenAllowed = compiledWhen
    ? compiledWhen.exec(
        {
          scope: input.scope.readVisible(),
          value: nextValue,
          prev,
          changed,
  ```

- **严重程度**: P2
- **类别**: 状态泄漏 / 错误传播保真度
- **现状**: reaction 在 `when` 表达式执行和 action dispatch 成功之前就把 `previousValue` 与 `initialized` 更新为新值。若 `compiledWhen.exec(...)` 抛错，或后续 action 抛错进入 catch，catch 只上报/settle failed，不回滚 `previousValue`。
- **影响**: 某次 reaction 因临时错误失败后，同一个 watch value 再次触发时会被判定为 `changed === false`，从而不再重试 action；错误恢复后也可能需要额外无关变化才能重新触发，造成“失败吞掉一次业务变化”的隐性缺陷。
- **修复建议**: 将 `previousValue = nextValue` / `initialized = true` 延后到 `when` 与 dispatch 成功确认之后，或在 catch 中回滚到 `prev`/旧 initialized 状态；如果设计上失败也要消费变化，应在代码和 debug state 中显式记录 failed-consumed，而不是静默当作成功推进游标。
- **为什么值得现在做**: reaction 是 scope-driven side effect 的核心运行时机制；失败时提前消费 watch 值会造成难以重放的业务漏触发。
- **误报排除**: 这不是已有发现中的 reaction/validation `ok:false` cause 传播或 HTTP retry metadata；本项关注的是异常路径下 watch 游标提前提交导致后续同值不再触发，属于 try/finally 状态恢复缺失。
- **历史模式对应**: 保存/修改状态后异常路径未恢复，导致后续行为基于错误游标继续运行。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-10] Action-backed data source 将 ok:false ActionResult 抛成通用 Error 后丢失结果上下文

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\api-data-source-controller-runtime.ts`
- **行号范围**: `31-60`, `320-365`
- **证据片段**:

  ```ts
  function toDispatchError(result: ActionResult): unknown {
    if (result.error) {
      return result.error;
    }

    if (result.cancelled || result.timedOut) {
      return Object.assign(new Error('Data source action was cancelled'), { name: 'AbortError' });
    }

    return new Error('Data source action failed');
  }
  ```

- **严重程度**: P2
- **类别**: ok:false 上下文丢失
- **现状**: data source action dispatch 返回 `{ ok:false }` 时，`executeDataSourceAction` 通过 `toDispatchError(result)` 抛出 `result.error` 或通用 `Error`，没有保留完整 `ActionResult` 的 `data`、`results`、`attempts`、`failureCount`、`timedOut` 等上下文。后续 catch 只能把该 error 写入 data-source state / async governance。
- **影响**: action-backed data source 的失败在进入 data-source 状态机时被压缩为单个 Error；schema action 链、parallel aggregate、timeout/retry 结果携带的上下文无法通过 `statusPath.failureReason`、debug snapshot 或 monitor 还原。
- **修复建议**: 为 data-source action 失败保留完整 `ActionResult`，例如抛出带 `{ cause: result.error, actionResult: result }` 的结构化错误，或直接让 catch 接收 failure result 并写入 `failureReason`/debug details；取消和超时应保留 `cancelled`、`timedOut`、attempt metadata。
- **为什么值得现在做**: data-source 是跨 action/runtime/debugger 的公共边界，保留 ActionResult 能提升所有 action-backed source 失败诊断能力。
- **误报排除**: 这不是第 2 轮的 HTTP `executeApiSchema` retry metadata 丢失；本项位于 action-backed data source controller 的 `dispatch(...) -> DataSourceState` 边界，即使 action 不是 HTTP request 也会触发。
- **历史模式对应**: ok:false failure result 被重新包装成普通 Error，跨层失败上下文丢失。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度19-11] Table quick edit 保存动作返回 ok:false 时被当作成功提交

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\table-quick-edit-controller.ts`
- **行号范围**: `88-108`
- **证据片段**:
  ```ts
  try {
    await helpers.dispatch(saveAction, { scope: rowScope });
    const nextSavedValue = field
      ? toOptionalDraftValue((rowScope.get('record') as Record<string, unknown>) ?? record, field)
      : draftValue;
    setSavedValue(nextSavedValue);
    setDraftValue(nextSavedValue);
    setBodyDirty(false);
    setDialogOpen(false);
  } catch (error) {
    setSaveError(error);
  ```
- **严重程度**: P1
- **类别**: ok:false 上下文丢失 / 状态泄漏
- **现状**: `runSave()` 只依赖 `helpers.dispatch(...)` 是否抛错，没有检查返回的 `ActionResult.ok`。Flux action pipeline 的标准失败形态是 `{ ok:false, error }`，这种失败不会进入 `catch`，而是继续执行“保存成功”路径，清除 dirty、关闭弹窗并更新 saved/draft 状态。
- **影响**: 远程保存、权限校验、服务端校验等通过 `{ ok:false }` 返回失败时，用户会看到 quick edit 已保存并关闭；失败原因、`cancelled`、`timedOut`、`attempts`、`failureCount` 等上下文全部丢失，且本地行状态可能与后端事实不一致。
- **修复建议**: 接收 dispatch 结果并显式判定 `if (!result.ok)`；失败时保留完整 `ActionResult` 或至少 `result.error` 到 `setSaveError`/`onSaveError`，不要进入提交成功路径。
- **为什么值得现在做**: quick edit 是用户可见保存路径，ok:false 被当作成功会造成数据可信度问题，优先级高。
- **误报排除**: 这不是已有 createDialog submitAction 空失败问题；当前 residual 位于 table quick edit 的保存控制器，且标准 `ActionResult` 非抛出失败确实会被当作成功处理。
- **历史模式对应**: non-throw ActionResult failure 未检查，失败路径进入成功状态提交。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度19-12] 组件/命名空间 action 抛错时 monitor 结束事件丢失目标与 provider 上下文

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\action-dispatcher\action-runners.ts`; `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\action-dispatcher\action-execution.ts`
- **行号范围**: `action-runners.ts:80-92,114-141`; `action-execution.ts:171-198`
- **证据片段**:
  ```ts
  const result = await internals.adapter.invokeComponentAction(invocation, ctx);
  return finishAction(
    internals,
    { ...actionPayload, dispatchMode: 'component', method },
    startedAt,
    result,
  );
  ```
  ```ts
  const result = normalizeActionResult(
    await internals.adapter.invokeNamespacedAction(invocation, ctx),
  );
  return finishAction(
    internals,
    {
      ...actionPayload,
      dispatchMode: 'namespace',
  ```
  ```ts
  } catch (error) {
    if (isAbortError(error)) {
      const result = createCancelledResult(error);
      ctx
        .getEnv()
        .monitor?.onActionEnd?.({ ...actionPayload, durationMs: Date.now() - startedAt, result });
      return result;
  ```
- **严重程度**: P2
- **类别**: 错误上下文丢失
- **现状**: component / namespace action 只有在 adapter/provider 正常返回 `ActionResult` 时才通过 `finishAction(...)` 注入 `componentId`、`componentName`、`componentType`、`namespace`、`method`、`sourceScopeId`、`providerKind` 等上下文。若 `handle.capabilities.invoke(...)` 或 `provider.invoke(...)` 抛错，异常跳到 `runSingleAction` 的通用 catch，`onActionEnd` 只拿到基础 `actionPayload`。
- **影响**: 同一个 namespace 在多个 lexical `ActionScope` 中存在、或同类型组件有多个实例时，监控/调试器只能看到 actionType 和 Error，无法可靠定位哪个 component handle、哪个 source scope/provider 抛错。返回型失败和抛出型失败的诊断上下文不一致。
- **修复建议**: 在 `runComponentAction` / `runNamespacedAction` 内包裹 invoke，抛错时也调用 `finishAction` 并携带已解析的 target/provider metadata；或让通用 catch 接收/enrich 当前 dispatchMode 上下文。
- **为什么值得现在做**: component/namespace action 是 cross-scope dispatch 核心入口，错误定位上下文丢失会直接影响 monitor/debugger 使用价值。
- **误报排除**: 这不是既有 ok:false 被包装为普通 Error 的 data-source 问题；当前问题只发生在 provider/handle 抛出异常时，原始 Error 仍保留，但 action 目标定位上下文被丢失。
- **历史模式对应**: 成功/返回型失败路径有上下文 enrichment，抛出型失败旁路走通用 catch 导致上下文降级。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度19-13] Host capability union 参数校验硬编码 silent diagnostics，失败时只保留泛化错误

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-compiler\src\schema-compiler\host-action-validation.ts`
- **行号范围**: `10-12`, `257-270`
- **证据片段**:

  ```ts
  function createSilentDiagnosticsContext(): SchemaCompilerDiagnosticsContext {
    return createSchemaCompilerDiagnosticsContext({ diagnostics: { enabled: false } }, 'validate');
  }
  ```

  ```ts
  case 'union': {
    for (const variant of shape.anyOf) {
      const silentDiagnostics = createSilentDiagnosticsContext();
      if (validateArgsShape(value, variant, path, silentDiagnostics, family)) {
        return true;
      }
    }

    diagnostics.emit({
      code: 'invalid-host-capability-args',
      path,
      message: `${family} capability args: value does not match any expected type in union.`,
  ```

- **严重程度**: P2
- **类别**: 诊断禁用
- **现状**: host capability args 的 union 分支校验使用硬编码 `diagnostics: { enabled: false }` 逐个试探；当所有 variant 都失败时，只向真实 diagnostics 发出“does not match any expected type in union”的泛化错误，丢弃每个分支具体的 path、expected type、缺失字段或 literal mismatch。
- **影响**: schema 作者在调试 `designer:*`、`report-designer:*` 等 host action 参数时，只能看到 union 不匹配，无法知道哪一个字段/分支失败；复杂 host manifest 的参数错误会退化为低保真编译诊断。
- **修复建议**: silent probe 可以保留用于避免噪声，但在全部失败时应聚合每个 variant 的诊断摘要，或在 dev/diagnostics enabled 模式下输出最接近分支的具体失败原因。
- **为什么值得现在做**: host capability validation 是 schema 导入/编译时的关键反馈点，错误低保真会显著拉高修复成本。
- **误报排除**: 这不是普通“为了 union 探测而静默中间分支”的可接受实现；问题在于最终失败也没有保留任何分支级上下文，且该禁用是硬编码、不可由 diagnostics 配置恢复。
- **历史模式对应**: diagnostics 被用于 internal probe 后，最终失败没有回填被静默的具体原因。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/schema-file-validator.md`
- **复核状态**: 未复核

### [维度19-14] Async governance debug error summary 截断 Error cause 与结构化失败字段

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\async-governance.ts`; `C:\can\nop\nop-chaos-flux\packages\flux-core\src\types\async-governance.ts`
- **行号范围**: `async-governance.ts:9-24,124-140`; `types/async-governance.ts:5-8,10-22`
- **证据片段**:

  ```ts
  function summarizeError(error: unknown): AsyncErrorSummary | undefined {
    if (!error) {
      return undefined;
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }
  ```

  ```ts
  const settled: AsyncOwnerRunDebugEntry = {
    ownerKind: handle.ownerKind,
    ownerId: handle.ownerId,
    scopeId: handle.scopeId,
    runId: handle.runId,
    cause: handle.cause,
    startedAt: handle.startedAt,
    settledAt: Date.now(),
    outcome: stale ? 'stale-dropped' : input.outcome,
    error: summarizeError(input.error),
  };
  ```

- **严重程度**: P3
- **类别**: 诊断上下文丢失
- **现状**: async governance 的 debug snapshot 对 `Error` 只保留 `name` 和 `message`；`Error.cause`、stack、以及通过 `Object.assign(error, { attempts, failureCount, lastFailureReason, actionResult })` 之类附加的结构化字段都不会进入 `AsyncErrorSummary` 类型。
- **影响**: data-source、reaction、validation 等路径即使上游已经保留了 cause 或 retry/action metadata，进入 async debug snapshot 后仍只能看到一条扁平 message；排查跨层失败时无法从 governance recentRuns 还原原始失败链。
- **修复建议**: 扩展 `AsyncErrorSummary`，至少保留 `cause` 的 message/name、可序列化 `details`、以及常见 metadata（`attempts`、`failureCount`、`lastFailureReason`、`cancelled`、`timedOut`）；避免存放不可序列化对象本体。
- **为什么值得现在做**: async governance 是多个 runtime 异步 owner 的统一 debug 出口，出口截断会抵消上游错误保真修复。
- **误报排除**: 这不是要求 debug snapshot 保存完整 Error 对象或 stack；问题是当前类型层完全没有 cause/metadata 通道，导致已保真的上游错误在诊断出口再次降级。
- **历史模式对应**: debug/monitor summary 将结构化错误重新压扁为 message，造成诊断出口降级。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度19-15] VariantField detectVariantAction 返回 ok:false 时静默回退并丢失失败原因

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\variant-field\variant-field.tsx`
- **行号范围**: `198-218`
- **证据片段**:
  ```tsx
  const result = await props.helpers.dispatch(
    injectDetectVariantArgs(schemaProps.detectVariantAction, {
      value: currentValue,
      variants: variants.map((variant) => variant.key),
    }),
    {
  ```
  ```tsx
  if (!result.ok) {
    setDetectedKey(undefined);
    return;
  }
  ```
- **严重程度**: P2
- **类别**: ok:false 上下文丢失 / 错误吞没
- **影响**: `detectVariantAction` 是复杂 union-like 值识别的扩展点；当 action 返回 `{ ok:false, error }` 时，当前代码只清空 `detectedKey` 并继续走 `defaultVariant`/首个 variant 回退路径，既不记录 `result.error`，也不向字段错误或调试通道暴露失败原因。用户可能看到错误的 variant UI 被选中并继续编辑，原始检测失败、取消、超时、attempts/failureCount 等上下文全部丢失。
- **修复建议**: 对 `!result.ok` 分支保留完整 `ActionResult`：至少 `console.warn`/runtime monitor 上报 `result.error` 与 action context；更好是引入 variant-field 局部错误态或外部 field error，阻止无诊断回退。若设计允许回退，也应显式记录“detect failed, fallback used”及原始 cause。
- **为什么值得现在做**: `variant-field` 当前文档已把 `detectVariantAction` 列为 live baseline 能力，且它服务于低代码作者难以静态匹配的多态值；静默回退会把真实检测失败伪装成合法默认 variant，后续排查成本高。
- **误报排除**: 这不是已知“superseded completion 静默丢弃”的 latest-request-wins 设计；这里的 request 仍是当前 request，只是标准 ActionResult 失败被无诊断消费。也不同于 [维度19-03] createDialog submitAction 空失败和 [维度19-11] quick edit 保存成功误判，本项位于 variant 检测扩展点。
- **历史模式对应**: non-throw ActionResult failure 未保留；失败路径静默回退为默认状态。
- **参考文档**: `docs/architecture/variant-field.md`; `docs/architecture/action-scope-and-imports.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

第 5 轮上限已达，深挖结束。

## 维度复核结论

- [维度19-01] 保留：live code 仍在复合事务中缺少异常路径 rollback/finally，事务栈泄漏风险成立，维持 P1。
- [维度19-02] 保留：`ActionResult.error` 被重新包装为普通 `Error` 且无 `cause`，原始错误对象丢失成立。
- [维度19-03] 保留：`confirmCreateDialog` 对 `ok:false` 仅返回空失败，调用方也未记录/展示失败原因，成立。
- [维度19-04] 保留：`resolveSurfaceValidationPlan` 裸 `catch` 返回 `undefined`，会静默丢失验证计划诊断，成立。
- [维度19-05] 保留：`onSubmitError` 抛错会覆盖原始 submit 失败，并可能再次进入错误处理器，成立。
- [维度19-06] 保留：非抛出型 retry 失败未写入 `lastFailureReason`，最终 HTTP 错误也未携带完整响应上下文，成立。
- [维度19-07] 保留：Flow Designer lifecycle hook 异常被 `String(err)` 化且类型层只允许 string，原始 Error 丢失成立。
- [维度19-08] 保留：formula data source `beginRun` 后失败路径无法 settle 对应 run，async governance 状态泄漏成立。
- [维度19-09] 保留：reaction 在 when/dispatch 前提前推进 `previousValue`，失败后同值变化不再重试风险成立。
- [维度19-10] 保留：action-backed data source 将失败 `ActionResult` 压缩为单个 Error，完整结果上下文丢失成立。
- [维度19-11] 保留：Table quick edit 未检查 dispatch 返回的 `ok:false`，会进入保存成功路径，维持 P1。
- [维度19-12] 保留：component/namespace action 抛错绕过 enriched `finishAction`，monitor 目标/provider 上下文丢失成立。
- [维度19-13] 保留：host capability union 最终失败只输出泛化诊断，分支级错误上下文被硬编码 silent 探测吞掉，成立。
- [维度19-14] 保留：async governance debug summary 仅保留 Error name/message，cause 与结构化 metadata 出口截断成立，维持 P3。
- [维度19-15] 保留：VariantField 对当前 `detectVariantAction` 的 `ok:false` 静默清空检测结果并回退，失败原因丢失成立。
- 需子项复核：维度19-01、维度19-11；建议补充复核维度19-04、维度19-09的设计意图边界。

## 子项复核结论

- [维度19-01] 保留：Flow Designer 多步插入事务仍在 `beginTransaction()` 后缺少异常路径 `rollback`/`finally`，抛错会留下悬挂事务风险。
- [维度19-04] 保留：Dialog/Drawer 的 `resolveSurfaceValidationPlan` 仍裸 `catch` 返回 `undefined`，编译失败会静默降级为无验证计划。
- [维度19-09] 保留：reaction 仍在 `when`/dispatch 成功前推进 `previousValue` 与 `initialized`，失败后同值变化会被当作未变化而不重试。
- [维度19-11] 保留：Table quick edit 仍未检查 `helpers.dispatch(saveAction)` 返回的 `ActionResult.ok`，`ok:false` 会进入保存成功路径。

最终进入汇总：19-01、19-04、19-09、19-11。
