# 维度 19：错误传播保真度

## 第 1 轮（初审）

### [维度19-01] formula 数据源首轮异步 catch 将非 Error 原因替换为无 cause 的 `Error(String(error))`

- **文件**: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:240-254`
- **证据片段**:
  ```ts
  void Promise.resolve()
    .then(() => {
      publish();
    })
    .catch((error: unknown) => {
      input.onDependenciesChange?.(undefined);
      reportPublishFailure(error);
      updateState((current) => ({
        ...current,
        status: 'error',
        fetchStatus: 'idle',
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **现状**: `error` 原值仍写入 `state.error`，但公开/诊断用的 `failureReason` 在非 `Error` payload 时变成 `new Error(String(error))`，没有 `{ cause: error }`；同文件同步 publish catch 路径已使用 `{ cause: error }`，首轮启动 catch 路径不一致。
- **影响**: 公式数据源启动阶段若抛出结构化对象（例如表达式/host payload `{ code, path, details }`），UI/调试器读取 `failureReason` 时只剩 `[object Object]` 或扁平字符串，丢失原始 code/path/details。
- **风险**: 数据源初始化失败的诊断保真度低于刷新失败路径，容易误判为普通字符串错误；跨 runtime async-data 边界的问题定位变困难。
- **建议**: 与 `publish()` 主 catch 保持一致：`error instanceof Error ? error : new Error(String(error), { cause: error })`，必要时统一抽 helper。
- **为什么值得现在做**: 小改动即可消除同一 owner 内两条失败路径的保真度不一致。
- **误报排除**: 不是 harmless debug/test path；这是 runtime async-data 主路径。虽然 `state.error` 保留原值，但 owner 文档强调 runtime/host failure payload 应通过 `Error.cause` 保真，`failureReason` 当前确实替换丢失 cause。
- **历史模式对应**: catch 中新建 Error 未保留原始 cause。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度19-02] Flow Designer auto-layout catch 将非 Error 失败替换为通用消息且不保留 cause

- **文件**: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:126-133`
- **证据片段**:
  ```ts
  .catch((error: unknown) => {
    if (layoutRequestRef.current !== requestId) {
      return;
    }
    const layoutError =
      error instanceof Error ? error : new Error('Auto-layout failed');
    setLayoutError(layoutError.message);
  })
  ```
- **严重程度**: P2
- **类别**: 错误替换
- **现状**: auto-layout promise 失败后，非 `Error` 原因被替换为 `new Error('Auto-layout failed')`，没有结构化日志、没有 rethrow、也没有 `cause`；最终 UI state 只保存通用 message。
- **影响**: ELK/布局 owner 若 reject 结构化错误对象（如 layout node id、edge id、algorithm reason），用户和调试器只能看到 “Auto-layout failed”，无法定位是哪类图结构或布局配置失败。
- **风险**: 图设计器自动布局属于跨 renderer -> layout/host owner 的异步边界；错误被扁平化后，后续只能复现调试而不能从 runtime 状态回溯原始 payload。
- **建议**: 对非 `Error` 使用 `new Error('Auto-layout failed', { cause: error })`，并将完整 Error/原因提交到 host issue reporter 或 monitor；UI message 可继续显示简短文本。
- **为什么值得现在做**: 这是 suspect 中典型 catch flatten；修复局部且能显著提升布局失败诊断。
- **误报排除**: stale request 分支返回是合理的；问题仅在当前 request 的真实失败路径。不是维度 06 已保留的 detail-view confirm catch。
- **历史模式对应**: 异步 UI 边界 catch + 通用消息替换。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

## suspect 复核摘要

- 已运行/消费 `pnpm check:audit-async-failure-paths`：108 suspects。
- 重点复核：
  - `flux-action-core` action execution / retry / timeout / monitor catch：多处为 structured result、metadata、monitor best-effort 或 withRetry 计数路径，暂不作为初审发现。
  - `flux-runtime` action-adapter / async-data / form-submit：大多数保留 `error`、report host issue、return `ActionResult`；保留 `formula-data-source-controller` 首轮 catch 的 cause 丢失。
  - Flow designer core lifecycle hook catches：emit `lifecycleHookError` 携带原始 `err`，不报。
  - report/spreadsheet host action provider：已用 `Error.cause` 或 `cause` 字段保留原始 payload，基本符合 owner 文档。
  - debugger、JSON viewer、strict-mode、monitor hook catches：多为 debug/test/best-effort 或格式化 fallback，未列入。
  - diagnostics disabled：`flux-value-shape-validation` silent context 为内部 shape probe 且仍收集 diagnostics；debugger `enabled:false` 是配置默认值，未作为发现。
  - Result.err / `{ ok:false }` 计数：`withRetry` 对非 success result 计入 `failureCount`，未发现“只有 throw 才算失败”的核心偏差。

## 错误传播问题清单

- `[维度19-01]` runtime formula data source 启动失败 `failureReason` 丢失非 Error cause。
- `[维度19-02]` Flow Designer auto-layout 非 Error 失败被替换为通用 message 且无 cause/structured report。

## 总结评估

第 1 轮初审未发现 P0/P1 级错误传播保真度问题。核心 action/runtime 请求路径整体已经有较好的 `ActionResult.error`、`cause`、monitor/report、retry metadata 保留。剩余问题主要集中在局部异步 UI/runtime 边界对非 `Error` payload 的 cause 保真不一致。

## 第 2 轮深挖方向

- 继续沿 `new Error(String(error))` / `new Error('... failed')` 且无 `{ cause }` 的路径深挖，尤其是 renderer-owned host bridges。
- 复核 Flow Designer action provider 中直接调用 `core.*` 返回 `{ ok:true }` 的命令是否存在 throw 后被上层保真捕获的统一边界。
- 抽样检查 `reportRuntimeHostIssue` / monitor consumers 是否展示或序列化 `Error.cause`，确认保留的 cause 是否能到达调试面。

## 深挖第 2 轮追加

### [维度19-03] Word Editor host provider 对非 Error 保存异常二次包装后丢失原始 cause

- **文件**: `packages/word-editor-renderers/src/word-editor-action-provider.ts:153-163,178-187`
- **证据片段**:
  ```ts
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    return failWithError(
      new Error('Unable to save word document.', {
        cause: normalizedError,
      }),
    );
  }
  ```
- **严重程度**: P2
- **现状**: `captureDocumentSnapshot`、`persistSavedDocument`、`saveDatasets` 抛出非 `Error` 结构化 payload 时，provider 先生成无 cause 的 `new Error(String(error))`，再把该 synthetic Error 作为外层 `Unable to save word document.` 的 cause。原始 payload 没有进入 `Error.cause` 链。
- **风险**: Word Editor namespaced host action `save` 是 renderer-owned host provider 边界；如果 core/storage 抛出 `{ code, quota, documentId, details }` 等结构化失败，action chain、monitor、debugger 最终只能看到固定文案和 `"[object Object]"`，无法定位保存阶段和真实业务原因。
- **建议**: 非 `Error` 分支改为 `new Error(String(error), { cause: error })`，或让外层错误 `cause` 直接指向原始 payload；必要时把 `stage: 'snapshot' | 'persist'` 放入 `ActionResult.data/details`。
- **误报排除**: 现有测试只覆盖 `Error` cause；对非 `Error` payload 没有验证。该路径不是 best-effort UI 日志，而是 `word-editor:*` host action provider 返回给 action runtime 的失败结果。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md:469-477`; `docs/architecture/action-scope-and-imports.md:597-600`
- **复核状态**: 未复核

### [维度19-04] Schema import preload / runtime import load 对非 Error rejection 的 monitor 错误丢失原始 cause

- **文件**: `packages/flux-react/src/schema-renderer.tsx:357-374`; `packages/flux-runtime/src/runtime-factory.ts:316-324`
- **证据片段**:
  ```ts
  reportImportFailure({
    env: props.env,
    error: error instanceof Error ? error : new Error(String(error)),
    message: error instanceof Error ? error.message : String(error),
    phase: 'compile',
    path: props.schemaUrl,
  });
  ```
  ```ts
  const wrappedError = new Error(
    `Imported namespace ${prepared.spec.as} failed to load: ${error instanceof Error ? error.message : String(error)}`,
    error instanceof Error ? { cause: error } : undefined,
  );
  ```
- **严重程度**: P2
- **现状**: `SchemaRenderer` 的 preload catch 对非 `Error` reject 使用无 cause 的 `new Error(String(error))` 上报 `reportImportFailure`。更下游的 `runtime.prepareSchema` 在 import module load 失败时也只给 `Error` 设置 `{ cause }`，非 `Error` payload 被字符串化进 message，cause 为空。
- **风险**: `xui:imports`、`importLoader`、`staticMeta` 这类 host/runtime import 边界可能 reject 结构化对象（namespace、url、provider、status、response body）。当前 monitor 只收到扁平 Error，调试面无法知道哪个 loader/provider 返回了什么结构化失败。
- **建议**: 两处统一改为对非 `Error` 保留 cause，例如 `new Error(String(error), { cause: error })`；`runtime-factory` 包装错误时无论是否 `Error` 都应设置 `{ cause: error }`，同时可在 `reportImportFailure.details` 中补充 `schemaUrl/import alias`。
- **误报排除**: `setPrepareError(error)` 虽保留原始值用于 React root error state，但 `reportImportFailure` / monitor 通道收到的是新建无 cause Error；问题发生在 host import diagnostics 主通道，不是纯 UI fallback。
- **参考文档**: `docs/architecture/action-scope-and-imports.md`; `docs/architecture/flux-runtime-module-boundaries.md`
- **复核状态**: 未复核

### [维度19-05] Debugger monitor consumer 只格式化 Error stack/message，`Error.cause` 与 monitor details 无法到达调试事件

- **文件**: `packages/nop-debugger/src/controller-helpers.ts:60-74`; `packages/nop-debugger/src/adapters.ts:226-236`
- **证据片段**:
  ```ts
  export function formatErrorDetail(error: unknown) {
    if (error instanceof Error) {
      return error.stack ?? error.message;
    }
  ```
  ```ts
  onError(payload) {
    input.store.append({
      kind: 'error',
      group: 'error',
      level: 'error',
      source: 'monitor.onError',
      summary: `${payload.phase} error`,
      detail: formatErrorDetail(payload.error),
      nodeId: payload.nodeId,
      path: payload.path,
    });
  ```
- **严重程度**: P2
- **现状**: `reportRuntimeHostIssue` 会把 `input.error` 和 `details` 原样传给 `env.monitor.onError`，但 debugger 的 monitor consumer 只把 `payload.error` 通过 `formatErrorDetail` 压成 stack/message 字符串，并且没有把 `payload.details`、`Error.cause` 或结构化 error 放入 `exportedData`。
- **风险**: 即使各 runtime/host provider 已按规范把原始 payload 放进 `Error.cause`，Nop Debugger 时间线里仍只能看到外层 message/stack；`cause` 中的 `{ reason, result, providerKind, code, path }` 和 `reportRuntimeHostIssue.details` 不可见，削弱已修复 cause 保真的实际诊断价值。
- **建议**: `formatErrorDetail` 至少递归/安全序列化 `Error.cause`；`decorateDebuggerEnv.onError` 应把 `payload.details` 与规范化后的 error/cause 放入 `exportedData`（走 redaction），detail 保持简短摘要即可。
- **误报排除**: `baseMonitor?.onError?.(payload)` 只把原 payload 继续传给外部 monitor，不能证明内置 debugger surface 可见；当前 `NopDebugEvent` 已有 `exportedData` 字段但 error monitor 未使用。
- **参考文档**: `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度19-01]`: 降级（P3）。live code 仍在 `formula-data-source-controller.ts` 首轮异步 catch 中把非 `Error` 写成无 cause 的 `failureReason: new Error(String(error))`，但同一路径 `state.error` 与 `reportRuntimeHostIssue(... error)` 仍保留原始 payload，问题限于公开状态的 `failureReason` 诊断保真。
- `[维度19-02]`: 保留（P2）。live auto-layout 初始树布局 `.catch` 仍只把非 `Error` 替换为 `new Error('Auto-layout failed')` 并落到 `layoutError.message`，没有 rethrow/monitor/details；`elk.layout(...)` 是真实异步外部失败边界。
- `[维度19-03]`: 降级（P3）。provider live code 仍对非 `Error` 使用无 cause 的 `new Error(String(error))` 再二次包装；但 core 的 `captureDocumentSnapshot`/`persistSavedDocument` 已主要抛 `SaveDocumentError` 并保留 cause，剩余风险集中在 `saveDatasets` 或异常 mock/host 直接抛非 `Error` 的路径。
- `[维度19-04]`: 保留（P2）。`SchemaRenderer` preload 与 `runtime-factory.prepareSchema` live code 仍分别对非 `Error` import rejection 构造无 cause Error/无 cause wrapper，而 `reportImportFailure` 会把该 Error 作为 monitor 主错误上报，结构化 loader payload 到不了 import diagnostics 主通道。
- `[维度19-05]`: 保留（P2）。`ErrorMonitorPayload` live 类型含 `details`，`NopDebugEvent` 也有 `exportedData`，但 debugger `onError` 仍只记录 `formatErrorDetail(payload.error)` 的 stack/message 且不写 `details`/`cause`，导致内置调试时间线丢失已保留的结构化错误上下文。

## 子项复核建议

无。

## 子项复核结论

- `[维度19-01]`: 降级（P3）。live formula data source 首轮 catch 的 `failureReason` 仍丢非 Error cause，但同一路径 `state.error` 与 host issue reporting 仍保留原始 payload，影响范围限于公开状态诊断字段。
- `[维度19-03]`: 降级（P3）。live word-editor save provider 仍对非 Error 二次包装丢原始 cause，但 core `captureDocumentSnapshot`/`persistSavedDocument` 主失败多已抛 `SaveDocumentError` 并保留 cause，剩余主要是 `saveDatasets` 或外部非 Error 抛出路径。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                      | 摘要                                                                                             |
| --------- | -------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 维度19-01 | P3       | `packages/flux-runtime/src/async-data/formula-data-source-controller.ts`                      | formula 数据源首轮异步 catch 的 `failureReason` 对非 Error 原因丢失 cause。                      |
| 维度19-02 | P2       | `packages/flow-designer-renderers/src/use-designer-auto-layout.ts`                            | Flow Designer auto-layout catch 将非 Error 失败替换为通用消息且不保留 cause。                    |
| 维度19-03 | P3       | `packages/word-editor-renderers/src/word-editor-action-provider.ts`                           | Word Editor host provider 对非 Error 保存异常二次包装后丢失原始 cause。                          |
| 维度19-04 | P2       | `packages/flux-react/src/schema-renderer.tsx`; `packages/flux-runtime/src/runtime-factory.ts` | Schema import preload / runtime import load 对非 Error rejection 的 monitor 错误丢失原始 cause。 |
| 维度19-05 | P2       | `packages/nop-debugger/src/controller-helpers.ts`; `packages/nop-debugger/src/adapters.ts`    | Debugger monitor consumer 未把 `Error.cause` 与 monitor details 带到调试事件。                   |
