# 维度 19: 错误传播保真度

## 第 1 轮（初审）

本轮以主 agent 提供的自动化基线为入口：`pnpm check:audit-async-failure-paths` 输出 107 个 suspects，其中 `catch-without-structured-failure-path` 作为候选线索而非结论。已按 `docs/references/audit-tooling.md` 要求对 live code 与 owner 文档复核后，仅保留以下当前可定位、可修复且会影响跨层诊断保真度的发现。

### [维度19-01] ImportStack 复用 pending load 时吞掉首次失败并立即重试

- **文件**: `packages/flux-runtime/src/import-stack.ts:115-135`
- **行号范围**: `import-stack.ts:115-135`
- **证据片段**:

  ```ts
  const existing = input.moduleCache.getPending(key);

  if (existing) {
    try {
      return await existing;
    } catch {
      input.moduleCache.removePending(key);
    }
  }

  const pending = loader.load(input.spec, input.signal);
  input.moduleCache.setPending(key, pending);
  ```

- **严重程度**: P1
- **类别**: 错误吞没 / 错误替换
- **影响**: 多个边界并发等待同一个 `xui:imports` module load 时，后到调用者如果遇到已存在的 pending promise 失败，会吞掉原始失败并立即发起第二次 `loader.load`。这会让同一次导入需求的不同等待者观察到不同结果：首个调用者看到失败，后续调用者可能因重试成功而继续进入 subtree，从而破坏“导入失败阻止依赖命名空间继续执行”的诊断一致性。
- **修复建议**: `existing` 分支捕获失败后应移除 pending 并重新抛出原始错误，或显式返回带 `{ cause: originalError }` 的结构化失败；如果需要重试，应由更外层显式重试策略驱动，而不是在 pending 复用路径隐式重试。
- **为什么值得现在做**: 当前 v1 基线不接受主路径过渡态；`xui:imports` 是运行时能力边界，错误不一致会直接影响 schema 依赖的命名空间是否可用以及调试器/monitor 中的根因定位。
- **误报排除**: 这不是普通“清理缓存后允许下次尝试”的模式；问题点在同一次等待已存在 pending 的调用链中，catch 没有保留或传播首次失败，而是继续走新的 load 主路径。
- **历史模式对应**: 对应本仓库 deep-audit 中高频的 `catch-without-structured-failure-path`：catch 块以恢复/重试为名丢失原始错误上下文。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`（`xui:imports` preload-first、module load dedupe、失败后不进入部分可用命名空间）；`docs/references/audit-tooling.md`。
- **复核状态**: 未复核

### [维度19-02] action-backed data source 将无 error 的失败结果扁平化为通用 Error

- **文件**: `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:31-60`
- **行号范围**: `api-data-source-controller-runtime.ts:31-60`
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

- **严重程度**: P1
- **类别**: 错误替换 / 非抛出型失败诊断丢失
- **影响**: data source 的 action dispatch 可以返回 `{ ok: false }` 且携带 `data`、`results`、`attempts`、`failureCount`、`cause`、`providerKind` 等结构化上下文；当前在没有 `result.error` 时直接替换为 `Data source action failed`，导致后续 `toErrorDataSourceState` 与 `reportRuntimeHostIssue` 只能看到通用错误，无法定位是哪一个 action/attempt/聚合子结果失败。
- **修复建议**: 对无 `error` 的失败结果创建错误时保留完整 `ActionResult`，例如 `new Error('Data source action failed', { cause: result })`，并优先把 `result.cause`、`results`、`attempts` 等纳入 monitor details；取消/超时路径也应保留原始 result 作为 cause。
- **为什么值得现在做**: 该文件是 `flux-runtime` owner 文档列出的 API data source controller request/publish 主路径；错误被扁平化后会让 source 状态、host monitor 和用户反馈同时丢失根因。
- **误报排除**: 不是“没有 error 就只能造一个 Error”的合理降级；`ActionResult` 类型本身已有 `cause`、`results`、`attempts`、`failureCount` 等字段，当前代码完全丢弃了这些非抛出型失败上下文。
- **历史模式对应**: 对应维度 19 的“非抛出型失败计数/诊断”与“new Error without cause”模式：Result 风格失败跨层转为 throw 风格失败时未保留原结构。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`（request/data source boundary）；`docs/architecture/action-scope-and-imports.md`（ActionResult、timeout/cancel/result context 语义）。
- **复核状态**: 未复核

