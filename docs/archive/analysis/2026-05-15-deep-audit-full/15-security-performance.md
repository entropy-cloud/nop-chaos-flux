# 维度 15：安全与性能红线

## 第 1 轮（初审）

### [维度15-01] `useNodeSourceProps` 在节点热路径用 `JSON.stringify` 做变更判定

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\use-node-source-props.ts`
- **证据片段**:
  ```ts
  56:   const sourceInputs = useMemo(
  57:     () => sourcePropKeys.map((key) => propsValue[key]),
  58:     [propsValue, sourcePropKeys],
  59:   );
  60:   const sourceInputsKey = useMemo(() => JSON.stringify(sourceInputs), [sourceInputs]);
  61:
  68:   useEffect(() => {
  69:     if (!hasSourceProps) return;
  70:     controller.run(propsValueRef.current, scopeRef.current);
  71:   }, [controller, hasSourceProps, sourceInputsKey]);
  ```
- **严重程度**: P2
- **现状**: 这个 hook 运行在 `flux-react` 节点解析主路径里；对带 source props 的节点，它先做一次 `hasSourceProps` 深遍历，再把 `sourceInputs` 整体 `JSON.stringify` 成 effect dependency key，随后触发 `controller.run(...)`。
- **风险**: 这是热路径 change detection，不是稳定 cache-key。表单/表格/设计器里一旦 source-backed 节点数量上来，每次相关渲染都会支付整段序列化成本；同时对象键顺序、非 JSON 友好值、无语义变化但引用结构变化，都可能导致无谓重跑。
- **建议**: 把 source entry 定位尽量前移到编译期/模板期，或至少改成 revision / identity tuple / per-entry token 判定；不要在 render/update 主路径上把整组 source 输入序列化成依赖键。
- **为什么值得现在做**: 这是共享 `flux-react` 主路径问题，修一处会影响所有带 source props 的 renderer，收益面大。
- **误报排除**: 这不是日志、序列化输出、也不是稳定缓存键；它直接参与 effect 触发条件，属于 `JSON.stringify` change detection 的真实热路径场景。
- **历史模式对应**: `pnpm check:audit-performance-suspects` 的 `json-stringify-change-detection` 命中；且不属于 `docs/references/audit-tooling.md` 里应排除的 cache-key / 序列化 / 日志类噪音。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/references/audit-tooling.md`、`docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核
- **类别**: 性能
- **规则编号**: P1

## 安全零发现结论

- 已检查 `packages/flux-react/src/schema-renderer.tsx`、`packages/flux-runtime/src/import-stack.ts`、`packages/flux-runtime/src/runtime-factory.ts`、`packages/flux-react/src/node-renderer.tsx`、`packages/nop-debugger/src/controller-component-inspector.ts`。
- 当前已复核范围内，未确认主路径 `fail-open`、异常默认放行、或缺少文档支撑的敏感边界假设缺陷；`xui:imports` 相关失败路径目前总体表现为报错并中止或不上线，偏 fail-closed。

## 深挖第 2 轮追加

### [维度15-02] `createReadonlyScopeBinding` 用 `JSON.stringify` 驱动 `$form/$crud` 绑定版本判定，落在作用域快照热路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\status-owner.ts`
- **证据片段**:
  ```ts
  21:   const getSummaryVersion = (summary: TSummary) => {
  23:     if (!summary || typeof summary !== 'object') {
  24:       return summary;
  25:     }
  27:     const record = summary as Record<string, unknown>;
  28:     return JSON.stringify(Object.keys(record).sort().map((key) => [key, record[key]]));
  29:   };
  34:   const { readSnapshot, store } = createProjectedScopeStore(scope, buildOwnSnapshot, () =>
  35:     getSummaryVersion(getSummary()),
  36:   );
  ```
