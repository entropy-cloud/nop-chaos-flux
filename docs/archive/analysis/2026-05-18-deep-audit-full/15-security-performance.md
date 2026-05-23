# 维度 15：安全与性能红线

## 第 1 轮（初审）

### [维度15-01] action dispatcher 诊断钩子失败被静默吞掉

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\action-dispatcher\action-execution.ts:82-99,108-115`
- **证据片段**:
  ```ts
  try {
    ctx.onActionError?.(error, actionCtx);
  } catch {
    // Diagnostic hooks must not replace the primary action failure.
  }
  ```
- **严重程度**: P2
- **类别**: 安全
- **规则编号**: R3
- **现状**: `reportActionError()`、插件 `onError` 回调、`reportActionEnd()` 都用了空 `catch {}`；二级诊断失败不会进入任何结构化上报。
- **风险**: action 失败相关的监控/插件链路会“失明”而不是显式退化，属于 failure-sensitive 边界上的 fail-open 可观测性缺口。
- **建议**: 保持“不覆盖主失败”的语义，但在 `catch` 中补一个 best-effort fallback（如 `monitor.onError` / `env.notify`），带上 hook/plugin 阶段信息。
- **为什么值得现在做**: 这是共享 action 调度主路径，一处修复覆盖全仓 action 失败观测。
- **误报排除**: 不是要求让诊断异常改变主 action 结果；问题是当前完全无 telemetry，且 `pnpm lint` 不覆盖这类空 catch。
- **历史模式对应**: 对应 `docs/analysis/2026-05-17-deep-audit-full/15-security-performance.md` 的 retained 15-01，当前仍然存活。
- **参考文档**: `docs/architecture/security-design-requirements.md`; `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度15-02] import-stack 复用 pending import 失败时丢失结构化失败记录

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\import-stack.ts:117-123`
- **证据片段**:
  ```ts
  if (existing) {
    try {
      return await existing;
    } catch {
      input.moduleCache.removePending(key);
    }
  }
  ```
- **严重程度**: P3
- **类别**: 安全
- **规则编号**: R3
- **现状**: 等待已有 pending 模块加载失败时，只清理 pending cache；没有走 `reportImportFailure`/`notifyImportFailure`。
- **风险**: 动态导入边界第一次真实失败原因会被吞掉，后续只看到重试结果，宿主很难定位 capability/import wiring 失效根因。
- **建议**: `catch (error)` 后先上报结构化失败，再清理 pending；如果仍要重试，保留现有重试语义即可。
- **为什么值得现在做**: 该模块本身已经有 import failure reporting 工具，修复局部且收益明确。
- **误报排除**: 不是重复报告后面的 `await pending` 分支；这里是“加入已存在 promise”的专属失败路径，当前确实单独漏报。
- **历史模式对应**: 对应 `docs/analysis/2026-05-17-deep-audit-full/15-security-performance.md` 的 retained 15-02，当前仍然存活。
- **参考文档**: `docs/architecture/security-design-requirements.md`; `docs/references/audit-tooling.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

