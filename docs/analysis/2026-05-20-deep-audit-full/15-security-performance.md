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

## 深挖第 2 轮追加

### [维度15-03] source props 控制器用 JSON.stringify 做运行态变更判定，热路径成本与语义都不稳定

- **文件**: `packages/flux-react/src/node-source-prop-controller.ts:51-67,219-238`; `packages/flux-react/src/use-node-source-props.ts:86-92`
- **行号范围**: `node-source-prop-controller.ts:51-67,219-238`; `use-node-source-props.ts:86-92`
- **证据片段**:

  ```ts
  function safeValueKey(value: unknown): string | undefined {
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  ```

  ```ts
  const nextRunState: ControllerRunState = {
    scopeId: scope.id,
    scopePath: scope.path,
    scopeStore: scope.store,
    entriesKey: createEntriesKey(sourceEntries),
    baseValueKey: safeValueKey(baseValue),
  };
  ```

  ```ts
  useEffect(() => {
    if (!hasSourceProps) {
      return;
    }

    controller.run(propsValue, scope);
  }, [controller, hasSourceProps, propsValue, scope]);
  ```

- **严重程度**: P2
- **类别**: 性能
- **安全/性能规则编号**: P1（避免在热路径用深层 `JSON.stringify` 做变更检测）
- **现状**: `useNodeSourceProps` 在 renderer props 变化后调用 `controller.run()`，而 `createNodeSourcePropController.run()` 每次都会对 `sourceEntries` 和剔除 source 后的 `baseValue` 执行 `JSON.stringify`，并把字符串结果作为是否重跑 source observer 的判定键。
- **风险**: source prop 常用于 options/data 等可增长 schema 片段；这里的序列化发生在 renderer source-prop 更新路径，不是诊断或稳定 cache-key 边界。大型嵌套 props 会把每次变更判定放大为深遍历序列化；遇到循环或不可序列化值时 `safeValueKey()` 返回 `undefined`，不同输入可能坍缩成同一个 key，既可能掩盖真实变更，也可能让后续优化无法依赖结构化 identity。
- **建议**: 用结构化 revision / 引用 identity / 编译期 source plan key 替代深层 stringify；`sourceEntries` 可由编译期稳定 source plan 与 targetPath 列表生成增量签名，`baseValue` 应通过 shallow equality、显式 changed paths 或 source-free props revision 判定是否需要重跑 observer。
- **误报排除**: 这不是 suspect 脚本已排除的日志、展示、测试辅助或 API cache key；代码位于 `packages/flux-react` 的 renderer source-prop 主路径，且 `JSON.stringify` 结果直接决定运行时是否重跑 source observer。也不同于已有 [维度15-02] 的 TreeSelect options × selected 嵌套查找，这是独立的 source-prop 变更检测序列化红线。
- **参考文档**: `docs/architecture/performance-design-requirements.md:44-47,51-54,132-136`; `docs/skills/deep-audit-prompts.md:1461-1464`; `docs/references/audit-tooling.md:56`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度15-04] Table 可搜索过滤在每次按键同步全量重算，虚拟化只覆盖渲染不覆盖过滤热路径

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-filter.ts:122-157`, `packages/flux-renderers-data/src/table-renderer.tsx:231-237,303-307`, `packages/flux-renderers-data/src/table-renderer/table-data.ts:96-108`
- **行号范围**: `use-table-filter.ts:122-157`; `table-renderer.tsx:231-237,303-307`; `table-data.ts:96-108`
- **证据片段**:
  ```ts
  const handleSearch = useCallback(
    (columnName: string, keyword: string) => {
      const prev = filterState;
      const newFilters: FilterState = { ...prev };
      const current = newFilters[columnName] ?? { values: new Set<string>(), keyword: undefined };
  ```
  ```ts
  onFilterChange?.(null, {
    scope: helpers.createScope(
      { column: columnName, filters: Array.from(current.values), keyword },
      { scopeKey: 'filter', pathSuffix: 'filter' },
    ),
  });
  onFilterStateChange?.(newFilters);
  ```
  ```ts
  const filteredData = useMemo(
    () => processTableData(source, schemaProps.rowKey, sortState, filterState),
    [source, schemaProps.rowKey, sortState, filterState],
  );
  ```
  ```ts
  if (values.keyword && values.keyword.trim().length > 0) {
    const needle = values.keyword.trim().toLowerCase();
    data = data.filter((row) =>
      String(row.record[columnName] ?? '')
        .toLowerCase()
        .includes(needle),
    );
  }
  ```
- **严重程度**: P2
- **类别**: 性能
- **安全/性能规则编号**: P1 / P2（交互热路径避免全量数据重算；长列表虚拟化不能只覆盖 DOM 渲染）
- **现状**: 表头搜索框每次 `onChange` 都调用 `handleSearch`，随后同步调用 `onFilterStateChange?.(newFilters)`，父层回调会立即基于完整 `source` 执行 `processTableData()`；渲染层虽然在 `virtualThreshold` 命中时启用虚拟化，但过滤、关键字 lower-case、逐行 includes 仍在每次按键上遍历全量数据。
- **风险**: 大表格开启 searchable/filterable 后，用户每输入一个字符都会触发全量过滤和分页 clamp 计算；数据量达到虚拟化阈值时 DOM 行数被控制住，但 CPU 过滤成本仍随 `source.length × 活跃过滤列数` 增长，容易造成输入卡顿，并且 `startTransition` 只包住状态写入，无法取消或合并外部 `onFilterStateChange` 的同步全表重算。
- **建议**: 将搜索关键字更新与全量过滤计算解耦：对搜索输入使用 debounce / `useDeferredValue` / 显式查询提交，或为 table 数据处理建立可取消的 deferred filter pipeline；分页 clamp 应基于已延迟稳定的 filter state 触发。对大数据表应明确 server-side filtering 或索引化/增量过滤策略，避免每个 keystroke 扫描完整 `source`。
- **误报排除**: 这不是已有 [维度15-02] 的 TreeSelect options × selected 嵌套查找，也不是已有 [维度15-03] 的 JSON.stringify 变更检测；该问题位于 table 搜索输入的主交互路径。也不是“已经虚拟化所以无风险”，因为 `virtualEnabled` 只影响 `TableBodyRows` 的 DOM 渲染，`processTableData()` 在虚拟化判断后仍按完整 `source` 执行过滤。
- **参考文档**: `docs/architecture/performance-design-requirements.md:39-47,122-124,132-140`; `docs/skills/deep-audit-prompts.md:1451-1474`
- **复核状态**: 未复核
