# Stage-1 Full Findings: Dimensions 06-10

> 状态：第 1 轮初审条目重建稿。内容来自 live repo 复查，用于补救早期维度文件只保留一句话摘要的问题；最终结论仍需与第 2-5 轮 raw findings 合并后重新独立复核。

## 维度 06：异步模式与取消安全

### [维度06-01] Schema import preload 未把 `AbortSignal` 传到底层 prepare/import loader

- **文件**: `packages/flux-react/src/schema-renderer.tsx:299-352`
- **证据片段**:

  ```ts
  const { signal } = controller;

  void prepare(props.schema, {
    schemaUrl: props.schemaUrl,
  })
    .then((result) => {
      if (signal.aborted || prepareRequestIdRef.current !== requestId) {
        return;
      }
      setPreparedImports(result.preparedImports);
  ```

- **严重程度**: P2
- **现状**: local `AbortController` 创建后只在 prepare resolve/reject 后检查，signal 未传入 `runtime.prepareSchema`。
- **风险**: schema replacement/unmount 后 import preload 与底层 `importLoader` 仍可能继续执行，浪费网络/CPU，并与新 schema prepare 竞争。
- **建议**: 扩展 `prepareSchema`/compiler import preload API 接收 `AbortSignal`，并向 import resolution/loading 传递。
- **误报排除**: stale guard 能防止 React setState，但不能取消底层 async import work。
- **复核结论**: 保留 P2。