### [维度19-03] word-editor host action 将 abort 伪装成普通失败而非 cancelled 结果

- **文件**: `packages/word-editor-renderers/src/word-editor-action-provider.ts:67-75`
- **行号范围**: `word-editor-action-provider.ts:67-75`
- **证据片段**:
  ```ts
  if (input.saveEvent) {
    const result = await input.saveEvent(saved, ctx);
    if (!result.ok) {
      return result;
    }
  }
  if (ctx.signal?.aborted) {
    return { ok: false, error: new Error('Word document save was aborted.') };
  }
  ```
- **严重程度**: P2
- **类别**: 非抛出型失败计数遗漏 / 错误替换
- **影响**: action core 通过 `cancelled` / `timedOut` 分类取消语义；这里在 `ctx.signal.aborted` 时返回普通 `{ ok: false, error }`，会被 `classifyActionResult` 归为 failure 而不是 cancelled。后续 `onError`、retry/failureCount、monitor 展示会把用户取消或上游 abort 误报为业务失败。
- **修复建议**: 改为返回 `{ ok: false, cancelled: true, error: ctx.signal.reason ?? new Error('Word document save was aborted.') }`，并在需要包装 Error 时使用 `cause` 保留 signal reason。
- **为什么值得现在做**: host action provider 是 namespaced action 的跨包桥接层；取消分类一旦错误，所有通过 `word-editor:save` 的 schema action chain 都会收到错误的失败语义。
- **误报排除**: 这不是 UI 层消息文案问题；`ActionResult` 分类由结构字段决定，缺少 `cancelled: true` 会实质改变 action 分支、失败计数与诊断语义。
- **历史模式对应**: 对应维度 19 的“非抛出型失败计数”以及 owner 文档中的 cancellation normalization 要求。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`（Cancellation Ownership）；`docs/architecture/flux-runtime-module-boundaries.md`（namespaced host provider result contract）。
- **复核状态**: 未复核

### [维度19-04] parallel 聚合失败在子结果无 error 时生成通用错误，onError 的 error 绑定丢失子结果定位

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:182-194`
- **行号范围**: `action-execution.ts:182-194`
- **证据片段**:
  ```ts
  const representativeFailure = results.find((result) => {
    const cls = classifyActionResult(result);
    return cls === 'failure' || cls === 'cancelled';
  });
  const representativeError =
    representativeFailure?.error ??
    (representativeFailure ? new Error('Parallel action failed') : undefined);
  ```
