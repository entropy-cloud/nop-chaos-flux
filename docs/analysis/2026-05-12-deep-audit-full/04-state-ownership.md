# 维度 04：状态所有权与单一事实来源

## 范围与状态

- **维度范围**: 状态所有权、单一事实来源、重复 owner、bridge 是否符合架构定义。
- **最终状态**: 最终保留 3 项，驳回 1 项。
- **来源限制**: 本文件仅根据同目录 `stage-1-full-findings-01-05.md`、`round-2-to-5-raw-findings.md`、`raw-findings-03-06.md`、`final-review-results-01-05.md`、`summary.md` 重写。
- **代码检查**: 本次重写未检查运行时代码。

## 深挖轮次与收敛说明

- **第 1 轮**: 初审发现 2 项，独立复核后保留 1 项、驳回 1 项。
- **第 2-5 轮**: raw findings 追加 `04-03` 和 `04-04`，覆盖 Flow Designer tree mode owner truth 与 variant-field child validation contract。
- **收敛说明**: `summary.md` 与 `final-review-results-01-05.md` 均说明第 5 轮达到执行上限后进入最终复核，不声称自然收敛。

## 最终复核摘要

- **最终保留**: 3 项。
- **最终驳回**: 1 项。
- **最终 P1**: 1 项。
- **最终 P2**: 2 项。
- **驳回要点**: `04-02` report/spreadsheet dual-core bridge 被架构文档明确允许，canonical public truth 仍是 `document.spreadsheet`。

## 最终保留项