- **严重程度**: P2
- **现状**: `createReadonlyScopeBinding` 把对象 summary 序列化成 version token；而 `$form` 绑定通过 `createFormScopeWithBinding(...)` 挂进表单运行时作用域，随后基于该 scope 的快照读取都会走到这条版本判定路径。
- **风险**: 这不是离线 cache-key，而是活跃作用域的快照版本判定。表单子树越大、scope 快照读取越频繁，越容易把 `buildFormStatusSummary()` 加 `JSON.stringify(...)` 变成共享热路径成本；summary 结构或顺序波动也会带来无谓失效。
- **建议**: 改成显式 revision/version counter，或对 summary 做字段级稳定 token；不要在 `$form/$crud` 绑定的快照判定路径上序列化整个 summary。
- **为什么值得现在做**: 这是 `flux-runtime` / `flux-react` 共享基础设施问题，修一处会影响所有使用 `$form` 绑定的表单树和 `$crud` 作用域槽位场景。
- **误报排除**: 这不是日志或持久化，也不是冷路径稳定缓存键；它直接参与作用域投影快照命中判定。
- **历史模式对应**: `json-stringify-change-detection` 命中。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/references/audit-tooling.md`
- **复核状态**: 未复核
- **类别**: 性能
- **规则编号**: P1

### [维度15-03] `useStableFormErrorQuery` 在字段错误订阅主路径里对 `sourceKinds` 做 stringify/parse 稳定化

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-react\src\hooks\use-form-hooks.ts`
- **证据片段**:
  ```ts
  107: function useStableFormErrorQuery(query?: FormErrorQuery) {
  111:   const sourceKindsKey = query?.sourceKinds ? JSON.stringify(query.sourceKinds) : undefined;
  113:   return useMemo(() => {
  123:       resolvedQuery: {
  127:         sourceKinds: sourceKindsKey
  128:           ? (JSON.parse(sourceKindsKey) as FormErrorQuery['sourceKinds'])
  129:           : undefined,
  132:   }, [stablePath, stableOwnerPath, stableRule, sourceKindsKey]);
  ```
- **严重程度**: P2
- **现状**: `useStableFormErrorQuery` 为了把查询对象“稳定化”，先对 `sourceKinds` 做 `JSON.stringify`，再在 `useMemo` 内 `JSON.parse` 回数组。`FieldFrame -> useAggregateError -> useCurrentFormError` 会在大量字段渲染时反复走这条路径。
- **风险**: 这是字段错误或聚合错误订阅主路径里的 dependency-key 技巧，不是稳定持久化。大表单下每个字段 render 都会付出 stringify/parse 成本；同时把数组内容编码成字符串依赖，后续若引入顺序噪声，也会带来不必要的 query 重建。
- **建议**: 改成稳定常量、浅比较数组 memo，或把 `FormErrorQuery` 正规化为结构化 token；不要在字段级 hook 热路径里做 stringify/parse 循环。
- **为什么值得现在做**: 这是 `flux-react` 通用表单 hook，影响所有基于 `FieldFrame` 或聚合错误展示的字段渲染路径。
- **误报排除**: 这里的 `JSON.stringify` 不是调试输出，也不是缓存落盘；它直接参与 hook 依赖稳定化，且调用链已落到表单字段渲染热路径。
- **历史模式对应**: `json-stringify-change-detection` 命中。
- **参考文档**: `docs/architecture/performance-design-requirements.md`、`docs/references/audit-tooling.md`
- **复核状态**: 未复核
- **类别**: 性能
- **规则编号**: P1

## 维度复核结论

- [维度15-01]：保留 (P2)。`useNodeSourceProps` 仍在共享节点解析路径用 `JSON.stringify(sourceInputs)` 做变更判定。
- [维度15-02]：降级为 P2。主成本更像 summary 的非增量汇总；`stringify` token 本身不足以单独维持原结论力度。
- [维度15-03]：降级为 P2。`sourceKinds` stringify/parse 仍是残留，但证据不足以作为独立字段级热路径主问题保留。

## 最终保留项

| 编号  | 严重程度 | 文件                                               | 一句话摘要                                             |
| ----- | -------- | -------------------------------------------------- | ------------------------------------------------------ |
| 15-01 | P2       | `packages/flux-react/src/use-node-source-props.ts` | 节点热路径仍用 `JSON.stringify` 做 source 输入变更判定 |
