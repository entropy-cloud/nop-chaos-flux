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

## 深挖第 7 轮追加

### [维度19-15] value-adapter 将 value adaptation action 的失败结果压缩成字符串错误，丢失 `ActionResult` 结构化上下文

- **文件**: `packages/flux-core/src/value-adapter.ts:110-124,251-287,310-314`
- **行号**: `110-124`, `251-287`, `310-314`
- **证据片段**:
  ```ts
  function toActionFailureMessage(
    phase: 'transformIn' | 'transformOut',
    resultOrError: ActionResult | unknown,
  ): string {
    if (... && (resultOrError as ActionResult).ok === false) {
      return `[flux] ${phase} failed: ${String((resultOrError as ActionResult).error ?? 'Unknown adapter error')}`;
    }
  }
  ```
  ```ts
  if (!result?.ok) {
    throw new Error(toActionFailureMessage('transformOut', result));
  }
  ```
- **严重程度**: P1
- **类别**: 错误替换 / 非抛出型失败上下文丢失
- **当前状态**: `actionAdapter` 是 `detail-field`、`detail-view`、`object-field`、`variant-field` 共用的 value adaptation substrate，但在 `transformIn` / `transformOut` 失败时只读取 `result.error` 拼接文案，再抛出一个新的 `Error`；原始 `ActionResult` 中的 `cancelled`、`timedOut`、`cause`、`results`、`attempts`、`failureCount`、`providerKind` 等字段全部丢失。`validate` 分支同样只把 `result.error` 映射成 issue message，无法保留完整失败结果。
- **风险**: 适配 action 一旦走 namespaced/import/provider/parallel/retry/timeout 路径，owner 层最终只能看到一条字符串错误，无法区分“用户取消/超时/补偿失败/聚合子结果失败/重试耗尽”等不同语义；这会让 detail/object/variant 这条跨 renderer 家族的共享错误通道失真，并误导上层 notify、draft error、调试与后续补偿逻辑。
- **建议**: `actionAdapter` 不应把失败结果降格为字符串。至少应抛出/返回保留原始 `ActionResult` 的错误，例如 `new Error(message, { cause: result })`，或直接把完整 `ActionResult` 作为 owner-level failure object 向上传递；`validate` 路径也应允许 issue/diagnostic 读取 `result.cause`、`results`、`attempts` 等结构字段。
- **误报排除**: 这不是普通 UI 友好文案问题。`docs/architecture/value-adaptation-and-detail-field.md` 已把 value adaptation 定义为 owner-level shared infrastructure，要求其统一处理 action payload/result/error；当前实现是在共享基础设施边界主动替换失败对象，而不是某个单独 renderer 的展示层简化。
- **参考文档**: `docs/architecture/value-adaptation-and-detail-field.md`（共享 value adaptation substrate、统一错误处理）；`docs/architecture/action-scope-and-imports.md`（`ActionResult`、cancellation/timeout/result context 语义）
- **复核状态**: 未复核

### [维度19-16] anonymous source observer 将结构化 cancelled/timedOut source result 记录成普通 error 状态

- **文件**: `packages/flux-runtime/src/async-data/source-observer.ts:27-32,99-105`; `packages/flux-renderers-form/src/renderers/input-choice-renderers.tsx:47-66`; `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:11-32`
- **行号**: `source-observer.ts:27-32,99-105`; `input-choice-renderers.tsx:47-66`; `tree-control-controllers.ts:11-32`
- **证据片段**:
  ```ts
  function buildResultState(result: ActionResult): SourceTransientState {
    return {
      loading: false,
      error: result.ok ? undefined : result.error,
      status: result.ok ? 'ready' : 'error',
    };
  }
  ```
  ```ts
  if (sourceState?.status !== 'error') {
    return undefined;
  }
  ```
