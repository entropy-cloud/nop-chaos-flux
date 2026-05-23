# 维度 07: 生命周期与副作用归属

## 第 1 轮（初审）

### [维度07-01] source-enabled props anonymous source 由 React hook/controller run/dispose

- **文件**: `packages/flux-react/src/use-node-source-props.ts:72-98`
- **证据片段**:
  ```ts
  const controller = useMemo(
    () =>
      hasSourceProps
        ? createNodeSourcePropController(node, runtime)
        : createIdleSourcePropController(),
    [node, runtime, hasSourceProps],
  );
  useEffect(() => {
    controller.run(propsValue, scope);
  }, [controller, hasSourceProps, propsValue, scope]);
  ```
- **严重程度**: 初审 P2，复核驳回
- **现状**: React hook 创建 controller 并在 effect 中运行。
- **风险**: 初审认为 anonymous source 生命周期可能形成 React-owned 第二套 controller family。
- **建议**: 初审建议迁移到 runtime-owned anonymous source entry。
- **为什么值得现在做**: 初审认为会误导 renderer 作者。
- **误报排除**: 复核确认实际 source 执行、abort 和 settle 逻辑在 runtime `SourceObserver` 中；React 层只是 host wiring。
- **参考文档**: `docs/architecture/api-data-source.md`
- **复核状态**: 已驳回

### [维度07-02] `useSourceValue` 公开 hook 直接拥有 source observer run/dispose

- **文件**: `packages/flux-react/src/use-source-value.ts:25-45`
- **证据片段**:
  ```ts
  const observer = useMemo<SourceObserver>(() => runtime.createSourceObserver(), [runtime]);
  const snapshot = useSyncExternalStore(
    observer.subscribe,
    observer.getSnapshot,
    observer.getSnapshot,
  );
  useEffect(() => {
    observer.run({
      scope,
      entries: [{ key: 'value', source, stateKey: 'sourceState' }],
      baseValue: {},
    });
  }, [input, observer, scope, source]);
  ```
- **严重程度**: 初审 P2，复核驳回
- **现状**: hook 消费 runtime `SourceObserver` 并通过 effect run/dispose。
- **风险**: 初审认为公开 hook 会传播 React-owned source lifecycle。
- **建议**: 初审建议统一 runtime-owned anonymous source registry。
- **为什么值得现在做**: 初审认为复制风险高。
- **误报排除**: 复核确认该 hook 仍使用 runtime observer 公共契约，没有创建第二套 executor/settle 语义。
- **参考文档**: `docs/architecture/api-data-source.md`
- **复核状态**: 已驳回

### [维度07-03] request runtime 给父 AbortSignal 添加 listener 后正常完成不移除

- **文件**: `packages/flux-runtime/src/async-data/request-runtime.ts:421-450`
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
- **严重程度**: P2
- **effect 职责**: runtime signal bridging cleanup
- **现状**: parent signal listener 使用匿名 handler，只在 parent abort 时 `{ once: true }` 自动清理；请求正常完成时 finally 不移除 listener。
- **风险**: 长生命周期 parent signal 高频请求会保留已完成 request controller 闭包，未来 abort 时触发大量 stale abort。
- **建议**: 保存 handler 引用，在 request settle 的 `finally` 中 removeEventListener。
- **为什么值得现在做**: request runtime 是 action/source/data-source/form 远程执行共享底座。
- **误报排除**: `{ once: true }` 不能清理从未 abort 的正常完成请求。
- **参考文档**: `docs/architecture/api-data-source.md`
- **复核状态**: 维度复核通过

### [维度07-04] runtime-owned ActionScope release/dispose 缺 namespace provider 兜底 cleanup

- **文件**: `packages/flux-runtime/src/runtime-factory.ts:157-170,531-538`; `packages/flux-runtime/src/action-scope.ts:48-62`
- **证据片段**:
  ```ts
  function releaseOwnedActionScope(actionScope: ActionScope) {
    ownedActionScopes.delete(actionScope);
  }
  ```
  ```ts
  return () => {
    if (namespaces.get(namespace) === provider) {
      namespaces.delete(namespace);
      provider.dispose?.();
    }
  };
  ```
- **严重程度**: P2
- **effect 职责**: runtime action scope/provider lifecycle cleanup
- **现状**: `releaseOwnedActionScope` 只删除 tracking set；provider dispose 只发生在显式 unregister disposer 中。
- **风险**: scope release 时仍注册的 namespace provider 可能滞留外部 bridge/store 引用，依赖分散 React cleanup 正确性。
- **建议**: 为 ActionScope 增加 dispose helper，遍历 namespaces 并 unregister；runtime release/dispose 都调用该路径。
- **为什么值得现在做**: ActionScope 是 host capability / namespaced action 生命周期边界。
- **误报排除**: 不是 NodeRenderer render-phase mutation 旧问题；是 release/dispose 兜底缺口。
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`
- **复核状态**: 维度复核通过

## 深挖第 2 轮追加

维度 07：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度07-01]: 驳回。React 层只是 runtime SourceObserver host wiring。
- [维度07-02]: 驳回。公开 hook 仍通过 runtime observer 执行 source。
- [维度07-03]: 保留 (P2)。parent AbortSignal listener 正常完成不移除。
- [维度07-04]: 保留 (P2)。ActionScope release 缺 provider dispose 兜底。

## 子项复核结论

- [维度07-04]: 建议后续枚举 `runtime.releaseActionScope(...)` 调用点，确认哪些依赖外部 cleanup。

## 最终保留项

| 编号  | 严重程度 | 文件                                                              | 一句话摘要                                                     |
| ----- | -------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 07-03 | P2       | `packages/flux-runtime/src/async-data/request-runtime.ts:421-450` | request parent AbortSignal listener 正常完成不移除             |
| 07-04 | P2       | `packages/flux-runtime/src/runtime-factory.ts:157-170`            | ActionScope release/dispose 缺 namespace provider 兜底 cleanup |
