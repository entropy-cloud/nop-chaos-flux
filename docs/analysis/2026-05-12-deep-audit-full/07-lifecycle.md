# 维度 07：生命周期与副作用归属

## 范围与状态

- 审核维度：生命周期与副作用归属。
- 来源范围：仅汇总 `stage-1-full-findings-06-10.md`、`raw-findings-07-20.md`、`final-review-results-06-10.md` 与 `summary.md` 中本维度记录。
- 覆盖对象：source observer lifecycle、request abort listener、ActionScope ownership、render-phase allocation、status publication 与 RAF focus side effects。
- 最终状态：7 项进入最终复核；保留 4 项，驳回 3 项。保留项为 P1 1 项、P3 3 项。

## 深挖轮次与收敛说明

第 1 轮初审记录 5 项。第 2-5 轮追加 raw findings 补充 2 项。本次审核在第 5 轮达到执行上限时仍有新增，因此按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核收窄了生命周期问题边界：React-owned hook lifecycle 本身不被视为缺陷，只有 render phase side effect、settled 后 listener 未清理、缺少 scope-wide dispose convenience、未取消 RAF 等仍保留。其中 [07-05] 是本维度唯一 P1，因为它在 render/useMemo 阶段创建 child scope 并写 WeakMap cache，aborted render cleanup 不会运行。

## 最终保留项

### [07-03] parent `AbortSignal` listener 在请求正常结束后不移除

- 文件：`packages/flux-runtime/src/async-data/request-runtime.ts:366-372`
- 证据片段：

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

- 严重程度：P3
- 当前行为：parent abort listener 以 `{ once: true }` 注册，但匿名 listener 在请求正常 settle 后不会移除。
- 风险：long-lived parent signal 可保留已完成 request controller/listener，直到 parent abort 或 GC。
- 建议：保存 listener，并在 request `finally` 中 remove。
- 误报排除：`{ once: true }` 只在 abort 触发时移除，不处理 successful completion。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 API request parent abort listener 正常 settlement 后未移除。

### [07-04] `ActionScope` 缺少 scope-level dispose

- 文件：`packages/flux-runtime/src/action-scope.ts:44-88`
- 证据片段：

```ts
unregisterNamespace(namespace) {
  const provider = namespaces.get(namespace);

  if (!provider) {
    return;
  }

  namespaces.delete(namespace);
  provider.dispose?.();
```

- 严重程度：P3
- 当前行为：`ActionScope` 支持单 namespace unregister/dispose，但返回对象没有一次性清理所有 namespaces 的 `dispose()`。
- 风险：owner 需要自行遍历 namespace，scope-wide cleanup 模式容易遗漏或漂移。
- 建议：增加 `ActionScope.dispose()`，统一 unregister/dispose 所有 namespace providers。
- 误报排除：per-namespace cleanup 存在，但缺 scope-level ownership primitive。
- 最终复核结论：降级保留 P3。
- 修订标题/理由：原始严重程度 P2；最终复核认为 `ActionScope` 有 per-namespace unregister/listNamespaces，`SchemaRenderer` 已手动 loop，缺的是 scope-wide dispose convenience，不是已证实 leak。

### [07-05] `RenderNodes` 在 render/useMemo 阶段写 fragment scope cache

- 文件：`packages/flux-react/src/render-nodes.tsx:243-278`
- 证据片段：

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

- 严重程度：P1
- 当前行为：`useMemo` 在 render phase 创建 child scope 并 mutate module-level WeakMap cache。
- 风险：React concurrent/pre-commit aborted render 中，render-phase side effect 可能逃逸且 cleanup effect 不会运行。
- 建议：将 scope/cache mutation 移入 effect 或 lifecycle-safe allocation pattern。
- 误报排除：后续 cleanup effect 能处理 committed unmount，但无法清理 aborted render allocation。
- 最终复核结论：保留 P1。
- 修订标题/理由：无标题修订；最终理由强调 aborted render cleanup 不会运行。

### [07-07] ArrayEditor focus RAF 未在卸载或 items 变化时取消

- 文件：`packages/flux-renderers-form-advanced/src/array-editor.tsx:226-247`
- 证据片段：