- **严重程度**: P2
- **类别**: 错误替换 / 非抛出型失败诊断丢失
- **影响**: `parallel` 的子 action 可以返回无 `error` 但包含 `data`、`results`、`cancelled`、`timedOut`、`attempts`、`failureCount` 或 provider metadata 的失败结果。当前只在 `error` 缺失时创建 `Parallel action failed`，使 `onError` 分支中的 `error` 绑定无法知道是哪一个子结果失败、是否取消、是否超时或尝试次数是多少。
- **修复建议**: 保持 `results` 数组的同时，将 `representativeFailure` 作为 `cause` 或 details 附到聚合错误；更理想是构造专门的 aggregate error，包含失败子项索引、action type、result class 与原始 `ActionResult`。
- **为什么值得现在做**: `parallel` 是 action algebra 主路径，错误上下文会跨 action-core -> runtime adapter -> schema `onError` 表达式传播；当前扁平化会误导 schema 作者和调试器。
- **误报排除**: 虽然顶层结果保留了 `results` 数组，但 owner 文档明确 `error` 会作为 `onError` 分支上下文注入；因此 `error` 字段的通用化不是纯展示问题，而是会影响后续 action 表达式读取。
- **历史模式对应**: 对应维度 19 的“错误替换”和“跨层错误丢失”，也是 `new Error without cause` 在聚合 action 中的实例。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`（parallel aggregate semantics、chained action result context）；`docs/references/audit-tooling.md`。
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度19-05] form submit 的显式 signal abort 分支丢弃 AbortSignal.reason

- **文件**: `packages/flux-runtime/src/form-runtime-submit-flow.ts:178-180,343-351`
- **行号范围**: `form-runtime-submit-flow.ts:178-180,343-351`
- **证据片段**:

  ```ts
  if (options?.signal?.aborted) {
    return { ok: false, cancelled: true, error: new Error('Submit aborted') };
  }
  ...
  if (options?.signal?.aborted) {
    return { ok: false, cancelled: true, error: new Error('Submit aborted') };
  }

  const result = await awaitWithAbort(executeSubmit(), options?.signal);

  if (options?.signal?.aborted) {
    return { ok: false, cancelled: true, error: new Error('Submit aborted') };
  }
  ```

- **严重程度**: P2
- **类别**: 错误替换 / 取消原因丢失
- **现状**: `executeFormSubmit` 在多个显式 `options.signal.aborted` 检查点直接返回 `new Error('Submit aborted')`，没有读取 `options.signal.reason`，也没有把 reason 作为 `cause` 保留；同文件的 `awaitWithAbort` 也通过 `createSubmitAbortError()` 生成固定 AbortError 文案。
- **风险**: 上游 action timeout、用户取消、surface 关闭或 owner dispose 都可能通过 abort reason 携带真实原因；当前 submit 边界把这些原因统一替换为固定文案，后续 `ActionResult.error`、`onError`/`onSettled` 绑定和 monitor 只能看到“Submit aborted”，无法区分取消来源，也会削弱跨层诊断。
- **建议**: 统一构造 submit abort result/error 时优先使用 `options.signal.reason`；若需要标准 AbortError 包装，应使用 `new Error('Submit aborted', { cause: options.signal.reason })` 并保留 `name = 'AbortError'`，或直接复用已有 `isAbortError`/`createCancelledResult` 语义。
- **误报排除**: 这不是普通取消文案问题；`docs/architecture/action-scope-and-imports.md` 明确取消语义由 action/runtime 栈统一归一，且不应由高层 owner 重新解释。这里已经在主 submit action result 中替换了上游 reason，影响 schema 分支与监控可见的错误对象。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`（Cancellation Ownership、Chained Action Result Context）；`docs/architecture/flux-runtime-module-boundaries.md`（form submit flow ownership）。
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度19-06] withRetry abort 分支丢弃 AbortSignal.reason

- **文件**: `packages/flux-action-core/src/operation-control.ts:156-187`
- **行号范围**: `operation-control.ts:156-187`
- **证据片段**:

  ```ts
  function abortError() {
    return withRetryMetadata(new DOMException('The operation was aborted', 'AbortError'), {
      attempts,
      failureCount,
      lastFailureReason,
    });
  }

  function throwIfAborted() {
    if (options.signal?.aborted) {
      throw abortError();
    }
  }
  ```

