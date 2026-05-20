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
