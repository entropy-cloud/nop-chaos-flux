# 维度 04: 状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] Report Designer 在 report core 与 spreadsheet core 间维护同一 workbook 的双状态

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:305-325`, `packages/report-designer-renderers/src/page-renderer.tsx:442-479`
- **行号范围**: `page-renderer.tsx:305-325, 442-479`
- **证据片段**:

  ```ts
  const spreadsheetCore = useMemo(
    () => createSpreadsheetCore({ document: resolvedDocument.spreadsheet }),
    [resolvedDocument],
  );
  const core = useMemo(
    () =>
      createReportDesignerCore({
        document: resolvedDocument,
  ```

  ```ts
  const syncingSpreadsheetFromReportRef = useRef(false);
  const lastSyncedSpreadsheetRef = useRef(spreadsheetSnapshot.document);
  const lastAppliedReportSpreadsheetRef = useRef(snapshot.document.spreadsheet);

  useEffect(() => {
    const nextReportSpreadsheet = snapshot.document.spreadsheet;
    ...
    spreadsheetCore.replaceDocument(snapshot.document.spreadsheet);
  }, [snapshot.document.spreadsheet, snapshot.spreadsheetSyncSource, spreadsheetCore]);

  useEffect(() => {
    const nextSpreadsheetDocument = spreadsheetSnapshot.document;
    ...
    core.syncSpreadsheetDocument(spreadsheetSnapshot.document);
  }, [core, spreadsheetSnapshot.document]);
  ```

- **严重程度**: P1
- **现状**: `report-designer-page` 同时创建 `ReportDesignerCore` 与独立 `SpreadsheetCore`，两者都持有同一份 workbook/spreadsheet 文档，并用双向 `useEffect`、`lastSyncedSpreadsheetRef`、`spreadsheetSyncSource` 做同步防环。
- **风险**: 这是典型双状态同步链：report 文档的 `document.spreadsheet` 和 spreadsheet runtime 的 `document` 都可成为写入端。任何异步派生、初始化、undo/redo、import、field drop、直接单元格编辑在同步窗口内错序，都可能让 canvas、host scope、save/export、dirty/history 读到不同 workbook 版本。
- **建议**: 收敛为单一 canonical owner。可选方向是让 report core 成为 spreadsheet subtree 的唯一文档 owner，spreadsheet canvas 只通过命令/投影读写；或把 spreadsheet core 明确作为唯一编辑 owner，并让 report core 只持有语义 metadata，保存/export 时从唯一 spreadsheet owner 组合快照。不要在主路径保留双向 effect 同步。
- **双状态详情**: 第一份状态是 `ReportDesignerCore` 的 `snapshot.document.spreadsheet`；第二份状态是 `SpreadsheetCore` 的 `spreadsheetSnapshot.document`。二者都包含 workbook/sheets/cells，并通过 refs 与 effect 相互复制。
- **同步失败症状**: 用户在报表设计器中编辑单元格后，画布显示新值但右侧 inspector/host schema/save/export 仍读取旧 workbook；或执行 report undo/import 后，canvas 被 `replaceDocument` 重置选择与 dirty，短时间内显示与 statusPath/host scope 不一致的文档，可能造成保存丢失刚编辑的单元格。
- **为什么值得现在做**: owner 文档已经明确要求 `workbook` / `spreadsheet.workbook` / `reportDocument.spreadsheet` 共享同一 canonical baseline；当前实现却需要两个 core 加双向同步防环。v1 基线不接受“为了分阶段集成保留双主状态”的主路径。
- **误报排除**: 这不是只读 projection 或 detached snapshot。`spreadsheetCore.replaceDocument(...)` 和 `core.syncSpreadsheetDocument(...)` 都会改变各自 runtime store；`lastSyncedSpreadsheetRef`/`spreadsheetSyncSource` 的存在也说明当前需要防止双写回环。不同于校准文档允许的 readonly live view。
- **历史模式对应**: 对应维度 04 的“双状态（local/store 或 store/store 维护同一事实）”和 reopened adjudications 中“review-confirmed dual-state tradeoffs”边界；这里不是已裁定的 `object-field`/`table-quick-edit-controller` draft cache，而是 live report/spreadsheet owner 残留双主文档状态。
- **参考文档**: `docs/architecture/report-designer/design.md:443-450`, `docs/components/report-designer-page/design.md:102-110`, `docs/architecture/report-designer/design.md:311-320`
- **复核状态**: 未复核

### [维度04-02] Report Designer host scope 用 spreadsheet core 快照覆盖 reportDocument，形成 save/export 与 schema 读面的事实源冲突

- **文件**: `packages/report-designer-renderers/src/host-data.ts:136-195`, `packages/report-designer-core/src/core.ts:441-450`
- **行号范围**: `host-data.ts:136-195`, `core.ts:441-450`
- **证据片段**:

  ```ts
  const spreadsheet = spreadsheetSnapshot
    ? buildSpreadsheetScopeData(spreadsheetSnapshot)
    : undefined;
  const workbook = spreadsheet?.workbook ?? snapshot.document.spreadsheet.workbook;
  ...
  const reportDocument = spreadsheetSnapshot
    ? { ...snapshot.document, spreadsheet: spreadsheetSnapshot.document }
    : snapshot.document;
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
  ```

- **严重程度**: P1
- **现状**: `buildReportDesignerScopeData` 在有 `spreadsheetSnapshot` 时直接把 host scope 的 `reportDocument.spreadsheet`、`workbook`、`activeSheet` 切到 spreadsheet core 的快照，而 report core 自身另有 `snapshot.document`，保存/export 又从 report core 的 `exportDocument()` 返回。
- **风险**: host schema 表达式看到的 `reportDocument.spreadsheet` 可能领先于或落后于 report core 中真正用于 `exportDocument()`/save/history 的 `snapshot.document.spreadsheet`。这会让 inspector/toolbar 自定义 schema 读到的值与保存出的报表文件不一致。
- **建议**: host scope 不应临时拼出另一份 `reportDocument`。应只发布 canonical owner 的文档，另一个 runtime 若存在只能发布明确命名的 transient UI/editing projection，不能覆盖 `reportDocument`、`workbook` 等 canonical 字段。
- **双状态详情**: `host-data.ts` 把 `spreadsheetSnapshot.document` 包装成 `reportDocument.spreadsheet`，而 `report-designer-core` 的 `snapshot.document.spreadsheet` 仍是 report owner 的正式文档状态，二者通过异步 `syncSpreadsheetDocument` 才趋同。
- **同步失败症状**: 自定义 toolbar 中 `${reportDocument.spreadsheet.workbook...}` 显示刚编辑的单元格，但点击 `report-designer:exportTemplate` 或保存拿到的 report core 文档仍是旧值；反向情况下，import/undo 已更新 report core，但 host scope 短暂继续显示 spreadsheet core 旧 workbook。
- **为什么值得现在做**: 这条路径直接影响 schema-visible host contract。文档把 `reportDocument`、`workbook`、`spreadsheet.workbook` 定义为 canonical core fields，而当前实现让这些字段在同步窗口内选择另一个 store 的快照。
- **误报排除**: 不是派生便利字段问题。`reportDocument`、`workbook` 在组件 owner 文档中属于 core projection contract，不是可自由从任意 runtime 拼装的 UI convenience。这里也不是简单 by-reference readonly view，而是两个 runtime 快照间的替换。
- **历史模式对应**: 对应“多来源事实冲突”和 report designer owner 文档中的 dirty/canonical workbook 收敛规则；不重复报告历史“compatibility alias”问题，因为本条关注 live canonical 字段被另一 store 覆盖。
- **参考文档**: `docs/components/report-designer-page/design.md:72-110`, `docs/architecture/report-designer/design.md:443-450`
- **复核状态**: 未复核

### [维度04-03] Spreadsheet inline 编辑把同一单元格草稿拆在 React state/ref 与 spreadsheet core editing 模型之外

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:15-99`, `packages/spreadsheet-core/src/types.ts:193-249`
- **行号范围**: `use-editing.ts:15-99`, `types.ts:193-249`
- **证据片段**:

  ```ts
  export function useEditing(
    snapshot: SpreadsheetHostSnapshot,
    bridge: SpreadsheetBridge,
    sheetId: string,
    selectedCell: { row: number; col: number } | null,
    cellValue: string,
  ) {
    const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [editSaveState, setEditSaveState] = useState<EditSaveState>({ status: 'idle' });
    const editingCellRef = useRef<{ row: number; col: number } | null>(null);
    const editValueRef = useRef('');
  ```

  ```ts
  export interface SpreadsheetEditingState {
    cell: SpreadsheetCellRef;
    editorId: string;
    initialValue: unknown;
    draftValue: unknown;
  }

  export interface SpreadsheetRuntimeSnapshot {
    document: SpreadsheetDocument;
    activeSheetId: string;
    selection: SpreadsheetSelection;
    editing?: SpreadsheetEditingState;
  ```

- **严重程度**: P1
- **现状**: spreadsheet core 类型与 snapshot 已定义 `editing?: SpreadsheetEditingState`，但 renderer 的主编辑路径把 `editingCell`、`editValue`、`editSaveState` 和对应 refs 放在 React hook 局部状态中，保存时才 `bridge.dispatch('spreadsheet:setCellValue')`。
- **风险**: spreadsheet runtime、host projection、undo/redo/selection clearing、外部 actions 看不到当前正在编辑的 draft。core 的 `replaceDocument`/selection handlers 会清 `editing`，但 renderer-local edit 状态不由 core 驱动，容易出现 core 认为没有编辑会话、UI 仍显示编辑器或草稿尚未提交的冲突。
- **建议**: 将 inline editing session（cell、initialValue、draftValue、save/cancel状态）收敛进 spreadsheet core 或一个明确的 spreadsheet editing owner，renderer 只订阅和派发 editing commands。若某些 DOM 输入细节必须本地保存，应限于 focus/selection composition，不承载单元格 draft value。
- **双状态详情**: 第一份状态是 spreadsheet core 的 `SpreadsheetRuntimeSnapshot.editing` 契约；第二份状态是 `useEditing` 内的 `editingCell`/`editValue` state 与 `editingCellRef`/`editValueRef`。二者都描述当前编辑中的单元格及草稿值，但主路径只更新本地 React 状态。
- **同步失败症状**: 用户双击单元格开始输入后，外部 toolbar/status/host schema 仍显示没有 editing session；此时切换 sheet、执行 undo/replaceDocument 或外部 selection action，core 可能清理自己的 editing/selection，而 UI 局部编辑器仍保留旧单元格草稿，最终保存到错误位置或覆盖新选择。
- **为什么值得现在做**: `spreadsheet-page` 文档明确“worksheet document、selection、editing、history 和 viewport 归 spreadsheet core”。当前代码与该 owner contract 直接冲突，且编辑草稿是用户数据，不是纯视觉状态。
- **误报排除**: 不是合法的 DOM-only transient state。`editValue` 是即将写入单元格的用户数据，`editingCell` 决定保存目标，`editSaveState` 决定失败/取消 UI；这些状态会影响持久化与用户可见提交结果。
- **历史模式对应**: 对应维度 04 的“复杂控件/设计器状态同时在 store 和 React state 中维护”。不同于 flow canvas hover/dragging 这类文档允许由适配层持有的纯 UI 临时态。
- **参考文档**: `docs/components/spreadsheet-page/design.md:47-64`, `docs/architecture/report-designer/design.md:231-239`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度04-04] Flow Designer Tree Mode 将同一流程结构拆在 React `treeDocument` state 与 DesignerCore `GraphDocument`/history 中双写同步

- **文件**: `packages/flow-designer-renderers/src/designer-tree-mode.tsx:21-43`, `packages/flow-designer-renderers/src/designer-command-adapter.ts:54-68`, `packages/flow-designer-core/src/core.ts:318-328`
- **行号范围**: `designer-tree-mode.tsx:21-43`, `designer-command-adapter.ts:54-68`, `core.ts:318-328`
- **证据片段**:

  ```ts
  const inputTreeDocument = readDesignerResolvedProp<TreeDocument>(props, 'treeDocument');
  const [treeDocument, setTreeDocument] = useState<TreeDocument | undefined>(inputTreeDocument);
  const [hasLocalTreeEdits, setHasLocalTreeEdits] = useState(false);

  const [core] = useState(() =>
    createDesignerCore(
      initialTreeDocument
        ? computeTreeModeDocument(initialTreeDocument, config)
  ```

  ```ts
  function applyTreeDocument(nextTree: TreeDocument): void {
    if (!treeOwner) {
      return;
    }
    treeOwner.setTreeDocument(nextTree);
    core.replaceDocument(projectTreeDocumentToGraph(nextTree, core.getConfig()), nextTree);
  }
  ```

  ```ts
  historyState = result.state;
  replaceDocument(cloneDocument(result.entry.doc), result.entry.revision);
  if (treeOwner && result.entry.treeDocument) {
    treeOwner.setTreeDocument(result.entry.treeDocument);
  }
  ```

- **严重程度**: P1
- **现状**: Tree Mode 的当前结构化流程同时存在于 React 层 `treeDocument` / `hasLocalTreeEdits` state，以及 `DesignerCore` 内的 projected `GraphDocument`、history entry `treeDocument`、`replaceDocument(...)` 同步链中。普通 tree 命令先写 React tree owner，再用投影结果替换 core document；undo/redo 又从 core history 反向写回 React tree state。
- **风险**: TreeDocument 与 GraphDocument projection 都参与当前编辑事实，并且通过多条命令/prop/effect/undo 同步路径保持一致。一旦 host prop 更新、tree 命令、auto-layout、undo/redo、export JSON 同时发生，React `treeDocument`、core `snapshot.doc`、history entry、toolbar/export/inspector 可能读到不同版本的流程结构。
- **建议**: 收敛 Tree Mode 的 canonical owner。推荐让 `DesignerCore` 拥有 TreeDocument 及其 projected GraphDocument cache，React 只订阅 snapshot；或反过来让 TreeDocument owner 成为唯一写入端，core 只接收只读 projection，不保存可回写的 tree history。不要保留 React state 和 core history 双向同步当前结构文档。
- **双状态详情**: 第一份状态是 `TreeModeLayoutWrapper` 的 `treeDocument` / `hasLocalTreeEdits` React state；第二份状态是 `DesignerCore` 的 projected `doc`、history entry 中的 `treeDocument` 以及 `treeOwner.setTreeDocument(...)` 回写接口。二者表达同一个 tree-mode 流程结构，只是一个是源 TreeDocument，一个是投影 GraphDocument + paired history snapshot。
- **同步失败症状**: 用户在 tree mode 中新增/删除节点后，画布 `core.snapshot.doc` 已显示新节点，但外部 `treeDocument` prop 或 React `treeDocument` state 仍停留在旧树；随后触发 undo/redo 或 host rerender，core 会从 history/treeOwner 反写另一份树，导致画布节点、export JSON、status/inspector 读取面不一致，甚至把 host replacement 或本地未保存编辑互相覆盖。
- **为什么值得现在做**: Flow Designer 文档明确 `@xyflow/react` 不应成为第二事实源，Tree Mode 也应保持稳定 runtime instance 与清晰投影链。当前实现不是只读 projection，而是 TreeDocument 与 GraphDocument/history 双写互相驱动，和已发现的 report/spreadsheet 双状态属于同类 owner 漂移。
- **误报排除**: 这不是合法的 canvas dragging 临时态，也不是纯 memoized projection。`setTreeDocument(nextTree)`、`core.replaceDocument(...)`、undo/redo 中的 `treeOwner.setTreeDocument(...)` 都会改变当前编辑文档状态；`hasLocalTreeEdits` 还明确参与 host prop 与本地编辑的冲突仲裁。
- **历史模式对应**: 与 reopened adjudications 中“review-confirmed dual-state tradeoffs”相似，但本条不是已裁定的 ordinary local draft cache；它位于 live designer tree-mode 主路径，影响 document/history/export 事实源，应作为新的 designer state 双状态 residual 处理。
- **参考文档**: `docs/architecture/flow-designer/design.md:104-115`, `docs/architecture/flow-designer/design.md:489-523`
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度04-05] Flow Designer Xyflow bridge 用 `useNodesState/useEdgesState` 维护图结构本地副本，拖拽/删除先写 React Flow state 再回写 DesignerCore

- **文件**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:83-105`, `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-interactions.ts:75-110`
- **行号范围**: `use-xyflow-sync.ts:83-105`, `use-xyflow-interactions.ts:75-110`
- **证据片段**:

  ```ts
  export function useXyflowSync({
    snapshotNodes,
    snapshotEdges,
    hoveredEdgeId,
  }: UseXyflowSyncParams): UseXyflowSyncResult {
    const lastCommittedPositionsRef = useRef<Map<string, string>>(new Map());

    const [localNodes, setLocalNodes, onNodesChangeInternal] = useNodesState(snapshotNodes);
    const [localEdges, setLocalEdges, onEdgesChangeInternal] = useEdgesState(snapshotEdges);
  ```

  ```ts
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChangeInternal(changes);

      for (const change of changes) {
        if (change.type === 'remove') {
          onDeleteNode(change.id, undefined);
          lastCommittedPositionsRef.current.delete(change.id);
          continue;
  ```

- **严重程度**: P1
- **现状**: Flow Designer 的 Xyflow 适配层从 `DesignerCore` snapshot 派生 `snapshotNodes/snapshotEdges` 后，又通过 `useNodesState/useEdgesState` 持有 `localNodes/localEdges`。`onNodesChangeInternal` / `onEdgesChangeInternal` 先把 React Flow 本地 graph state 改掉，再把 remove / position / edge remove 翻译为 `DesignerCore` 命令。
- **风险**: 这违反 owner 文档中“`@xyflow/react` 只作为 canvas 交互与可视化适配层，不作为 graph 数据的第二 source of truth”的边界。删除、拖拽、重连或 core 拒绝/归一化命令时，React Flow 本地 nodes/edges 已经先变化，随后才等待 core snapshot 回推；在同步窗口或命令失败路径中，画布显示、selection、history、export/status host scope 可能短暂或持续读到不同图结构。
- **建议**: 将 Xyflow bridge 收敛为完全受控 projection：`nodes/edges` 直接来自 `DesignerCore` snapshot；`onNodesChange/onEdgesChange` 只解析交互 intent 并 dispatch core command，不调用会修改结构化 graph state 的本地 setter。若需要拖拽中的流畅预览，应把本地状态限制为 pointer/drag overlay 或“拖拽中位置预览”，并在命名和类型上与 canonical `GraphDocument` nodes/edges 分离。
- **双状态详情**: 第一份状态是 `DesignerCore` 的 `snapshot.doc.nodes` / `snapshot.doc.edges`；第二份状态是 Xyflow hook 内的 `localNodes` / `localEdges`。二者都表达当前画布节点、边和节点位置，且本地副本会先于 core 命令写入。
- **同步失败症状**: 用户拖拽节点后 React Flow 立即显示新位置，但 `DesignerCore` history/export/host scope 仍是旧位置；若 core 命令被 tree mode、规则校验或未来插件拒绝，本地画布已经应用了变化。删除节点/边时也可能先从画布消失，再由 core snapshot 回滚，造成 selection、toolbar 状态和保存导出短暂不一致。
- **为什么值得现在做**: owner 文档已明确 Xyflow 只能持有 pointer capture、dragging 中间态、连线预览、尺寸测量等纯 UI 临时态，不能持有结构化 document state。当前代码把 nodes/edges 结构副本放进 React Flow state，是 live 主路径，不是未接线实验代码。
- **误报排除**: 这不是合法的 readonly projection 或纯拖拽手势态。`useNodesState/useEdgesState` 返回的 `onNodesChangeInternal` / `onEdgesChangeInternal` 会根据 React Flow change 修改 `localNodes/localEdges`，随后 `<ReactFlow nodes={localNodes} edges={renderedEdges}>` 直接渲染这份副本；它承载的是结构化 nodes/edges，而不仅是 hover 或 pointer 状态。
- **历史模式对应**: 与已有 [维度04-04] Tree Mode 双写同属 designer graph owner 漂移，但本条覆盖的是 ordinary graph canvas 的 Xyflow adapter 本地 graph 副本，不重复报告 TreeDocument/GraphDocument/history 双写。
- **参考文档**: `docs/architecture/flow-designer/design.md:104-115`, `docs/architecture/flow-designer/design.md:186-204`
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度04-06] Word Editor 将 chart/code 元数据同时写入 canvas 文档标签与 React state extras

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:84-91`, `packages/word-editor-renderers/src/hooks/use-word-editor-actions.ts:116-134`, `packages/word-editor-core/src/document-io.ts:255-262`
- **行号范围**: `use-word-editor-state.ts:84-91`, `use-word-editor-actions.ts:116-134`, `document-io.ts:255-262`
- **证据片段**:

  ```ts
  const [charts, setCharts] = useState<DocChart[]>(() =>
    normalizeDocCharts(props.props.initialCharts),
  );
  const [codes, setCodes] = useState<DocCode[]>(() => normalizeDocCodes(props.props.initialCodes));
  const [savedDocument, setSavedDocument] = useState<SavedDocumentData | null>(() => {
    return (
      recoveredState.document ??
      (initialDocument
        ? createSavedDocumentData({ data: initialDocument, paperSettings: null })
        : null)
    );
  });
  ```

  ```ts
  const handleChartSave = useCallback(
    (_chart: DocChart) => {
      if (!validateDocChart(_chart).valid) {
        return;
      }
      bridge.insertChart(_chart);
      setCharts((current) => [...current, _chart]);
    },
    [bridge, setCharts],
  );
  ```

  ```ts
  return createSavedDocumentData({
    data: {
      header: value.data.header ?? [],
      main: value.data.main,
      footer: value.data.footer ?? [],
      charts: extras?.charts ?? [],
      codes: extras?.codes ?? [],
    },
  ```

- **严重程度**: P1
- **现状**: `insertChart` / `insertCode` 先把 chart/code 作为 `nop:chart` / `nop:code` 标签插入 canvas-editor 文档，再把同一元数据追加到 React `charts` / `codes` state；保存时 `captureDocumentSnapshot(...)` 又从 canvas 当前文档读取正文，并从 React state extras 注入 `charts` / `codes`。
- **风险**: canvas 文档和 React extras 都能表达同一个 chart/code 占位符事实。用户通过 undo、删除正文标签、恢复文档、导入旧文档或外部 action 改变 canvas 内容时，React `charts` / `codes` 可能不随之移除或重建，最终保存出“正文已无 chart/code 标签但 persisted `data.charts` 仍包含旧元数据”或“正文标签存在但 extras 缺失”的不一致模板。
- **建议**: 收敛为单一 persisted owner。可选方向是让 canvas/editor document 成为 chart/code 占位符的唯一事实源，保存前从当前文档标签解析并校验 metadata；或把 chart/code registry 放入 `word-editor-core` owner store，并让 canvas 只渲染/插入该 registry 的受控 projection。不要在主保存路径继续用 React local extras 与 canvas document 组合成同一个 `WordDocument`。
- **双状态详情**: 第一份状态是 canvas-editor 文档中的 `nop:chart` / `nop:code` 标签及其 attrs；第二份状态是 `WordEditorPage` React state 中的 `charts` / `codes` 数组。二者共同决定保存出的 `SavedDocumentData.data.charts` / `data.codes`。
- **同步失败症状**: 插入 chart 后执行 undo 或手动删除占位符，画布不再显示该 chart，但 `charts` state 仍被保存；或者恢复/加载包含 chart tags 的文档但未同步初始化 `charts` state，保存后 extras 丢失，后端模板编译或 host projection 读到的 chart/code registry 与正文不一致。
- **为什么值得现在做**: Word Editor 文档已把 `SavedDocumentData` 定义为 persisted envelope，并明确 explicit save 使用完整 envelope 作为单一 persisted truth surface；当前实现却把同一 persisted document 的正文与 chart/code registry 分拆在 canvas 内部和 React state extras 中，属于 live 保存主路径。
- **误报排除**: 这不是合法的 renderer-local dialog draft。`charts` / `codes` 会进入 `SavedDocumentData.data`，影响持久化、host projection 和后端模板渲染；它们不是只影响 UI 预览的 transient state。也不是校准文档允许的只读 projection，因为 `setCharts` / `setCodes` 是写入端，`captureDocumentSnapshot` 把该写入端作为保存事实源。
- **历史模式对应**: 对应维度 04 的“复杂设计器状态同时在 domain store / host document 与 React state 中维护”。不同于已有 report/spreadsheet 双状态，本条覆盖 Word Editor 的 canvas document 与 renderer-local extras 组合保存路径。
- **参考文档**: `docs/architecture/word-editor/design.md:65-102`, `docs/architecture/word-editor/design.md:159-168`
- **复核状态**: 未复核

### [维度04-07] Spreadsheet toolbar cell/comment editor 用 React draftState 镜像 core 单元格值并先本地显示再异步写 core

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:40-54`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-cell-value-sync.ts:18-28`, `packages/spreadsheet-renderers/src/spreadsheet-toolbar/cell-editor.tsx:16-24`
- **行号范围**: `use-spreadsheet-shell.ts:40-54`, `use-cell-value-sync.ts:18-28`, `cell-editor.tsx:16-24`
- **证据片段**:

  ```ts
  const [draftState, setDraftState] = useState(() => ({
    selectedKey: selectedCellSnapshot.selectedKey,
    cellValue: selectedCellSnapshot.cellValue,
    commentText: selectedCellSnapshot.commentText,
  }));
  const gridRef = useRef<HTMLDivElement>(null);

  const cellValue =
    draftState.selectedKey === selectedCellSnapshot.selectedKey
      ? draftState.cellValue
      : selectedCellSnapshot.cellValue;
  ```

  ```ts
  input.setCellValue(value);
  input.bridge.dispatch({
    type: 'spreadsheet:setCellValue',
    cell: {
      sheetId: input.sheetId,
      address: cellAddress(input.selectedCell.row, input.selectedCell.col),
      row: input.selectedCell.row,
      col: input.selectedCell.col,
    },
    value,
  });
  ```

  ```tsx
  <Input
    id={cellValueInputId}
    data-slot="spreadsheet-cell-value-input"
    size="sm"
    value={props.cellValue}
    onChange={(e) => props.onCellValueChange(e.target.value)}
  ```

- **严重程度**: P1
- **现状**: toolbar cell editor 的 `cellValue` / `commentText` 先从 spreadsheet core snapshot 派生，但随后进入 renderer-local `draftState`。`onCellValueChange` 先 `setCellValue(value)` 更新本地显示，再 fire-and-forget `bridge.dispatch('spreadsheet:setCellValue', ...)` 写入 spreadsheet core，且没有等待 `SpreadsheetCommandResult` 或失败回滚。
- **风险**: 单元格值属于 `spreadsheet core` 的 worksheet document；当前 toolbar 输入框可短时间或持续显示未被 core 接受的值。若 core 因 readonly、取消、校验、异步命令失败或未来 command policy 拒绝写入，host scope、history、dirty、save/export 仍读 core 旧值，而 toolbar 本地 draft 显示新值，形成可持久化数据与 UI 读面冲突。
- **建议**: toolbar cell/comment editor 不应拥有 canonical cell value draft。普通 cell value 输入应直接由 core snapshot 驱动，change intent 通过 core command 返回结果后由 snapshot 回推；如果需要 optimistic UI，必须进入 spreadsheet core 的 editing/command owner，并有明确的 pending/cancelled/failed 状态与回滚策略。`bridge.dispatch` 结果不能在写入同一事实源时被忽略。
- **双状态详情**: 第一份状态是 spreadsheet core 的 `snapshot.document.activeSheet.cells[address].value/comment`；第二份状态是 `useSpreadsheetShell` 的 `draftState.cellValue/commentText`。二者都表达当前 selected cell 的编辑值，且本地状态先于 core command 更新。
- **同步失败症状**: 用户在 toolbar 输入单元格值后输入框显示新值，但 core command 被取消或失败时，表格单元格、statusPath、host schema、undo/history 和保存导出仍保持旧值；切换选择后又可能按 `selectedKey` 回落，造成输入框与 grid 闪烁/回滚且缺少错误提示。
- **为什么值得现在做**: `spreadsheet-page` owner 文档明确 worksheet document、selection、editing、history、viewport 归 spreadsheet core，并要求 outside-click edit-save 走统一 save result contract。当前 toolbar cell editor 是另一条单元格编辑入口，仍保留 renderer-local value mirror 与忽略 command result 的双状态路径。
- **误报排除**: 这不是纯 DOM 输入 composition state。`draftState.cellValue` 是将要写入 workbook 的单元格值，`commentText` 是将要写入 cell comment 的内容，都会影响保存/export；也不是已有 [维度04-03] 的 inline grid editing，本条覆盖 toolbar cell/comment editor 和 `useCellValueSync` 的独立写入路径。
- **历史模式对应**: 对应维度 04 的“复杂字段不得维护独立本地状态，只从 store 读取”和 spreadsheet owner contract 中“worksheet document 归 core”。它是已有 inline editing 双状态旁边的 residual，不重复报告 `use-editing.ts` 的 `editingCell/editValue`。
- **参考文档**: `docs/components/spreadsheet-page/design.md:47-64`
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度04-08] Report Designer 将当前选择目标拆在 SpreadsheetCore selection 与 ReportDesignerCore selectionTarget 中异步镜像

- **文件**: `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:89-146`, `packages/report-designer-renderers/src/host-data.ts:181-187`
- **行号范围**: `report-spreadsheet-canvas.tsx:89-146`, `host-data.ts:181-187`
- **证据片段**:

  ```ts
  const prevSelectedCell = useRef<{ row: number; col: number } | null>(null);
  const hasMirroredSpreadsheetSelection = useRef(false);

  useEffect(() => {
    const selection = ssSnapshot.selection;
    const selectedCellTarget =
      selection.kind === 'cell' && selection.anchor
        ? { row: selection.anchor.row, col: selection.anchor.col }
  ```

  ```ts
      spreadsheet,
      selectionTarget: snapshot.selectionTarget,
      reportDocument,
      workbook,
      activeSheet,
      activeCell: spreadsheet?.activeCell,
      activeRange: spreadsheet?.activeRange,
  ```

- **严重程度**: P2
- **现状**: `SpreadsheetCore` 的 `ssSnapshot.selection` 是表格画布当前选择；`ReportDesignerCore` 另有 `snapshot.selectionTarget`，由 `report-spreadsheet-canvas.tsx` 的 React effect 通过 `void core.setSelectionTarget(...)` 异步镜像。host scope 同时发布 `spreadsheet.selection/activeCell/activeRange` 与 canonical `selectionTarget`，两者可在同一 render turn 中表达不同目标。
- **风险**: inspector、metadata、toolbar action 以 `selectionTarget` 为 canonical current-target，但画布和 `spreadsheet.activeCell/activeRange` 已经切到新选择时，schema 片段可能读到“新 activeCell + 旧 selectionTarget/activeMeta/inspector”的组合。快速切换单元格、行列头或范围后立即触发 inspector 写入/字段拖放/toolbar action，可能把 metadata 写到旧目标，或让 inspector schema 与画布高亮不一致。
- **建议**: 收敛 current selection 的单一 owner。推荐让 report designer core 直接消费 spreadsheet selection command 并同步产出 `selectionTarget`、`activeMeta`、inspector projection；host scope 只发布这一份 canonical target 及其派生 convenience 字段。若 `spreadsheet.selection` 必须保留，应明确标记为 canvas-local projection，不应与 `selectionTarget` 并列作为当前选择读面。
- **双状态详情**: 第一份状态是 `SpreadsheetCore` 的 `ssSnapshot.selection`；第二份状态是 `ReportDesignerCore` 的 `snapshot.selectionTarget` / `activeMeta` / inspector resolved schema。二者共同描述当前选中的 workbook/sheet/cell/range。
- **同步失败症状**: 用户点击新单元格后，画布 selection 与 `spreadsheet.activeCell` 已更新，但 `selectionTarget`、`meta`、`inspector` 仍停留在上一单元格；紧接着提交 inspector 表单或执行 toolbar action 时，操作落到旧 target 或显示错误属性面板。
- **为什么值得现在做**: 组件文档已声明 `selectionTarget` 是唯一 canonical current-target surface，而当前实现仍把 current target 通过 effect 从 spreadsheet selection 镜像到 report core，属于已有 report/spreadsheet 双状态之外的选择/metadata owner residual。
- **误报排除**: 这不是合法的纯 UI hover/focus state。`selectionTarget` 驱动 inspector schema、active metadata 和 host action 目标；`spreadsheet.selection` 驱动画布选择与 activeCell/activeRange。二者都进入 schema-visible host projection，并会影响 metadata 写入目标。
- **历史模式对应**: 与已有 [维度04-01]/[维度04-02] 同属 report/spreadsheet owner 漂移，但本条不重复 workbook/document 双状态；它覆盖的是 current selection target 与 inspector/metadata 的事实源冲突。
- **参考文档**: `docs/architecture/report-designer/design.md:291-292`, `docs/components/report-designer-page/design.md:80-107`
- **复核状态**: 未复核

## 深挖第 6 轮追加

### [维度04-09] Word Editor 纸张设置同时存在于 editorStore 与 canvas-editor 内部文档，保存读取另一事实源

- **文件**: `packages/word-editor-renderers/src/toolbar/page-controls.tsx:76-100`, `packages/word-editor-renderers/src/editor-canvas.tsx:55-70`, `packages/word-editor-core/src/document-io.ts:235-264`
- **行号范围**: `page-controls.tsx:76-100`, `editor-canvas.tsx:55-70`, `document-io.ts:235-264`
- **证据片段**:
  ```ts
  const handlePaperSize = (key: string) => {
    const preset = PAPER_SIZE_PRESETS[key];
    if (preset) {
      store.setPaperSettings({ ...paperSettings, width: preset.width, height: preset.height });
      requestAnimationFrame(() => {
        bridge?.command?.executePaperSize(preset.width, preset.height);
      });
    }
  };
  ```
  ```ts
  const handleApplyMargins = () => {
    store.setPaperSettings({ ...paperSettings, margins });
    bridge?.command?.executeSetPaperMargin(margins);
    setShowMarginDialog(false);
  };
  ```
  ```ts
  const paperSettings = bridge.getPaperSettings();
  const saved = createSavedDocumentData({
    data: {
      header: editorValue.header ?? [],
      main: editorValue.main,
      footer: editorValue.footer ?? [],
      charts: chartsRef.current ?? [],
      codes: codesRef.current ?? [],
    },
    paperSettings: paperSettings ?? { ...DEFAULT_PAPER_SETTINGS },
  });
  ```
  ```ts
  value = bridge.getValue();
  paperSettings = bridge.getPaperSettings();
  ...
  return createSavedDocumentData({
    data: {
      header: value.data.header ?? [],
      main: value.data.main,
      footer: value.data.footer ?? [],
      charts: extras?.charts ?? [],
      codes: extras?.codes ?? [],
    },
    paperSettings,
  });
  ```
- **严重程度**: P1
- **现状**: Word Editor 的纸张尺寸、方向、页边距先写入 `editorStore.paperSettings` 供 toolbar/UI 读取，再通过 `bridge.command.executePaperSize/executePaperDirection/executeSetPaperMargin` 写入 canvas-editor 内部状态；但 autosave 和显式 save 的 persisted `SavedDocumentData.paperSettings` 又从 `bridge.getPaperSettings()` 读取 canvas-editor 状态。
- **风险**: `editorStore.paperSettings` 和 canvas-editor 内部 paper settings 都描述同一份持久化纸张设置。由于部分写入使用 `requestAnimationFrame` 延迟，且 bridge command 没有结果/失败回滚，toolbar/host runtime 可显示新设置，而保存/autosave 仍持久化旧设置；反向也可能在 bridge 被外部恢复或初始化后，store 只保存初始化时的一次镜像，后续 canvas 内部变化未同步到 store。
- **建议**: 收敛纸张设置的 canonical owner。若 `editorStore` 是 owner，保存应从 `editorStore.paperSettings` 读取，并让 canvas-editor 只作为受控 projection；若 canvas-editor 是 owner，toolbar 不应先写 store，而应执行 bridge command 后通过统一 change event/快照回推 store。不要在保存主路径中让 UI store 与 bridge 内部状态分别作为同一 `paperSettings` 的写入端/读取端。
- **双状态详情**: 第一份状态是 `EditorStoreState.paperSettings`；第二份状态是 `@hufe921/canvas-editor` 实例内部由 `executePaperSize`、`executePaperDirection`、`executeSetPaperMargin` 修改并由 `bridge.getPaperSettings()` 读取的 paper settings。二者共同决定用户看到的纸张设置与最终保存出的 `SavedDocumentData.paperSettings`。
- **同步失败症状**: 用户选择 A3 或修改页边距后，toolbar 立即显示新设置，但在 `requestAnimationFrame` 执行前或 bridge command 失败/被忽略时点击保存，`captureDocumentSnapshot` 仍从 canvas-editor 读取旧纸张设置，导致保存文件与 UI 显示不一致；或者 autosave 将旧 paperSettings 写入 `savedDocument`，host projection 继续暴露旧 envelope。
- **为什么值得现在做**: Word Editor 文档明确 `paperSettings` 属于 `SavedDocumentData` persisted envelope，显式 save 以完整 envelope 作为持久化 truth surface。当前实现让 persisted 字段在 renderer store 与 canvas-editor 内部状态之间分裂，并且保存读取的不是 toolbar 刚写入的 store。
- **误报排除**: 这不是纯视觉 toolbar draft。`paperSettings` 会进入 `SavedDocumentData.paperSettings`，影响保存、恢复、打印/页面布局和 host save payload；`store.setPaperSettings(...)` 与 `bridge.command.executePaper...(...)` 都是对同一持久化设置的实际写入。
- **历史模式对应**: 对应维度 04 的“复杂编辑器状态同时在 domain store 与第三方 editor 内部状态中维护”。不同于已有 [维度04-06] 的 chart/code registry，本条覆盖 Word Editor 的纸张设置保存路径。
- **参考文档**: `docs/architecture/word-editor/design.md:95-101`, `docs/architecture/word-editor/design.md:159-167`
- **复核状态**: 未复核

## 深挖第 7 轮追加

### [维度04-10] Spreadsheet viewport 同时存在于 core runtime 契约与 grid React 本地滚动状态，且保存/export 永远读不到实际视口

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:110-209`, `packages/spreadsheet-core/src/types.ts:18-26`, `packages/spreadsheet-core/src/core.ts:37-43`
- **行号范围**: `spreadsheet-grid.tsx:110-209`, `types.ts:18-26,245-252`, `core.ts:37-43`
- **证据片段**:

  ```ts
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(800);
  ...
  setScrollTop(el.scrollTop);
  setScrollLeft(el.scrollLeft);
  ```

  ```ts
  export interface SpreadsheetDocument {
    id: string;
    kind: string;
    name: string;
    version: string;
    meta?: Record<string, unknown>;
    viewport?: SpreadsheetViewportSnapshot;
    workbook: WorkbookDocument;
  }
  ```

  ```ts
  const store = createStore<SpreadsheetInternalState>(() => ({
    document: initialDocument,
    activeSheetId: firstSheetId,
    selection: { kind: 'none' },
    editing: undefined,
    viewport: createDefaultViewport(),
  ```

- **严重程度**: P2
- **现状**: spreadsheet core 的 document/runtime 明确定义了 `viewport`，且 owner 文档声明 worksheet document、selection、editing、history 和 viewport 归 spreadsheet core；但实际滚动视口由 `SpreadsheetGrid` 的 `scrollTop/scrollLeft/viewportHeight/viewportWidth` React state 驱动，core `runtime.viewport` 始终初始化为默认值，且没有命令把真实滚动状态写回 core。
- **风险**: host projection、status/manifest、保存/export 或未来恢复视口时读取的是 core 的默认 viewport，而画布实际显示的是 grid 本地 viewport。用户滚动到某区域后，schema-visible runtime、保存出的 `SpreadsheetDocument.viewport`、以及重新加载后的视口位置都可能与用户最后看到的位置不一致。
- **建议**: 将 viewport owner 收敛到 spreadsheet core：提供 `spreadsheet:setViewport` 或专门的 viewport update API，grid 只派发滚动 intent / measurement update 并从 core snapshot 派生可发布 viewport。若 `viewportHeight/viewportWidth` 被判定为纯 DOM measurement，可拆成 renderer-local measurement；但 `scrollX/scrollY/zoom` 这类可持久化/host-visible viewport 应由 core 唯一持有。
- **双状态详情**: 第一份状态是 `SpreadsheetRuntimeSnapshot.viewport` / `SpreadsheetDocument.viewport`；第二份状态是 `SpreadsheetGrid` 内部 `scrollTop` / `scrollLeft` / `viewportHeight` / `viewportWidth`。二者共同描述当前表格可视区域，但只有本地 React state 实际驱动画布。
- **同步失败症状**: 用户滚动表格后，画布显示第 N 行/列，但 core snapshot 仍暴露 `{ scrollX: 0, scrollY: 0, zoom: 1 }`；保存/export 或 host schema 读取 viewport 时得到默认值，重新打开无法恢复用户视口，外部 toolbar/status 基于 runtime viewport 的行为也会落在错误区域。
- **误报排除**: 这不是纯 pointer/hover 临时态。`viewport` 已进入 `SpreadsheetDocument` 与 `SpreadsheetRuntimeSnapshot` 类型契约，并被 spreadsheet owner 文档归入 core runtime state；当前本地 state 承载的是同一 viewport 事实，而不是仅用于 DOM 测量的私有实现细节。
- **参考文档**: `docs/components/spreadsheet-page/design.md:47-52`, `docs/architecture/report-designer/design.md:231-239`
- **复核状态**: 未复核

## 深挖第 8 轮追加

### [维度04-11] CRUD 与 Table 对同一个 filter owner path 使用两套不兼容形状，导致 `$crud.filters` 与实际过滤结果分裂

- **文件**: `packages/flux-renderers-data/src/crud-renderer.tsx:60-83,122-134,236-250`, `packages/flux-renderers-data/src/crud-renderer-state.ts:253-263`, `packages/flux-renderers-data/src/table-renderer/use-table-filter.ts:19-31,95-105`, `packages/flux-renderers-data/src/table-renderer/table-data.ts:96-107`
- **行号范围**: `crud-renderer.tsx:60-83,122-134,236-250`; `crud-renderer-state.ts:253-263`; `use-table-filter.ts:19-31,95-105`; `table-data.ts:96-107`
- **证据片段**:

  ```ts
  const { queryState, paginationState, sortState, filterState, selectedRowKeys } =
    useCrudRuntimeState({
      scope,
      queryStatePath: ownerPaths.queryStatePath,
      paginationStatePath: ownerPaths.paginationStatePath,
      sortStatePath: ownerPaths.sortStatePath,
      filterStatePath: ownerPaths.filterStatePath,
  ```

  ```ts
  const filterState = useScopeSelector(
    (scopeData) => toRecord(getIn(scopeData, filterStatePath)),
    shallowEqualRecords,
    { paths: [filterStatePath] },
  );
  ```

  ```ts
  const toFilterState = useCallback((value: unknown): FilterState => {
    const record = value as
      | Record<string, { filters?: string[]; keyword?: string } | undefined>
      | undefined;
    const next: FilterState = {};
    Object.entries(record ?? {}).forEach(([key, entry]) => {
      next[key] = {
        values: new Set(Array.isArray(entry?.filters) ? entry.filters : []),
        keyword: typeof entry?.keyword === 'string' ? entry.keyword : undefined,
      };
  ```

  ```ts
  if (filterOwnership === 'scope' && filterStatePath) {
    renderScope.update(
      filterStatePath,
      Object.fromEntries(
        Object.entries(newFilters).map(([key, entry]) => [
          key,
          { filters: Array.from(entry.values), keyword: entry.keyword },
        ]),
      ),
  ```

  ```ts
  Object.entries(filterState).forEach(([columnName, values]) => {
    if (values.values.size > 0) {
      data = data.filter((row) => values.values.has(String(row.record[columnName])));
    }
  ```

- **严重程度**: P1
- **现状**: CRUD 将 `filterStatePath` 作为 `$crud.filters` / `statusPath` 的公开摘要来源直接 `toRecord(...)` 发布；底层 Table 又把同一个 `filterStatePath` 解释为 `{ [column]: { filters?: string[]; keyword?: string } }`，再转换成内部 `Set` 参与 `processTableData(...)`。同一个 owner path 同时承担 public summary shape 与 table internal filter DTO，两边没有共享规范化层。
- **风险**: 当宿主或初始数据写入 `{ filters: { status: 'active' } }` 这类 CRUD summary 形状时，`$crud.filters.status` 会显示 active，但 Table 的 `toFilterState` 会把 string 当成无 filters/keyword，实际表格不被过滤。反过来，用户通过列头筛选后 Table 写入 `{ status: { filters: ['active'] } }`，实际行过滤生效，但 `$crud.filters.status` 变成对象，schema 表达式、toolbar、statusPath 消费方读到的形状与文档/测试中的摘要语义不一致。
- **建议**: 为 CRUD/Table filter owner path 收敛唯一 canonical DTO。推荐把 `filterStatePath` 明确定义为 Table filter DTO，并让 CRUD `$crud.filters` 通过共享 serializer 派生稳定公开摘要；或反向让 Table 接受 CRUD summary DTO，但必须统一读写与文档。不要让同一个 scope path 同时被 raw public summary 与 internal Set-backed filter bridge 以不同结构解释。
- **双状态详情**: 第一份“状态”是 CRUD 公开读面中的 `filterState` / `$crud.filters` / `statusPath.filters`，直接来自 `toRecord(getIn(scopeData, filterStatePath))`；第二份“状态”是 Table 的 `FilterState`，由同一个 path 解析成 `{ values: Set<string>, keyword }` 并驱动 `processTableData`。二者指向同一个 owner path，却表达不同 shape 和语义。
- **同步失败症状**: 页脚或 toolbar 显示 `filter=active`，但表格仍显示未过滤行；或用户点击列头筛选后表格只剩 active 行，而 `${$crud.filters.status}` 显示对象/异常文本，依赖 `$crud.filters.status` 的刷新参数、导出参数或自定义按钮拿到错误 payload。
- **误报排除**: 这不是合法的 renderer-local UI state，也不是已报告的 table visible/order local defaults。`filterStatePath` 是 CRUD 明确传给 Table 的 scope-owned interaction state，同时 `$crud` / `statusPath` 是 schema-visible projection；该 path 直接影响实际行过滤与外部 schema 读面，属于同一事实源的形状冲突。
- **参考文档**: `docs/components/table/design.md:46-48`, `docs/components/crud/design.md:163-177`, `docs/components/crud/design.md:179-198`
- **复核状态**: 未复核

## 深挖第 9 轮追加

### [维度04-12] CRUD/Table 对同一个 `sortStatePath` 支持的 sort DTO 不一致，导致 `$crud.sort` 与实际行排序分裂

- **文件**: `packages/flux-renderers-data/src/crud-renderer-state.ts:63-80,253-257`, `packages/flux-renderers-data/src/table-renderer/use-table-sort.ts:43-58,88-95`, `packages/flux-renderers-data/src/table-renderer/table-data.ts:84-93`, `packages/flux-renderers-data/src/crud-renderer.tsx:236-250`
- **行号范围**: `crud-renderer-state.ts:63-80,253-257`; `use-table-sort.ts:43-58,88-95`; `table-data.ts:84-93`; `crud-renderer.tsx:236-250`
- **证据片段**:

  ```ts
  export function normalizeSort(value: unknown): CrudSortState {
    const record = toRecord(value);
    const column =
      typeof record.column === 'string'
        ? record.column
        : typeof record.field === 'string'
          ? record.field
          : undefined;
    const direction =
      record.direction === 'asc' || record.direction === 'desc'
        ? record.direction
        : record.order === 'asc' || record.order === 'desc'
          ? record.order
          : undefined;
  ```

  ```ts
  const sortState = useScopeSelector(
    (scopeData) => normalizeSort(getIn(scopeData, sortStatePath)),
    (a, b) => a.column === b.column && a.direction === b.direction,
    { paths: [sortStatePath] },
  );
  ```

  ```ts
  const scopeSortState = useScopeSelector(
    (scopeData) => {
      if (sortOwnership !== 'scope' || !sortStatePath) {
        return undefined;
      }

      const value = getIn(scopeData, sortStatePath) as Record<string, unknown> | undefined;
      return {
        column: typeof value?.column === 'string' ? value.column : '',
        direction:
          value?.direction === 'asc' || value?.direction === 'desc' ? value.direction : null,
      } satisfies SortState;
    },
  ```

  ```ts
  if (sortState.column && sortState.direction) {
    data.sort((a, b) => {
      const aVal = a.record[sortState.column];
      const bVal = b.record[sortState.column];
  ```

  ```ts
  sortOwnership: 'scope',
  sortStatePath,
  filterOwnership: 'scope',
  filterStatePath,
  ```

- **严重程度**: P1
- **现状**: CRUD 的 `useCrudRuntimeState` 对同一个 `sortStatePath` 接受并规范化 `{ field, order }` 与 `{ column, direction }` 两种形状，用于 `$crud.sort` / `statusPath` 摘要；但内部 Table 读取同一个 `sortStatePath` 时只接受 `{ column, direction }`，随后 `processTableData(...)` 也只按 Table 解析出的 `sortState.column/direction` 排序。
- **风险**: 宿主或初始 scope 写入 `{ field: 'name', order: 'asc' }` 时，`$crud.sort` 会显示 `{ column: 'name', direction: 'asc' }`，但 Table 实际排序状态为空，行顺序不变。schema-visible projection、toolbar/refresh/export 参数和用户看到的表格结果会分裂；用户可能基于 `$crud.sort` 触发导出或刷新，得到“参数已排序、当前表格未排序”的不一致结果。
- **建议**: 将 sort owner DTO 收敛到唯一 canonical shape。推荐抽出共享 `normalizeSort` 给 CRUD 与 Table 共用，并在 scope-owned path 上写回同一 canonical `{ column, direction }`；或明确只支持 `{ column, direction }`，删除 CRUD 对 `{ field, order }` 的公开支持及测试语义。不要让 `$crud.sort` 与 Table 排序执行路径对同一路径使用不同解析规则。
- **双状态详情**: 第一份“状态”是 CRUD 公开读面的 `sortState` / `$crud.sort` / `statusPath.sort`，会把 `{ field, order }` 解释为 canonical `{ column, direction }`；第二份“状态”是 Table 的 `SortState`，从同一个 `sortStatePath` 只读取 `column/direction` 并驱动 `processTableData`。两者指向同一个 owner path，但允许的 DTO shape 不一致。
- **同步失败症状**: 页面 footer 或 toolbar 显示 `sort=name:asc`，但表格仍按原始 source 顺序显示；随后点击列头排序时 Table 写入 `{ column: 'name', direction: 'asc' }`，才与 `$crud.sort` 对齐，表现为同一排序状态在初始/外部写入与用户交互写入之间结果不同。
- **误报排除**: 这不是重复报告 `[维度04-11]` 的 filter owner shape conflict；本条仅覆盖 `sortStatePath`。也不是合法的 public alias，因为 CRUD 文档声明 pagination/sort/filter/selection 继续通过内部 Table 的 scope-owned state path 收口，而当前 `$crud.sort` 与实际 Table 排序执行读取同一路径却使用不同 shape。
- **参考文档**: `docs/components/crud/design.md:172-176,179-195`, `docs/components/table/design.md:44-55`
- **复核状态**: 未复核

## 深挖第 10 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度04-01]: 保留 (P1)。`packages/report-designer-renderers/src/page-renderer.tsx` 确实同时创建 `ReportDesignerCore` 与 `SpreadsheetCore`，并通过双向 `useEffect`/ref 防环同步同一 spreadsheet subtree；而 owner 文档明确要求 `document.spreadsheet` 作为 canonical baseline。
- [维度04-02]: 保留 (P1)。`buildReportDesignerScopeData()` 在有 `spreadsheetSnapshot` 时直接用其覆盖 `reportDocument/workbook`，但 `report-designer-core.exportDocument()` 仍从 report core 导出，live code 已形成 host 读面与 save/export 读面分裂。
- [维度04-03]: 降级为 P2。`use-editing.ts` 的确把编辑草稿放在 React state/ref，而 `SpreadsheetRuntimeSnapshot` 预留了 `editing`；但 live core 目前没有完整的 editing command/订阅消费链，现阶段更像 owner contract 未收口，而非已经广泛外溢的双事实源。
- [维度04-04]: 保留 (P1)。Tree mode 同时维护 React `treeDocument/hasLocalTreeEdits` 与 `DesignerCore` 的 projected `doc`/history `treeDocument`，且 prop sync、命令执行、undo/redo 都在双向回写。
- [维度04-05]: 降级为 P2。`useNodesState/useEdgesState` 确实让 Xyflow 持有结构副本并先本地应用 change，但 live 代码也持续用 snapshot 回推合并、主要服务交互流畅性；属明确边界违约，严重度低于独立持久化/历史 owner。
- [维度04-06]: 保留 (P1)。`insertChart/insertCode` 同时写 canvas tag 与 React `charts/codes`，而 autosave/save 又从 bridge 文档正文 + React extras 组装 `SavedDocumentData`；删除/undo/recover 路径下两者没有统一回收或重建机制。
- [维度04-07]: 保留 (P1)。toolbar `draftState` 先本地显示单元格值/注释，再 fire-and-forget `bridge.dispatch('spreadsheet:setCellValue')`，未等待结果或回滚；这与 spreadsheet core 作为 worksheet owner 的契约直接冲突。
- [维度04-08]: 保留 (P2)。`report-spreadsheet-canvas.tsx` 确实通过 effect 将 `ssSnapshot.selection` 异步镜像到 `selectionTarget`，而 host scope 同时暴露 `spreadsheet.activeCell/activeRange` 与 `selectionTarget`，存在短窗口冲突。
- [维度04-09]: 保留 (P1)。纸张设置先写 `editorStore.paperSettings`，再经 `bridge.command.executePaper*` 写 canvas-editor，保存却从 `bridge.getPaperSettings()` 读取；live code 已存在写入端与保存读取端不一致。
- [维度04-10]: 保留 (P2)。类型与文档都把 `viewport` 归 spreadsheet core，但实际滚动/尺寸只在 `SpreadsheetGrid` 本地 state 中维护，core `viewport` 未接线，属于明确 owner 漂移。
- [维度04-11]: 保留 (P1)。CRUD 对 `filterStatePath` 直接 `toRecord(...)` 生成 `$crud.filters/statusPath.filters`，Table 同一路径却要求 `{ filters, keyword }` DTO 并驱动实际过滤，live shape 已不一致。
- [维度04-12]: 保留 (P1)。CRUD `normalizeSort()` 接受 `{ field, order }` 和 `{ column, direction }`，但 Table scope sort 只识别后者；同一 `sortStatePath` 的公开摘要与实际排序执行路径仍未统一。

## 子项复核结论

- [维度04-01]: 成立 (P1)。Report Designer / Spreadsheet 双 core canonical document owner 冲突保留。
- [维度04-02]: 成立 (P1)。host 读面与 save/export 读面分裂保留。
- [维度04-03]: 降级保留 (P2)。editing owner contract 未收口，但尚未证明为高概率双事实源故障。
- [维度04-04]: 成立 (P1)。tree mode React 文档与 core projected doc/history 双 owner 保留。
- [维度04-05]: 降级保留 (P2)。Xyflow 本地结构副本问题存在，但严重度低于独立持久化 owner。
- [维度04-06]: 成立 (P1)。Word Editor chart/code 双写 extras 问题保留。
- [维度04-07]: 成立 (P1)。toolbar draftState 与 worksheet owner 冲突保留。
- [维度04-08]: 成立 (P2)。selectionTarget 异步镜像短窗口冲突保留。
- [维度04-09]: 成立 (P1)。paperSettings 写入端与保存读取端不一致保留。
- [维度04-10]: 成立 (P2)。viewport owner 漂移保留。
- [维度04-11]: 成立 (P1)。CRUD/Table filter DTO shape 不一致保留。
- [维度04-12]: 成立 (P1)。CRUD/Table sort DTO shape 不一致保留。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                            | 一句话摘要                                                                           |
| ----- | -------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 04-01 | P1       | `packages/report-designer-renderers/src/page-renderer.tsx`                      | Report Designer 同时维护 report core 与 spreadsheet core 的 canonical document owner |
| 04-02 | P1       | `packages/report-designer-renderers/src/host-data.ts`                           | host 读面与 save/export 读面读取不同事实源                                           |
| 04-03 | P2       | `packages/spreadsheet-renderers/src/use-editing.ts`                             | spreadsheet editing state 降级保留为 owner contract 未收口                           |
| 04-04 | P1       | `packages/flow-designer-renderers/src/designer-tree-mode.tsx`                   | tree mode 同时维护 React treeDocument 与 DesignerCore history/projected doc          |
| 04-05 | P2       | `packages/flow-designer-renderers/src/designer-xyflow-canvas`                   | Xyflow 本地结构副本降级保留为交互副本 owner 漂移                                     |
| 04-06 | P1       | `packages/word-editor-renderers/src/editor-canvas.tsx`                          | Word Editor chart/code 同时写 canvas tags 与 React extras                            |
| 04-07 | P1       | `packages/spreadsheet-renderers/src/spreadsheet-toolbar/use-toolbar-actions.ts` | toolbar draftState 与 worksheet owner 冲突                                           |
| 04-08 | P2       | `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`          | spreadsheet selection 异步镜像到 selectionTarget 存在短窗口分裂                      |
| 04-09 | P1       | `packages/word-editor-renderers/src/toolbar/page-controls.tsx`                  | paperSettings 写入 editorStore/canvas，保存却从 bridge 读取另一事实源                |
| 04-10 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`                       | viewport 文档/类型归 core，实际仍在 grid 本地 state                                  |
| 04-11 | P1       | `packages/flux-renderers-data/src/crud-renderer-ownership.ts`                   | CRUD/Table 同一 filterStatePath 使用不同 DTO shape                                   |
| 04-12 | P1       | `packages/flux-renderers-data/src/crud-renderer-ownership.ts`                   | CRUD/Table 同一 sortStatePath 使用不同 DTO shape                                     |
