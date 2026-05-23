# 07 Lifecycle

- 深挖轮次: 1
- 深挖发现数: 1

## 第 1 轮初审

### [维度07-01] source-enabled props 的匿名 source 生命周期仍由 React hook/controller 直接拥有

- **文件**: `packages/flux-react/src/use-node-source-props.ts:43-76`; `packages/flux-react/src/node-source-prop-controller.ts:137-184`
- **行号范围**: `packages/flux-react/src/use-node-source-props.ts:43-76`
- **证据片段**:

  ```ts
  const [controller] = useState(() => createNodeSourcePropController(node, runtime));

  useEffect(() => {
    if (!hasSourceProps) return;
    controller.run(propsValueRef.current, scopeRef.current);
  }, [controller, hasSourceProps, sourceInputs]);

  useEffect(() => {
    return () => {
      controller.dispose();
    };
  }, [controller]);
  ```

- **严重程度**: P2
- **effect 职责**: 在 React effect 中启动 source-enabled prop 的匿名 source 执行，并在 cleanup 中 dispose 对应 controller。
- **应归属层级**: runtime 层拥有 source execution / invalidation / transient state；React 层只应 mount、subscribe、dispose 已由 runtime-owned source entry 暴露的生命周期。
- **现状**: `useNodeSourceProps()` 在 React hook 内创建 `NodeSourcePropController`，再由 effect 直接调用 `controller.run(...)` 和 `controller.dispose()`；controller 内部再创建 `runtime.createSourceObserver()` 并维护 loading/value/error snapshot。`docs/architecture/api-data-source.md` 已明确 source-enabled props 是同一套 anonymous source model，React-side helpers 不应成为第二套 controller family。
- **风险**: source-enabled props 与命名 `data-source` 的 runtime-owned registry 生命周期继续分裂，后续在取消、status 订阅、debug snapshot、scope dispose、polling/retry/invalidations 等路径上容易出现两套治理口径；这也会误导后续 renderer 作者把 source 生命周期继续放进 React hook，而不是进入 runtime substrate。
- **建议**: 按 `docs/plans/231-source-substrate-and-code-editor-convergence-plan.md` Phase 2 收敛：在 `flux-runtime` 提供匿名 source entry/snapshot 支撑，使 `useNodeSourceProps()` 退化为订阅 runtime-owned entry 的 host wiring；保留 `sourceStateKey` 作为窄 transient state 输出，不再由 React controller 自行管理 source semantic state。
- **为什么值得现在做**: 这是当前 owner docs 与 live code 明确对齐失败的 lifecycle ownership residual，且已有计划把它列为目标；先收敛这一处能避免新 renderer 继续复制 React-owned source controller 模式。
- **误报排除**: 这不是已驳回的 `DataSourceRenderer registration lifecycle in React effect`，后者只是 null renderer 在 mount/unmount 时注册 runtime-owned data-source entry；本项是 React hook/controller 自己维护 anonymous source 的 run/snapshot/dispose 语义。也不是 NodeRenderer prepared-import render-phase side effect、plan 211/223/229 已修项。
- **历史模式对应**: “DataSource 轮询/缓存/去重曾放在 React effect 中，后移入 flux-runtime”的同族 lifecycle ownership 问题；当前 residual 是 source-enabled props 的匿名 source substrate 尚未完成 runtime-owner 收敛。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/api-data-source.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/plans/231-source-substrate-and-code-editor-convergence-plan.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度07-02] `useSourceValue` 导出的匿名 source hook 仍由 React effect 直接驱动 run/dispose

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\use-source-value.ts:25-45`
- **行号范围**: `25-45`
- **证据片段**:

  ```ts
  const [observer] = useState<SourceObserver>(() => runtime.createSourceObserver());
  const snapshot = useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot,
    observer.getSnapshot,
  );

  useEffect(() => {
    if (!source) {
      observer.run({ scope, entries: [], baseValue: { value: input as T | undefined } });
      return;
    }

    observer.run({
      scope,
      entries: [{ key: 'value', source, stateKey: 'sourceState' }],
      baseValue: {},
    });
  }, [input, observer, scope, source]);
  ```

- **严重程度**: P2
- **effect 职责**: 在 React hook 中创建 source observer，并通过 effect 直接启动匿名 source 执行与卸载 dispose。
- **应归属层级**: runtime 层拥有 anonymous source entry / snapshot / invalidation；React 层只应订阅 runtime-owned entry。
- **现状**: 第 1 轮已覆盖 `useNodeSourceProps()` / `NodeSourcePropController`，但导出的 `useSourceValue()` 仍保留同族 residual：React hook 自行持有 observer、触发 `observer.run(...)`、并在 cleanup 中 `observer.dispose()`。`docs/plans/231-source-substrate-and-code-editor-convergence-plan.md:19,84-86` 也明确把 `use-source-value.ts` 列为仍需收敛的 React-owned anonymous source state。
- **风险**: 对外导出的 hook 会继续传播“source 生命周期可由 React hook/controller 直接拥有”的模式，和 source-enabled props 的 runtime-owned substrate 收敛目标分叉；后续重试、debug snapshot、scope disposal、status 订阅等能力容易在 `useNodeSourceProps` 与 `useSourceValue` 两条路径继续不一致。
- **建议**: 与第 1 轮 source-enabled props residual 同步处理：在 `flux-runtime` 提供 runtime-owned anonymous source entry/snapshot 支撑，让 `useSourceValue()` 退化为 mount/subscribe/dispose host wiring，不再直接拥有 run/snapshot 语义。
- **为什么值得现在做**: 这是同一 owner residual 的公开 hook 入口；若只修 `useNodeSourceProps()` 而保留 `useSourceValue()`，新的 renderer/host 仍可能继续复制 React-owned source controller 模式。
- **误报排除**: 这不是已驳回的 `DataSourceRenderer` 注册 lifecycle；本项不是简单注册 runtime-owned entry，而是 React hook 自己驱动 anonymous source observer 的执行状态。也不是 DynamicRenderer 一次性 schema load 的历史驳回项。
- **历史模式对应**: “DataSource 轮询/缓存/去重曾放在 React effect 中，后移入 flux-runtime”的同族 lifecycle ownership residual。
- **参考文档**: `docs/architecture/renderer-runtime.md:149`; `docs/architecture/api-data-source.md:17-22`; `docs/plans/231-source-substrate-and-code-editor-convergence-plan.md:19,84-86`
- **复核状态**: 未复核

### [维度07-03] request runtime 给父 AbortSignal 添加 listener 后请求完成不移除，长生命周期 signal 可累积闭包

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\async-data\request-runtime.ts:366-396`
- **行号范围**: `366-396`
- **证据片段**:

  ```ts
  const controller = new AbortController();
  if (options?.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      options.signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  const requestPromise = env.fetcher<T>(executableApi, {
  ```

  ```ts
  try {
    return await requestPromise;
  } finally {
    if (activeControllers.get(requestKey) === controller) {
      activeControllers.delete(requestKey);
    }
    if (activePromises.get(requestKey) === requestPromise) {
      activePromises.delete(requestKey);
    }
  }
  ```