```tsx
React.useEffect(() => {
  const pending = pendingFocusRef.current;
  if (!pending) return;
  pendingFocusRef.current = null;

  requestAnimationFrame(() => {
    if (pending.kind === 'add') {
      const lastItem = items[items.length - 1];
      if (lastItem) {
        inputRefs.current.get(lastItem.id)?.focus();
      }
```

- 严重程度：P3
- 当前行为：add/remove 后调度 `requestAnimationFrame` 执行 focus，但没有保存 RAF id，也没有 effect cleanup 取消。
- 风险：组件卸载或 items 已变化后仍可能执行过期 focus 副作用，导致焦点跳转到不再属于当前组件生命周期的 DOM/ref。
- 建议：保存 RAF id 并在 cleanup 中 `cancelAnimationFrame`；必要时加 mounted/sequence guard。
- 误报排除：ref 为空会让部分操作 no-op，但调度的副作用仍越过组件 ownership 边界。
- 最终复核结论：降级保留 P3。
- 修订标题/理由：原始严重程度 P2；最终复核认为多数 stale refs 会 no-op，因此降级为生命周期卫生问题。

## 驳回项

### [07-01] anonymous source lifecycle 边界仍偏 React-owned

- 文件：`packages/flux-react/src/use-node-source-props.ts:43-75`
- 证据片段：

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

- 严重程度：无
- 当前行为：source props controller/observer lifecycle 由 React effects 触发 run/dispose。
- 风险：最终复核未保留缺陷；原始风险是 anonymous nested source props 的 ownership 分裂在 React mount semantics 与 runtime source observer semantics 之间，生命周期推理成本高。
- 建议：不跟踪代码变更；如需降低推理成本，可文档化该 React-owned boundary。
- 误报排除：不是缺 cleanup；cleanup 存在。
- 最终复核结论：驳回。
- 修订标题/理由：最终理由为 React hook owns mount/unmount，runtime controller owns execution；cleanup 已存在。

### [07-02] `useSourceValue` lifecycle wiring 与当前 observer design 一致

- 文件：`packages/flux-react/src/use-source-value.ts:25-45`
- 证据片段：

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

- 严重程度：无
- 当前行为：hook 创建 runtime `SourceObserver`，通过 `useSyncExternalStore` 订阅，在 effect 中 run，unmount dispose。
- 风险：无保留缺陷。
- 建议：不跟踪代码变更。
- 误报排除：模式符合当前 source observer design：React 拥有 hook mount/unmount，runtime observer 拥有 execution/cancellation internals。
- 最终复核结论：驳回。
- 修订标题/理由：最终理由为 observer 创建、subscribe、run、dispose wiring 与当前 design 一致。

### [07-06] status publication 在同 target 的 summary 变化上缺少每次发布 cleanup 归属

- 文件：`packages/flux-react/src/status-path.ts:50-69`
- 证据片段：

```ts
useEffect(() => {
  const nextTarget = scope && statusPath ? { scope, statusPath } : undefined;
  const targetChanged = !samePublishedTarget(publishedTargetRef.current, nextTarget);
  const summaryChanged = !shallowEqualSummary(publishedSummaryRef.current, summary);

  if (publishedTargetRef.current && targetChanged) {
    publishOwnerStatus(publishedTargetRef.current.scope, publishedTargetRef.current.statusPath, undefined);
  }

  if (nextTarget && (targetChanged || summaryChanged)) {
    publishOwnerStatus(nextTarget.scope, nextTarget.statusPath, summary);
```

- 严重程度：无
- 当前行为：hook 在 target 改变或 unmount 时清理旧 path；同一个 `scope/statusPath` 的 `summary` 变化覆盖写入新 summary。
- 风险：最终复核未确认缺陷；原始风险是 publisher 生灭和 summary 更新交错时 host scope 可能暴露陈旧 status。
- 建议：不跟踪代码变更。
- 误报排除：同 target summary update 正确覆盖同一 scope path；effect cleanup 覆盖 unmount。
- 最终复核结论：驳回。
- 修订标题/理由：最终理由为未证明 per-summary cleanup defect。