- **严重程度**: P2
- **类别**: 错误替换 / 取消原因丢失
- **现状**: `withRetry` 在 pre-aborted signal 与 retry delay abort 两条路径中都调用 `abortError()`，但 `abortError()` 固定创建 `DOMException('The operation was aborted', 'AbortError')`，没有读取 `options.signal.reason`，也没有把原始 reason 作为 `cause` 或 `lastFailureReason` 保留。
- **风险**: action 控制流文档要求 cancellation 由 action/operation-control 层统一归一；当前 retry 控制层会把用户取消、surface dispose、上游 timeout 等原因统一替换为固定 AbortError。随后 `runSingleActionWithRetry` 只能把这个固定错误放进 `{ cancelled: true }` result，`onError`/`onSettled`、monitor 和失败诊断无法区分取消来源。
- **建议**: `abortError()` 应优先使用 `options.signal.reason`：若 reason 是 Error/DOMException 则保留原对象并附加 retry metadata；若需要标准 AbortError 包装，则使用 `{ cause: options.signal.reason }` 保留原始原因，并将 `lastFailureReason` 设为该 reason。
- **误报排除**: 这不是普通取消文案问题；同文件 `withTimeout` 已在 parent abort 分支用 `createAbortError(parentSignal.reason)` 保留上游 reason，而 `withRetry` 是 action retry 主控制层，当前确实在跨层传播时替换了取消根因。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`（Cancellation Ownership、timeout/cancel result 语义）；`docs/architecture/flux-runtime-module-boundaries.md`（`operation-control.ts` 为 action/request execution control 共享层）。
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度19-07] async validation 将结构化 cancelled action result 记录成成功

- **文件**: `packages/flux-runtime/src/runtime-action-helpers.ts:36-44`, `packages/flux-runtime/src/form-runtime-validation.ts:340-346,420-422`
- **行号范围**: `runtime-action-helpers.ts:36-44`; `form-runtime-validation.ts:340-346,420-422`
- **证据片段**:
  ```ts
  if (result.cancelled) {
    return undefined;
  }
  ```
  ```ts
  const asyncError = await sharedState.inputValue.executeValidationRule(
    compiledRule,
    rule,
    field,
    sharedState.scope,
    validationAbortController?.signal,
  );
  ```
  ```ts
  if (validationRun) {
    sharedState.validationAsyncGovernance.settleRun(validationRun, { outcome: 'succeeded' });
  }
  ```
- **严重程度**: P1
- **类别**: 非抛出型取消语义丢失 / 错误传播失真
- **现状**: async validation action dispatch 返回 `{ ok: false, cancelled: true, error }` 时，`executeRuntimeValidationRule` 直接返回 `undefined`。调用方 `validateCompiledField` 无法区分“验证通过无错误”和“下层 action 已取消”，随后把本次 async-governance run 记录为 `outcome: 'succeeded'`。
- **风险**: action/runtime 文档要求结构化 `{ cancelled: true }` 与 thrown abort 属于同一取消语义；当前路径会把 action 层取消折叠成验证成功，导致 debugger/async-governance 快照、validation owner 诊断和后续排障都显示为成功，丢失原始 `result.error` 与取消来源。
- **建议**: `executeRuntimeValidationRule` 不应以 `undefined` 表示 cancelled；可抛出/返回内部 cancellation sentinel，或返回带取消元数据的结构，使 `validateCompiledField` 能 settle 为 `{ outcome: 'cancelled', cancelled: true, error: result.error }`，同时仍保持 `ValidationResult` 对外不暴露 cancelled flag 的当前 contract。
- **误报排除**: 这不是“取消时不显示验证错误”的 UI 策略问题；问题在 owner 诊断层把下层结构化取消记录成 succeeded，违反 `docs/architecture/form-validation.md` 对 async-governance cancellation folding 的要求。
- **参考文档**: `docs/architecture/form-validation.md`（Async Validation Semantics、Cancellation ownership note）；`docs/architecture/action-scope-and-imports.md`（Cancellation Ownership）；`docs/architecture/debugger-runtime.md`（async-governance diagnostics baseline）。
- **复核状态**: 未复核

### [维度19-08] request-runtime dedup/parent abort 转发丢弃 AbortSignal.reason

- **文件**: `packages/flux-runtime/src/async-data/request-runtime.ts:431-443,475-477`
- **行号范围**: `request-runtime.ts:431-443,475-477`
- **证据片段**:
  ```ts
  if (dedupStrategy === 'cancel-previous' && previousController) {
    previousController.abort();
  }
  ...
  if (options.signal.aborted) {
    controller.abort();
  } else {
    const abortFromParent = () => controller.abort();
    options.signal.addEventListener('abort', abortFromParent, { once: true });
  }
  ```
  ```ts
  executeApiRequest.dispose = () => {
    for (const controller of activeControllers.values()) {
      controller.abort();
    }
  };
  ```
- **严重程度**: P2
- **类别**: 取消原因丢失 / 错误替换
- **现状**: `createApiRequestExecutor` 为实际 fetcher 创建内部 `AbortController`，但父 signal 已 abort、父 signal 后续 abort、dedup `cancel-previous`、executor `dispose()` 都调用无参 `abort()`。因此 fetcher 只能看到内部 signal 的默认 abort reason，而不是上游 `options.signal.reason`、dedup supersession reason 或 dispose reason。
- **风险**: 该 executor 是 ajax、form submit、async validation、data-source producer 等共享 request substrate；上游 timeout、用户取消、surface dispose、source refresh supersession 等原因会在 transport 层被统一替换成通用 AbortError。后续 `executeRuntimeAjaxAction`、data-source state、host monitor 与 `ActionResult.error` 无法区分真实取消来源。
- **建议**: 父 signal 转发应使用 `controller.abort(options.signal.reason)`；pre-aborted 分支同样保留 reason。dedup cancel/dispose 至少提供结构化 reason（例如 superseded/disposed，含 requestKey/actionType），或在无法指定业务 reason 时保留明确的 AbortError cause。
- **误报排除**: `executeRequestWithControl` 的 `withTimeout` 会保留 parent reason，但这里是更下层的 `createApiRequestExecutor` 内部 signal 转发；实际传给 `env.fetcher` 的是内部 `controller.signal`，当前确实丢弃了外部 reason。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`（request cancellation plumbing、shared request substrate）；`docs/architecture/api-data-source.md`（dedup/abort lifecycle rule）；`docs/architecture/action-scope-and-imports.md`（Cancellation Ownership）。
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度19-09] namespaced/component action 抛错路径绕过结果元数据补全

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-runners.ts:118-145`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts:296-311`
- **行号范围**: `action-runners.ts:118-145`; `action-execution.ts:296-311`
- **证据片段**:

  ```ts
  const resolved = ctx.actionScope?.resolve(action.action);
  const sourceScopeId = resolved?.sourceScopeId;
  const providerKind = resolved?.provider.kind ?? 'host';
  const invocation: NamespacedActionInvocation = {
    actionName: action.action,
    namespace: parsed.namespace,
    method: parsed.method,
    payload,
  };
  const result = normalizeActionResult(
    await internals.adapter.invokeNamespacedAction(invocation, ctx),
  );
  ```

  ```ts
  return finishAction(
    internals,
    {
      ...actionPayload,
      dispatchMode: 'namespace',
      namespace: parsed.namespace,
      method: parsed.method,
    },
    startedAt,
    {
      ...result,
      sourceScopeId,
      providerKind,
    },
  );
  ```

  ```ts
  } catch (error) {
    if (isAbortError(error)) {
      const result = createCancelledResult(error);
      reportActionEnd(ctx, actionPayload, Date.now() - startedAt, result);
      return result;
    }

    reportActionError(ctx, error, activeCtx);

    const result = {
      ok: false,
      error,
    };
  ```