### [04-01] Spreadsheet editing state 在 renderer local state/ref 与 core snapshot 双轨

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:12-16`, `31-44`; `packages/spreadsheet-core/src/core/internal-state.ts:10-15`, `29-35`
- **证据片段**:
  ```ts
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const editingCellRef = useRef<{ row: number; col: number } | null>(null);
  const editValueRef = useRef('');
  ...
  const handleEditSave = useCallback(async () => {
    editingCellRef.current = null;
    editValueRef.current = '';
    setEditingCell(null);
    await bridge.dispatch({
  ```
- **严重程度**: P2
- **现状**: renderer 本地持有 active edit cell/value，同时 spreadsheet core snapshot 也有 `editing` 字段。
- **风险**: editing lifecycle 可能分叉，尤其保存时先清 local state 再 dispatch，失败场景容易状态不一致。
- **建议**: 将 editing lifecycle 收敛到 core；或明确 core `editing` 未使用并移除/避免平行 truth。
- **误报排除**: 这不是允许的 report/spreadsheet bridge；同一个 editing 概念在 local renderer 和 core snapshot 双重表示。
- **最终复核结论**: 保留 P2。spreadsheet edit cell/value 在 renderer state/refs 与 core snapshot 双轨，且 save 先清草稿后 dispatch。
- **修订标题/理由**: 标题与方向维持。

### [04-03] Tree mode 的 `TreeDocument` 同时由 React state 与 DesignerCore history 维护

- **文件**: `packages/flow-designer-renderers/src/designer-tree-mode.tsx:21-29`; `packages/flow-designer-renderers/src/designer-command-adapter.ts:62-68`; `packages/flow-designer-core/src/core.ts:129-136`; `packages/flow-designer-core/src/core.ts:397-412`
- **证据片段**:

  ```ts
  const inputTreeDocument = readDesignerResolvedProp<TreeDocument>(props, 'treeDocument');
  const [treeDocument, setTreeDocument] = useState<TreeDocument | undefined>(inputTreeDocument);

  useEffect(() => {
    setTreeDocument(inputTreeDocument);
  }, [inputTreeDocument]);
  ```

  ```ts
  function pushHistory() {
    historyState = pushHistoryEntry(
      historyState,
      doc,
      docRevision,
      maxHistorySize,
      treeOwner?.getTreeDocument(),
    );
  }
  ```

- **严重程度**: P1
- **现状**: tree mode owner truth `TreeDocument` 存在两份可写状态：renderer React state 与 `DesignerCore` history entry。`replaceDocumentWithHistory(nextDoc, treeDocument)` 收到显式 treeDocument 后，后续 `pushHistory()` 仍通过 React state callback 读取当前 tree，可能读到旧值。
- **风险**: tree command 修改 owner tree 后，history entry 可能保存“新 GraphDocument + 旧 TreeDocument”的错配快照；undo/redo 会破坏 `TreeDocument 是 owner truth` 的设计基线。
- **建议**: 让 `DesignerCore` 在 tree mode 内部接收并同步记录当前 `TreeDocument`，或让 `pushHistory()` 直接使用显式参数，避免通过 React state callback 读取异步外部镜像。
- **误报排除**: 不是已驳回 report/spreadsheet bridge；这里存在明确双写 owner state，且 history 写入路径读取异步 React state 镜像。
- **最终复核结论**: 保留 P1。tree mode `TreeDocument` 由 React state 与 core history 双重维护；`replaceDocumentWithHistory(nextDoc, treeDocument)` 后 `pushHistory()` 可能通过 React closure 读取旧 tree。
- **修订标题/理由**: 建议 core-owned tree 或显式传入 history snapshot。

### [04-04] `variant-field` 默认 parent-owned projected editor 却无条件注册 child validation contract

- **文件**: `packages/flux-renderers-form-advanced/src/variant-field/variant-field.tsx:408-446`; `packages/flux-renderers-form-advanced/src/variant-field/variant-field-runtime.ts:19-35`
- **证据片段**:

  ```ts
  React.useEffect(() => {
    const owner = parentForm ?? parentValidationOwner;
    const childOwner = parentForm ? variantForm : variantValidationOwner;

    if (!owner || !childOwner || !name) {
      return;
    }
  ```

  ```ts
  owner.registerChildContract({
    childOwnerId,
    mode: 'recurse-submit',
    active: true,
  ```

- **严重程度**: P2
- **现状**: 架构文档规定 `variant-field` 默认是 parent-owned projected polymorphic editor，但 live code 即使只是 projected `variantForm` / `variantValidationOwner`，也无条件向 parent owner 注册 `recurse-submit` child contract。
- **风险**: parent submit/validation 会同时把同一字段当作 parent-owned path 与 child contract 处理，owner 事实来源不清晰，可能导致重复验证、错误 gating 或 submit 行为漂移。
- **建议**: 仅在 compiler/runtime 明确判定为 `create-owner` 时注册 child contract；默认 `inherit-owner` 路径只使用 projected scope/form/validation view。
- **误报排除**: 注册的是影响 submit orchestration 的 live child contract，不是 UI transient state。
- **最终复核结论**: 保留 P2。`variant-field` projected form/validation owner 路径仍注册 `recurse-submit` child contract，模糊 parent-owned field 与 child-owner submit orchestration。
- **修订标题/理由**: 标题与方向维持。

## 驳回项

### [04-02] Report/spreadsheet dual-core bridge 不是状态所有权缺陷

- **文件**: `packages/report-designer-renderers/src/page-renderer.tsx:223-244`, `307-337`; `docs/architecture/report-designer/design.md:438-442`
- **证据片段**:
  ```md
  - `document.spreadsheet` 是 report-designer 对外发布、`save` / `exportDocument()` 返回、以及 host scope `spreadsheet.workbook`/`workbook` 投影所共同依赖的 canonical spreadsheet subtree
  - 内部 `spreadsheet-core` 可以维护自己的编辑态与 history store，但支持路径下的 report-owned mutation 必须把同步后的 spreadsheet document 回写到 report document，再由 host projection 读取同一份 canonical snapshot
  - `runtime.dirty` 表示对宿主发布的聚合 dirty，等于 `designer.dirty || spreadsheet.runtime.dirty`
  ```
- **严重程度**: 无
- **现状**: report designer renderer 同时创建 report core 与 spreadsheet core，并将 spreadsheet document 同步回 report document。
- **风险**: 存在维护性/性能风险，但 owner docs 明确支持此 bridge 形态。
- **建议**: 不作为状态所有权违规跟踪；如需跟进，使用更窄的 bridge maintainability/performance 条目。
- **误报排除**: 文档明确区分 internal spreadsheet core 和 canonical `document.spreadsheet`。
- **最终复核结论**: 驳回。report/spreadsheet dual-core bridge 被架构文档明确允许；canonical public truth 仍是 `document.spreadsheet`。
- **修订标题/理由**: 仅可作为 maintainability/performance 跟踪，不作为状态所有权缺陷。