### [维度15-03] node lifecycle effect 的异步 dispatch 未使用 AbortController

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-renderer-effects.ts:85-107`
- **证据片段**:
  ```ts
  if (lifecycleActions?.onMount) {
    void latestHelpersRef.current.dispatch(lifecycleActions.onMount, {
      nodeInstance: input.nodeInstance,
    });
  }
  ```
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P5
- **现状**: `useNodeLifecycleActions()` 在 `useEffect` 中 fire-and-forget `dispatch` `onMount/onUnmount`，没有 `AbortController`，cleanup 也不取消在途任务。
- **风险**: 节点快速卸载/重绑时，旧 lifecycle action 仍可继续执行，造成重复副作用、过期请求和 dispose 后的无意义工作。
- **建议**: 每次 effect 建立独立 `AbortController`，把 `signal` 传给 `dispatch`，并在 cleanup 中 `abort()`；必要时再补 late-result guard。
- **为什么值得现在做**: 这是共享 `flux-react` 节点生命周期路径，所有声明 lifecycleActions 的 renderer 都受影响。
- **误报排除**: 不是猜测“也许会发网络请求”；`dispatch` 在仓库其他共享路径已支持 `signal`，这里正好命中 `async useEffect` 的强制约束。
- **历史模式对应**: 对应 `docs/analysis/2026-05-17-deep-audit-full/15-security-performance.md` 的 retained 15-07，当前仍然存活。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/references/audit-tooling.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度15-04] source-prop 控制器在实时 rerun 判定热路径上仍以 `JSON.stringify` 生成整对象变更键

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\node-source-prop-controller.ts:51-67,222-227`
- **证据片段**:
  ```ts
  function safeValueKey(value: unknown): string | undefined {
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  // ...
  entriesKey: createEntriesKey(sourceEntries),
  baseValueKey: safeValueKey(baseValue),
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P1
- **现状**: `createNodeSourcePropController().run(...)` 在每次 source-enabled props 刷新时，都会先重新收集 `sourceEntries`、构造 `baseValue`，再通过 `createEntriesKey(...)` 和 `safeValueKey(baseValue)` 对 entry 描述与整个去 source 后的 props 值做 `JSON.stringify`，把序列化结果作为是否跳过 rerun 的主判定键。该逻辑位于 React source-prop 的实时更新路径，而不是调试或离线预处理路径。
- **风险**: 这会把 props 图大小线性放大为主线程字符串构建与分配成本；当节点 props 较大、嵌套 source 较多或更新频繁时，会直接制造 render/update 抖动与 GC 压力。更糟的是，一旦值含循环引用或不可序列化结构，`safeValueKey()` 会退化为 `undefined`，既付出了 stringify 尝试成本，又把不同输入压扁到同一个空键，降低变更判定精度。
- **建议**: 改为显式、增量式的 change token：对 `sourceEntries` 使用稳定字段加引用比较，对 `baseValue` 使用 revision、version 或 path-level invalidation，而不是整对象 stringify。若确实需要结构签名，应在编译期或冷路径预生成稳定 token，避免在 controller 的 live rerun gate 上做深序列化。
- **为什么值得现在做**: 这是共享 `allowSource` 渲染链路上的热路径问题，一处修复可同时改善所有 source-enabled renderer；而且仓库在 2026-05-15 已经专门清理过同类 stringify 触发键，本处属于同类模式回流，越早收口越能避免后续性能回归继续扩散。
- **误报排除**: 这不是理论上可能慢。live code 明确在 `run(...)` 早退判定前执行 `JSON.stringify`；该路径不是测试代码、不是 dev-only instrumentation，也没有外层缓存把整对象序列化移出热路径。`docs/architecture/performance-design-requirements.md` 也已明确禁止热路径 full-graph stringify。
- **历史模式对应**: 对应 Plan 290 与 `docs/logs/2026/05-15.md` 里已收敛过的 source-prop rerun trigger 不应走 stringify hot path 同类模式，只是旧问题从 hook 依赖键转移到了 controller 的 rerun gate。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/renderer-runtime.md`; `docs/plans/290-deep-audit-2026-05-15-source-props-reactive-and-lifecycle-convergence-plan.md`; `docs/logs/2026/05-15.md`
- **复核状态**: 未复核