- **严重程度**: P2
- **effect 职责**: 非 React effect，但属于 runtime lifecycle cleanup：把外部 `AbortSignal` 桥接到 request-local `AbortController`。
- **应归属层级**: runtime 层应完整拥有 request listener cleanup；父 signal 监听器应在请求 settle 时解除。
- **现状**: `executeApiRequest()` 对 `options.signal` 调用 `addEventListener('abort', () => controller.abort(), { once: true })`，但 `finally` 只清理 `activeControllers` / `activePromises`，没有保存 handler 并 `removeEventListener`。如果父 signal 长期不 abort、但被用于多次请求，已完成请求的 listener 会一直挂在父 signal 上并持有对应 controller 闭包。
- **风险**: 长生命周期 action/form/source signal 复用或高频请求场景下，父 signal 上会累积无效 abort listener，形成内存/闭包泄漏；未来如果父 signal 最终 abort，还会批量触发大量已完成请求的 stale controller abort。
- **建议**: 保存 abort handler 引用，在 request `finally` 中移除；可参考 `operation-control.ts` 中 timeout / retry helper 的 cleanup 模式，确保成功、失败、取消路径都释放父 signal listener。
- **为什么值得现在做**: 该路径是 runtime request substrate，覆盖 action/source/data-source/form 等远程调用；单点 cleanup 缺口会被多个上层入口放大。
- **误报排除**: 这不是 React 层本应持有的 DOM listener，也不是 `{ once: true }` 已自动解决的情况；`once` 只在父 signal abort 时移除，不能清理已经正常完成但父 signal 未 abort 的请求监听器。
- **历史模式对应**: request/data-source 生命周期从 React effect 收敛到 runtime 后，runtime 内部仍需对 listener/timer/subscription 做 owner-level cleanup 的残留问题。
- **参考文档**: `docs/architecture/api-data-source.md:199-215`; `docs/skills/deep-audit-prompts.md:989-992`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度07-04] runtime-owned ActionScope 缺少 scope-level cleanup，runtime.dispose 只清空集合不释放已注册 namespace provider

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\runtime-factory.ts:151-159,501-507`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-scope.ts:48-62`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\use-node-scopes.ts:59-63`
- **行号范围**: `runtime-factory.ts:151-159,501-507`; `action-scope.ts:48-62`; `use-node-scopes.ts:59-63`
- **证据片段**:

  ```ts
  function createOwnedActionScope(scopeInput: { id?: string; parent?: ActionScope } = {}) {
    actionScopeCounter += 1;
    const actionScope = createActionScope({
      id: scopeInput.id ?? `action-scope-${actionScopeCounter}`,
      parent: scopeInput.parent,
    });

    ownedActionScopes.add(actionScope);
    return actionScope;
  }
  ```

  ```ts
  registerNamespace(namespace, provider) {
    const existing = namespaces.get(namespace);

    if (existing && existing !== provider) {
      existing.dispose?.();
    }

    namespaces.set(namespace, provider);
  ```

  ```ts
  ownedActionScopes.clear();
  executeApiRequest.dispose?.();
  ```

- **严重程度**: P2
- **effect 职责**: 非 React effect 本身，而是 runtime lifecycle cleanup：`RendererRuntime` 创建并追踪 `ActionScope` 后，需要在 runtime/node owner 生命周期结束时释放其中的 namespace provider。
- **应归属层级**: runtime 层。`ActionScope` 由 `runtime.createActionScope()` 创建并加入 `ownedActionScopes`，其 namespace provider 的 dispose 也应由 runtime-owned scope lifecycle 兜底，而不是完全依赖 React 层每个注册点都正确 cleanup。
- **现状**: `createOwnedActionScope()` 把每个 runtime-owned `ActionScope` 放入 `ownedActionScopes`，但 `runtime.dispose()` 只把这些 scope 传给 `importManager.dispose(...)` 后直接 `ownedActionScopes.clear()`，没有遍历 `listNamespaces()` / `unregisterNamespace()`，也没有 ActionScope 自身的 `dispose()`。同时 `useNodeScopes()` 只 cleanup node-owned component registry，没有对应 cleanup node-owned action scope；如果某个 host/action provider 仍挂在该 scope 上，runtime/node lifecycle 结束时缺少 scope-level 兜底释放。
- **风险**: 长生命周期 runtime 中反复挂载/卸载 `actionScopePolicy: 'new'` 的 domain-host renderer（如 designer / spreadsheet / report / word editor）时，runtime 的 `ownedActionScopes` 可持续持有已不再活跃的 scope；若 provider cleanup 因异常、条件切换或非 React 调用路径遗漏，provider 的闭包、bridge、store、外部资源会滞留到整个 runtime dispose，且 runtime dispose 本身也不会调用 provider.dispose。
- **建议**: 给 runtime-owned `ActionScope` 增加明确的 dispose 路径：例如在 `createActionScope()` 返回对象上提供 `dispose()`，内部遍历 namespace 并调用 `unregisterNamespace()`；`runtime.dispose()` 对所有 `ownedActionScopes` 调用 dispose；`useNodeScopes()` 在 node-owned action scope cleanup 时同时 unregister/dispose 并从 runtime tracking 中移除，避免仅到 root runtime dispose 才清空。
- **为什么值得现在做**: 这是低成本的 lifecycle ownership closure，且命中当前 runtime 公开承诺“runtime owners must expose explicit teardown for long-lived resources”。ActionScope 是 host capability 的核心边界，越早补上 scope-level cleanup，越能避免各 host renderer 继续依赖分散的 React effect cleanup 作为唯一释放机制。
- **误报排除**: 这不是已裁定的 `NodeRenderer` prepared-import render-phase side effect 旧问题；本项不涉及 render-phase mutation，而是 runtime-owned `ActionScope` 的 cleanup 缺失。也不是单个 renderer 的局部 provider 注册问题，因为 runtime 已集中追踪 `ownedActionScopes`，却没有对应集中释放 namespace provider 的语义。
- **历史模式对应**: 与“React 层注册/cleanup 抢 runtime ownership”同族，但这里是 runtime 已经接管创建和追踪后，缺少 owner-level dispose 兜底，类似此前 data-source/source/reaction 生命周期从 React effect 收敛到 runtime 后仍需补齐 listener/provider cleanup 的残留。
- **参考文档**: `C:\can\nop\nop-chaos-flux\docs\architecture\renderer-runtime.md:57`, `C:\can\nop\nop-chaos-flux\docs\architecture\renderer-runtime.md:831-843`, `C:\can\nop\nop-chaos-flux\docs\references\reopened-design-decisions-and-audit-adjudications.md:50-60`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度07-05] `ImportStack.installPrepared/push` 在多 import 边界部分安装失败时缺少 rollback，已注册 namespace provider 会滞留

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\import-stack.ts:379-423`; `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\import-stack.ts:427-440`
- **行号范围**: `379-423`, `427-440`
- **证据片段**:

  ```ts
  const providerResult = module.createNamespace(context);
  const helpersResult = module.createExpressionHelpers?.(context);

  if (providerResult instanceof Promise || helpersResult instanceof Promise) {
    const error = createImportError(
      `Prepared import ${prepared.spec.as} must install synchronously at render time.`,
    );
    notifyImportFailure(error, prepared.spec);
    throw error;
  }
  ```

  ```ts
  if (args.actionScope) {
    releaseMap.set(
      buildPreparedFrameEntryKey(prepared),
      args.actionScope.registerNamespace(prepared.spec.as, wrappedProvider),
    );
  }

  entries[prepared.spec.as] = {
  ```

  ```ts
  const frame: InternalImportFrame = {
    id: frameId,
    ownerNodeId: args.ownerNodeId,
    parentFrameId: args.parentFrame?.id,
    parentFrame: args.parentFrame,
    actionScope: args.actionScope,
    entries,
    releaseMap,
    controllerMap,
  };

  framesById.set(frameId, frame);
  ```

- **严重程度**: P1
- **effect 职责**: import-owned namespace provider 的安装与释放；由 `NodeRenderer` layout effect 触发，但实际生命周期资源属于 runtime/import stack。
- **应归属层级**: runtime 层。`ImportStack` 既然集中注册 provider 并维护 `releaseMap`，也应在 frame 安装失败时集中 rollback。
- **现状**: `installPrepared()` / `push()` 在循环内逐个 `registerNamespace()`，但 frame 只有在整个循环完成后才写入 `framesById`。如果第 N 个 import 的 `createNamespace()`、`createExpressionHelpers()`、同步性检查、缺失 module、alias collision 等路径抛错，前面已注册的 namespace release 函数只存在于局部 `releaseMap`，不会进入 `pop()`，也不会被 layout-effect cleanup 释放。
- **风险**: 一个失败的 `xui:imports` 边界可能把部分 namespace provider 留在 `ActionScope` 中；后续 sibling/descendant action 解析会看到本应安装失败的 provider，provider 持有的 bridge/store/外部资源也会泄漏。该问题跨过 React 错误边界，因为失败发生在 runtime 安装过程中，React cleanup 没有 frame id 可 pop。
- **建议**: 在 `push()` / `installPrepared()` 中对 frame 构建过程加 rollback：一旦循环中任何步骤失败，遍历当前 `releaseMap` 调用 release，abort/clear `controllerMap`，然后再 rethrow；或先构造完整 provider，再一次性 commit 注册。为 prepared 与 async push 两条路径共享同一 rollback helper。
- **为什么值得现在做**: import namespace 是 action capability 边界；部分安装失败会直接污染 action resolution，比单纯内存泄漏更容易产生错误行为。
- **误报排除**: 这不是 reopened 裁定中的 `NodeRenderer` prepared-import render-phase side effect 旧问题；当前安装已在 layout effect 中执行。本项是 runtime import stack 对“部分安装失败”缺少 provider rollback 的新 residual。也不同于 `[维度07-04]` 的 runtime.dispose 未释放 ActionScope provider；这里即使 runtime 最终可 dispose，失败 frame 在当下已没有可追踪 frame 记录可供正常 cleanup。
- **历史模式对应**: runtime lifecycle resource 安装过程中缺少失败 rollback，导致部分注册资源脱离 owner tracking。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

### [维度07-06] `RenderNodes` 在 render/useMemo 阶段写入模块级 fragment scope cache，pre-commit abort 时 cleanup 不会运行

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\render-nodes.tsx:93-104`; `C:\can\nop\nop-chaos-flux\packages\flux-react\src\render-nodes.tsx:244-294`
- **行号范围**: `93-104`, `244-294`
- **证据片段**:

  ```ts
  const fragmentScopeCacheByRuntime = new WeakMap<
    RendererRuntime,
    Map<string, FragmentScopeCacheEntry>
  >();

  function getFragmentScopeCache(runtime: RendererRuntime): Map<string, FragmentScopeCacheEntry> {
    let cache = fragmentScopeCacheByRuntime.get(runtime);

    if (!cache) {
      cache = new Map();
      fragmentScopeCacheByRuntime.set(runtime, cache);
  ```

  ```ts
  const fragmentScope = useMemo(() => {
    if (!shouldUseFragmentScope || !fragmentBindings) {
      return undefined;
    }

    const fragmentScopeCache = getFragmentScopeCache(runtime);
    const cachedFragmentScope = fragmentScopeCache.get(fragmentScopeCacheKey);
  ```

  ```ts
    const scope = runtime.createChildScope(currentScope, fragmentBindings, {
      isolate,
      pathSuffix,
      scopeKey,
      source: 'fragment',
    });

    fragmentScopeCache.set(fragmentScopeCacheKey, {
      scope,
      parent: currentScope,
      runtime,
      isolate,
  ```

  ```ts
  useEffect(() => {
    return () => {
      getFragmentScopeCache(runtime).delete(fragmentScopeCacheKey);
    };
  }, [fragmentScopeCacheKey, runtime]);
  ```

- **严重程度**: P2
- **effect 职责**: fragment child scope 的 cache 注册与卸载清理。
- **应归属层级**: React 层可以创建 fragment render scope，但持久 cache 写入/释放必须 commit-safe；runtime-owned scope 资源也需要明确生命周期边界。
- **现状**: `RenderNodes` 在 `useMemo` 计算期间调用 `getFragmentScopeCache(runtime)` 并 `fragmentScopeCache.set(...)`，这是 render 阶段对模块级 WeakMap/Map 的外部写入；对应删除只在 `useEffect` cleanup 中发生。如果 React concurrent render、错误恢复、Suspense/throw 等导致本次 render 未 commit，cleanup effect 不会安装，已写入的 cache entry 会挂在 runtime 对应的 Map 下。
- **风险**: 被放弃的 render 会遗留 fragment scope/cache entry，直到整个 runtime 释放；高频动态 fragment、列表/表格 region 或错误重试场景下会积累 stale ScopeRef/store 闭包。更重要的是它重新引入了“render 阶段修改外部运行时结构”的模式，靠近历史 `RenderNodes` render-phase `setSnapshot()` bug 的问题边界。
- **建议**: 避免在 render/useMemo 中写模块级 cache。可将 cache 改为组件实例本地 ref/state（未 commit 的实例随 React 丢弃而 GC），或拆成 render 阶段纯创建 + layout/effect commit 注册，并在替换/卸载时显式释放旧 scope 相关 runtime 资源。若必须保留 runtime 级 cache，应提供 commit-safe acquire/release API，保证未 commit render 不会持久登记。
- **为什么值得现在做**: `RenderNodes` 是所有 fragment/region 渲染的共享入口；这里的 render-phase 外部写入会被普通 renderer 的 `regions.render({ bindings })` 放大。
- **误报排除**: 这不是已裁定的 `NodeRenderer` prepared-import render-phase side effect；也不是已修的旧 `RenderNodes` render 阶段 `store.setSnapshot()`。本项没有在 render 中写 scope 数据，但仍在 render/useMemo 中修改模块级生命周期 cache，且 cleanup 依赖 commit 后 effect，属于新的 pre-commit cleanup 缺口。
- **历史模式对应**: render phase external mutation + commit-only cleanup 的 lifecycle hazard。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

未发现新的问题。深挖结束。

## 维度复核结论

- [维度07-01] 保留：live code 仍由 `useNodeSourceProps`/`NodeSourcePropController` 在 React hook/controller 中创建 observer、驱动 `run` 并 `dispose`；与当前 source lifecycle runtime-owned 文档目标和计划 231 Phase 2 residual 对齐，维持 P2。
- [维度07-02] 保留：`useSourceValue` 当前仍在 React hook 内持有 `SourceObserver`，由 effect 直接 `observer.run(...)`/cleanup `dispose()`；与 07-01 同族且计划 231 明确列为待收敛项，维持 P2。
- [维度07-03] 保留：`executeApiRequest` 对父 `AbortSignal` 添加 `{ once: true }` listener 后，请求 settle 的 `finally` 未移除未触发 listener；长生命周期 signal 复用时闭包可累积，维持 P2。
- [维度07-04] 保留：runtime 确实追踪 `ownedActionScopes`，但 `ActionScope` 无 scope-level dispose，`runtime.dispose()` 仅通过 import stack 释放 import frame，未兜底遍历释放普通 namespace provider；node-owned action scope 也无对应 cleanup，维持 P2。
- [维度07-05] 保留：`ImportStack.installPrepared/push` 在循环内逐项注册 namespace，但 frame 只有全部成功后才进入 tracking；后续 import 失败会留下前序已注册 provider，无 rollback，维持 P1。
- [维度07-06] 保留：`RenderNodes` 仍在 `useMemo`/render 期间写入模块级 runtime cache，并依赖 commit 后 effect cleanup；pre-commit abort 时 cache entry 无清理路径，维持 P2。

需子项复核：维度07-05 必须逐项复核；维度07-01、07-02、07-04、07-06 建议在进入修复计划前按同族 lifecycle ownership 批量复核。

## 子项复核结论

- [维度07-05] 保留：`ImportStack.push()`/`installPrepared()` 仍在 frame commit 前逐项注册 namespace，后续 import 失败时没有 rollback 已注册 provider。
- [维度07-01] 保留：`useNodeSourceProps()`/`NodeSourcePropController` 仍由 React hook/controller 直接拥有 anonymous source run/snapshot/dispose 语义。
- [维度07-02] 保留：导出的 `useSourceValue()` 仍在 React hook 内创建 `SourceObserver` 并由 effect 驱动 `run()`/`dispose()`。
- [维度07-04] 保留：runtime 仍追踪 `ownedActionScopes` 但 `ActionScope` 没有 scope-level dispose，runtime/node owner lifecycle 缺少 namespace provider 兜底释放。
- [维度07-06] 保留：`RenderNodes` 仍在 render/useMemo 阶段写入模块级 fragment scope cache，pre-commit abort 时 effect cleanup 不会安装。

最终进入汇总：07-05、07-01、07-02、07-04、07-06。
