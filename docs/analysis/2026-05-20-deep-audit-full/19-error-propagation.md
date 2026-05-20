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