### [维度15-05] 匿名 source 在无 `stateKey` 时把失败折叠为 `undefined`，且缺少运行时级别可观测性

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\source-observer.ts:102-116,127-134`
- **证据片段**:
  ```ts
  valuePatch[entry.key] = actionResult.ok ? actionResult.data : undefined;
  if (entry.stateKey) {
    transientPatch[entry.stateKey] = buildResultState(actionResult);
  }
  // ...
  if (!(entry.key in valuePatch)) {
    valuePatch[entry.key] = undefined;
  }
  if (entry.stateKey && !(entry.stateKey in transientPatch)) {
    transientPatch[entry.stateKey] = { loading: false, error, status: 'error' };
  }
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P6
- **现状**: `createSourceObserver()` 在 source 执行失败时，无论是 `ActionResult.ok === false` 还是 promise reject，都会把对应值写成 `undefined`。只有当 entry 显式带有 `stateKey` 时，错误才会进入 `transientPatch`。如果 entry 没有 `stateKey`，运行时既不发布错误状态，也不记录诊断或监控信号，最终对外只剩一个看起来正常的 `undefined`。
- **风险**: 后端异常、鉴权失败、adaptor 错误、运行时执行异常都可能伪装成这个 source 合法地产生了 undefined 或空值，从而把真实故障降级成静默空态、错误分支未触发或 UI 误导。由于 `source-observer` 是共享匿名 source 基础设施，这种不可观测失败会扩散到所有未配置 `stateKey` 的 source-enabled props 与匿名 source 使用点。
- **建议**: 即使保留值通道上的 `undefined` 降级，也应补一个运行时级别的可观测失败出口，例如 runtime monitor 或 diagnostic hook、开发态告警、或基于 synthetic source key 的默认 transient error publication。并补回归测试，覆盖 `ok:false` 且无 `stateKey` 与 promise reject 且无 `stateKey` 两条路径。
- **为什么值得现在做**: 这是共享 observer 层的一处缺口；一旦补上，所有匿名 source 都能立即获得最低限度的失败可诊断性，避免后续在各 renderer/field 上重复排查为何数据神秘变空的局部补丁。
- **误报排除**: 这不是建立在调用方理应总传 `stateKey` 的假设上。live code 已证明 `stateKey` 是可选的，且所有错误发布都被 `if (entry.stateKey)` 条件保护；文件中也不存在任何 fallback 日志、monitor 上报或全局错误通道。根据 `api-data-source` 文档，source 生命周期本就应由 runtime 统一拥有，因此这里的静默失败是共享运行时缺口，不是调用方选择。
- **历史模式对应**: 对应仓库已沉淀的 async error diagnosability and swallowed failures 历史模式：异步失败被内部吞掉，只留下表面上可继续运行的降级结果。
- **参考文档**: `docs/architecture/api-data-source.md`; `docs/architecture/flux-runtime-module-boundaries.md`; `docs/architecture/performance-design-requirements.md`; `docs/references/audit-rules/async-error-diagnosability-and-swallowed-failures.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度15-06] `stopWhen` 对 null 或 undefined 成员访问错误静默降级为继续轮询

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\api-data-source-controller-state.ts:137-145`
- **证据片段**:
  ```ts
  } catch (error) {
    if (
      error instanceof Error &&
      error.cause instanceof Error &&
      error.cause.message === 'Cannot access member of null or undefined'
    ) {
      return false;
    }
    updateControllerState(input, mutable, (current) => toStopConditionErrorState(current, error));
  ```
