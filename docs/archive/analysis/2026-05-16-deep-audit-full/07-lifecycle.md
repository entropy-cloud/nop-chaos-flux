# 维度 07：生命周期与副作用归属

## 第 1 轮（初审）

### [维度07-01] `use-node-scopes` 创建的 node-owned `ActionScope` 缺少显式 release

- **文件**: `packages/flux-react/src/use-node-scopes.ts:41-47,69-84`
- **证据片段**:
  ```ts
  const nodeActionScope = useMemo(() => {
    if (input.actionScopePolicy !== 'new') {
      return undefined;
    }
    return createNodeOwnedActionScope(runtime, actionScope, input.nodeId);
  }, [runtime, actionScope, input.actionScopePolicy, input.nodeId]);
  ```
- **严重程度**: P1
- **现状**: 组件 registry 有 cleanup，但 node-owned action scope 没有对称 release。
- **风险**: runtime 长寿命场景下可累积 orphaned action scope。
- **建议**: 在 cleanup 中调用 `runtime.releaseActionScope(...)`。
- **为什么值得现在做**: 这是生命周期 owner 漏口，不会自动随 namespace unregister 收敛。
- **误报排除**: 不是在重复报告 namespace cleanup；问题是 scope 对象本身的 owner teardown 缺失。
- **历史模式对应**: runtime-owned object not released。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度07-02] `node-renderer` 的 import-owned `ActionScope` 只弹出 import frame，不释放 scope owner

- **文件**: `packages/flux-react/src/node-renderer.tsx:71-77,120-163`
- **证据片段**:
  ```ts
  const importOwnedActionScope = useMemo(() => {
    if (!nodeImports?.length) {
      return undefined;
    }
    return createImportOwnedActionScope(runtime, props.actionScope, props.node.id);
  }, [runtime, props.actionScope, props.node.id, nodeImports]);
  ```
- **严重程度**: P1
- **现状**: cleanup 只处理 `importStack.pop(nextFrame.id)`，未释放由 `NodeRenderer` 自己创建的 action scope。
- **风险**: 导入子树重复 mount/unmount 时会留下 scope owner 残留。
- **建议**: 在 frame cleanup 结束后显式 release `importOwnedActionScope`。
- **为什么值得现在做**: 这是 import 生命周期与 scope owner 生命周期分离造成的真实缺口。
- **误报排除**: 不是在说 `importStack.pop` 缺失；pop 存在，但不足以清理 NodeRenderer-owned scope。
- **历史模式对应**: cross-layer teardown asymmetry。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度07-03] `schema-renderer` 自建 root `ActionScope` 仅注销 namespace，不做提前 release

- **文件**: `packages/flux-react/src/schema-renderer.tsx:232-274`
- **证据片段**:
  ```ts
  const rootActionScope = useMemo(
    () => props.actionScope ?? runtime.createActionScope({ id: 'root-action-scope' }),
    [props.actionScope, runtime],
  );
  useEffect(() => {
    return () => {
      for (const namespace of rootActionScope.listNamespaces()) {
        rootActionScope.unregisterNamespace(namespace);
      }
    };
  }, [ownsRootActionScope, rootActionScope]);
  ```
- **严重程度**: P2
- **现状**: 普通 runtime dispose 能最终兜底，但如果同一 runtime 下 root action scope 被替换，这里缺少 owner 级提前 release。
- **风险**: 同 runtime 切换 action scope 边界时可能保留 stale root scope。
- **建议**: 在 `ownsRootActionScope` cleanup 中补 `runtime.releaseActionScope(rootActionScope)`。
- **为什么值得现在做**: 复核确认这是 narrower residual，不应继续依赖 runtime 全局 dispose 兜底。
- **误报排除**: 不是说 runtime dispose 无效；问题在于同 runtime 生命周期中的提前替换场景。
- **历史模式对应**: missing early release with long-lived runtime。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度07-04] fragment scope cache 删除缓存条目时没有 dispose 已创建 child scope

- **文件**: `packages/flux-react/src/render-nodes.tsx:93-107,305-321`
- **证据片段**:
  ```ts
  const fragmentScopeCacheByRuntime = new WeakMap<
    RendererRuntime,
    Map<string, FragmentScopeCacheEntry>
  >();
  if (!matchesFragmentScopeEntry(nextEntry, fragmentScopeIdentity)) {
    nextEntry = {
      scope: runtime.createChildScope(currentScope, fragmentBindings, {
        isolate,
      }),
    };
    fragmentScopeCache.set(fragmentScopeCacheKey, nextEntry);
  }
  ```
- **严重程度**: P1
- **现状**: retained child scope 被 cache 管理，但删除 cache entry 时没有走 runtime scope disposal contract。
- **风险**: scope 归属下的 source/reaction 等副作用可能失去 owner teardown。
- **建议**: 在淘汰 cache entry 时显式 `runtime.disposeScope(...)` 或等价 release。
- **为什么值得现在做**: 这正是文档要求“retained child scopes must be explicitly disposed”的 live 反例。
- **误报排除**: 不是 reactive-precision 问题，而是 retained child scope 的生命周期归属问题。
- **历史模式对应**: retained child scope teardown leak。
- **参考文档**: `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度07-01]：保留 (P1)。`use-node-scopes` 未释放自建 action scope。
- [维度07-02]：保留 (P1)。`node-renderer` 的 import-owned action scope 缺少 release。
- [维度07-03]：降级为 P2。仅在同 runtime 下 root scope 替换时形成 residual。
- [维度07-04]：保留 (P1)。fragment scope cache 删除时未 dispose child scope。

## 最终保留项

| 编号  | 严重程度 | 文件                                                  | 一句话摘要                                            |
| ----- | -------- | ----------------------------------------------------- | ----------------------------------------------------- |
| 07-01 | P1       | `packages/flux-react/src/use-node-scopes.ts:41-47`    | node-owned `ActionScope` 缺少显式 release             |
| 07-02 | P1       | `packages/flux-react/src/node-renderer.tsx:71-77`     | import-owned `ActionScope` 只弹出 frame 不释放 scope  |
| 07-04 | P1       | `packages/flux-react/src/render-nodes.tsx:93-107`     | fragment scope cache 淘汰时未 dispose child scope     |
| 07-03 | P2       | `packages/flux-react/src/schema-renderer.tsx:232-274` | root `ActionScope` 仅注销 namespace，不做提前 release |
