# 15 Security Performance

- 深挖轮次: 1
- 深挖发现数: 1

## 第 1 轮初审

### [维度15-01] Table column settings 在渲染循环内重复线性查找列与顺序，形成宽表 O(n²) 热路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer.tsx:291-307,350-374`
- **行号范围**: `291-307`；同类 inline 分支见 `350-374`
- **证据片段**:

  ```tsx
  {orderedColumns.map((key) => {
    const columnIndex = columns.findIndex(
      (column, index) => (column.name ?? `column-${index}`) === key,
    );
    if (columnIndex < 0) {
      return null;
    }

    const column = columns[columnIndex];
    const orderedIndex = orderedColumns.indexOf(key);
  ```

- **严重程度**: P2
- **类别**: 性能
- **安全/性能规则编号**: P2
- **现状**: `orderedColumns.map(...)` 的每次迭代都对 `columns.findIndex(...)` 和 `orderedColumns.indexOf(...)` 做线性扫描；同文件 inline column settings 分支还重复 `visibleColumns.includes(key)`。
- **风险**: 宽表列设置面板在每次 TableRenderer 渲染时构造 children，列数增长后会把列设置渲染推成 O(columns²)，并与 header/filter/selection 等表格交互重渲染叠加。
- **建议**: 在进入 JSX 前用 `useMemo` 构建 `columnsByKey: Map<string, { column, index }>`、`orderIndexByKey: Map<string, number>` 和 `visibleColumnSet`，两个 column-settings 分支复用 O(1) lookup。
- **为什么值得现在做**: table 是已明确纳入高性能 row identity / scope 性能基线的复杂 renderer；这里修复局部、低风险，并能同时消除 overlay 与 inline 两条分支的重复查找。
- **误报排除**: 这不是单纯“大文件”或风格问题，也不是测试代码；命中的是性能文档明示的“repeated id-based lookup in loops”模式。虽然 column settings 不是所有用户都会打开，但 JSX children 当前仍随 TableRenderer render 构造，且宽表列数是可增长输入。
- **历史模式对应**: 对应 `docs/architecture/performance-design-requirements.md` 的 P2 “pre-index by id before transformation” 与历史 table hot-path 拆分/row identity 性能收敛模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/table-row-identity-and-scope-performance.md`; `docs/components/table/design.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度15-02] Dialog/Drawer validationPlan 编译失败时静默降级为无验证，违反 fail-closed 与可观察性要求

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-runtime\src\action-adapter.ts`
- **行号范围**: `43-51`；调用点见 `220-229`、`270-279`
- **证据片段**:
  ```ts
  try {
    const compiled = runtime.compile({
      type: 'page',
      body,
    });
    const root = Array.isArray(compiled.root) ? compiled.root[0] : compiled.root;
    return root?.validationPlan;
  } catch {
    return undefined;
  }
  ```
- **严重程度**: P1
- **类别**: 安全 / 观察性
- **规则编号**: R3 / R4 / P6
- **现状**: `resolveSurfaceValidationPlan` 在 dialog/drawer body 编译失败时直接返回 `undefined`，随后 `openDialog` / `openDrawer` 仍继续打开 surface，只是缺失 `validationPlan`。
- **风险**: 本应阻止提交或提示用户的表单验证可能因 schema 编译异常被静默跳过；同时没有 monitor/diagnostic 输出，宿主只看到弹窗正常打开，很难发现验证边界已经降级。
- **建议**: 将编译失败转为 action failure 或至少阻止创建带表单提交能力的 surface；同时通过 `env.monitor?.onError` 或结构化 diagnostics 记录失败路径、surface kind、node instance 信息。
- **为什么值得现在做**: dialog/drawer 是高频运行时入口，修复点集中在一个 helper；当前行为会把初始化失败伪装成正常无验证状态，后续排查成本高。
- **误报排除**: 这不是已裁定的 declarative surface 双状态或 lifecycle 问题；问题不是 surface open/close，而是 validation owner 初始化失败被吞掉并降级为无验证。也不是单纯开发体验日志缺失，因为代码改变了验证执行结果。
- **历史模式对应**: 对应安全设计 R3 “errors must not silently grant capability” 与 R4 “Do not swallow security-relevant initialization failures silently”；也对应性能设计 P6 “Swallowed errors that can cause hidden degraded behavior are prohibited in runtime-critical paths”。
- **参考文档**: `docs/architecture/security-design-requirements.md`; `docs/architecture/performance-design-requirements.md`; `docs/references/reopened-design-decisions-and-audit-adjudications.md`
- **复核状态**: 未复核

### [维度15-03] ConditionBuilder 多选值渲染对 options/selected 做重复线性扫描，选项规模增长后形成 O(n²) 路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\condition-builder\value-input.tsx`
- **行号范围**: `173-186`、`230-236`
- **证据片段**:

  ```tsx
  const selected = Array.isArray(value) ? value.map(String) : [];

  const toggle = (itemValue: string) => {
    const next = selected.includes(itemValue)
  ...
        selected.map((v) => {
          const opt = options.find((o) => String(o.value) === v);
  ...
          {options
            .filter((o) => !selected.includes(String(o.value)))
            .map((opt) => (
  ```

- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2
- **现状**: 多选值组件在每次渲染时对 `selected` 执行 `includes`，对每个 selected 值再 `options.find`，并对所有 options 过滤时再次 `selected.includes`。
- **风险**: 条件构建器字段/枚举选项来自 schema 或远端数据时，`selected × options` 的重复线性扫描会使复杂规则编辑、搜索和选择交互退化；该路径位于表单高级控件渲染链路内，用户每次切换条件值都会触发。
- **建议**: 在渲染前用 `useMemo` 构建 `selectedSet` 和 `optionByStringValue`，badge label 与剩余 option 过滤都改为 O(1) lookup。
- **为什么值得现在做**: 修复局部、无契约变化，且与既有 Table column settings 发现属于同一类“循环内重复 id/value 查找”，可复用同一优化模式。
- **误报排除**: 不是小数组风格问题；`options` 是外部 schema 数据，规模不由组件保证。也不同于已覆盖的 `table-renderer.tsx` column settings，本问题发生在 condition-builder 多选值控件。
- **历史模式对应**: 对应 `docs/architecture/performance-design-requirements.md` P2 “For repeated id-based lookup in loops, pre-index by id (`Map`) before transformation”。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度15-04] CheckboxGroup 每个 option 渲染时扫描 selectedValues，形成 options × selected 的渲染热路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form\src\renderers\input.tsx:365-386`
- **行号范围**: `365-386`
- **证据片段**:

  ```tsx
  {options?.map((option) => {
    const checked = selectedValues.some((candidate: unknown) =>
      Object.is(candidate, option.value),
    );

    return (
      <Label key={option.value} data-slot="checkbox-group-item">
        <Checkbox
          checked={checked}
  ...
              const nextValue = checkedValue
                ? [...selectedValues, option.value]
                : selectedValues.filter(
                    (candidate: unknown) => !Object.is(candidate, option.value),
                  );
  ```

- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2 / P7
- **现状**: `options.map(...)` 内部对每个 option 执行 `selectedValues.some(...)`；取消选择时再执行 `selectedValues.filter(...)`。当 options 与 selectedValues 均可由 schema / scope 数据增长时，渲染阶段会退化为 O(options × selected)。
- **风险**: checkbox-group 是基础表单控件，远端 options 或大枚举场景下，任一字段值变更、source 状态变更、表单重渲染都会重复扫描选择集，放大表单交互延迟。
- **建议**: 在渲染前用 `useMemo` 构建基于稳定序列化 key 或 SameValueZero 语义的 selected lookup；至少对 primitive option value 构建 `Set`，复杂值保留当前 Object.is fallback。
- **为什么值得现在做**: 这是基础 form renderer 热路径，修复范围局部，且与已发现的 table/condition-builder 重复 lookup 问题可用同一 pre-index 模式处理。
- **误报排除**: 这不是纯样式或小数组偏好问题；`options` 是公开 schema 数据入口，当前代码没有规模上限，也没有虚拟化/分页兜底。该问题不同于已覆盖的 Table column settings 和 ConditionBuilder multi-select，发生在基础表单 CheckboxGroup renderer。
- **历史模式对应**: repeated id/value lookup inside render loop，应按性能要求在循环前预索引。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: 未复核

### [维度15-05] TreeSelect / InputTree 每次渲染重建整棵 option meta，并对每个节点重复扫描选中值

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-controls.tsx:171-174,219-227`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-control-controllers.ts:63,144-153`; `C:\can\nop\nop-chaos-flux\packages\flux-renderers-form-advanced\src\tree-options.ts:129-153`
- **行号范围**: `tree-controls.tsx:171-174,219-227`; `tree-control-controllers.ts:63,144-153`; `tree-options.ts:129-153`
- **证据片段**:
  ```tsx
  const options = buildTreeOptionMetaList(
    props.props.options,
    getTreeOptionConfig(props.props as InputTreeSchema),
  );
  ...
  const options = buildTreeOptionMetaList(props.props.options, treeConfig);
  const { triggerText, triggerLabel, hasSelection } = useTreeSelectController({
    options,
    treeConfig,
    value,
    multiple,
  ```
  ```ts
  const checked = isTreeSelectionChecked(value, option.value, multiple);
  ...
  const flattenedOptions = flattenTreeOptions(options, treeConfig);
  const selectedLabels = multiple
    ? flattenedOptions
        .filter((entry) => isTreeSelectionChecked(value, entry.value, true))
        .map((entry) => entry.label)
  ```
  ```ts
  if (multiple) {
    return Array.isArray(value) && value.some((entry) => Object.is(entry, candidate));
  }
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2 / P7 / P9
- **现状**: `buildTreeOptionMetaList(...)` 在 renderer 每次 render 直接递归重建 option meta；TreeSelect trigger 又 `flattenTreeOptions(...)` 全量展开；每个节点 checked 计算调用 `isTreeSelectionChecked(...)`，多选时对 value 数组 `some(...)` 扫描。
- **风险**: tree options 通常来自远端数据源或 schema 大树。大树 + 多选场景下，任意输入、展开、搜索或表单状态更新都会触发整树重建与 nodes × selected 的重复扫描，且 Popover 内列表没有窗口化兜底。
- **建议**: 用 `useMemo` 缓存 option meta 与 flattenedOptions；为多选值构建 selected lookup，并传入 TreeOptionList / TreeOptionNode；较大同级节点或总节点数超过阈值时引入虚拟化或 lazy window。
- **为什么值得现在做**: tree-select/input-tree 是 advanced form 的复杂交互控件，远端树和多选组合是常见增长输入；局部 memo/index 可以显著减少无关 render 成本。
- **误报排除**: 不是单纯“tree 没虚拟化”的泛泛建议；证据显示当前渲染路径同时存在整树重建、全量 flatten 和每节点 selected 扫描，属于性能文档禁止的重复查找热路径。
- **历史模式对应**: tree/list option meta 每 render 全量重建 + per-node linear lookup，属于 hot path broad invalidation 与重复扫描叠加。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度15-06] Spreadsheet regex 查找在每个 cell 循环内重复创建 RegExp，违背 compile once / execute many

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-core\src\core\search-operations.ts:12-21,40-57`
- **行号范围**: `12-21`、`40-57`
- **证据片段**:

  ```ts
  function createSearchRegex(query: string, matchCase?: boolean) {
    if (!hasSearchQuery(query) || UNSAFE_REGEX_PATTERN.test(query)) {
      return null;
    }

    try {
      return new RegExp(query, matchCase ? '' : 'i');
    } catch {
      return null;
    }
  }
  ```

  ```ts
  for (const [address, cell] of Object.entries(sheet.cells)) {
    const value = String(cell.value ?? '');

    if (options.useRegex) {
      const regex = createSearchRegex(query, options.matchCase);
      if (!regex) {
        continue;
      }

      const match = value.match(regex);
  ```

- **严重程度**: P2
- **类别**: 性能 / 观察性
- **规则编号**: P1 / P6
- **现状**: `findInDocument` 在遍历每个 cell 时调用 `createSearchRegex`，导致同一个 query 的 unsafe-pattern 检查、try/catch 和 `new RegExp(...)` 随单元格数量重复执行。
- **风险**: spreadsheet find 是交互路径；工作簿单元格数增长后，regex 查找成本会被每格重复编译放大。非法 regex 也会在每个 cell 上重复走失败分支，且没有一次性诊断或结构化失败结果。
- **建议**: 在进入 sheet/cell 循环前预编译 regex；编译失败直接返回 `null` 或显式错误状态。循环内只执行 `value.match(compiledRegex)`。
- **为什么值得现在做**: 修复点局部且不改变搜索语义；spreadsheet-core 是可增长数据域，预编译能直接降低大表搜索成本。
- **误报排除**: 这不是测试/调试 stringify，也不是合理的小集合扫描；Spreadsheet 是已明确有虚拟化和性能约束的交互型 surface，当前问题是可直接定位的热路径重复编译。
- **历史模式对应**: compile once / execute many 规则在大集合循环中被违反，类似 validation pattern precompile 与 table pre-index 性能要求。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/architecture/report-designer/design.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度15-07] Flow Designer 批量节点拖拽提交逐节点线性查找并重复复制 nodes 数组，形成 selection × nodes 热路径

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-xyflow-canvas\use-xyflow-interactions.ts:75-94`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-canvas.tsx:264-278`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core-node-commands.ts:100-123`; `C:\can\nop\nop-chaos-flux\packages\flow-designer-core\src\core\node-operations.ts:26-42`
- **行号范围**: `use-xyflow-interactions.ts:75-94`、`designer-canvas.tsx:264-278`、`core-node-commands.ts:100-123`、`node-operations.ts:26-42`
- **证据片段**:
  ```ts
  for (const change of changes) {
    if (change.type === 'position' && change.dragging === false && change.position) {
      const position = {
        x: Math.round(change.position.x),
        y: Math.round(change.position.y),
      };
      const signature = normalizePositionSignature(position);
      lastCommittedPositionsRef.current.set(change.id, signature);
      onMoveNode(change.id, undefined, position);
    }
  }
  ```
  ```ts
  const node = snapshot.doc.nodes.find((item) => item.id === nodeId);
  ...
  const nodeIndex = ctx.doc.nodes.findIndex((n) => n.id === nodeId);
  ...
  const nodeIndex = doc.nodes.findIndex((entry) => entry.id === nodeId);
  const nextNodes = [...doc.nodes];
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P2 / P3
- **现状**: React Flow 一次 `onNodesChange` 可携带多个 selected nodes 的 position 变更；当前代码对每个 position change 调用 `onMoveNode`，随后在 renderer 层 `snapshot.doc.nodes.find(...)`、core 命令层 `ctx.doc.nodes.findIndex(...)`、document operation 层 `doc.nodes.findIndex(...)` 都各自线性扫描，并且每个节点单独 `const nextNodes = [...doc.nodes]` 复制整份 nodes 数组、触发 documentChanged/dirty/history 逻辑。
- **风险**: 多选拖拽是 Flow Designer 的交互热路径。选中 k 个节点、画布中 n 个节点时，一次拖拽提交会退化为 O(k × n) 查找和 O(k × n) 数组复制/事件发射；大图中批量移动会放大主线程卡顿，并产生多次中间 document snapshot，影响后续监听器、history 和 dirty 更新成本。
- **建议**: 在 `handleNodesChange` 中收集本次 position changes，按一次批量命令提交；复用已有 `core.moveNodes(...)` / `moveNodesInDocument(...)` 或新增 absolute-position batch API，在 core 内单次遍历 nodes、单次复制数组、单次 emit/history 更新。若仍需保留单节点 API，至少在 renderer 层预建 `Map<nodeId, node>`，避免每个 change 重新扫描 snapshot nodes。
- **为什么值得现在做**: Flow Designer canvas 是明确的交互型热路径；仓库已有 `moveNodes` 批量能力，但 XYFlow 拖拽提交未使用，修复方向清晰且符合性能文档 “pre-index / single-pass transforms” 要求。
- **误报排除**: 这不是已覆盖的 Table/ConditionBuilder/CheckboxGroup/TreeSelect/Spreadsheet regex 问题；本问题发生在画布节点拖拽提交链路。也不是单个节点移动的小集合偏好，因为 React Flow 的 `changes` 参数天然支持批量节点变更，且 core 已存在 `moveNodesCommand` 批量入口。
- **历史模式对应**: repeated id lookup/copy in loop，且已有 batch API 未被热路径使用。
- **参考文档**: `docs/architecture/performance-design-requirements.md`, `docs/architecture/flow-designer/design.md`
- **复核状态**: 未复核