- **严重程度**: P1
- **类别**: 跨层错误上下文丢失 / 错误传播保真度
- **现状**: `runNamespacedAction` 和 `runComponentAction` 只在 provider/handle 正常返回 `ActionResult` 后补充 `dispatchMode`、`namespace`、`method`、`sourceScopeId`、`providerKind`、component metadata。若 host/import provider 或 component capability 直接 throw，异常会跳到 `runSingleAction` 的通用 catch，生成 `{ ok: false, error }`，并用未带 namespace/component 元数据的 `actionPayload` 上报。
- **风险**: 外部 import、host namespace、component capability 的真实异常会在 action-core 边界退化成普通失败；`onError`/`onSettled` 的 `result`、monitor `onActionEnd`、调试器只能看到 Error，无法定位哪个 namespace/provider/component 实例抛错。动态 `xui:imports` 和复杂 host action 的排障会丢失关键 owner 信息。
- **建议**: 在 `runNamespacedAction` / `runComponentAction` 内部捕获 provider/handle 抛错，返回带完整 metadata 的 `{ ok:false, error, namespace, method, sourceScopeId, providerKind }` 或 component metadata；或让 `runSingleAction` catch 基于已分类的 `processedAction` 重新构造带 dispatch-mode 的失败结果与 monitor payload。
- **误报排除**: 这不是“monitor hook best-effort 不能影响主流程”的允许模式；问题发生在主 `ActionResult` 失败对象本身，返回给 action chain 的 `result` 也缺少跨层定位字段。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`（Action Resolution Model、Chained Action Result Context）；`docs/architecture/flux-runtime-module-boundaries.md`（Action execution boundary、Namespaced Host Provider Result Contract）。
- **复核状态**: 未复核

### [维度19-10] Flow Designer host action 将 command reason 丢弃在 ActionResult 边界之外

- **文件**: `packages/flow-designer-renderers/src/designer-command-adapter-helpers.ts:31-43`, `packages/flow-designer-renderers/src/designer-context.ts:119-124`, `packages/flow-designer-renderers/src/designer-action-provider.ts:67-72`
- **行号范围**: `designer-command-adapter-helpers.ts:31-43`; `designer-context.ts:119-124`; `designer-action-provider.ts:67-72`
- **证据片段**:
  ```ts
  export function createFailure(
    core: DesignerCore,
    error: unknown,
    reason?: DesignerCommandReason,
    extra?: Omit<DesignerCommandResult, 'ok' | 'snapshot' | 'error' | 'reason'>,
  ): DesignerCommandResult {
    return {
      ok: false,
      snapshot: core.getSnapshot(),
      error,
      reason,
      ...extra,
    };
  }
  ```
  ```ts
  export function toActionResult(
    result: import('./designer-command-adapter.js').DesignerCommandResult,
  ) {
    return {
      ok: result.ok,
      data: result.exported ?? result.data,
      error: result.error,
    };
  }
  ```
  ```ts
  notifyCommandFailure({
    notify: ctx?.runtime?.env?.notify,
    error: result.error,
    reason: result.reason,
  });
  return toActionResult(result);
  ```
- **严重程度**: P2
- **类别**: 非抛出型失败上下文丢失
- **现状**: Flow Designer command 层已经用 `reason` 区分 `missing-node`、`constraint`、`unavailable`、`unchanged` 等失败原因；provider 只用它做一次 notify 过滤，随后 `toActionResult` 转成 Flux `ActionResult` 时完全丢弃 `reason`。
- **风险**: schema `onError`、action monitor、debugger 只能看到 `error` 文案，无法基于结构化 reason 做分支处理或诊断聚合。尤其是 `constraint` 与真实异常、`missing-node` 与不可用能力会在 ActionResult 边界变成同一类普通失败。
- **建议**: 在 `toActionResult` 中保留 `reason`，例如放入 `data`/`details`，或在失败 Error 上用 `cause`/自定义字段携带完整 `DesignerCommandResult`；同时确保 monitor payload 可读取该 reason。
- **误报排除**: 不是 UI notify 文案问题；`reason` 是 command 层已经生产出的结构化失败上下文，但跨 host action provider 后对 action chain 不可见。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`（Namespaced Host Provider Result Contract）；`docs/architecture/action-scope-and-imports.md`（Chained Action Result Context）。
- **复核状态**: 未复核