- **严重程度**: P1
- **类别**: 取消/超时误分类
- **当前状态**: `createSourceObserver` 对 source action 的返回结果只按 `result.ok` 决定 `ready/error`，完全忽略 `cancelled` / `timedOut`。而 options/tree 等 consumer 又把 `status === 'error'` 直接解释为“加载失败”并展示错误消息。
- **风险**: source-enabled props 经 action timeout、上游 abort、owner dispose、refresh supersession 等返回结构化 `{ ok:false, cancelled:true }` / `{ timedOut:true }` 时，会被匿名 source 管道误记成普通加载失败。这样下游控件会把取消/超时报成“Failed to load options/tree options”，同时丢失 cancellation 语义，破坏 action/runtime 文档要求的统一取消分类。
- **建议**: source observer 应为 cancelled/timedOut 保留独立状态或至少避免映射成 `status: 'error'`；若维持现有 `SourceTransientState` 形状，至少应让 consumer 可区分 `cancelled/timedOut` 与真正 failure，例如把完整 `ActionResult` 保留到 transient state，再由 UI 层决定是否展示错误。
- **误报排除**: 这不是“取消时不更新 UI”的可接受简化。问题发生在 runtime-owned source observer 对 `ActionResult` 的主分类层，且当前已有多个 consumer 把该分类直接用于用户可见错误提示。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`（Cancellation Ownership）；`docs/architecture/flux-runtime-module-boundaries.md`（source/reaction runtime ownership）
- **复核状态**: 未复核

## 深挖第 8 轮追加

### [维度19-17] anonymous source observer 会把首个 rejected source 的异常错误地扩散到后续 source

- **文件**: `packages/flux-runtime/src/async-data/source-observer.ts:81-116`
- **证据片段**:
  ```ts
  void Promise.allSettled(
    input.entries.map(async (entry) => {
      const result = await runtime.executeSource({
        source: entry.source,
        scope: input.scope,
        ctx: { signal: controller.signal },
      });
      return [entry, result] as const;
    }),
  ).then((settled) => {
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        /* ... */ continue;
      }
      const error = result.reason;
      for (const entry of input.entries) {
        if (entry.stateKey && !(entry.stateKey in transientPatch)) {
          transientPatch[entry.stateKey] = { loading: false, error, status: 'error' };
        }
      }
    }
  });
  ```
- **严重程度**: P1
- **类别**: 错误替换 / 跨层错误归因错位
- **现状**: `Promise.allSettled` 的 rejected 分支拿不到对应 `entry`，当前代码直接把当前 `result.reason` 批量写给所有尚未写入的 source state。这样一旦前面的 source 先 rejected，后续真正失败的 source 会继承“第一个失败”的错误对象。
- **风险**: 一个 observer 同时驱动多个匿名 source（如多个 source-enabled prop）时，UI、debugger 与 host diagnostics 会把 A source 的异常错误地显示在 B/C source 上；后续排障看到的是“错误对象存在”，但根因已被跨 source 替换，属于高价值的跨层诊断失真。
- **建议**: 不要在 rejected 分支按“所有未处理 entry”批量灌错。应改成每个 entry 自己产出 `{ entry, ok/result }` 或 `{ entry, error }` 的包装结果，再逐项写回对应 stateKey。
- **为什么值得现在做**: 这是 runtime-owned shared substrate，不是单个 renderer 的展示细节；一处错误会污染所有依赖匿名 source observer 的控件诊断。
- **误报排除**: 这不是“同一次批量加载统一失败提示”的合理策略；代码并非在构造 aggregate error，而是在逐 source state 上写入错误，却使用了错误的 source 归属。
- **历史模式对应**: 对应维度 19 的“跨层错误丢失/替换”，且比单纯字符串化更严重，因为它把错误归给了错误的 owner。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`；`docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

### [维度19-18] Flow Designer create dialog 会静默吞掉 submitAction 失败，并丢失完整 `ActionResult`

- **文件**: `packages/flow-designer-renderers/src/designer-page-helpers.tsx:200-208`; `packages/flow-designer-renderers/src/designer-page-body.tsx:186-197`
- **证据片段**:
  ```ts
  const result = await args.helpers.dispatch(submitAction, {
    scope: args.designerScope,
    actionScope: args.actionScope,
  });
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  ```
  ```ts
  const result = await confirmCreateDialog({ ... });
  if (result.ok && result.result.ok) {
    setPendingCreateDialog(null);
  }
  ```
- **严重程度**: P1
- **类别**: 错误吞没 / 非抛出型失败上下文丢失
- **现状**: create dialog 的 `submitAction` 若返回 `{ ok:false }`，helper 只保留 `result.error`，把 `cancelled`、`timedOut`、`cause`、`results`、`attempts` 等结构化上下文全部丢掉；而调用方对 `ok:false` 完全不报告、不通知、不上报，只是保持对话框原样停留。
- **风险**: 节点创建前置 action 一旦失败，尤其是返回无 `error` 的结构化失败或取消结果时，用户和调试器都看不到任何明确失败信号；这会把 action 层真实失败静默吞进 renderer 交互层，形成“按钮无反应”的跨层诊断黑洞。
- **建议**: `confirmCreateDialog` 应返回完整失败 `ActionResult`，而不是仅返回 `error`；`designer-page-body` 应显式上报/通知失败，并区分 cancelled、timedOut 与 ordinary failure。
- **为什么值得现在做**: create dialog 是 Flow Designer 高价值主路径；静默失败会直接损害节点创建、host action 集成和 schema 侧排障效率。
- **误报排除**: 这不是“失败时保留弹窗等待用户修正”的正常交互；当前问题不是弹窗不关闭，而是失败结果没有被任何层消费或传播，导致真正的错误被吞没。
- **历史模式对应**: 对应维度 19 的“Result 风格失败跨层被压扁/吞没”，且与已有 action-core 问题不同，发生在 renderer-owned action bridge。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`；`docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## 深挖第 9 轮追加

### [维度19-19] formula data source 的 publish 异常在 refresh 路径只被上报，不会结算为 failed，导致 source/debugger 卡在 `fetching` / `running`

- **文件**: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:97-114,216-241`; `packages/flux-runtime/src/async-data/source-registry.ts:253-264`
- **行号范围**: `formula-data-source-controller.ts:97-114,216-241`; `source-registry.ts:253-264`
- **证据片段**:

  ```ts
  const run =
    asyncOwnerId && input.asyncGovernance
      ? input.asyncGovernance.beginRun({ ownerKind: 'data-source', ownerId: asyncOwnerId, ... })
      : undefined;

  updateState((current) => ({
    ...toNextDataSourceState(current, {
      fetchStatus: 'fetching',
      status: typeof current.data === 'undefined' ? 'pending' : current.status,
    }),
  }));
  ```

  ```ts
  void Promise.resolve()
    .then(() => {
      publish();
    })
    .catch((error: unknown) => {
      reportPublishFailure(error);
      updateState((current) => ({ ...current, status: 'error', fetchStatus: 'idle', error }));
    });

  async refresh() {
    publish();
  }
  ```

  ```ts
  const refreshPromise = controller.refresh();
  void refreshPromise
    .catch((error) => {
      reportRefreshFailure(error);
    })
    .finally(() => {
      leaveSourceCascade(cascadeState);
    });
  ```

