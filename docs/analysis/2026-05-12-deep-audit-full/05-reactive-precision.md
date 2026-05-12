# 维度 05：响应式订阅精度

## 范围与状态

- **维度范围**: 订阅粒度、path-aware subscription、selector 唤醒范围、订阅 churn。
- **最终状态**: 最终保留 8 项，无驳回项。
- **来源限制**: 本文件仅根据同目录 `stage-1-full-findings-01-05.md`、`round-2-to-5-raw-findings.md`、`raw-findings-03-06.md`、`final-review-results-01-05.md`、`summary.md` 重写。
- **代码检查**: 本次重写未检查运行时代码。

## 深挖轮次与收敛说明

- **第 1 轮**: 初审发现 4 项，独立复核后均保留，其中 1 项 P2、3 项 P3。
- **第 2-5 轮**: raw findings 追加 `05-05` 到 `05-08`，覆盖 `paths` 引用稳定性、deep-path matcher sibling 命中、table visible columns paths 漏配、tabs scope ownership paths 漏配。
- **收敛说明**: `summary.md` 与 `final-review-results-01-05.md` 均说明第 5 轮达到执行上限后进入最终复核，不声称自然收敛。

## 最终复核摘要

- **最终保留**: 8 项。
- **最终 P2**: 2 项。
- **最终 P3**: 6 项。
- **重大修订**: `05-03` 降级保留为 P3；`05-08` 最终建议除 paths 外同时加 `enabled` guard。

## 最终保留项

### [05-01] form field-state 更新会唤醒 form scope data subscribers

- **文件**: `packages/flux-runtime/src/form-runtime.ts:100-129`; `packages/flux-runtime/src/form-runtime-status.ts:61-75`; `packages/flux-runtime/src/form-store.ts:281-297`
- **证据片段**:
  ```ts
  store: {
    getSnapshot: () => store.getState().values,
    getLastChange: () => lastChange,
    subscribe: (listener) => store.subscribe(() => listener(lastChange)),
  ...
  function updateFieldState(path: string, patch: Partial<FieldState>) {
    store.setState({ fieldStates: { ...current, [path]: next } });
    notifyPath(path);
  ```
- **严重程度**: P2
- **现状**: form scope store 的 `getSnapshot` 返回 values，但 `subscribe` 绑定到 broad `store.subscribe`；field-state-only changes 也会触发 scope subscribers。
- **风险**: value selectors 被 touched/dirty/errors/validating 更新唤醒，降低响应式精度。
- **建议**: data-scope selectors 只订阅 value changes；form status/field state 使用独立 channel。
- **误报排除**: `subscribeToPath` 对 form hooks 存在，但 form scope store 本身仍订阅整个 form store。
- **最终复核结论**: 保留 P2。form scope snapshot 读 values，但 broad `store.subscribe` 会被 field-state-only changes 唤醒。
- **修订标题/理由**: 标题与方向维持。