### [维度19-11] Report Designer host provider 将非 Error 预览/命令错误字符串化，丢失结构化 cause

- **文件**: `packages/report-designer-renderers/src/host-action-provider.ts:34-44`, `packages/report-designer-renderers/src/host-action-provider.ts:118-124`, `packages/report-designer-core/src/adapters.ts:52-57`, `packages/report-designer-core/src/core-dispatch.ts:214-226`
- **行号范围**: `host-action-provider.ts:34-44,118-124`; `adapters.ts:52-57`; `core-dispatch.ts:214-226`
- **证据片段**:

  ```ts
  function toActionError(error: unknown): Error | undefined {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string' && error.length > 0) {
      return new Error(error);
    }

    return error == null ? undefined : new Error(String(error));
  }
  ```

  ```ts
  export function toReportDesignerActionResult(
    response: ReportDesignerCommandResult,
  ): ActionResult {
    return {
      ok: response.ok,
      cancelled: response.cancelled,
      data: response.data,
      error: toActionError(response.error),
    };
  }
  ```

  ```ts
  export interface PreviewResult {
    ok: boolean;
    mode?: string;
    data?: unknown;
    error?: unknown;
  }
  ```

  ```ts
  return { ok: result.ok, changed: false, data: result.data, error: result.error };
  ...
  if (isAbortError(err)) {
    return { ok: false, changed: false, cancelled: true, error: err };
  }
  return { ok: false, changed: false, error: err };
  ```