- **严重程度**: P1
- **类别**: 错误吞没 / async owner 结算遗漏
- **现状**: `formula-data-source-controller` 的 `publish()` 会先 `beginRun()` 并把 source 状态推进到 `fetching`，但表达式求值、result mapping 或 `writeDataToScope()` 抛错时，没有在 `publish()` 内统一 `settleRun(..., { outcome: 'failed', error })`。初始 `start()` 路径至少会在外层 `.catch(...)` 把 source state 改成 error，但仍拿不到 `run` 去结算 async governance；`refresh()` 路径更糟，直接调用 `publish()`，异常只会被 `source-registry` 的 `.catch(reportRefreshFailure)` 记录，source state 也不会回落到 error/idle。
- **风险**: formula-backed source 一旦在 refresh/依赖变更后抛错，跨层会出现互相矛盾的诊断：host issue 已记录失败，但 `DataSourceState` 可能长期停留在 `fetching/pending`，`async` debug snapshot 的 `currentRun` 也可能一直是 `running`，看不到 failed/stale-dropped/cancelled 结算。依赖 source 状态的 renderer、statusPath 和 debugger 会把真实失败误读成“还在加载”或“没有结论”。
- **建议**: 把 `publish()` 改成 owner 内部完整 try/catch/finally：一旦 beginRun 后任一步失败，必须同时更新 `DataSourceState` 为 error/idle 并 `settleRun(run, { outcome: 'failed', error })`；`refresh()` 不应把异常留给 `source-registry` 仅做 host report。若仍需向上抛出，也应先完成 owner-local failed settlement，再决定是否 rethrow。
- **为什么值得现在做**: 这是 runtime-owned shared source substrate，不是单个 renderer 的展示细节；formula-backed source 是文档明确保留的主模型之一，错误被卡在 “fetching/running” 会直接破坏 source lifecycle 与 debugger 的根因可见性。
- **误报排除**: 这不是“同步 formula source 不需要 async diagnostics”的合理简化。live code 已明确为 formula source 调用 `beginRun()` 并把 `state.async` 暴露到 source/debug snapshot；既然 owner 已进入 shared async-governance 语义，就不能在失败路径只报 host issue 而不结算 owner。
- **参考文档**: `docs/architecture/api-data-source.md`（formula-backed 与 action-backed producer 共用 source model、source owner 负责 stale/result lifecycle）；`docs/architecture/flux-runtime-module-boundaries.md`（source/reaction runtime ownership）；`docs/architecture/debugger-runtime.md`（async-governance snapshot 需要解释 async result 为什么没有发布）
- **复核状态**: 未复核