### [05-02] non-form field scope fallback 缺少 path-scoped subscription

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx:42-59`; `packages/flux-react/src/hooks.ts:96-107`
- **证据片段**:
  ```tsx
  const scopeValue = useScopeSelector(
    (scopeData) => (name ? getIn(scopeData, name) : scopeData),
    eq,
    { enabled: !currentForm, fallback: UNUSED_VALUE },
  );
  ```
- **严重程度**: P3
- **现状**: 非 form fallback selector 只读一个 named path，但未传 `paths: [name]`。
- **风险**: 非 form 上下文的字段值 selector 会被无关 scope changes 唤醒。
- **建议**: 传 `{ enabled: !currentForm, fallback: UNUSED_VALUE, paths: name ? [name] : undefined }`。
- **误报排除**: form 分支已有 form path subscription；本条只针对 scope fallback。
- **最终复核结论**: 保留 P3。non-form field fallback 读单 path，但 `useScopeSelector` 不传 `paths`。
- **修订标题/理由**: 标题与方向维持。

### [05-03] dialog/drawer surface host 使用 whole-scope subscription

- **文件**: `packages/flux-react/src/dialog-host.tsx:79-85`, `168-174`; `packages/flux-react/src/dialog-host-surface.tsx:50-72`
- **证据片段**:
  ```tsx
  export function useSurfaceScopeSnapshot(scope: ScopeRef, paths?: string[]) {
    useSyncExternalStoreWithSelector(
      scope.store?.subscribe ?? (() => () => undefined),
      () => scope.readVisible(),
      (state: unknown) => {
        if (!paths || paths.length === 0) {
          return state;
        }
  ```
- **严重程度**: P3
- **现状**: `DialogView`/`DrawerView` 调用 `useSurfaceScopeSnapshot(props.surface.scope)` 时不传 paths，订阅整个 surface scope。
- **风险**: 无关 scope changes 会通知 surface host views。
- **建议**: 只有 surface-level dependency 需要时才订阅，或从 title/body/action dependency 推导 explicit paths。
- **误报排除**: hook 支持 `paths`，但当前调用点未使用。
- **最终复核结论**: 保留 P3。dialog/drawer surface host whole-scope subscription 成立，影响较低。
- **修订标题/理由**: 降级保留为 P3。

### [05-04] code editor form mode 仍启用 scope fallback subscription

- **文件**: `packages/flux-code-editor/src/code-editor-renderer/use-code-editor-binding.ts:18-27`
- **证据片段**:
  ```ts
  const formValue = useCurrentFormState(
    (state) => (hasName ? getIn(state.values, name) : undefined),
    Object.is,
    { enabled: hasName, path: hasName ? name : undefined },
  );
  const scopeValue = useScopeSelector(
    (data) => (hasName ? getIn(data, name) : undefined),
    Object.is,
    { enabled: hasName, fallback: undefined },
  );
  ```
- **严重程度**: P3
- **现状**: 即使 `currentForm` 存在，只要 `hasName` 为 true，scope subscription 仍创建；同时缺少 `paths`。
- **风险**: form-bound code editor 不必要订阅 scope updates；non-form 模式又 broad subscribe。
- **建议**: scope subscription 仅在 `!currentForm && hasName` 时启用，并传 `paths: [name]`。
- **误报排除**: form mode 的值选择最终用 `formValue`，但 unused scope subscription 仍存在。
- **最终复核结论**: 保留 P3。code editor form mode 仍创建 scope fallback subscription，且 non-form path broad subscribe。
- **修订标题/理由**: 标题与方向维持。

### [05-05] `useScopeSelector` 的 `paths` 选项按引用参与订阅 memo

- **文件**: `packages/flux-react/src/hooks.ts:96-107`
- **证据片段**:
  ```ts
  export function useScopeSelector<T, S = Record<string, unknown>>(
    selector: (scopeData: S) => T,
    equalityFn: (a: T, b: T) => boolean = Object.is,
    options?: { enabled?: boolean; fallback?: T; paths?: readonly string[] },
  ): T {
    const scope = useRenderScope();
    const enabled = options?.enabled !== false;
    const paths = options?.paths;
    const subscribe = useMemo(
      () => (enabled ? createScopeSubscribe(scope, paths) : () => emptyUnsubscribe),
      [enabled, paths, scope],
    );
  ```
- **严重程度**: P3
- **现状**: `paths` 内容相同但数组引用每次 render 都变时，`subscribe` 会被重建，`useSyncExternalStoreWithSelector` 需要退订/重订。调用点存在内联 `{ paths: [ownerStatePath, queryStatePath] }`。
- **风险**: CRUD/table 等热路径组件正常重渲染时会产生额外订阅 churn。
- **建议**: hook 内部将 `paths` 规范化为稳定 key 或提供单值 `path` 选项；调用方可临时 useMemo 包装。
- **误报排除**: equalityFn 能避免选中值不变时重渲染，但不能消除 subscribe 函数引用变化导致的订阅重建成本。
- **最终复核结论**: 保留 P3。`useScopeSelector` 的 `paths` 以数组引用参与 memo，会产生 resubscribe churn。
- **修订标题/理由**: 标题与方向维持。

### [05-06] deep-path dependency matcher 会把同 root sibling 当命中

- **文件**: `packages/flux-runtime/src/scope-change.ts`; `packages/flux-runtime/src/__tests__/scope-ownership-edge-cases.test.ts`
- **证据片段**:
  ```ts
  const prefixes = getPathPrefixes(changePath);
  for (const prefix of prefixes) {
    if (dependencyIndex.descendantsByPrefix.has(prefix)) {
      return true;
    }
  }
  ```
- **严重程度**: P2
- **现状**: `scopeChangeHitsDependencies()` 对 deep path 做 prefix 匹配时，会把依赖 `user.email` 和变更 `user.name` 判定为命中。测试中还固化了 sibling paths match 的行为。
- **风险**: 即使调用方声明精确 deep path，订阅过滤仍按共同祖先过度唤醒。影响 `useScopeSelector` path-aware 订阅、data source dependsOn、reaction dependsOn。
- **建议**: overlap 规则改为“完全相等、change 是 dependency 祖先、dependency 是 change 祖先”才命中；`user.name` vs `user.email` 应返回 false。
- **误报排除**: 不是 `useScopeSelector paths` 引用不稳定；这里是 matcher 语义把 sibling path 误判为 overlap。
- **最终复核结论**: 保留 P2。scope-change path matcher 将 sibling paths 当命中，影响 path-aware subscription/data source/reaction。
- **修订标题/理由**: 标题与方向维持。

### [05-07] `useTableVisibleColumns` 的 scope 订阅缺少 `paths` 过滤

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts:37-46`
- **证据片段**:
  ```ts
  const scopeVisibleColumns = useScopeSelector(
    (scopeData) => toStringArray(getIn(scopeData, toggledStatePath)),
    shallowEqualStringArray,
  );
  const scopeOrderedColumns = useScopeSelector(
    (scopeData) => toStringArray(getIn(scopeData, orderedStatePath)),
    shallowEqualStringArray,
  );
  ```
- **严重程度**: P3
- **现状**: selector 只读取 `toggledStatePath` 和 `orderedStatePath`，但 `useScopeSelector` 未传 `{ paths: [...] }`。
- **风险**: 启用 columnSettings 且配置 scope path 时，任意 scope change 都会唤醒 selector；复杂表格场景产生额外 selector 计算。
- **建议**: 传入 `{ paths: [toggledStatePath, orderedStatePath].filter(Boolean) }`，与 `useCrudVisibleColumnNames` 的 pattern 对齐。
- **误报排除**: 不重复 table event/CRUD query 等问题；这是 column visibility hook 的订阅精度漏配。
- **最终复核结论**: 保留 P3。table visible columns selectors 读两个 state paths，但未传 `paths`。
- **修订标题/理由**: 标题与方向维持。

### [05-08] tabs scope ownership 缺 paths，非 tabs 状态变更会误唤醒

- **文件**: `packages/flux-renderers-basic/src/interaction-owner.ts:20-25`
- **证据片段**:
  ```ts
  const scopedValue = useScopeSelector(
    (scopeData) => (statePath ? getIn(scopeData, statePath) : undefined),
    Object.is,
  );
  ```
- **严重程度**: P3
- **现状**: 注释说明只订阅 specific path，但实际没有传 `{ paths: statePath ? [statePath] : undefined }`。
- **风险**: tabs `valueOwnership: 'scope'` 且配置 `valueStatePath` 时，只读取一个 scope path，却订阅整个 scope。
- **建议**: 给 `useScopeSelector` 添加 paths 选项；最终复核还建议同时加 `enabled` guard，避免非 scope mode broad subscribe。
- **误报排除**: 不是 field fallback/table columns/surface broad subscribe；这是 basic tabs 共享 ownership hook 漏传 paths。
- **最终复核结论**: 保留 P3。tabs scope ownership hook 注释称订阅 specific path，但未传 `paths`，且非 scope mode 仍 broad subscribe。
- **修订标题/理由**: 建议同时加 `enabled` guard。

## 驳回项

无。