- **严重程度**: P1
- **类别**: 安全
- **规则编号**: R3
- **现状**: `evaluateControllerStopCondition()` 在 `stopWhen` 求值失败时，本应进入 `toStopConditionErrorState(...)` 并走 `reportRuntimeHostIssue(...)`；但对 `error.cause.message === 'Cannot access member of null or undefined'` 做了特判，直接 `return false`。而该返回值在 `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:137-139,269-271,327-329` 会被解释为不要停止，因此 polling 会继续。
- **风险**: 一旦 `stopWhen` 依赖的 payload 或 status 路径暂时为空、结构变化或响应缺字段，真实的表达式错误会被伪装成条件尚未满足，导致数据源持续轮询、重复发请求、维持表面正常状态且不进入错误通道。结果是错误不可观测、轮询无法按契约终止，并把前端或后端负载问题放大成生产期隐性资源消耗。
- **建议**: 删除这条基于错误文案的静默降级分支，统一按 stop-condition failure 处理：写入 error state、上报 host issue，并停止后续 polling。若确需兼容缺值即未满足的语义，应在表达式层提供显式 null-safe 写法或编译期约束，而不是在 runtime 里靠字符串匹配吞错；同时补回归测试覆盖该精确错误分支。
- **为什么值得现在做**: 这是 runtime-owned polling stop gate 的共享路径，修复点非常集中，但能一次性提升所有 data-source 轮询的失效可见性与停机安全性，避免后续把为什么一直轮询排查成分散的 schema 或后端偶发现象。
- **误报排除**: 这不是与通用 `stopWhen` 抛错分支重复。现有测试 `packages/flux-runtime/src/__tests__/request-runtime-polling.test.ts:48-91` 只覆盖了 `runtime.evaluate` 抛出普通 `Error('stopWhen exploded')` 时会通知并停止；并未覆盖这里的特判分支。且 `packages/flux-formula/src/evaluator.ts:238` 实际会构造 `Cannot access member of null or undefined`，说明这不是假设路径，而是 live evaluator 的稳定可达错误形态。
- **历史模式对应**: 与本文件已记录的 `[维度15-05]` 同属 runtime-owned async failure 被降级成看似正常继续运行的模式；这里只是把失败折叠成 `stopWhen === false`。
- **参考文档**: `docs/architecture/api-data-source.md`; `docs/references/audit-rules/async-error-diagnosability-and-swallowed-failures.md`; `docs/architecture/security-design-requirements.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度15-01]: 降级。live code 确有空 `catch {}`，但主 action 失败并未被吞掉；问题集中在次级诊断钩子自失败时缺少回退遥测，更像 observability 加固项，不宜维持原级别。
- [维度15-02]: 降级。live code 的确在复用 `pending` import 失败时先清 `pending` 再重试，joiner 路径会丢失该次结构化失败；但发起方失败路径仍会在主安装链路上报，实际影响更窄。
- [维度15-03]: 保留 (P3)。`packages/flux-react/src/node-renderer-effects.ts` 的 `useEffect` 或 cleanup 中 `dispatch(...)` 仍是 fire-and-forget，未传 `signal`、未用 `AbortController`，与 `performance-design-requirements.md` 的 P5 现行要求直接冲突。
- [维度15-04]: 保留 (P2)。`packages/flux-react/src/node-source-prop-controller.ts` 仍在 live rerun gate 上对 `sourceEntries` 和 `baseValue` 做 `JSON.stringify`，命中当前 P1 或 P6 热路径禁令，属真实回流。
- [维度15-05]: 降级。无 `stateKey` 时失败确会塌缩成 `undefined` 且无 host 级上报；但当前文档也把匿名 source 的状态面主要收敛在可选 `sourceStateKey`，这是 observability 缺口，但不足以按原强度保留。
- [维度15-06]: 保留 (P1)。`packages/flux-runtime/src/async-data/api-data-source-controller-state.ts` 对 `Cannot access member of null or undefined` 特判后直接返回 `false`，会继续 polling 且不进 error 或 reporting 通道，和当前文档与既有测试基线相悖。

## 子项复核结论

- [维度15-01]:
  - `onActionError`: 降级。`onActionError` 属于 diagnostics 或 tooling handoff；当前空 `catch {}` 不会吞掉主 action 失败，但确实留下诊断回调自失败后无 fallback telemetry 的轻度可观测性缺口。
  - `pluginOnError`: 驳回。`RendererPlugin.onError` 的契约本身就是 best-effort 诊断扩展，不宜继续按仓库级 retained finding 保留。
  - `reportActionEnd`: 驳回。`monitor.onActionEnd` 只会丢失一条 end telemetry，不构成本项所指的 action failure fail-open 问题。
  - overall retained residual: 仅剩 `onActionError` 宿主诊断回调自失败后缺少回退遥测的低强度可观测性残余。
- [维度15-05]: 驳回 rejected 分支批量写 `undefined` 本身是独立 correctness defect 这一更具体子指控；仅保留无 `stateKey` 的匿名 source 失败静默折叠为 `undefined`、缺少最小运行时诊断出口这一 observability 残余。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                               | 一句话摘要                                             |
| ----- | -------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 15-01 | P3       | `packages/flux-action-core/src/action-dispatcher/action-execution.ts:82-99`        | `onActionError` 自失败时缺少回退遥测                   |
| 15-02 | P3       | `packages/flux-runtime/src/import-stack.ts:117-123`                                | joiner 路径会丢失一次 pending import 失败的结构化记录  |
| 15-03 | P3       | `packages/flux-react/src/node-renderer-effects.ts:85-107`                          | node lifecycle async dispatch 未贯穿 `AbortController` |
| 15-04 | P2       | `packages/flux-react/src/node-source-prop-controller.ts:51-67,222-227`             | live rerun gate 仍使用 `JSON.stringify`                |
| 15-05 | P3       | `packages/flux-runtime/src/async-data/source-observer.ts:102-116,127-134`          | 无 `stateKey` 的匿名 source 失败缺少最小运行时诊断出口 |
| 15-06 | P1       | `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:137-145` | `stopWhen` 的 null-member 错误会静默继续 polling       |