## 深挖第 10 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度19-01]: 保留 (P1)。`packages/flux-runtime/src/import-stack.ts:115-135` 在复用 pending load 失败后仍会清除 pending 并隐式重试，首次失败不会按同一次等待链路继续传播。
- [维度19-02]: 保留 (P1)。`packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:45-55` 仍把无 `error` 的 failed `ActionResult` 扁平化成通用 `Error`，丢掉 `cause/results/attempts` 等结构化上下文。
- [维度19-03]: 保留 (P2)。`packages/word-editor-renderers/src/word-editor-action-provider.ts:80-82` 仍把 abort 伪装成普通 `{ ok:false, error }`，没有返回 `cancelled: true`。
- [维度19-04]: 保留 (P2)。`packages/flux-action-core/src/action-dispatcher/action-execution.ts:100-106` 仍在 parallel 聚合失败无 `error` 时生成 `new Error('Parallel action failed')`，`onError` 绑定拿不到失败子结果定位。
- [维度19-05]: 保留 (P2)。`packages/flux-runtime/src/form-runtime-submit-flow.ts:127-139,343-351` 仍在多个 abort 检查点统一返回 `new Error('Submit aborted')`，没有保留 `AbortSignal.reason`。
- [维度19-06]: 保留 (P2)。`packages/flux-action-core/src/operation-control.ts:160-171` 的 `withRetry` abort 分支仍固定生成 `DOMException('The operation was aborted', 'AbortError')`，未把 `options.signal.reason` 带过边界。
- [维度19-07]: 保留 (P1)。`packages/flux-runtime/src/runtime-action-helpers.ts:42-44` 仍把 cancelled validation action result 映射为 `undefined`，`packages/flux-runtime/src/form-runtime-validation.ts:420-422` 仍把这类 run 结算为 `succeeded`。
- [维度19-08]: 保留 (P2)。`packages/flux-runtime/src/async-data/request-runtime.ts:431-443,475-477` 的 parent abort、dedup cancel-previous 与 dispose 仍用无参 `abort()`，请求底层看不到上游 reason。
- [维度19-09]: 保留 (P1)。`packages/flux-action-core/src/action-dispatcher/action-runners.ts:118-145` 只在 provider 正常返回后补 namespace/component metadata；直接 throw 仍会掉回 `action-execution.ts:296-311` 的通用 catch，失败结果缺少 dispatch-mode/sourceScope/provider 元数据。
- [维度19-10]: 保留 (P2)。`packages/flow-designer-renderers/src/designer-context.ts:119-124` 的 `toActionResult()` 仍只保留 `ok/data/error`，把 command-level `reason` 丢在 Flow Designer host provider 边界外。
- [维度19-11]: 保留 (P2)。`packages/report-designer-renderers/src/host-action-provider.ts:34-44,118-124` 仍把非 `Error` 的 preview/command failure `new Error(String(error))` 化，没有保留结构化 cause。
- [维度19-12]: 保留 (P2)。`packages/flux-action-core/src/action-dispatcher/action-execution.ts:518-524,583-584` 仍只按 `previous.error !== undefined` 判断 `onError` 分支是否失败，无 `error` 的 failed `ActionResult` 继续被吞掉。
- [维度19-13]: 保留 (P2)。`packages/flux-runtime/src/async-data/reaction-runtime.ts:462-475` 仍把 failed `dispatchResult` 压成单个 `Error` 后上报 monitor/async governance，丢掉完整 `ActionResult`。
- [维度19-14]: 保留 (P2)。`packages/spreadsheet-renderers/src/host-action-provider.ts:16-26,98-104` 仍把 spreadsheet command 的非 `Error` 失败对象字符串化，和 Report Designer 同类问题独立存在。
- [维度19-15]: 保留 (P1)。`packages/flux-core/src/value-adapter.ts:110-124,251-287,310-314` 仍把 value adaptation action failure 降格成字符串 message 再抛新 `Error`，共享 substrate 丢失原始 `ActionResult` 结构字段。
- [维度19-16]: 保留 (P1)。`packages/flux-runtime/src/async-data/source-observer.ts:27-32,99-105` 仍只按 `result.ok` 分类 anonymous source state，`cancelled/timedOut` 会被记录为普通 `error` 并被下游控件当成加载失败。
- [维度19-17]: 保留 (P1)。`packages/flux-runtime/src/async-data/source-observer.ts:91-109` 的 `Promise.allSettled` rejected 分支仍把首个 rejected error 批量灌给所有尚未写入的 source state，错误归因会跨 source 污染。
- [维度19-18]: 保留 (P1)。`packages/flow-designer-renderers/src/designer-page-helpers.tsx:200-208` 仍只从 `submitAction` 失败中摘 `result.error`，`designer-page-body.tsx:186-197` 也仍未显式上报/处理 `result.ok === false`，create dialog 失败仍会静默停留。
- [维度19-19]: 保留 (P1)。`packages/flux-runtime/src/async-data/formula-data-source-controller.ts:97-185,240-242` 仍在 `publish()` 内 begin run 但不对 publish exception 做 failed settlement；`source-registry.ts:253-264` refresh 路径也仍只 report，不会把 source/debugger async owner 结算为 failed。

