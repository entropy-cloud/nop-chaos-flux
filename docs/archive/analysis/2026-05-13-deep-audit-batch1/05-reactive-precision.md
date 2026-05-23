# 维度 05：响应式订阅精度

## 第 1 轮（初审）

### [维度05-01] `useScopeSelector` 的 `paths` 被压缩到根键，丢失了嵌套路径订阅精度

- **文件**: `packages/flux-react/src/hook-subscriptions.ts`
- **证据片段**:

  ```ts
  function createRootDependencySet(
    paths: readonly string[] | undefined,
  ): ScopeDependencySet | undefined {
    if (!paths || paths.length === 0) {
      return undefined;
    }

    const normalized = Array.from(
      new Set(
        paths
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
          .map((path) => path.replace(/\[(\d+)\]/g, '.$1'))
          .map((path) => path.split('.').filter(Boolean)[0] ?? '*'),
      ),
    ).sort();

    return {
      paths: wildcard ? ['*'] : normalized,
      wildcard,
      broadAccess: wildcard,
    };
  }
  ```

- **严重程度**: P1
- **订阅位置**: `useScopeSelector()` -> `createScopeSubscribe(scope, paths)`
- **订阅范围**: 调用方传入 `a.b.c`、`foo.bar` 这类精确路径时，最终只按根键 `a`、`foo` 订阅
- **实际需要**: 保留调用方给出的完整依赖路径，让 `ScopeChange.paths` 的精细命中能力真正生效
- **重渲染频率**: 同一根键下任意兄弟字段更新，都会唤醒所有订阅该根键的选择器；即使最终 equalityFn 挡住 commit，也会发生无关失效与 selector 重算
- **建议**: 删掉根键压缩，直接把规范化后的完整路径传给 `scopeChangeHitsDependencies()`；数组下标可继续标准化，但不要截断到首段
- **为什么值得现在做**: 这是 hook 层面的全局精度损失，会影响所有依赖 `useScopeSelector(..., { paths })` 的调用点
- **误报排除**: 这不是“实现细节差异”；`packages/flux-runtime/src/scope-change.ts` 已支持多段路径精确匹配，问题是这里主动把精度降成了 root-level
- **历史模式对应**: changed-path 订阅精度在 React hook 层被人为放大为 root-level fan-out
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度05-02] 通用非表单字段绑定退化成整 scope 订阅

- **文件**: `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`
- **证据片段**:
  ```ts
  export function useBoundFieldValue(
    name: string,
    currentForm: FormRuntime | undefined,
    areValuesEqual?: (a: unknown, b: unknown) => boolean,
  ): unknown {
    const eq = areValuesEqual ?? Object.is;
    const formValue = useCurrentFormState(
      currentForm ? (state) => (name ? getIn(state.values, name) : state.values) : () => UNUSED_VALUE,
      eq,
      { enabled: Boolean(currentForm), path: name || undefined },
    );
    const scopeValue = useScopeSelector(
      (scopeData) => (name ? getIn(scopeData, name) : scopeData),
      eq,
      { enabled: !currentForm, fallback: UNUSED_VALUE },
    );
  ```