### [维度06-02] Report Designer field source refresh 缺少局部 stale guard

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:272-279`
- **证据片段**:
  ```ts
  useEffect(() => {
    void core.refreshFieldSources().catch((error) => {
      env.notify?.(
        'warning',
        error instanceof Error && error.message
          ? error.message
          : t('flux.reportDesigner.loadPanelsFailed'),
      );
    });
  }, [core, env]);
  ```
- **严重程度**: P3
- **现状**: effect 启动 `core.refreshFieldSources()` 并在失败时 notify，但没有 request id、mounted flag 或 abort/stale guard。
- **风险**: 旧 core 的失败可能在 renderer 切到新 core/config 后仍弹出 warning。
- **建议**: 在 effect cleanup 中设置 stale flag/request id，notify 前检查。
- **误报排除**: core disposal 可能减少 state mutation，但当前 React effect 的 warning publication 未受保护。
- **复核结论**: 保留 P3。

### [维度06-03] Flow Designer auto-layout cleanup 未使 pending request id 失效

- **文件**: `packages/flow-designer-renderers/src/use-designer-auto-layout.ts:123-135`
- **证据片段**:

  ```ts
  .finally(() => {
    if (layoutRequestRef.current === requestId) {
      setLayoutBusy(false);
    }
  });
  }, [config.documentMode, core]);

  useEffect(() => {
    const elkOwner = elkOwnerRef.current;

    return () => {
      elkOwner.invalidate();
    };
  ```

- **严重程度**: P2
- **现状**: async layout completion 用 `layoutRequestRef` 判断是否 setState；unmount cleanup 只 invalidate ELK owner，未 bump/invalidate `layoutRequestRef`。
- **风险**: pending layout promise 在 unmount 后仍可能通过 request-id check 并尝试 React state update。
- **建议**: cleanup 中递增/失效 `layoutRequestRef.current`，或添加 mounted guard。
- **误报排除**: `elkOwner.invalidate()` 不会让 React request id stale。
- **复核结论**: 保留 P2。

### [维度06-04] Flow Designer create dialog failure 缺用户可见反馈

- **文件**: `packages/flow-designer-renderers/src/designer-page-body.tsx:185-199`, `431-437`
- **证据片段**:
  ```tsx
  onClick={() => {
    handleConfirmCreateDialog().catch((error) => {
      console.warn('[flow-designer] create dialog confirm failed', error);
    });
  }}
  disabled={creatingNode}
  ```
- **严重程度**: P2
- **现状**: create operation rejected 时仅 `console.warn`；non-ok result 也没有明确用户反馈。
- **风险**: 用户无法知道节点创建失败原因；host/runtime failure 只进开发者控制台。
- **建议**: 通过 `reportHostIssue`、`env.notify` 或 dialog-local error state 报告失败。
- **误报排除**: Promise 已 catch，因此不是 unhandled rejection；问题是用户反馈与可观测性。
- **复核结论**: 保留 P2。

## 维度 07：生命周期与副作用归属

### [维度07-01] anonymous source lifecycle 边界仍偏 React-owned

- **文件**: `packages/flux-react/src/use-node-source-props.ts:43-75`
- **证据片段**:

  ```ts
  useEffect(() => {
    if (!hasSourceProps) return;
    controller.run(propsValueRef.current, scopeRef.current);
  }, [controller, hasSourceProps, sourceInputs]);

  useEffect(() => {
    return () => {
      controller.dispose();
    };
  ```

- **严重程度**: P3
- **现状**: source props controller/observer lifecycle 由 React effects 触发 run/dispose。
- **风险**: anonymous nested source props 的 ownership 分裂在 React mount semantics 与 runtime source observer semantics 之间，生命周期推理成本高。
- **建议**: 尽量 runtime-owned source prop lifecycle，或明确文档化该 React-owned boundary。
- **误报排除**: 不是缺 cleanup；cleanup 存在，保留问题是 ownership boundary clarity。
- **复核结论**: 降级保留 P3。

### [维度07-02] `useSourceValue` lifecycle wiring 与当前 observer design 一致

- **文件**: `packages/flux-react/src/use-source-value.ts:25-45`
- **证据片段**:

  ```ts
  const [observer] = useState<SourceObserver>(() => runtime.createSourceObserver());
  const snapshot = useSyncExternalStore(observer.subscribe, observer.getSnapshot, observer.getSnapshot);

  useEffect(() => {
    if (!source) {
      observer.run({ scope, entries: [], baseValue: { value: input as T | undefined } });
      return;
    }

    observer.run({
  ```

- **严重程度**: 无
- **现状**: hook 创建 runtime `SourceObserver`，通过 `useSyncExternalStore` 订阅，在 effect 中 run，unmount dispose。
- **风险**: 无保留缺陷。
- **建议**: 不跟踪代码变更。
- **误报排除**: 模式符合当前 source observer design：React 拥有 hook mount/unmount，runtime observer 拥有 execution/cancellation internals。
- **复核结论**: 驳回。

### [维度07-03] parent `AbortSignal` listener 在请求正常结束后不移除

- **文件**: `packages/flux-runtime/src/async-data/request-runtime.ts:366-372`
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
  ```
- **严重程度**: P3
- **现状**: parent abort listener 以 `{ once: true }` 注册，但匿名 listener 在请求正常 settle 后不会移除。
- **风险**: long-lived parent signal 可保留已完成 request controller/listener，直到 parent abort 或 GC。
- **建议**: 保存 listener，并在 request `finally` 中 remove。
- **误报排除**: `{ once: true }` 只在 abort 触发时移除，不处理 successful completion。
- **复核结论**: 保留 P3。

### [维度07-04] `ActionScope` 缺少 scope-level dispose

- **文件**: `packages/flux-runtime/src/action-scope.ts:44-88`
- **证据片段**:

  ```ts
  unregisterNamespace(namespace) {
    const provider = namespaces.get(namespace);

    if (!provider) {
      return;
    }

    namespaces.delete(namespace);
    provider.dispose?.();
  ```

- **严重程度**: P2
- **现状**: `ActionScope` 支持单 namespace unregister/dispose，但返回对象没有一次性清理所有 namespaces 的 `dispose()`。
- **风险**: owner 需要自行遍历 namespace，scope-wide cleanup 模式容易遗漏或漂移。
- **建议**: 增加 `ActionScope.dispose()`，统一 unregister/dispose 所有 namespace providers。
- **误报排除**: per-namespace cleanup 存在，但缺 scope-level ownership primitive。
- **复核结论**: 保留 P2。

### [维度07-05] `RenderNodes` 在 render/useMemo 阶段写 fragment scope cache

- **文件**: `packages/flux-react/src/render-nodes.tsx:243-278`
- **证据片段**:

  ```ts
  const scope = runtime.createChildScope(currentScope, fragmentBindings, {
    isolate,
    pathSuffix,
    scopeKey,
    source: 'fragment',
  });

  fragmentScopeCache.set(fragmentScopeCacheKey, {
    scope,
  ```

- **严重程度**: P1
- **现状**: `useMemo` 在 render phase 创建 child scope 并 mutate module-level WeakMap cache。
- **风险**: React concurrent/pre-commit aborted render 中，render-phase side effect 可能逃逸且 cleanup effect 不会运行。
- **建议**: 将 scope/cache mutation 移入 effect 或 lifecycle-safe allocation pattern。
- **误报排除**: 后续 cleanup effect 能处理 committed unmount，但无法清理 aborted render allocation。
- **复核结论**: 保留 P1。

## 维度 08：验证系统一致性

### [维度08-01] Form field presentation 可能使用 ancestor validation owner

- **文件**: `packages/flux-react/src/hooks/use-form-hooks.ts:40-50`
- **证据片段**:

  ```ts
  export function useCurrentValidationScope(): ValidationScopeRuntime | undefined {
    const validationScope = useContext(ValidationContext);
    const currentForm = useCurrentForm();
    const currentPage = useContext(PageContext) as PageRuntime | undefined;

    if (validationScope === NO_VALIDATION_OWNER) {
      return currentForm;
    }

    return validationScope ?? currentForm ?? currentPage?.validationOwner;
  ```

- **严重程度**: P1
- **现状**: `ValidationContext` 优先于 `currentForm`，除非显式设为 `NO_VALIDATION_OWNER`。
- **风险**: 嵌套在其他 validation context 内的 form 可能读取/发布到错误 owner。
- **建议**: 在 form context 内优先 current form owner，或明确区分 inherited validation owner 与 form-owned validation。
- **误报排除**: fallback order 在代码中明确存在，不是推测。
- **复核结论**: 保留 P1。

### [维度08-02] disposed/unactivated validation 返回 clean success

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:433-442`
- **证据片段**:

  ```ts
  if (sharedState.lifecycleState === 'disposed') {
    return createValidationResult([]);
  }

  if (isLifecycleTransitional(sharedState)) {
    const activated = await waitForActiveLifecycle(sharedState);

    if (!activated) {
      return createValidationResult([]);
    }
  ```

- **严重程度**: P1
- **现状**: disposed 或未激活的 validation path resolve 为 `{ ok: true, errors: [] }`。
- **风险**: submit/validation caller 会把生命周期取消解释为验证成功。
- **建议**: 返回 explicit cancelled/blocked result 或抛 lifecycle cancellation sentinel。
- **误报排除**: 代码直接构造 empty success result，不是 distinct cancelled result。
- **复核结论**: 保留 P1。

### [维度08-03] `summary-gate` submit 语义与 recurse-submit 边界模糊

- **文件**: `packages/flux-runtime/src/form-runtime-submit-flow.ts:185-200`, `204-229`
- **证据片段**:
  ```ts
  for (const contract of childContractsSnapshot) {
    if (contract.mode === 'recurse-submit') {
      childValidationPromises.push(contract.triggerValidation());
    } else if (contract.mode === 'summary-gate') {
      const childState = contract.getState();
      if (!childState.ready || childState.validating || !childState.valid) {
        summaryGateBlockers.push(contract.childOwnerId);
        continue;
      }
  ```
- **严重程度**: P3
- **现状**: `summary-gate` 先基于 child summary state gate，但 ready/valid 后仍可能触发 validation。
- **风险**: contract 名称像 summary-only gating，但行为与 recursive validation 有重叠。
- **建议**: 澄清 docs/types，或拆分 contract mode。
- **误报排除**: 行为可能 intentional；保留问题是契约语义歧义。
- **复核结论**: 降级保留 P3。

### [维度08-04] 同一路径含 async rule 时 sync errors 被 debounce/async 阶段延后发布

- **文件**: `packages/flux-runtime/src/form-runtime-validation.ts:291-331`, `413-423`
- **证据片段**:
  ```ts
  hasAsyncRules &&
    sharedState.validationRuns.get(path) === runId &&
    sharedState.modelGeneration === capturedGeneration
  ) {
    commitPathValidationState({
      sharedState,
      path,
      errors: finalErrors,
      validating: false,
    });
  ```
- **严重程度**: P1
- **现状**: field 有 async rules 时，final errors 在 async-rule finalization path 一次性 commit；先收集到的 sync errors 不立即发布。
- **风险**: 明显同步错误会被 debounce/async validation 延迟展示。
- **建议**: await debounced/async rules 前先发布 sync errors，再合并 async results。
- **误报排除**: 非 async field 会立即发布；问题限定于 sync+async mixed rule path。
- **复核结论**: 保留 P1。

## 维度 09：渲染器契约合规性

### [维度09-01] Flex renderer semantic props 与 marker-only layout contract 冲突

- **文件**: `packages/flux-renderers-basic/src/flex.tsx:30-48`
- **证据片段**:
  ```tsx
  'nop-flex',
  resolveDirection(direction),
  wrap && 'flex-wrap',
  align === 'center' && 'items-center',
  align === 'start' && 'items-start',
  align === 'end' && 'items-end',
  align === 'stretch' && 'items-stretch',
  justify === 'center' && 'justify-center',
  justify === 'start' && 'justify-start',
  ```
- **严重程度**: P3
- **现状**: layout renderer 根据 semantic props 发出 Tailwind layout classes。
- **风险**: 样式事实来源在 schema className 与 renderer semantic prop mapping 之间分裂。
- **建议**: 将 layout 移到 schema classes/aliases，或文档化 Flex 为明确 exception。
- **误报排除**: renderer 是有意发出 visual layout classes；这是契约张力，不是偶发代码。
- **复核结论**: 降级保留 P3。

### [维度09-02] Tree repeated region 缺少 `instancePath`

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:87-90`, `142-155`
- **证据片段**:
  ```tsx
  const nodeContent = owner.regions.node
    ? owner.regions.node.render({
        bindings: { node, index, depth, key: nodeKey, parentNode },
      })
    : defaultContent;
  ```
- **严重程度**: P2
- **现状**: Tree node region rendering 只传 bindings，没有为每个 tree node 提供 repeated `instancePath`。
- **风险**: nested renderer state、diagnostics、component handles 或 validation paths 可能缺稳定 runtime instance identity。
- **建议**: 对每个 tree node 传 deterministic `instancePath/pathSuffix`。
- **误报排除**: React keys 存在；问题是 renderer runtime instance identity。
- **复核结论**: 保留 P2。

### [维度09-03] Tabs `onChange` event payload 缺稳定 semantic object

- **文件**: `packages/flux-renderers-basic/src/tabs.tsx:197-207`
- **证据片段**:
  ```tsx
  ownedAxis.setValue(String(next));
  const nextIndex = items.findIndex((item, index) => getItemValue(item, index) === String(next));
  void props.events.onChange?.(null, {
    scope: props.helpers.createScope(
      { value: next, index: nextIndex },
      { scopeKey: 'tabs', pathSuffix: 'tabs' },
    ),
  });
  ```
- **严重程度**: P3
- **现状**: Tabs 直接 event data 为 `null`，依赖 temporary scope 暴露 `{ value, index }`。
- **风险**: event payload shape 与直接传 semantic event data 的 renderer 不一致。
- **建议**: 传 semantic payload object，同时保留 scope bindings。
- **误报排除**: consumer 可读 created scope；问题是跨 renderer event contract 一致性。
- **复核结论**: 降级保留 P3。

### [维度09-04] CRUD refresh event payload 缺 semantic object

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:167-181`
- **证据片段**:

  ```ts
  scope?.update(queryStatePath, {
    values: queryState.values,
    refreshCount: queryState.refreshCount + 1,
  });

  props.events.onRefresh?.(undefined, {
    scope: crudScope,
  });
  ```

- **严重程度**: P3
- **现状**: Refresh event data 为 `undefined`，依赖 `$crud` scope state。
- **风险**: event consumers 缺少直接稳定的 semantic refresh context payload。
- **建议**: 传 current query/pagination/selection/refresh count 等 payload，同时保留 scope。
- **误报排除**: `$crud` scope 存在；问题不是数据完全缺失，而是 payload consistency。
- **复核结论**: 降级保留 P3。

## 维度 10：样式系统合规性

### [维度10-01] Error fallback JSX 保留 BEM 状态/内部类

- **文件**: `packages/flux-react/src/node-error-boundary.tsx:42-50`, `138-155`
- **证据片段**:
  ```tsx
  <Alert
    data-slot={props.mode === 'loading' ? 'schema-root-status' : 'schema-root-error'}
    role={props.mode === 'loading' ? 'status' : 'alert'}
    variant={destructive ? 'destructive' : 'default'}
    className={cn('nop-schema-root-fallback', !destructive && 'nop-schema-root-fallback--status')}
  >
    {destructive ? <AlertCircleIcon className="size-4 shrink-0" /> : null}
    <AlertDescription className="nop-schema-root-fallback__message">
  ```
- **严重程度**: P2
- **现状**: JSX 发出 `--status` modifier 与 `__message` element BEM classes。
- **风险**: 违背 styling guidance 中以 `data-slot`、semantic markers、Tailwind/utilities 替代 BEM 的约定。
- **建议**: 用 `data-slot` selectors 和 non-BEM semantic markers 替换 BEM modifier/element。
- **误报排除**: 这是 production fallback UI，不是测试/demo 样式。
- **复核结论**: 保留 P2。

### [维度10-02] `default-spacing.css` 保留 BEM selectors

- **文件**: `packages/flux-react/src/default-spacing.css:146-187`
- **证据片段**:

  ```css
  .nop-schema-root-fallback {
    align-items: center;
  }

  .nop-schema-root-fallback--status {
    background: hsl(var(--background));
    color: hsl(var(--foreground));
  }

  .nop-schema-root-fallback__message {
  ```

- **严重程度**: P2
- **现状**: package-level default CSS 使用 BEM modifier/element selectors。
- **风险**: 强化不支持的 selector 约定，并重复 `data-slot` 可表达的语义。
- **建议**: 转为 `data-slot` 与 non-BEM marker classes。
- **误报排除**: selectors 位于 live package CSS，不是 legacy comments 或 dead docs。
- **复核结论**: 保留 P2。

### [维度10-03] Playground Flow Designer modifier classes 与 `data-*` 状态重复

- **文件**: `apps/playground/src/flow-designer/flow-designer-canvas.tsx:112-121`, `202-210`
- **证据片段**:
  ```tsx
  <div
    key={node.id}
    className={classNames(
      'fd-node',
      snapshot.selection.activeNodeId === node.id && 'fd-node--selected',
      node.type && `fd-node--${node.type}`,
    )}
    data-slot="flow-designer-node"
    data-selected={snapshot.selection.activeNodeId === node.id ? '' : undefined}
    data-type={node.type || undefined}
  ```
- **严重程度**: P3
- **现状**: playground nodes 同时发出 BEM-like modifier classes 与等价 `data-selected/data-type`。
- **风险**: 示例代码传播 duplicated styling pattern，与推荐 `data-*` selector model 冲突。
- **建议**: 使用 `data-selected/data-type` selectors，移除 modifier classes，除非明确标为 playground-only legacy。
- **误报排除**: 属 playground code，故严重程度较低；但仍是项目可见示例。
- **复核结论**: 保留 P3。
