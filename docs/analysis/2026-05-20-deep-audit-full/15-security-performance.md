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

## 深挖第 4 轮追加

### [维度15-05] Spreadsheet 选区高亮在每个可见单元格重复计算选区范围，行/列多选会触发 per-cell 排序

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:131-142,413-431`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts:182-195,216-224`
- **行号范围**: `table-shell.tsx:131-142,413-431`; `use-selection.ts:182-195,216-224`
- **证据片段**:
  ```ts
  const inRange = isInRange(row, col);
  ```
  ```tsx
  {viewport.visibleColIndices.map((col) => (
    <SpreadsheetGridCell
      key={`${row}-${col}`}
      row={row}
      col={col}
      ...
      isInRange={isInRange}
  ```
  ```ts
  const getSelectedRange = useCallback((): SpreadsheetRange | null => {
    ...
    if (snapshot.selection.kind === 'row' && snapshot.selection.rows?.length) {
      const rows = [...snapshot.selection.rows].sort((a, b) => a - b);
      return createRange(sheetId, rows[0]!, 0, rows[rows.length - 1]!, totalCols - 1);
    }
    if (snapshot.selection.kind === 'column' && snapshot.selection.columns?.length) {
      const columns = [...snapshot.selection.columns].sort((a, b) => a - b);
      return createRange(sheetId, 0, columns[0]!, totalRows - 1, columns[columns.length - 1]!);
    }
  ```
  ```ts
  const isInRange = useCallback(
    (row: number, col: number): boolean => {
      const range = getSelectedRange();
      if (!range) return false;
      return (
        row >= range.startRow && row <= range.endRow && col >= range.startCol && col <= range.endCol
      );
    },
    [getSelectedRange],
  );
  ```
- **严重程度**: P2
- **类别**: 性能
- **安全/性能规则编号**: P2（虚拟化渲染路径中避免 per-cell 重复派生和可增长集合排序）
- **现状**: `SpreadsheetGrid` 已在父层计算一次 `selectedRange` 并传给每个 cell，但 `SpreadsheetGridCell` 仍对每个可见单元格调用 `isInRange(row, col)`；`isInRange()` 内部又调用 `getSelectedRange()`。当选区是行/列多选时，`getSelectedRange()` 会复制并排序 `selection.rows` / `selection.columns`，导致一次表格渲染按“可见单元格数 × 已选行/列数 log n”重复计算。
- **风险**: Spreadsheet 虚拟化只限制 DOM 节点数量，但冻结区、overscan、大 viewport、列宽较窄时可见单元格仍可达到数百到上千；行/列多选、拖拽扩展选区、键盘选择等高频路径会把同一个选区范围在每个 cell 上重复排序和构造对象，造成渲染卡顿。已传入的 `selectedRange` 未被复用，说明这是可避免的热路径浪费。
- **建议**: 在 `useSelection` 或 `SpreadsheetGrid` 层将 selected range 作为 memoized 派生值一次性计算，并让 cell 直接基于传入的 `selectedRange` 做 O(1) 边界判断；行/列多选的 min/max 应在选择状态更新时维护，或至少在单次 render 中缓存，避免 per-cell sort。
- **误报排除**: 这不是普通的小数组 `includes`；证据显示该函数在每个可见 cell 渲染中调用，且行/列选择会复制排序可增长集合。也不同于已有 [维度15-01] 图编辑索引缺失、[维度15-02] TreeSelect 嵌套查找、[维度15-04] Table 过滤热路径，这是 Spreadsheet 网格渲染主路径中的独立重复派生问题。
- **参考文档**: `docs/architecture/performance-design-requirements.md:39-47,55-58,132-140`
- **复核状态**: 未复核

