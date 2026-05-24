# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] spreadsheet grid 同时用 React state 与 spreadsheet runtime 维护 viewport scroll 位置

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:111-191`
- **证据片段**:
  ```tsx
  const [scrollTop, setScrollTop] = useState(snapshot.runtime.viewport?.scrollY ?? 0);
  const [scrollLeft, setScrollLeft] = useState(snapshot.runtime.viewport?.scrollX ?? 0);
  ...
  setScrollTop(el.scrollTop);
  setScrollLeft(el.scrollLeft);
  void bridge.dispatch({
    type: 'spreadsheet:setViewport',
    viewport: {
      scrollX: el.scrollLeft,
      scrollY: el.scrollTop,
  ```
- **严重程度**: P2
- **现状**: grid 将 `scrollTop/scrollLeft` 作为本地 React state 初始化自 `snapshot.runtime.viewport`，滚动时又同时更新本地 state 与 runtime store 的 viewport。
- **风险**: 若 viewport 由外部命名空间 action、恢复布局、协作回放、测试/宿主控制等 runtime 路径更新，本地 `scrollTop/scrollLeft` 不会从新的 `snapshot.runtime.viewport` 重新对齐；随后 effect 会继续用旧本地 state 回写 DOM scroll，导致 runtime 中的 viewport 与实际画布位置分叉。
- **建议**: 明确单一 owner：要么 viewport scroll 位置只归 spreadsheet runtime，grid 从 `snapshot.runtime.viewport` 派生并只保留 DOM ref；要么本地 state 只作为未发布的临时测量态，不再作为 runtime viewport 的事实来源，并补齐外部 runtime viewport 变更到 DOM 的同步入口。
- **为什么值得现在做**: viewport 已有正式 runtime command，双写会直接影响 host action、恢复滚动位置、调试快照和未来协作/撤销语义的一致性。
- **双状态详情**: 第一份事实源是 `spreadsheet-grid.tsx` 的本地 `scrollTop/scrollLeft`；第二份事实源是 `SpreadsheetRuntimeSnapshot.runtime.viewport` / `spreadsheet:setViewport` 写入的 spreadsheet core store。
- **同步失败症状**: 外部调用 `spreadsheet:setViewport({ scrollX, scrollY })` 后，runtime snapshot 显示新 viewport，但 grid DOM 仍保持旧滚动位置，甚至被 `useEffect([scrollLeft, scrollTop])` 按旧本地 state 拉回。
- **误报排除**: 这不是单纯 hover/展开/选中之类局部 UI state；scroll 坐标已经通过 `spreadsheet:setViewport` 成为 runtime-owned snapshot，可被 host scope/action 读取和写入。
- **历史模式对应**: local state + runtime store 双写同一份状态，类似历史 ArrayEditor/CheckboxGroup 的本地值与 store 值不同步风险。
- **参考文档**: `docs/architecture/scope-ownership-and-isolation.md`; `docs/architecture/report-designer/api.md`; `docs/components/report-designer-page/design.md`
- **复核状态**: 未复核

## 检查范围

已按要求先读取并遵守共享前缀、维度 04 正文、附录 A、owner 文档：`docs/architecture/form-validation.md`、`docs/architecture/scope-ownership-and-isolation.md`。

重点搜索/阅读模式：`useState(...)` / `React.useState(...)`、`useEffect(...)` + setter / props-to-state、`useRef(...)` 缓存 store/scope 数据、surface/dialog open state、complex field 本地 draft/cache、designer/spreadsheet/report 双 runtime 同步。

重点复核文件包括：

- `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- `packages/flux-react/src/render-nodes.tsx`
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`
- `packages/flux-renderers-form-advanced/src/key-value.tsx`
- `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`
- `packages/flux-renderers-form-advanced/src/variant-field/variant-field-controller.ts`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-draft-controller.ts`
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`
- `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts`
- `packages/flux-renderers-data/src/table-renderer/use-table-selection.ts`
- `packages/flux-renderers-data/src/table-renderer/use-table-filter.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`
- `packages/flow-designer-renderers/src/designer-tree-mode.tsx`

## 候选排除清单

- `packages/flux-react/src/render-nodes.tsx:340` 的 `readOwn()`：位于 commit/layout effect 阶段的 fragment scope reconciliation，不是 render-phase 第二事实源；更贴近维度 05 的订阅/读面候选。
- `packages/flux-renderers-basic/src/use-surface-renderer.ts`：未发现旧 `localOpen` 双状态；当前 open owner 为 controlled prop 或 `surfaceRuntime.store.uncontrolledOpenById`，本地 `openRevision/openingData` 更像 surface scope generation/data seed，不重复 reopen plan 211 历史双状态。
- `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`：`resolvedValue` 是 transformIn/transformOut 工作值，命中 reopened adjudication 的 draft/adapter cache 类，未见直接提交绕过 owner 的独立事实源。
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts`：`draftValue/savedValue/draftRecordRef` 属已裁定的 quick-edit draft cache 模式；本轮未重复报告。
- `packages/flux-renderers-form-advanced/src/array-editor.tsx`、`key-value.tsx`、`condition-builder.tsx`：`itemsRef/pairsRef/valueRef` 用于 runtime registration callback 读取最新值，真实值仍来自 form/scope selector 与 `setValue/update`；未见本地 state 先行成为提交事实源。
- `packages/report-designer-renderers/src/page-renderer.tsx` 的 report core / spreadsheet core 双 runtime：存在显式 bridge 与 source-ref short-circuit，且 host-data 测试明确区分 canonical report document 与 spreadsheet draft snapshot；初审不作为新发现。
- `packages/flow-designer-renderers/src/designer-tree-mode.tsx`：`acceptedHostDocumentRef` 是 host-owned tree mode 的变更接纳哨兵，避免覆盖本地编辑；未见用户可见双写故障。
- 表格 filter/sort/selection/visible column 的 local fallback：多数是 schema 明确允许的 local/controlled/scope ownership 分支；其中 column defaults 对 schema 变更的处理可作为第 2 轮继续深挖，但本轮证据不足以直接判定为第二事实源缺陷。

## 总结评估

第 1 轮初审发现 1 条新的高价值候选：spreadsheet grid viewport scroll 位置在 React local state 与 spreadsheet runtime store 中双写。其余复杂字段 draft cache、surface open、detail draft、quick edit、report/spreadsheet bridge 均已按 owner 文档与 reopened adjudication 排除，未重复旧 dual-state 裁定。

## 建议第 2 轮深挖方向

- 深挖 `spreadsheet:setViewport` 是否存在外部 action、状态恢复、测试或 host scope 写入路径，补强用户可见复现。
- 继续核对 table column settings 在 columns/schema 动态变化时 local visible defaults 是否会隐藏新增列；若有测试或 schema 动态更新路径，再决定是否升级为独立发现。

## 深挖第 2 轮追加

### [维度04-02] table 本地列可见性把 schema 默认列集冻结在首次渲染，动态 columns 新增/hidden 变更不会生效

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts:27-65`
- **证据片段**:

  ```ts
  const defaultVisibleColumns = useMemo(
    () =>
      columns
        .filter((column) => column.hidden !== true)
        .map((column, index) => column.name ?? `column-${index}`),
    [columns],
  );

  const [localVisibleColumns, setLocalVisibleColumns] = useState<string[]>(defaultVisibleColumns);
  ```

- **严重程度**: P2
- **现状**: `columnSettings.enabled` 且未配置 `toggledColumnsStatePath` 时，`localVisibleColumns` 只在首次 render 从 `defaultVisibleColumns` 初始化；后续 `columns` schema 动态变化只会更新 `defaultVisibleColumns`，不会重新协调 `localVisibleColumns`。
- **风险**: 动态新增的可见列默认不会显示；已从 schema 改为 `hidden: true` 的列仍可能继续显示。表格实际列可见性与当前 schema 分叉，CRUD/table 动态列场景会出现“schema 已声明但 UI 不出现”或“schema 已隐藏但 UI 仍显示”的用户可见问题。
- **建议**: 明确 local owner 的语义。可将本地状态改为“用户 override/delta”而非完整可见列事实源，最终可见列从当前 `columns` + override 派生；或在 columns key/default hidden 集合变化时对 `localVisibleColumns` 做受控 reconcile，补入新默认可见列并剔除当前 schema 已隐藏/已删除列。
- **为什么值得现在做**: 表格列配置是用户可见功能，且动态 columns 是低代码 schema 的常见能力；修复可以局部收敛默认值与本地 override 的边界。
- **双状态详情**: 第一份状态是当前 schema 派生的 `defaultVisibleColumns`；第二份状态是 React 本地 `localVisibleColumns`。二者表达同一件事：没有 scope owner 时哪些列应可见。
- **同步失败症状**: 父 schema/表达式把 columns 从 `[name,email]` 更新为 `[name,email,role]` 后，`role` 被 `orderedColumns` 补入设置菜单，但表格主体仍因 `localVisibleColumns` 缺少 `role` 而不显示；或者 schema 将 `email.hidden` 改为 `true` 后，本地可见列仍保留 `email`。
- **误报排除**: 这不是“显式 scope-owned 空数组”的旧问题；scope path 分支已保留 `[]`。本问题只发生在无 `toggledColumnsStatePath` 的 local fallback，属于 props/schema 默认值被冻结为本地事实源。
- **历史模式对应**: props-derived local state 冻结 schema 默认值，导致 local state 与 schema/current owner 分叉。
- **参考文档**: `docs/architecture/scope-ownership-and-isolation.md`; `docs/architecture/renderer-runtime.md`
- **复核状态**: 未复核

### [维度04-03] report-designer 保存只清 report core dirty，spreadsheet bridge dirty 仍让宿主状态保持未保存

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:469-550`; `packages/report-designer-core/src/core-dispatch.ts:321-328`
- **证据片段**:
  ```tsx
  useEffect(() => {
    const nextSpreadsheetDocument = spreadsheetSnapshot.document;
    ...
    lastSyncedSpreadsheetRef.current = nextSpreadsheetDocument;
    core.syncSpreadsheetDocument(spreadsheetSnapshot.document);
  }, [core, spreadsheetSnapshot.document]);
  ```
  ```tsx
  useStatusPathPublication<ReportDesignerHostStatusSummary>(
    ...
    {
      kind: 'report-designer',
      dirty: snapshot.dirty || spreadsheetSnapshot.dirty,
  ```
- **严重程度**: P2
- **现状**: spreadsheet 编辑会先让 `spreadsheetCore` dirty，再通过 `core.syncSpreadsheetDocument(...)` 同步进 report document；但 `report-designer:save` 只把 report core 的 `savedDocument` 指向当前 document，不会清理 spreadsheet core 的 `dirty`。同时对外 status 使用 `snapshot.dirty || spreadsheetSnapshot.dirty`。
- **风险**: 用户保存 report 后，导出的 report document 已包含 spreadsheet 改动，但宿主 `statusPath.dirty` 仍为 true。上层导航守卫、保存按钮状态、dirty badge 会认为仍有未保存改动，形成跨 runtime 状态所有权冲突。
- **建议**: 为 report/spreadsheet bridge 定义统一 save owner。保存 report 时应同步标记 spreadsheet draft 已提交，或让 status dirty 只以 report canonical document 的 saved 状态为准；若保留双 dirty 汇总，则需要一个 bridge-level commit/ack 方法同时清 report core 与 spreadsheet core 的 dirty baseline。
- **为什么值得现在做**: dirty 状态直接影响宿主保存提示和导航守卫，是用户可见的核心工作台状态。
- **双状态详情**: 第一份 dirty owner 是 report core 的 `state.document !== state.savedDocument`；第二份 dirty owner 是 spreadsheet core 的 `spreadsheetSnapshot.dirty`。二者共同描述同一个 report 页面是否有未保存内容。
- **同步失败症状**: 编辑单元格后触发 `report-designer:save`，返回的保存数据包含单元格改动，但 `statusPath.dirty` 仍因 `spreadsheetSnapshot.dirty` 为 true 而保持未保存状态。
- **误报排除**: 第 1 轮已排除 report/spreadsheet 文档双 runtime 的 source-ref short-circuit 本身；本条不是重复报告“有两个 runtime”，而是指出保存/dirty publication 这个跨 runtime owner 没有共同 commit 边界。
- **历史模式对应**: 跨 domain bridge 的双 owner 状态缺少共同 commit/ack 边界。
- **参考文档**: `docs/architecture/report-designer/design.md`; `docs/architecture/scope-ownership-and-isolation.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度04-04] word-editor runtime.currentPage 在 editor-store 与 canvas-editor 实际页码之间形成失效镜像

- **文件+行号**: `packages/word-editor-core/src/editor-store.ts:53-100`; `packages/word-editor-renderers/src/editor-canvas.tsx:95-130`; `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:133-166`
- **证据片段**:
  ```ts
  currentPage: number;
  totalPages: number;
  scale: number;
  ...
  currentPage: 0,
  totalPages: 0,
  ...
  setCurrentPage(page: number) {
    store.setState({ currentPage: page });
  }
  ```
  ```tsx
  onPageSizeChange: (payload) => {
    editorStore.setTotalPages(payload);
  },
  onPageScaleChange: (payload) => {
    editorStore.setScale(payload);
  },
  ```
  ```ts
  currentPage: state.currentPage,
  totalPages: state.totalPages,
  scale: state.scale,
  ```
- **严重程度**: P2
- **现状**: `EditorStore` 将 `currentPage` 作为 runtime host projection 的实时字段发布，但 live canvas bridge 只接线了 `pageSizeChange` 和 `pageScaleChange`，没有任何生产路径调用 `setCurrentPage(...)`。
- **风险**: 宿主 schema、状态面板或自动化逻辑读取 `runtime.currentPage` 时会得到 editor-store 默认值，而非 canvas-editor 当前页；同一 runtime 摘要中 `totalPages/scale` 看起来实时，容易误导调用方把 `currentPage` 也当作可信事实源。
- **建议**: 明确单一 owner：要么从 canvas-editor 的页码变化事件接入 `editorStore.setCurrentPage(...)`，让 editor-store 成为真实投影；要么在未能可靠接线前从 manifest、host projection 和 docs 中移除/标记不可用的 `runtime.currentPage`。
- **双状态详情**: 第一份状态是 canvas-editor 内部实际滚动/页码位置；第二份状态是 `EditorStore.currentPage` 及其 host projection `runtime.currentPage`。
- **同步失败症状**: 用户翻到第 3 页后，canvas 中实际页码变化，但 `$wordEditor.runtime.currentPage` / probe runtime 仍保持 `0`，依赖该字段的页码显示、导航禁用或自动化断言会错误。
- **误报排除**: 这不是“只读 host projection 返回 by-reference view”的允许模式；这里的问题不是引用可变性，而是公开 runtime 字段有独立 store 槽位却没有 live owner 同步路径。
- **参考文档**: `docs/components/word-editor-page/design.md`; `docs/architecture/scope-ownership-and-isolation.md`
- **复核状态**: 未复核

### [维度04-05] word-editor chart/code 计数由 React 本地数组维护，已与“从 canvas tag 重建”持久化 owner 分叉

- **文件+行号**: `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:84-171`; `packages/word-editor-renderers/src/word-editor-action-provider.ts:200-226`; `packages/word-editor-core/src/document-io.ts:337-366`
- **证据片段**:
  ```ts
  const [charts, setCharts] = useState<DocChart[]>(() => normalizeDocCharts(props.props.initialCharts));
  const [codes, setCodes] = useState<DocCode[]>(() => normalizeDocCodes(props.props.initialCodes));
  ...
  chartCount: charts.length,
  codeCount: codes.length,
  ```
  ```ts
  input.bridge.insertChart(chart);
  input.setCharts([...input.getCharts(), chart]);
  ...
  input.bridge.insertCode(code);
  input.setCodes([...input.getCodes(), code]);
  ```
  ```ts
  data: {
    header: value.data.header ?? [],
    main: value.data.main,
    footer: value.data.footer ?? [],
    charts: extractDocChartsFromDocument(value.data),
    codes: extractDocCodesFromDocument(value.data),
  },
  ```
- **严重程度**: P2
- **现状**: 插入 chart/code 时同时写 canvas 文档 tag 和 React 本地 `charts/codes` 数组；保存/autosave 又从 canvas 文档 tag 重新提取 persisted `charts/codes`。host runtime 的 `chartCount/codeCount` 使用本地数组长度，而 host document 使用保存快照中的 tag 提取结果。
- **风险**: 如果用户在 canvas 中删除或编辑 `nop:chart` / `nop:code` 占位符，保存结果会按 canvas tag 重建，但 runtime `chartCount/codeCount` 仍可能保留旧本地数组计数；宿主 dirty/status、侧栏 badge 或校验逻辑会看到与实际可保存文档不一致的数量。
- **建议**: 将 chart/code registry 的单一事实源收敛到 canvas document tag 提取结果；runtime 计数应从同一 owner 派生，或在 canvas 内容变化/autosave 后用提取结果 reconcile 本地派生缓存，避免 action 插入数组成为第二事实源。
- **双状态详情**: 第一份状态是 canvas 文档中的 `nop:chart` / `nop:code` tags，并由 `extractDocChartsFromDocument` / `extractDocCodesFromDocument` 决定保存事实；第二份状态是 `useWordEditorState` 的 React `charts/codes` 数组及 `runtime.chartCount/codeCount`。
- **同步失败症状**: 插入一个图表后再在编辑器中删除该占位符，保存快照 `document.charts` 可为空，但 `runtime.chartCount` 仍显示 1。
- **误报排除**: 这不是允许的“document 与 runtime 时效不同”滞后投影；文档明确要求 persisted `charts/codes` 从 live tags 重建且 `initialCharts/initialCodes` 不再作为第二事实源，而当前 runtime count 仍由独立 React 数组驱动。
- **参考文档**: `docs/components/word-editor-page/design.md`; `docs/architecture/scope-ownership-and-isolation.md`
- **复核状态**: 未复核

## 深挖第 4 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- `[维度04-01]`: 保留（P2）。重新核对 live code 确认 `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 仍以本地 `scrollTop/scrollLeft` 驱动 viewport，同时滚动时 dispatch `spreadsheet:setViewport`；`spreadsheet-core` 与文档均把 viewport 作为 runtime snapshot/host projection 状态。
- `[维度04-02]`: 保留（P2）。`packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts` 仍用 `useState(defaultVisibleColumns)` 冻结 local fallback，后续 `columns`/`hidden` 变化不会 reconcile 到 `localVisibleColumns`。
- `[维度04-03]`: 保留（P2）。`report-designer:save` 只推进 report core `savedDocument`，而 `packages/report-designer-renderers/src/page-renderer.tsx` 的 `statusPath.dirty` 仍聚合 `snapshot.dirty || spreadsheetSnapshot.dirty`，且文档要求 bridge/status/host dirty 定义一致。
- `[维度04-04]`: 保留（P2）。`EditorStore.currentPage` 被 manifest/host projection 发布，但重新搜索 live code 只发现测试调用 `setCurrentPage(...)`，`EditorCanvas` 生产桥接仅接入 totalPages/scale，未接入当前页更新路径。
- `[维度04-05]`: 保留（P2）。`word-editor` 插入 chart/code 仍同时写 canvas bridge 与 React `charts/codes` 数组，而保存快照从 canvas `nop:chart`/`nop:code` tag 提取，文档也明确 persisted truth surface 应来自 live tags。

## 子项复核建议

- `[维度04-01]`：会驱动实际改代码，且已有文档-代码违约迹象。
- `[维度04-02]`：会驱动实际改代码，需要补充动态 columns/hidden 回归用例。
- `[维度04-03]`：跨 `report-designer`/`spreadsheet` 包边界，且涉及文档-代码 dirty 语义一致性。
- `[维度04-04]`：公开 host contract 字段失效，需进一步确认 canvas-editor 是否提供当前页事件或应下线字段。
- `[维度04-05]`：文档-代码违约且会驱动实际改代码，需要确认删除/编辑占位符后的 registry reconcile 策略。

## 子项复核结论

- `[维度04-01]`: 子项复核通过（P2）。live code 仍在 `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 同时维护本地 `scrollTop/scrollLeft` 与 `spreadsheet:setViewport` runtime viewport，外部 viewport 写入缺少回同步入口。
- `[维度04-02]`: 子项复核通过（P2）。live `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts` 仍用 `useState(defaultVisibleColumns)` 冻结 local fallback，动态 columns/hidden 变化不会 reconcile。
- `[维度04-03]`: 子项复核通过（P2）。live `report-designer:save` 仍只推进 report core `savedDocument`，而 `packages/report-designer-renderers/src/page-renderer.tsx` 仍发布 `snapshot.dirty || spreadsheetSnapshot.dirty`。
- `[维度04-04]`: 子项复核通过（P2）。live code 仅测试调用 `setCurrentPage(...)`，生产 `EditorCanvas` 仍只桥接 totalPages/scale，`runtime.currentPage` 公开字段没有真实同步路径。
- `[维度04-05]`: 子项复核通过（P2）。live word-editor 仍以 React `charts/codes` 计数发布 runtime，同时保存从 canvas `nop:chart`/`nop:code` tag 重建 persisted registry，且设计文档确认 live tags 是保存事实源。

## 最终保留项

| 编号      | 严重程度 | 文件路径                                                                                                            | 摘要                                                                                             |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 维度04-01 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                                                           | Spreadsheet grid 仍同时维护本地 scroll state 与 runtime viewport。                               |
| 维度04-02 | P2       | `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts`                                      | Table local fallback 仍冻结 `defaultVisibleColumns`，动态 columns/hidden 变化不会 reconcile。    |
| 维度04-03 | P2       | `packages/report-designer-renderers/src/page-renderer.tsx`; `packages/report-designer-core/src/core-dispatch.ts`    | `report-designer:save` 只推进 report core savedDocument，但 dirty 发布仍聚合 spreadsheet dirty。 |
| 维度04-04 | P2       | `packages/word-editor-core/src/editor-store.ts`; `packages/word-editor-renderers/src/editor-canvas.tsx`             | `runtime.currentPage` 公开字段没有生产同步路径。                                                 |
| 维度04-05 | P2       | `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`; `packages/word-editor-core/src/document-io.ts` | Word editor runtime chart/code 计数来自 React 数组，但保存事实源来自 canvas tags。               |