- **严重程度**: P2
- **类别**: 错误替换 / 非抛出型失败诊断丢失
- **现状**: Report Designer core/adapter contract 允许 `PreviewResult.error` 和 `ReportDesignerCommandResult.error` 为 `unknown`。host provider 转为 Flux `ActionResult` 时，非 `Error`、非字符串对象会被 `new Error(String(error))` 替换，结构化字段变成 `"[object Object]"`，且没有 `{ cause: error }`。
- **风险**: 预览 provider、模板 codec 或 domain command 返回 `{ code, providerId, details }` 这类结构化失败时，schema `onError`、monitor 和 host diagnostics 只能看到无意义字符串，无法定位 provider、格式、参数或具体失败类型。
- **建议**: `toActionError` 对非 Error 对象应保留原始值为 `cause`，并从 `message`/`code` 等字段提取可读 message；同时可把完整 `response.error` 放入 `ActionResult.data` 或 diagnostic details，避免 Result 风格失败跨包后被扁平化。
- **误报排除**: 当前部分 core 路径返回字符串或 Error 并不构成豁免；公开 adapter contract 明确是 `unknown`，跨包 host provider 必须保真处理非 Error 结构化失败。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`（Namespaced Host Provider Result Contract）；`docs/architecture/action-scope-and-imports.md`（ActionResult、error/result branch context）。
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度19-12] `onError` 分支返回无 `error` 的失败结果会被吞掉，并丢失分支失败上下文

- **文件**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:518-524,583-584`
- **行号**: `518-524`, `583-584`
- **证据片段**:
  ```ts
  if (classifyActionResult(previous) === 'failure') {
    previous = {
      ...result,
      onErrorError: previous.error,
    };
  }
  ...
  if (resultClass === 'failure' && !normalizedAction.control?.continueOnError) {
    return (previous as { onErrorError?: unknown }).onErrorError !== undefined ? previous : result;
  }
  ```