### [维度15-06] Report Designer 每次 Spreadsheet 文档同步都深拷贝整棵文档并进入 undo 栈

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:467-479`, `packages/report-designer-core/src/core.ts:312-318,441-450`
- **行号范围**: `page-renderer.tsx:467-479`; `core.ts:312-318,441-450`
- **证据片段**:

  ```ts
  useEffect(() => {
    const nextSpreadsheetDocument = spreadsheetSnapshot.document;

    if (syncingSpreadsheetFromReportRef.current) {
      return;
    }
    if (nextSpreadsheetDocument === lastSyncedSpreadsheetRef.current) {
      return;
    }

    lastSyncedSpreadsheetRef.current = nextSpreadsheetDocument;
    core.syncSpreadsheetDocument(spreadsheetSnapshot.document);
  }, [core, spreadsheetSnapshot.document]);
  ```

  ```ts
  syncSpreadsheetDocument(nextDocument) {
    const currentDocument = store.getState().document;
    const changed = applyDocumentChange({
      ...currentDocument,
      spreadsheet: structuredClone(nextDocument),
    });

    if (changed) {
      store.setState((current) => ({ ...current, spreadsheetSyncSource: nextDocument }));
      void refreshDerivedState();
    }
  },
  ```

  ```ts
  function pushUndoEntry(
    current: ReportDesignerInternalState,
  ): Partial<ReportDesignerInternalState> {
    const maxDepth = config.maxUndoDepth ?? 50;
    const undoStack = [...current.undoStack, current.document];
    if (undoStack.length > maxDepth) undoStack.shift();
    return { undoStack, redoStack: [] };
  }
  ```

- **严重程度**: P2
- **类别**: 性能
- **安全/性能规则编号**: P1 / P2（交互热路径避免整文档深拷贝；长生命周期 undo 栈避免大对象放大）
- **现状**: Report Designer renderer 订阅 `spreadsheetSnapshot.document`，每次 Spreadsheet core 文档 identity 变化都会调用 `core.syncSpreadsheetDocument()`；该方法对完整 spreadsheet 子树执行 `structuredClone(nextDocument)`，随后 `applyDocumentChange()` 将当前完整 report document 推入 undo 栈，默认最多 50 层。
- **风险**: 单元格编辑、粘贴、拖拽填充、样式批量修改等 Spreadsheet 高频操作都会同步到 Report Designer。随着 workbook/cells/styles/metadata 增长，每次操作都要深拷贝整棵 spreadsheet 文档，并保留历史 report document 引用，容易造成 CPU 峰值和内存放大；批量粘贴或连续编辑时，`structuredClone` 与 undo 栈会成为主交互路径瓶颈。
- **建议**: 将 report/spreadsheet 同步改为补丁或 command-level history：Spreadsheet core 产出可逆变更记录，Report Designer 只记录增量 patch 或共享不可变结构；至少对同步路径做 batch/debounce，并避免把每个单元格级变化都作为完整 report document undo entry。对于保存/导出再做深拷贝，交互同步路径不应整文档 clone。
- **误报排除**: 这不是保存/导出时的边界 clone；触发点在 `useEffect` 监听 spreadsheet document identity 的运行态同步路径。也不是已有 [维度15-03] source props JSON.stringify 变更检测或 [维度15-04] Table 过滤问题；这里的成本来自 Report Designer 与 Spreadsheet 跨包同步时的整文档 `structuredClone` 和 undo 历史放大。
- **参考文档**: `docs/architecture/performance-design-requirements.md:39-47,51-58,132-140`, `docs/architecture/report-designer/design.md`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度15-07] Spreadsheet 行过滤会按最大行号全量回填，稀疏大表过滤可被单个远端单元格放大

- **文件**: `packages/spreadsheet-core/src/core/filter-operations.ts:15-37`, `packages/spreadsheet-renderers/src/spreadsheet-grid/use-context-menu-actions.ts:236-248`
- **行号范围**: `filter-operations.ts:15-37`; `use-context-menu-actions.ts:236-248`
- **证据片段**:

  ```ts
  const candidateRows = Object.values(cells)
    .filter((cell) => newFilterColumns.some((f) => f.col === cell.col))
    .map((cell) => cell.row);
  const maxRow = candidateRows.length > 0 ? Math.max(...candidateRows) : -1;

  const rows = { ...sheet.rows };
  for (let row = hasHeader ? 1 : 0; row <= maxRow; row++) {
    const key = String(row);
    const matchesAll = newFilterColumns.every((f) => {
      const cell = cells[cellAddress(row, f.col)];
  ```

  ```ts
  const selectedCellValue =
    cells?.[cellAddress(selectionAnchorCell.row, selectionAnchorCell.col)]?.value;
  await bridge.dispatch({
    type: 'spreadsheet:filterRowsByCellValue',
    sheetId: activeSheetId,
    col: selectionAnchorCell.col,
    value: selectedCellValue,
  });
  ```

- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P1 / P2
- **当前状态**: Spreadsheet 右键“按选中值过滤”进入 core 后，先遍历所有 `cells` 并对每个 cell 执行 active filters 的 `some`，再用 `Math.max(...candidateRows)` 得到最大行号，随后从 0 到 `maxRow` 为每一行计算 `every` 并写入 `rows[key]`。
- **风险**: 对稀疏大表，一个很远的有值单元格会让过滤路径回填大量空行元数据；多列过滤时成本变为 `cells × filters + maxRow × filters`。`Math.max(...candidateRows)` 还会在候选 cell 很多时创建大参数列表，存在栈/参数数量放大风险。虚拟化只限制渲染，不限制该 core 过滤计算与状态写入。
- **建议**: 过滤应基于实际 used-row/index 结构，而不是 `0..maxRow` 回填；维护 sheet 级 `usedRowsByColumn` / row index，过滤时只计算候选 row 集合，并用增量 patch 标记过滤状态。`maxRow` 应用单次循环求值，避免 spread 大数组。
- **误报排除**: 这不是已有 Spreadsheet 选区 per-cell 排序问题，也不是 Table 搜索过滤问题；这里位于 spreadsheet core 的行过滤命令路径，风险来自稀疏表 `maxRow` 扫描和 `cells × filters` 派生。
- **参考文档**: `docs/architecture/performance-design-requirements.md:39-47,55-58,132-140`
- **复核状态**: 未复核

### [维度15-08] Word Editor 自动保存每次编辑后同步序列化整篇文档并写 localStorage

- **文件**: `packages/word-editor-renderers/src/editor-canvas.tsx:52-70,108-110`
- **行号范围**: `editor-canvas.tsx:52-70,108-110`
- **证据片段**:
  ```ts
  const debouncedSave = () => {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const value = bridge.getValue();
      if (value) {
        const editorValue = value.data;
        const paperSettings = bridge.getPaperSettings();
        const saved = createSavedDocumentData({
  ```
  ```ts
          localStorage.setItem('nop-word-editor-document', JSON.stringify(saved));
          onAutosaveRef.current?.(saved);
        }
      }, 500);
    };
  ```
  ```ts
  onContentChange: () => {
    debouncedSave();
    editorStore.setDirty(true);
  },
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P1 / P6
- **当前状态**: Word Editor 的 `onContentChange` 每次内容变化都会安排 500ms 自动保存；保存回调在主线程读取完整 editor value，构造完整 `SavedDocumentData`，执行 `JSON.stringify(saved)`，再同步 `localStorage.setItem(...)`。
- **风险**: 大文档、图表、代码块或连续输入场景下，自动保存会周期性阻塞主线程；localStorage quota 或不可用异常也没有走 `word-editor-core` 中已有的结构化 persist 错误路径，可能形成难诊断的 autosave 退化。
- **建议**: 将自动保存改为 owner-controlled persistence pipeline：使用 idle/deferred 写入、大小阈值、增量 dirty segments 或后台持久化 adapter；复用 `word-editor-core` 的 persist 错误封装，并将 autosave 失败反馈到 store/monitor。
- **误报排除**: 这不是一次性导出/手动保存的合理序列化；触发点直接挂在 `onContentChange` 编辑主路径上，且 `localStorage.setItem` 是同步阻塞 API。
- **参考文档**: `docs/architecture/performance-design-requirements.md:44-47,73-76,132-140`
- **复核状态**: 未复核

## 深挖第 6 轮追加

未发现新的高价值问题。深挖结束。