## 子项复核结论

- [维度19-01] 至 [维度19-19]: 均成立。复核后仍集中在四类根因：Result 风格失败被扁平化为通用 Error、abort reason/cancelled 语义被丢失、provider/namespace metadata 未跨边界保真、async owner 的 failed/cancelled settlement 仍缺口明显。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                    | 一句话摘要                                                       |
| ----- | -------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 19-01 | P1       | `packages/flux-runtime/src/import-stack.ts:115-135`                                     | pending import 失败后仍被吞掉并隐式重试                          |
| 19-02 | P1       | `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:45-55`      | data-source failed result 仍被扁平化为通用 Error                 |
| 19-03 | P2       | `packages/word-editor-renderers/src/word-editor-action-provider.ts:80-82`               | Word Editor abort 仍被伪装成普通 failure                         |
| 19-04 | P2       | `packages/flux-action-core/src/action-dispatcher/action-execution.ts:100-106`           | parallel 聚合失败仍生成无上下文的通用 Error                      |
| 19-05 | P2       | `packages/flux-runtime/src/form-runtime-submit-flow.ts:127-139,343-351`                 | form submit abort 仍丢 `AbortSignal.reason`                      |
| 19-06 | P2       | `packages/flux-action-core/src/operation-control.ts:160-171`                            | withRetry abort 分支仍丢上游 reason                              |
| 19-07 | P1       | `packages/flux-runtime/src/runtime-action-helpers.ts:42-44`                             | async validation 仍把 cancelled action result 记成 succeeded     |
| 19-08 | P2       | `packages/flux-runtime/src/async-data/request-runtime.ts:431-443,475-477`               | request runtime abort 转发仍丢上游 reason                        |
| 19-09 | P1       | `packages/flux-action-core/src/action-dispatcher/action-runners.ts:118-145`             | namespaced/component action 直接 throw 仍丢 dispatch metadata    |
| 19-10 | P2       | `packages/flow-designer-renderers/src/designer-context.ts:119-124`                      | Flow Designer command `reason` 仍未进入 ActionResult             |
| 19-11 | P2       | `packages/report-designer-renderers/src/host-action-provider.ts:34-44,118-124`          | Report Designer 非 Error failure 仍被字符串化                    |
| 19-12 | P2       | `packages/flux-action-core/src/action-dispatcher/action-execution.ts:518-524,583-584`   | `onError` 分支无 `error` 的 failed result 仍会被吞掉             |
| 19-13 | P2       | `packages/flux-runtime/src/async-data/reaction-runtime.ts:462-475`                      | reaction failed result 仍被压成单个 Error                        |
| 19-14 | P2       | `packages/spreadsheet-renderers/src/host-action-provider.ts:16-26,98-104`               | Spreadsheet 非 Error command failure 仍被字符串化                |
| 19-15 | P1       | `packages/flux-core/src/value-adapter.ts:110-124,251-287,310-314`                       | value-adapter 仍把 shared ActionResult failure 压成字符串错误    |
| 19-16 | P1       | `packages/flux-runtime/src/async-data/source-observer.ts:27-32,99-105`                  | anonymous source observer 仍把 cancelled/timedOut 记成普通 error |
| 19-17 | P1       | `packages/flux-runtime/src/async-data/source-observer.ts:91-109`                        | source observer 仍会把首个 rejected error 扩散到后续 source      |
| 19-18 | P1       | `packages/flow-designer-renderers/src/designer-page-helpers.tsx:200-208`                | Flow Designer create dialog 仍静默吞掉 submitAction 失败         |
| 19-19 | P1       | `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:97-185,240-242` | formula source refresh 失败后仍不会 failed settlement            |
