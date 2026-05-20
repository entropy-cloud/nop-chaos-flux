# 维度 15: 安全与性能红线

## 第 1 轮（初审）

本轮未重复报告已通过硬门禁覆盖的 `eval` / `new Function` / React 19 legacy API / src artifact 问题。`pnpm check:audit-performance-suspects` 的 JSON.stringify 候选逐项抽查后，未将序列化、诊断展示、cache-key、测试辅助等用途保留为热路径缺陷；以下仅保留复核 live code 后仍具备实际性能红线风险的发现。

### [维度15-01] Flow Designer 连接校验在交互路径重复全表扫描，缺少 node/edge 索引

- **文件**: `packages/flow-designer-renderers/src/designer-command-adapter-helpers.ts:46-55,83-103`, `packages/flow-designer-core/src/core-edge-commands.ts:44-64,92-99`
- **行号范围**: `designer-command-adapter-helpers.ts:46-55,83-103`, `core-edge-commands.ts:44-64,92-99`
- **证据片段**:

  ```ts
  export function hasNode(doc: GraphDocument, nodeId: string): boolean {
    return doc.nodes.some((node) => node.id === nodeId);
  }

  export function getNode(doc: GraphDocument, nodeId: string): GraphNode | undefined {
    return doc.nodes.find((node) => node.id === nodeId);
  }

  export function hasEdge(doc: GraphDocument, edgeId: string): boolean {
    return doc.edges.some((edge) => edge.id === edgeId);
  }
  ```

  ```ts
  if (!hasNode(doc, source) || !hasNode(doc, target)) {
    return { error: EDGE_MISSING_NODE_ERROR, reason: 'missing-node' };
  }

  if (!config.rules.allowSelfLoop && source === target) {
    return { error: EDGE_SELF_LOOP_ERROR, reason: 'self-loop' };
  }

  if (hasEdgeConnection(doc, source, target, sourcePort, targetPort, ignoreEdgeId)) {
  ```

- **严重程度**: P2
- **类别**: 性能
- **安全/性能规则编号**: P2（避免图编辑操作中的可避免全量查找，使用索引结构）
- **现状**: `designer-command-adapter` 在 `addEdge` / `reconnectEdge` 前先用 `hasNode` / `hasEdgeConnection` 对 `nodes` / `edges` 做线性扫描，随后 `core.addEdge` / `core.reconnectEdge` 内部又会再次 `find` 节点、`filter` 入/出边并调用 `validateEdgeConnection` 全表扫描。
- **风险**: 连接、重连、插入节点这类高频图交互在节点/边规模增大时会退化为多次 O(n+e) 全表扫描；拖拽连线、批量导入后编辑、自动布局后重连等路径容易出现卡顿，且 renderer adapter 与 core 的重复校验会让优化点分散。
- **建议**: 在 `flow-designer-core` 的 `GraphDocument` 运行时层维护或派生 `nodeById`、`edgeById`、`edgesBySource`、`edgesByTarget` / port 邻接索引；adapter 只调用 core 的结构化校验结果，避免在 renderer 层重复全表校验。
- **为什么值得现在做**: `docs/architecture/flow-designer/design.md:394-398` 已明确要求 node lookup 使用 Map、edges 维护 source/target/port 邻接索引，当前 live 主路径仍停留在线性扫描；v1 基线不接受“后续再优化”的主路径缺口。
- **误报排除**: 这不是单个小数组上的偶发 `find`；该路径属于 Flow Designer 核心图编辑交互，且同一次连接命令会跨 adapter 与 core 重复扫描。也不是自动化硬门禁已覆盖项，当前 suspect 脚本只覆盖 JSON.stringify，不覆盖图邻接索引缺失。
- **历史模式对应**: 对应 `performance-design-requirements.md` 的 P2 图编辑索引化要求，以及 Flow Designer owner 文档“edges 按 source/target/port 建邻接索引”的既有性能策略。
- **参考文档**: `docs/architecture/performance-design-requirements.md:55-58`, `docs/architecture/flow-designer/design.md:392-398`, `docs/references/audit-tooling.md:56`
- **复核状态**: 未复核

### [维度15-02] TreeSelect 多选标签计算为 options × selected 的嵌套查找

- **文件**: `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:332-341`, `packages/flux-renderers-form-advanced/src/tree-options.ts:129-136`
- **行号范围**: `tree-control-controllers.ts:332-341`, `tree-options.ts:129-136`
- **证据片段**:
  ```ts
  const triggerText = React.useMemo(() => {
    const flattenedOptions = flattenTreeOptions(options, treeConfig);
    const selectedLabels = multiple
      ? flattenedOptions
          .filter((entry) => isTreeSelectionChecked(value, entry.value, true))
          .map((entry) => entry.label)
      : flattenedOptions.find((entry) => Object.is(entry.value, value))?.label;
  ```
  ```ts
  export function isTreeSelectionChecked(
    value: unknown,
    candidate: unknown,
    multiple: boolean,
  ): boolean {
    if (multiple) {
      return Array.isArray(value) && value.some((entry) => Object.is(entry, candidate));
    }
  ```
- **严重程度**: P2
- **类别**: 性能
- **安全/性能规则编号**: P2（避免可增长集合上的嵌套查找）
- **现状**: `useTreeSelectController` 每次 `options` / `value` 变化都会先 flatten 全树，再对每个 option 调用 `isTreeSelectionChecked`；多选模式下该函数内部对当前选中值数组执行 `some`，形成 O(可选项数 × 已选项数)。
- **风险**: `tree-select` / `input-tree` 常由外部数据源提供层级选项，选项数和选中数都可增长；多选大树在触发器文本、搜索、选择切换时会出现不必要的 CPU 放大，并可能与未虚拟化的树渲染叠加。
- **建议**: 多选模式下先把 `value` 归一成一次性 membership 结构（例如按稳定 `valueKey` 或保持对象身份的 `Set` / Map），再单次遍历 flattened options 生成标签；同时保留当前 `Object.is` 对象身份语义或明确转换为 valueKey 语义。
- **为什么值得现在做**: 这是局部可修的真实嵌套复杂度，位于用户交互路径而不是测试/诊断路径；修复后可直接降低长树多选成本，并为后续虚拟化或懒加载保留清晰数据结构。
- **误报排除**: 不是单纯“有 filter/find 就报”；证据显示外层遍历所有 flattened options，内层遍历 selected values，且函数位于 React hook 的 UI 派生路径。也不是 React Compiler 或 memo 能自动消除的复杂度问题，因为依赖变化时仍必须执行该计算。
- **历史模式对应**: 对应 `performance-design-requirements.md` 的“避免交互循环中的 accidental quadratic paths”和维度 15 对长列表/tree/select options 的虚拟化与索引化审计口径。
- **参考文档**: `docs/architecture/performance-design-requirements.md:39-43,55-58,132-136`, `docs/skills/deep-audit-prompts.md:1451-1474`
- **复核状态**: 未复核
