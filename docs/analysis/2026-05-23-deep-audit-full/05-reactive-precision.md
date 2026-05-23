# 维度 05: 响应式订阅精度

## 第 1 轮（初审）

### [维度05-01] `render-nodes.tsx` 的 `readOwn()` 命中 scanner，但实际发生在 commit-phase `useLayoutEffect` 中，不构成 render-phase 响应式读取缺陷

- **文件**: `packages/flux-react/src/render-nodes.tsx:315-346`
- **证据片段**:
  ```tsx
  useLayoutEffect(() => {
    ...
    const currentOwnSnapshot = nextEntry.scope.readOwn();
    if (currentOwnSnapshot !== fragmentBindings) {
      const change = createFragmentScopeChange(currentOwnSnapshot, fragmentBindings);
  ```
- **严重程度**: P3
- **现状**: `pnpm check:audit-reactive-render-reads` 将其标为 `reactive-render-read`，但实际读取发生在 fragment scope commit-safe update effect 中，而非 render-phase reactive dependency。
- **风险**: 如果把这类 commit-time scope diff 误报为 render 订阅缺陷，会错误驱动把 runtime-owned child-scope update 迁回更差的路径。
- **建议**: 在 scanner 层把 `useLayoutEffect` / `useEffect` 内的 `readOwn()` 明确排除，避免重复噪音。
- **为什么值得现在做**: 这是本轮 reactive suspect 的最高优先级命中之一；不先排除会污染后续维度 05 结论质量。
- **误报排除**: 直接命中 `audit-tooling.md` 的 suspect 规则复核要求；这里不是 render-sensitive imperative read，而是 commit-phase scope reconciliation。
- **历史模式对应**: 对应 reopened adjudication 第 3 条里“render-phase side effect vs 其他 residual 要区分”的同类误报边界。
- **参考文档**: `docs/architecture/renderer-runtime.md:96-100`；`docs/references/audit-tooling.md`；`docs/references/deep-audit-calibration-patterns.md`。
- **复核状态**: 未复核

### [维度05-02] `ScopeDebugRenderer` 订阅完整 lexical scope 并在 selector 内执行全量序列化，公开 basic renderer 注册让调试路径直接进入主渲染热面

- **文件**: `packages/flux-renderers-basic/src/scope-debug.tsx:8-55`
- **证据片段**:

  ```tsx
  function stringifyDebugValue(value: unknown) {
    const json = JSON.stringify(value, (_key, currentValue: unknown) => {
      ...
    });
    return JSON.stringify(JSON.parse(json), null, 2);
  }

  const scopeText = useScopeSelector((scopeData) => stringifyDebugValue(scopeData));
  ```

- **严重程度**: P3
- **现状**: `scope-debug` 作为 `flux-renderers-basic` 的正式 renderer，可在普通 schema 中直接使用；每次 lexical scope 变化都会触发 selector，并对整个 scope 做 `JSON.stringify -> JSON.parse -> pretty stringify`。
- **风险**: 调试组件一旦遗留在 live schema，会把局部字段更新放大为全 scope 序列化，尤其在表单或 designer host scope 较大时会持续产生无关 render 成本。
- **建议**: 增加显式 debug gate 或 `paths` 支持；折叠/禁用状态下避免全量订阅与序列化。
- **为什么值得现在做**: 这是 scanner 已确认的真实广订阅位置，且修复面集中在单一 renderer，而不是大范围 runtime 改造。
- **误报排除**: calibration pattern 8 允许 widget/host 局部状态，但这里不是正常局部状态，而是公开 renderer 对完整 scope 的昂贵订阅；`defaultExpand` 也没有承担 owner-controlled debug gate 语义。
- **历史模式对应**: 对应 `performance-design-requirements.md` P9“debug-only 路径必须 owner-controlled”的同类问题。
- **参考文档**: `docs/architecture/performance-design-requirements.md:44-47,83-87`；`docs/architecture/renderer-runtime.md:44-56`；`docs/references/audit-tooling.md`。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度05-01]: 驳回。live code 明确位于 `useLayoutEffect` 中，不属于 render-phase reactive read；该命中保留为 automation false-positive 线索，不进入最终问题集。
- [维度05-02]: 保留 (P3)。`scope-debug` 仍是普通 renderer surface，且未通过 owner-controlled debug gate 把全 scope 序列化限制在诊断专用路径。

## 子项复核结论

- [维度05-02]: 子项复核通过。问题真实，但因明确是调试 renderer，严重度保持 P3。

## 最终保留项

| 编号  | 严重程度 | 文件                                                | 一句话摘要                                  |
| ----- | -------- | --------------------------------------------------- | ------------------------------------------- |
| 05-02 | P3       | `packages/flux-renderers-basic/src/scope-debug.tsx` | scope-debug 仍对整 scope 做昂贵订阅与序列化 |