- **严重程度**: P1
- **订阅位置**: `useFormFieldController()` 的底层值绑定 `useBoundFieldValue()`
- **订阅范围**: 非表单场景下订阅整个 lexical scope，而不是字段 `name`
- **实际需要**: 只订阅当前字段路径，例如 `name`
- **重渲染频率**: 页面里一个 scope 下多个独立字段时，任一字段写入都会唤醒所有同 scope 的字段绑定；即使值没变，也会让所有 selector 重新取值比较
- **建议**: 在 `useScopeSelector` 里传入 `paths: name ? [name] : undefined`；无名场景再保留广订阅
- **为什么值得现在做**: 这是通用字段绑定 helper，影响面比单个 renderer 大；独立字段页/属性面板里最容易形成“一次输入，所有 sibling 都被唤醒”
- **误报排除**: 表单路径已正确走 `useCurrentFormState(..., { path })`；只有 scope 分支退化成全 scope 订阅，因此是明确的不对称精度缺失，不是有意统一实现
- **历史模式对应**: 字段级读取落回 broad scope broadcast
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度05-03] 表格列设置状态遗漏 `paths`，热路径上产生整 scope 失效

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts`
- **证据片段**:
  ```ts
  const scopeVisibleColumns = useScopeSelector(
    (scopeData) =>
      toggledStatePath ? toStringArray(getIn(scopeData, toggledStatePath)) : undefined,
    areStringArraysEqual,
  );
  const scopeOrderedColumns = useScopeSelector(
    (scopeData) =>
      orderedStatePath ? toStringArray(getIn(scopeData, orderedStatePath)) : undefined,
    areStringArraysEqual,
  );
  ```
- **严重程度**: P2
- **订阅位置**: `TableRenderer` -> `useTableVisibleColumns()`
- **订阅范围**: 整个 render scope
- **实际需要**: 仅订阅 `toggledStatePath` 和 `orderedStatePath`
- **重渲染频率**: 表格所在 scope 内任意状态变化都会唤醒这两个选择器；表格又是大组件热路径，失效成本明显高于普通小组件
- **建议**: 分别补上 `paths: toggledStatePath ? [toggledStatePath] : undefined` 与 `paths: orderedStatePath ? [orderedStatePath] : undefined`
- **为什么值得现在做**: 同目录里的分页/排序/筛选/选择 hook 都已经显式传 path，这里是明显漏网点，而且位于 table 主渲染链路
- **误报排除**: 不是“只有 selector 没变就没事”的 harmless 差异；这里缺的是订阅边界，表格交互复杂时会持续产生无关 wake-up
- **历史模式对应**: 热组件局部状态读取未做精确 scope 订阅
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 已检查但不成立 / 不建议报出

- `packages/flux-renderers-basic/src/page.tsx`
  `refreshTick` 的 `useScopeSelector` 未传 `paths`，但只挂一个 page 级标量选择器，相对成本不足以作为主问题。
- `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.ts`
- `packages/flux-renderers-form-advanced/src/detail-view/projected-validation-runtime.ts`
  广义 `subscribe()` 虽委托 parent store，但路径敏感消费实际走 `subscribeToPath` / `subscribeToPaths` 且做了路径映射。
- `packages/flux-react/src/node-renderer-providers.tsx`
  `NodeMetaContext` 已 `useMemo`，其余 provider 未形成可报告广播问题。

## 深挖第 2 轮追加

### [维度05-04] `createReadonlyScopeBinding` 的 store snapshot 只按 base values 缓存，`$form` 在非值变更时会向 `useScopeSelector` 暴露陈旧摘要

- **文件**: `packages/flux-runtime/src/status-owner.ts`; `packages/flux-runtime/src/projected-scope-store.ts`; `packages/flux-runtime/src/form-runtime.ts`; `packages/flux-runtime/src/form-runtime-status.ts`; `packages/flux-react/src/hooks.ts`
- **证据片段**:

  ```ts
  function readSnapshot() {
    const baseSnapshot = scope.store?.getSnapshot() ?? scope.readVisible();

    if (lastProjected && lastBaseSnapshot === baseSnapshot) {
      return lastProjected;
    }
  }
  ```

- **严重程度**: P1
- **订阅位置**: `useScopeSelector((scope) => scope.$form, ...)` 与其他 readonly scope binding 读取路径
- **订阅范围**: 监听会在 form store 任意更新时触发，但快照缓存只看 `values` 引用
- **实际需要**: 当 binding summary 本身变化时也必须让 `store.getSnapshot()` 产出新快照
- **重渲染频率**: blur 校验、错误写入、submit 开始/结束这类非值变更时会出现“监听触发但快照不变”的 stale read
- **建议**: 不要让 readonly binding 的 store snapshot 仅按 base values 缓存；至少把 summary identity 一并纳入 cache key，并补只改 field state / submitting 的回归测试
- **为什么值得现在做**: 这是公开 scope export 的响应式正确性缺陷，影响 `$form.valid`、`$form.submitting` 等只读状态面
- **误报排除**: 不是 `$form` 设计本身错误；问题只出在 React hook 优先读取 `scope.store.getSnapshot()` 时的缓存失效条件错误
- **历史模式对应**: getSnapshot 缓存键遗漏非值状态，导致 reactive stale-read
- **参考文档**: `docs/architecture/renderer-runtime.md`, `docs/architecture/performance-design-requirements.md`, `docs/architecture/form-external-publication-and-reserved-bindings.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度05-01]: 保留 (P1)。`useScopeSelector(..., { paths })` 仍把多段路径压缩成根键，主动丢失 changed-path 精度。
- [维度05-02]: 保留 (P1)。非表单字段绑定仍退化为整 scope 订阅。
- [维度05-03]: 保留 (P2)。表格列设置热路径仍遗漏 `paths`。
- [维度05-04]: 保留 (P1)。readonly scope binding snapshot 只按 values 缓存，`$form` 在非值变更时仍会 stale-read。

## 子项复核结论

本维度无需要继续逐条复核的条目。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                           | 一句话摘要                                   |
| ----- | -------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| 05-01 | P1       | `packages/flux-react/src/hook-subscriptions.ts`                                | `paths` 被压成根键，嵌套路径订阅失真         |
| 05-02 | P1       | `packages/flux-renderers-form/src/field-utils/field-handlers.tsx`              | 非表单字段绑定退化为整 scope 订阅            |
| 05-03 | P2       | `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts` | 表格列状态遗漏 `paths` 导致热路径广订阅      |
| 05-04 | P1       | `packages/flux-runtime/src/projected-scope-store.ts`                           | `$form` 只读绑定在非值更新时可能暴露陈旧摘要 |