- **严重程度**: P2
- **类别**: 非抛出型失败上下文丢失 / 错误吞没
- **当前状态**: `onError` 分支自身返回 `{ ok: false }` 但没有 `error` 时，代码只读取 `previous.error` 写入 `onErrorError`。若该失败结果的上下文在 `data`、`results`、`attempts`、`failureCount` 或 `cause` 中，最终判断 `onErrorError !== undefined` 为 false，并直接返回原始失败 `result`，等于吞掉了错误处理分支自身失败。
- **风险**: schema 作者可能在 `onError` 中执行补偿、回滚、告警或二次请求；这些步骤失败但未提供 `error` 字段时，主 action result、monitor 与后续链路都看不到补偿失败，容易误判为原始错误已按预期处理或未发生二次失败。
- **建议**: 保留完整 `onError` 分支 `ActionResult`，例如新增 `onErrorResult` 或将无 `error` 的失败结果作为 `onErrorError` 的 `cause/details`；最终返回判断不应只依赖 `previous.error !== undefined`。
- **误报排除**: 这不是重复报告 parallel 聚合错误；该路径发生在失败分支执行阶段，且问题是 `onError` 自身的非抛出型失败被最终返回逻辑吞掉。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`（`then`/`onError` 分支上下文、ActionResult 语义）
- **复核状态**: 未复核

### [维度19-13] reaction runtime 将 action 失败结果压缩为单个 Error，丢失 ActionResult 结构化上下文

- **文件**: `packages/flux-runtime/src/async-data/reaction-runtime.ts:257-279`
- **行号**: `257-279`
- **证据片段**:

  ```ts
  if (!dispatchResult.ok) {
    const error =
      dispatchResult.error instanceof Error
        ? dispatchResult.error
        : new Error(
            dispatchResult.error == null
              ? `Reaction ${input.id} returned ok:false`
              : String(dispatchResult.error),
          );

    input.runtime.env.monitor?.onError?.({
      phase: 'action',
      error,
  ```

- **严重程度**: P2
- **类别**: 错误替换 / 非抛出型失败诊断丢失
- **当前状态**: reaction 执行动作返回 `{ ok: false }` 后，只把 `dispatchResult.error` 转成单个 `Error` 传给 monitor 与 async governance。若失败上下文在 `dispatchResult.results`、`attempts`、`failureCount`、`cause`、`namespace`、`providerKind` 或 `data` 中，会被丢弃；非 Error 对象还会被 `String(...)` 压成 `"[object Object]"`。
- **风险**: reaction 是 runtime-owned async owner，失败诊断会进入 debugger/async-governance 快照。当前压缩会让复杂 reaction action chain 的失败根因、重试次数、聚合子结果或 provider 来源不可见。
- **建议**: 对 reaction 失败保留完整 `dispatchResult`，例如构造带 `{ cause: dispatchResult }` 的错误，或在 monitor details / async-governance error summary 中记录 `ActionResult` 的关键结构化字段。
- **误报排除**: 这不是已有 data source action failure flattening；这里是 reaction runtime 独立 async owner 路径，状态沉淀到 reaction 的 governance/monitor 诊断。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`（Source and reaction runtime）；`docs/architecture/action-scope-and-imports.md`（ActionResult 与分支上下文）
- **复核状态**: 未复核

### [维度19-14] Spreadsheet host provider 将非 Error 命令错误字符串化，丢失结构化 cause

- **文件**: `packages/spreadsheet-renderers/src/host-action-provider.ts:16-26,98-104`; `packages/spreadsheet-core/src/commands.ts:213-219`
- **行号**: `host-action-provider.ts:16-26,98-104`; `commands.ts:213-219`
- **证据片段**:

  ```ts
  function toActionError(error: unknown): Error | undefined {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string' && error.length > 0) {
      return new Error(error);
    }

    return error == null ? undefined : new Error(String(error));
  }
  ```

  ```ts
  export interface SpreadsheetCommandResult {
    ok: boolean;
    changed: boolean;
    cancelled?: boolean;
    error?: unknown;
    data?: unknown;
  }
  ```

- **严重程度**: P2
- **类别**: 错误替换 / 非抛出型失败诊断丢失
- **当前状态**: Spreadsheet core 的 command result 允许 `error?: unknown`，但 renderer host provider 转成 Flux `ActionResult` 时，对非 Error 对象执行 `new Error(String(error))`，没有保留 `{ cause: error }` 或原始 `SpreadsheetCommandResult`。
- **风险**: 若命令处理器或宿主扩展返回/抛出 `{ code, sheetId, range, details }` 这类结构化错误，schema `onError`、monitor 和 debugger 只能看到 `"[object Object]"`，无法定位具体工作表、区域或命令失败类型。
- **建议**: `toActionError` 对非 Error 对象应使用可读 message 包装并保留 `cause`，同时可把完整 command result 放入 `ActionResult.data` 或 diagnostic details。
- **误报排除**: 这不是重复 Report Designer 非 Error stringification；这是 Spreadsheet host family 的独立 provider。虽然当前部分内置 handler 返回字符串，但公开 result contract 和 core dispatch catch 都是 `unknown`，跨包 host provider 应保真处理。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`（Namespaced Host Provider Result Contract）；`docs/architecture/action-scope-and-imports.md`（ActionResult、error/result branch context）
- **复核状态**: 未复核
