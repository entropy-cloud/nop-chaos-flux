# 32 report-designer-renderers 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/report-designer-renderers/src/` 排除 `*.test.*` 后 21 个实现文件共 3791 行（page-renderer.tsx 684 / report-designer-manifest.ts 528 / renderers.tsx 321 / report-spreadsheet-canvas.tsx 303 / host-data.ts 290 / field-panel-renderer.tsx 200 / report-designer-toolbar.tsx 188 / report-designer-toolbar-helpers.ts 179 / page-renderer.test-support.tsx 155 / report-field-panel.tsx 131 / bridge.ts 127 / page-renderer-snapshots.ts 118 / host-action-provider.ts 109 / fallbacks.tsx 79 / report-designer-inspector.tsx 75 / inspector-shell-renderer.tsx 69 / index.ts 63 / types.ts 53 / report-designer-toolbar-defaults.ts 41 / schemas.ts 39 / helpers.ts 39）。**精读覆盖率：全部 21 个文件 100% 精读**（含 `page-renderer.test-support.tsx`——其文件名不匹配 `*.test.*` 排除规则，按实现文件对待，共 155 行）。核对 `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/inspector-design.md`、`docs/components/report-designer-page/design.md`、`package.json`；并精读 `report-designer-core` 的 core.ts / core-dispatch.ts / types.ts / runtime/metadata.ts / runtime/field-sources.ts / runtime/inspector-panels.ts 与 `spreadsheet-core` 的 core.ts / selection-handlers.ts，及 `spreadsheet-renderers` 的 use-field-drop.ts / default-page-body.tsx / spreadsheet-grid viewport、`flux-renderers-form` 的 form.tsx / field-handlers.tsx，核实跨包结论与反误报。
- 结论概览：**P0 x1 / P1 x3 / P2 x8 / P3 x7**。总评：分层与契约面整体扎实（五 region + statusPath、canonical 命名空间 action 无双重前缀、toolbar undo/redo 正确读取 report-owned `designer.canUndo/canRedo`、preview 单.owner 取消语义、inspector loading/error 空态、拖拽 payload MIME 校验、回滚链完整、i18n 35 个 key 双语全存在）。但**默认画布硬编码 `ROWS=30 / COLS=10`**（P0）：任何 used range 超出 30×10 的报表模板在设计画布中被静默截断，且与共享 interaction 层内部 100×26 上限不一致（键盘可导航到未渲染单元格）。P1 集中在设计器经典缺陷面：report undo 触发 `replaceDocument` 重置 activeSheet/选区/ss-undo、inspector 换选目标即整体卸载重挂导致未保存草稿静默丢失、28 号 F-02 range meta 错乱在本包 inspector 的读写暴露面完整确认（含跨 range 元数据污染写入）。跨包结论核实：28 号 F-04（删行/删列 semantic 键不平移）渲染层**零补偿**，badge 与 inspector 全暴露。

## P0 缺陷

### F-01 默认画布硬编码 `ROWS=30 / COLS=10`：超出 30 行 × 10 列的 workbook 在设计画布被静默截断，且与 interaction 层 100×26 内部上限互相矛盾

- 位置：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:26-27`（硬编码）、`:53-54`（传入 interactions）、`:253-254`（传入 SpreadsheetGrid）；对照 `packages/spreadsheet-renderers/src/default-page-body.tsx:22-38`（`resolveGridDimensions` 从已用边界推导、100×26 仅作空白基线）；`packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:62-63`（grid 侧按 rows/cols 截断命中）；`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts:67-68`（interaction 层独立硬编码 100×26，`use-spreadsheet-interactions.ts:46-47` 声明的 rows/cols 从未解构使用）
- 关键源码摘录（report-spreadsheet-canvas.tsx:26-27, 50-55）：
  ```ts
  const ROWS = 30;
  const COLS = 10;
  // ...
  const interactions = useSpreadsheetInteractions({
    bridge: spreadsheetBridge,
    sheetId,
    rows: ROWS,
    cols: COLS,
  });
  ```
- 推理链（输入→路径→错误结果）：
  1. 输入：schema `document` 提供 used range 为 60 行 × 12 列的报表模板（authored JSON，或经 `report-designer:importTemplate` codec 导入）；
  2. 路径：`ReportSpreadsheetCanvas` 用常量 30/10 驱动 `SpreadsheetGrid`（渲染与命中均按 `rows-1/cols-1` 截断，viewport 的 `visEndRow = min(rows-1, …)`），第 31 行起、第 K 列起的单元格既不渲染也不可点击/不可拖拽命中；
  3. 错误结果：文档中真实存在的数据与 semantic metadata 不可见、不可编辑，用户无任何提示（静默截断）；同时 keyboard 导航/选区在 interaction 层仍按 100×26 寻址，方向键可以从第 30 行走到不可见的第 31~100 行，selection mirror（canvas `useEffect`，:92-146）随之把 core `selectionTarget` 设到**用户看不见的单元格**，inspector 随之编辑不可见目标。
- 契约依据：`docs/architecture/report-designer/design.md:195` "grid 维度必须从 active sheet 的已用边界推导，并保持 `100x26` 仅作为最小空白工作表基线；更大的 workbook 不能再被默认壳层静默截断到固定 demo 尺寸"（该条字面针对 spreadsheet-page 默认 host，但 report-designer canvas 是 report-designer-page 的同位默认 host，且 §9.1 明确主工作区是"面向持续编辑的 spreadsheet workbench"；31 号报告已将共享层同类问题定级 P0）。当前 30×10 甚至低于文档规定的空白最小基线。
- 影响：任何非 demo 尺寸报表模板在设计器内不可完整设计；截断无诊断、无警告；两层尺寸不一致产生"选区在不可见单元格"的错乱。
- 修复方向：与 `default-page-body.tsx` 对齐——从 `ssSnapshot.activeSheet` 的 rows/columns/cells/merges 推导维度（`Math.max(基线, lastRowIndex+1)`），随 active sheet 切换重算；同时推动共享层 `use-spreadsheet-interactions` 真正消费传入的 rows/cols（31 号 F-01）。

## P1 隐患

### F-02 report undo/redo（及任何 spreadsheet 子树回退）触发 `replaceDocument`：active sheet 被重置到第一个、选区清空、spreadsheet undo 历史被整体擦除

- 位置：`packages/report-designer-renderers/src/page-renderer.tsx:435-454`（report→ss 同步 effect 无条件 `replaceDocument`）；`packages/spreadsheet-core/src/core.ts:81-94`（`replaceDocument` 重置 activeSheetId/selection/editing/dirty/undoStack/redoStack）；`packages/report-designer-core/src/core-dispatch.ts:288-324`（undo/redo 换 spreadsheet 子树对象）；`packages/report-designer-core/src/core.ts:462-474`（`syncSpreadsheetDocument` 把每次 spreadsheet 编辑都压入 report undo 栈）
- 关键源码摘录（spreadsheet-core/src/core.ts:81-94）：
  ```ts
  replaceDocument(nextDocument: SpreadsheetDocument) {
    const replacedDocument = cloneSpreadsheetDocument(nextDocument);
    const activeSheetId = replacedDocument.workbook.sheets[0]?.id ?? '';
    store.setState({
      document: replacedDocument,
      activeSheetId,
      selection: { kind: 'none' },
      editing: undefined,
      dirty: false,
      undoStack: [],
      redoStack: [],
      ...
  ```
- 推理链：用户在 sheet2 编辑 B3 → 渲染层 ss→report 同步 effect（page-renderer.tsx:456-468）调用 `core.syncSpreadsheetDocument` → report undo 栈压入编辑前文档 → 默认 toolbar Undo 按钮（`designer.canUndo` 已为 true，`report-designer-toolbar-defaults.ts:7-13`）点击 → `report-designer:undo` 恢复旧 spreadsheet 子树 → 渲染层 effect 检测到 `snapshot.document.spreadsheet` 引用变化 → `spreadsheetCore.replaceDocument(...)` → 用户被踢回 sheet1、选区/编辑态清空、spreadsheet 自身 undo/redo 历史清零。
- 影响：多 sheet 报表的常用路径（改一个格子→点 undo）产生"跳 sheet + 丢选区 + 丢 ss 历史"的确定性破坏；redo 亦然；每次单元格编辑是一条独立 report undo 记录，回退多步编辑需要连续 N 次 undo 且每步都重置上下文。已由 `page-renderer-shell.test.tsx:208-257` 证实 undo→canvas 回退链路本身工作（cell 值会还原），但副作用未被测试覆盖。
- 修复方向：渲染层在 report→ss 回退时保留活动 sheet/选区（replaceDocument 前后对比 sheets id 集合，回退后恢复原 activeSheetId 与 selection，或为 spreadsheet-core 增加 `replaceDocumentPreservingView`）；或将 spreadsheet 子树 undo 交还 spreadsheet history（report undo 栈只记录 semantic 变更），避免双栈互相践踏。

### F-03 inspector 每次切换选区目标即卸载重挂表单：未保存草稿被静默丢弃 + 每次点击闪 "Loading panels"

- 位置：`packages/report-designer-renderers/src/inspector-shell-renderer.tsx:51-66`（loading 分支直接替换掉 body 渲染）；`packages/report-designer-core/src/core.ts:266-281`（`setSelectionTarget` 同步置 `loading:true`，异步 refresh 后置 false）；`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:92-146`（每次单元格点击都触发 `setSelectionTarget`）；`packages/flux-renderers-form/src/renderers/form.tsx:55-70`（form 初值仅在挂载时捕获）
- 关键源码摘录（inspector-shell-renderer.tsx:51-66）：
  ```tsx
  {!target ? (
    <p data-slot="report-designer-empty">{...noSelectionLabel}</p>
  ) : inspector?.loading ? (
    <p data-slot="report-designer-empty">{t('flux.reportDesigner.loadingPanels')}</p>
  ) : inspector?.error ? (
    ...
  ) : (
    (props.helpers.render(inspectorSchema, { pathSuffix: 'inspector' }) as React.ReactNode)
  )}
  ```
- 推理链：点击 cell A → `setSelectionTarget` 同步 `inspector.loading=true` → shell 重渲染时整棵 inspector body（含表单 fiber）被 loading 段落替换 → **卸载**；`refreshDerivedState`（至少一个微任务，含字段源加载）完成后 `loading=false` → body 重新挂载，表单以 cell A 的 meta 重建。此机制"顺带"避免了换目标草稿残留（见检查过程记录的反误报项），但代价是：用户在 cell A 的 inspector 字段中输入（按 `inspector-design.md` §7.3 的合法策略——表达式/复杂字段用 `blur` 或显式保存提交）后点击 cell B，**进行中的草稿确定性丢失且无任何提示/守卫**；同时每次点选单元格 inspector 都闪一次 loading 文案，且伴随完整的字段源 provider 刷新（见 F-07）。
- 影响：违背 inspector-design.md §7.3 "表达式字段和复杂字段支持 blur 或显式保存" 的草稿策略前提（草稿活不过一次选区切换）；高频点击下 UI 闪烁。
- 修复方向：loading 期间保持表单挂载（覆盖层/aria-busy 而非条件卸载），换目标时以 target identity 作为 React key 或 `pathSuffix`/`scopeKey` 后缀显式重建（`helpers.formatSelectionLabel(target)` 已有现成实现），把"卸载时机"从 loading 副作用改为显式目标切换语义；对未保存草稿加 dirty 守卫或自动 change 级提交。

### F-04 （28 号 F-02 消费侧暴露确认）range 选中的 inspector 读/写都落在"该 sheet 第一条 rangeMeta"上：显示错乱 + 跨 range 元数据污染写入，渲染层无任何缓解

- 位置：读写链完整经过本包：`packages/report-designer-core/src/types.ts:361-367`（range 分支恒返回 `rangeEntries[0].meta`，28 号已立案的根因）→ `packages/report-designer-core/src/core.ts:58-61`（`activeMeta`）→ `packages/report-designer-renderers/src/host-data.ts:274`（host scope 发布 `meta: snapshot.activeMeta ?? null`）→ `packages/report-designer-renderers/src/report-designer-inspector.tsx:18-25, 67-72`（inspector body 表单消费）；写回侧 `packages/report-designer-core/src/core-dispatch.ts:133-143`（`updateMeta` 用 `getTargetMeta` 结果做 merge 基底）+ `packages/report-designer-core/src/runtime/metadata.ts:279-300`（按精确 range id 追加写入）
- 关键源码摘录（core-dispatch.ts:133-143）：
  ```ts
  case 'report-designer:updateMeta': {
    return withDerivedRefresh(async () => {
      const current = store.getState();
      const currentMeta = getTargetMeta(current.document.semantic, command.target);
      const nextMeta = mergeMetadata(currentMeta, command.patch);
      const result = updateMetadata(current.document, command.target, nextMeta);
  ```
- 暴露面推理链：sheet 上已存在 rangeMeta R1=A1:D5（第一条）。用户框选 B2:C3（无精确匹配条目）→ canvas mirror 上报 range target → core `getTargetMeta` 返回 R1 的 meta → 本包 inspector 表单显示 R1 的属性（用户以为在看 B2:C3 的属性）→ 用户改一个字段提交 `report-designer:updateMeta{target:B2:C3}` → `mergeMetadata(R1.meta, patch)` 把 **R1 的全部元数据连同用户修改**写入 B2:C3 的新 rangeMeta 条目——无选中关系的第一条 range 的属性被整包复制污染到新 range。
- 影响：多 range 报表的属性面板读错误值、写产生跨 range 复制污染；`getCellMetadata` badge 路径（report-spreadsheet-canvas.tsx:148-155）不涉及 range，但 inspector 全路径暴露。本包作为消费方无任何防御（不校验返回 meta 与 target 的对应关系）。
- 修复方向：根因在 core（28 号 F-02：按重叠/精确匹配选择 rangeMeta）；渲染层短期可在 inspector 侧显示当前 target 概要与实际命中 range 的差异提示（`updateMetadata` 的精确 id `sheetId:r1:c1:r2:c2` 与选中 range 可比对），并在 `activeMeta` 来源与 target 不一致时禁用保存。

## P2 风险

### F-05 （28 号 F-04 消费侧确认）删行/删列后渲染层零补偿：metadata badge 与 inspector 按旧地址键显示，行/列语义整体错位

- 位置：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:148-155`（`getCellMetadata` 按当前 row/col 地址读 `core.getMetadata`，由 `SpreadsheetGrid` 逐可见单元格调用渲染 badge）；`packages/report-designer-core/src/types.ts:355-360`（row/column/cell meta 均按原始数字/地址键取值，结构操作不搬运，28 号已立案）；全包 grep `insertRow|deleteRow|removeRow|移位|shift` 零命中——**渲染层不存在任何补偿/平移逻辑**
- 关键源码摘录（report-spreadsheet-canvas.tsx:148-155）：
  ```ts
  const getCellMetadata = useCallback(
    (row: number, col: number) =>
      core.getMetadata({
        kind: 'cell',
        cell: { sheetId, address: cellAddress(row, col), row, col },
      }),
    [core, sheetId],
  );
  ```
- 问题：删除第 2 行后，原第 3 行上移为第 2 行，但 `cellMeta/rowMeta` 键仍指向旧索引——上移行显示的是原第 2 行的 badge，其真实 metadata 显示到了下方一行；inspector `meta` 同理错位。用户在错位显示下修改属性会写进错误目标的键。
- 影响：结构性编辑后设计器的全部语义可视化（badge + inspector）系统性错位一格，且无告警。
- 修复方向：core 侧结构命令联动平移 semantic 键（28 号 F-04 修复）；渲染层短期可在检测到 spreadsheet 行列数与 semantic 键集合越界时给出诊断提示（至少不静默展示错位数据）。

### F-06 拖拽 drop 目标三重回退链：dragLeave 不清 ref、画布铬区（SheetTabBar 等）drop 回退到"当前选中格"、外部拖拽回退到"上一次成功 drop 的字段"

- 位置：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:157-158`（stale payload 回退）、`:242-243`（根容器 `onDragOver` preventDefault + `onDrop` 全区域接收，覆盖 SheetTabBar）；`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-field-drop.ts:12`（`dropTargetCellRef.current || dropTargetCell || selectedCell` 回退链）、`:35-37`（`handleFieldDragLeave` 只清 state 不清 ref）
- 关键源码摘录（use-field-drop.ts:12 与 report-spreadsheet-canvas.tsx:158）：
  ```ts
  const targetCell = dropTargetCellRef.current || dropTargetCell || selectedCell;
  // ...
  const dragPayload = readReportFieldDragPayload(event) ?? core.getSnapshot().fieldDrag.payload;
  ```
- 问题：(a) 拖过某单元格后移出网格，`dropTargetCell` 高亮已清除但 ref 仍持有旧格，随后在画布任意铬区（tab 栏、网格下方空白）松手 → 字段写入那个已无高亮的旧格；(b) 未拖过任何单元格时铬区 drop 回退到**当前选中格**——用户以为取消了拖拽，实际选中格被写入 `${fieldId}` 并附加 metadata；(c) `readReportFieldDragPayload` 只认 MIME `application/x-nop-report-field`，来自其他应用/窗口的普通拖放没有该 MIME → 回退 `core.getSnapshot().fieldDrag.payload`，而该 payload 仅在上一次**成功 drop 后**由 core 写入（core-dispatch.ts:120-126），于是外部拖拽会静默复用上一次拖入的字段。
- 影响：drop 命中与视觉反馈脱节；"取消"拖拽变成隐式写入；跨应用拖入可绑定过期字段（错误数据进入模板）。
- 修复方向：`handleFieldDragLeave` 同时清 ref（共享层）；渲染层根容器只对网格区域 preventDefault/drop，或在回退分支要求 dragPayload 存在且 drag 会话由本面板发起（`fieldDrag.active`，见 F-13 该状态目前从未被激活）；移除对历史 payload 的回退。

### F-07 每次 spreadsheet 文档变更触发全文档 `structuredClone` + 字段源 provider 全量重载 + 全 scope 重建级联重渲染

- 位置：`packages/report-designer-renderers/src/page-renderer.tsx:456-468`（任一 spreadsheet 文档身份变化即 `syncSpreadsheetDocument`）；`packages/report-designer-core/src/core.ts:462-474`（`structuredClone(nextDocument)` + `refreshDerivedState()`）；`packages/report-designer-core/src/runtime/field-sources.ts:47-72`（每次调用都对每个已配置 provider `await provider.load(...)`）；`packages/report-designer-core/src/core.ts:377-385`（去重仅覆盖"同一 document 的并发"请求，跨编辑不去重）；`packages/report-designer-renderers/src/page-renderer-snapshots.ts:38-53`（`fieldSources` 按引用比较，每次刷新新数组必触发页面重渲染）
- 关键源码摘录（core.ts:462-472）：
  ```ts
  syncSpreadsheetDocument(nextDocument) {
    if (isReadonly) return;
    const currentDocument = store.getState().document;
    const changed = applyDocumentChange({
      ...currentDocument,
      spreadsheet: structuredClone(nextDocument),
    });
    if (changed) {
      store.setState((current) => ({ ...current, spreadsheetSyncSource: nextDocument }));
      void refreshDerivedState();
  ```
- 问题：每次单元格提交/样式变更/行列调整 → 渲染层同步 → core 深拷贝整个 spreadsheet 文档 + 压 undo + `refreshDerivedState` → 所有 field source provider 重新 load（设计文档明确预期数据集类 provider）→ 新 `fieldSources` 数组 → `equalReportPageSnapshot` 失败 → 页面重渲染 → `ReportDesignerHostScopeSync` 重建整个 host scope → toolbar / field panel / inspector 全部重渲染。连续编辑（如逐格输入）时该链条逐键重复。
- 影响：带 provider 的设计器在持续编辑下产生 O(文档大小) 拷贝 + 网络级重载 + 大范围重渲染；大模板下输入延迟可感。根因分属 core（refresh 策略与 clone），但触发点是本包同步 effect 的粒度。
- 修复方向：core 侧将 field-source 刷新与 spreadsheet 子树同步解耦（semantic/document 版本号或防抖）；渲染层对 ss→report 同步做微观批处理（同一帧多次 document 变更只同步末值）。suspect 级别取决于 provider 是否远程——机制本身已核实。

### F-08 toolbar `toCommand` 白名单缺少 `importTemplate` / `exportTemplate`：自定义这些 action 的按钮点击后静默无操作

- 位置：`packages/report-designer-renderers/src/report-designer-toolbar-helpers.ts:120-139`（白名单仅 7 个 action）；`packages/report-designer-renderers/src/report-designer-toolbar.tsx:29-31`（`toCommand` 返回 null 时直接 `return`，无提示）；对照 `packages/report-designer-renderers/src/host-action-provider.ts:9-22`（`REPORT_DESIGNER_HOST_METHODS` 含 importTemplate/exportTemplate）
- 关键源码摘录（report-designer-toolbar.tsx:29-31）：
  ```ts
  async function handleButtonClick(item: ToolbarItem) {
    const command = toCommand(item.action);
    if (!command) return;
  ```
- 问题：`itemsOverride` 完整支持自定义 button 的 `action` 字段，且宿主 action provider 也发布这两个方法，但 toolbar 对未列入白名单的 canonical action 一律静默吞掉点击——用户配置导出/导入按钮后点击无任何反馈（无 dispatch、无告警）。
- 影响：可配置能力与实际可调度面不一致；静默失败违背 D5 基线。
- 修复方向：`toCommand` 对所有 `report-designer:`/`spreadsheet:` 前缀的已知 method 生成 `{action}` 透传（payload 校验已由 provider 侧 manifest 承担），或至少对未知 action 发出诊断/禁用按钮。

### F-09 页面卸载时不 dispose report core：in-flight preview / 字段源 adapter 不被 abort

- 位置：`packages/report-designer-renderers/src/page-renderer.tsx:405-414`
- 关键源码摘录（page-renderer.tsx:405-414）：
  ```ts
  useEffect(() => {
    const previousCore = lastReportDesignerCoreRef.current;
    if (previousCore && previousCore !== core) {
      previousCore.dispose();
    }
    lastReportDesignerCoreRef.current = core;
    return () => {
      lastReportDesignerCoreRef.current = null;
    };
  }, [core]);
  ```
- 问题：该 effect 只在 core **替换**时 dispose 旧实例；组件卸载时 cleanup 仅置空 ref，当前 core 永不 dispose（`report-designer-core` 的 dispose 会 abort preview/refresh 控制器，core.ts:504-516）。页面卸载后仍在执行的 preview adapter、字段源 provider 网络请求不会被取消，回调在僵尸 store 上继续跑（core 侧有 `disposed` 守卫但永远为 false）。StrictMode 双挂载路径本身安全（重挂后 ref 为 null 不会误 dispose），此问题仅影响真实卸载。
- 影响：长会话中反复挂载/卸载设计器页面（路由切换）累积未取消的异步工作；preview 大结果集在后台继续计算。
- 修复方向：cleanup 中对"未被下一个 effect 接管"的当前 core 调用 dispose（例如 cleanup 捕获 core 并在 ref 已被清空/替换判断后 dispose），与 swap 分支对称。

### F-10 core 重建时同步 refs 不重置：document/readOnly props 身份变化后产生冗余 replaceDocument，并可能压入"无操作"undo 条目 + 假 dirty（suspect）

- 位置：`packages/report-designer-renderers/src/page-renderer.tsx:280-302`（`resolvedDocument`/`readOnly` 变化即重建 spreadsheetCore + core）、`:430-433`（`lastSyncedSpreadsheetRef` / `lastAppliedReportSpreadsheetRef` 为组件级 ref，不随 core 重建重置）、`:435-468`（两个同步 effect 依赖新 core 的克隆对象身份）、`packages/report-designer-core/src/core.ts:325-340`（`applyDocumentChange` 按对象身份判 changed）
- 问题：core 重建后，新 spreadsheetCore 的创建期克隆（clone2a）、新 report core 的克隆（clone2b）、replaceDocument 后的克隆（clone2c）三者身份互异且与旧 refs 不等：effect1 会 `replaceDocument`（多一次全文档深拷贝），effect2 判 `clone2a !== clone2c` 后调用 `syncSpreadsheetDocument(clone2a)`——内容相同但包装对象身份不同 → `applyDocumentChange` 判 changed → 压入一条内容无变化的 undo 记录且 `designer.dirty` 立即为 true。触发条件是 `props.props.document` / `readOnly` 的解析值身份变化（静态 schema 对象不触发；宿主用表达式每次产出新 document 对象则必触发）。
- 影响：条件触发下，页面一挂载或 scope 变化即出现"未做任何编辑但 dirty=true、undo 一步无变化"的状态，污染保存/关闭守卫语义。
- 修复方向：将两个 refs 的生命周期与 core 实例绑定（key 化重建整棵子树，或 refs 挂到 core 上随 memo 重置）；同步 effect 首次运行时对新建 core 做初始化标记。标 suspect：依赖上游 props 身份行为，未在本包测试中复现。

### F-11 拖拽 drop 路径双命令非原子：先 `spreadsheet:setCellValue` 再 `dropFieldToTarget`，违反"drop 只产生标准化 designer command"基线，且与 insert 按钮路径行为不对称

- 位置：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:163-216`（先写 `${fieldId}` 单元格文本，再 dispatch designer 命令，失败时手工回滚）；对照 insert 按钮路径 `packages/report-designer-renderers/src/page-renderer.tsx:607-612` 与 `packages/report-designer-renderers/src/field-panel-renderer.tsx:79-100`（仅 dispatch `report-designer:dropFieldToTarget`，不写单元格文本）；契约 `docs/architecture/report-designer/design.md:254`（"drop 时只产生标准化 designer command，不直接修改 document"）
- 关键源码摘录（report-spreadsheet-canvas.tsx:165-187）：
  ```ts
  const spreadsheetResult = await spreadsheetBridge.dispatch({
    type: 'spreadsheet:setCellValue',
    cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
    value: `\${${dragPayload.fieldId}}`,
  });
  ...
  const designerResult = await designerBridge.dispatchDesigner({
    type: 'report-designer:dropFieldToTarget',
    field: dragPayload,
    ...
  ```
- 问题：(a) 一次拖放产生两条独立历史记录（setCellValue 经 ss→report 同步压一条、designer drop 一条），report undo 一步只回退 semantic，得到"单元格仍有 `${field}` 文本但无绑定 metadata"的中间态；(b) 失败回滚又追加第三条命令（clearCells/restore），undo 栈进一步污染；(c) 同一逻辑操作的两条入口（拖拽 vs insert 按钮）效果不同——拖拽写单元格文本+metadata，insert 只写 metadata，画布呈现不一致。
- 影响：undo 语义破碎（需多次 undo 且中间态错误）；两种插入方式的可见结果分叉。
- 修复方向：把单元格文本写入并入 core 的 field-drop adapter/`applyFieldDrop`（单命令原子完成），渲染层 drop 只 dispatch 一个 designer 命令；insert 与 drop 共用同一 core 路径。

### F-12 直接使用 `report-inspector`（不经 shell）时无 loading/重挂门控：表单跨目标存活，草稿残留可经 `updateMeta` 串写到新目标（条件性）

- 位置：`packages/report-designer-renderers/src/report-designer-inspector.tsx:61-74`（`dynamicBody` 以稳定身份渲染，`pathSuffix: 'inspector-body'` 恒定，无 target 相关 key/scopeKey）；`packages/flux-renderers-form/src/renderers/form.tsx:55-70`（`initialValuesRef = useRef(initialValues)` 仅捕获首帧，form runtime memo 依赖不含初值）；`packages/flux-renderers-form/src/field-utils/field-handlers.tsx:302-317`（用户编辑过（`userEditedRef`）后默认值不再重推）
- 关键源码摘录（form.tsx:55-70，节选）：
  ```ts
  const initialValuesRef = useRef(initialValues);
  ...
  const ownedForm = useMemo(
    () => runtime.createFormRuntime({
      ...
      initialValues: initialValuesRef.current, // intentional: initial values must not retrigger useMemo
  ```
- 问题：默认页面路径经 `report-inspector-shell` 的 loading 翻转顺带卸载重挂表单（见 F-03），草稿不会残留；但 schema 作者把 `report-inspector` 直接放进 inspector region（page-renderer.tsx:500-507 支持任意自定义 region 内容）时没有该门控——`resolveInspectorSchemaForTarget` 对同 kind target 返回**同一个** config 对象（runtime/inspector-panels.ts:24-29），RenderNodes 的 compiled memo 稳定，表单 fiber 跨目标存活：按文档模式 `{type:'form', data:'${meta}'}` 初值永不更新；字段被用户编辑过后的 `value` 绑定也不再重推。此时提交 `report-designer:updateMeta` 会把上一目标的草稿写入新目标（与 dashboard 17 号 F-04/F-12 同类的串写路径）。
- 影响：条件性（作者直接使用 report-inspector + form/data 模式）下的确定性数据串写。
- 修复方向：`ReportInspectorRenderer` 内部按 `selectionTarget` 派生 `pathSuffix`/`scopeKey`（如 `inspector-body:${formatSelectionLabel(target)}`）强制换目标重建；或文档化"必须经 shell 使用"并在直接使用时输出契约警告。

## P3 提示

### F-13 死代码与未接线状态：fallbacks.tsx 全部导出无生产消费、bridge 事件发射器从未 emit、`fieldDrag` designer 状态从未激活、test-support 编译进 dist

- 位置：`packages/report-designer-renderers/src/fallbacks.tsx:10-79`（`renderFallbackCanvas/renderFallbackFieldPanel/renderFallbackInspector` 全包零引用，也未从 index 导出）；`packages/report-designer-renderers/src/bridge.ts:35-69`（`ReportDesignerEvent`/`createEventEmitter` 无内部使用、事件从未被 emit；`getDesignerSnapshot`/`getDesignerCore` 在 canvas 中创建 designerBridge 后仅用 `dispatchDesigner`）；`packages/report-designer-renderers/src/page-renderer.tsx:592`（`onFieldDragStart={() => undefined}`）与 `report-spreadsheet-canvas.tsx:282`（`draggingField={null}`）——design.md §11 保留投影 `designer.fieldDrag` 在 live UI 中永远是 `{active:false}`；`src/page-renderer.test-support.tsx` 随构建进入 `dist/`（dist/page-renderer.test-support.d.ts 已存在）。
- 影响：维护面与包体积噪音；`fieldDrag` 投影给 schema 作者"可订阅拖拽态"的假契约。
- 修复方向：删除或接线：拖拽 onDragStart 时 dispatch core 更新 `fieldDrag`（同时可作为 F-06 的会话校验依据），事件发射器接到 core subscribe；fallbacks 移入 test-support 或删除。

### F-14 host scope 每次 render 双份构建 + toolbar 全量订阅：任意 designer/spreadsheet 快照变化都重渲染 toolbar

- 位置：`packages/report-designer-renderers/src/page-renderer.tsx:470-478`（render 时非 memo 调 `buildReportDesignerScopeData`，内含 workbook 浅拷贝与多层对象构建）与 `:646-651` + `:239-254`（`ReportDesignerHostScopeSync` 再构建一份并在 layout effect replace——同一提交内 scope 被写两次）；`packages/report-designer-renderers/src/report-designer-toolbar.tsx:18`（`useOwnScopeSelector((data) => data, Object.is)` 订阅整个 scope data）。
- 影响：每次快照变化（含每格编辑、每次选区变化）toolbar/field-panel 级联重渲染并重算全部 items 求值；量级有界（items ≈ 11），属性能卫生问题。
- 修复方向：page-renderer 复用 HostScopeSync 的 memo 结果；toolbar 选择器收敛到 `designer.canUndo/canRedo/dirty`、`preview.running`、`fieldCount`、`documentName` 等实际消费的窄切片。

### F-15 inspector-shell 每次 render 新建 schema 对象字面量 + report-inspector 在 early-return 前调用 region 渲染

- 位置：`packages/report-designer-renderers/src/inspector-shell-renderer.tsx:30-35`（`inspectorSchema` 字面量每帧新建，经 `helpers.render` 走 schema compile，对象身份变化使编译缓存每帧 miss）；`packages/report-designer-renderers/src/report-designer-inspector.tsx:30`（`props.regions.body?.render()` 在无选区/空态 early-return 之前无条件调用）。
- 影响：选择器已把重渲染限频到 target/inspector 变化，实际开销小；region 预渲染在被丢弃时是纯浪费。
- 修复方向：schema 字面量用 `useMemo`（依赖 resolvedSchema/labels）；`authoredBody` 延迟到通过空态判定后再求值。

### F-16 toolbar 细节：无 `id` 的 override 项被静默丢弃；布尔表达式解析失败时按钮误启用

- 位置：`packages/report-designer-renderers/src/report-designer-toolbar-helpers.ts:141-174`（第二循环 `override.id != null && overrideMap.has(...)`——无 id 项既不能覆盖默认也不能追加，静默消失）；`:59-90`（`evalBooleanLike` 对非 boolean 解析结果返回 `undefined`，`report-designer-toolbar.tsx:135` 的 `disabled = ... === true` 使其在 scope 缺失/路径写错时退化为可点击）。
- 影响：配置错误无反馈；undo/redo 在 scope 不可用时点击后仅得到 "nothing to undo" 警告（轻度）。
- 修复方向：无 id override 在 schemaValidator 中报诊断；解析失败时保守禁用或发出 warning。

### F-17 双路径字段插入的错误处理不对称：page 默认路径的 `onFieldInsert` 无 catch

- 位置：`packages/report-designer-renderers/src/page-renderer.tsx:593-613`（async handler 直接 `await core.dispatch(...)`，ReportFieldPanel 的 onClick 不 await 不 catch，page-renderer.tsx 无兜底）与 `packages/report-designer-renderers/src/report-field-panel.tsx:117`；对照 renderer 路径 `packages/report-designer-renderers/src/field-panel-renderer.tsx:109-124, 183`（完整 catch + `reportRuntimeHostIssue` + notify）。
- 影响：当前 `core.dispatch` 全链 try/catch 返回 envelope（core-dispatch.ts:348-350），无实际 rejection 路径，属防御性缺失而非活缺陷；一旦 core dispatch 语义变化即成未处理 rejection。
- 修复方向：默认路径与 renderer 路径统一走带 catch 的包装。

### F-18 契约与一致性杂项

- `readOnly` 未在 `report-designer-page` 定义的 `fields`/`propContracts` 中声明（`packages/report-designer-renderers/src/renderers.tsx:243-289`），而 spreadsheet-page 显式声明（`packages/spreadsheet-renderers/src/renderers.tsx:63`）。未声明 key 默认 `kind:'prop'` 仍可流入 props（flux-compiler/src/schema-compiler/fields.ts:49-52），功能不受影响，仅契约完整性/编辑器提示缺口。
- 默认 `ReportFieldPanel`（page 左栏 fallback）无空态与分组头开关，能力弱于 `report-field-panel` renderer（后者有 `emptyLabel`/`showFieldSourceHeader`/`dragEnabled` 等，field-panel-renderer.tsx:49-52）；provider 配置存在但解析出 0 字段时左栏仅显示 "0 fields" 副标题。
- `page-renderer.tsx` 684 行，超过 500 行治理线；文件内已有 extraction 评估注释（:69-77，当时 ~665 行），此后增长约 20 行，评估结论未复审。
- 修复方向：补 `readOnly` 契约声明；两套面板能力对齐（默认路径直接复用 renderer 版本）；触发文件拆分复审。

### F-19 杂项：`console.warn` 直出与 `String(error)` 的显示退化

- 位置：`packages/report-designer-renderers/src/host-action-provider.ts:99`（`console.warn('[report-designer] action ... failed')`——包内其余错误路径均走 `reportRuntimeHostIssue`）；`packages/report-designer-renderers/src/inspector-shell-renderer.tsx:29`（`inspector.error` 为普通对象时 `String(...)` 显示 "[object Object]"；Error 实例显示 "Error: message" 尚可）。
- 修复方向：provider 侧错误上抛交由调用方统一上报（调用方均已处理）；error 展示取 `message` 字段兜底。

## 检查过程记录

1. 通读 `docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/inspector-design.md`、`docs/components/report-designer-page/design.md` 与 `package.json`，建立契约基线（五 region、statusPath、canonical action、dirty/undo 语义、preview 取消语义、inspector 薄壳 + Flux form、拖拽单一 command）。
2. 精读全部 21 个实现文件（3791 行），按 D1 正确性 / D2 契约漂移 / D3 React19 与泄漏 / D5 错误处理 / D6 性能 / D7 i18n / D8 结构归集线索。
3. 跨包核实（只读）：`report-designer-core`（core.ts、core-dispatch.ts、types.ts、runtime/metadata.ts、runtime/field-sources.ts、runtime/inspector-panels.ts）核实 F-02/F-04 读写链、dispatch 不拒绝语义、dispose 语义、structuredClone 同步路径；`spreadsheet-core`（core.ts、selection-handlers.ts）核实 replaceDocument 副作用与 setActiveSheet 重置 selection；`spreadsheet-renderers`（use-field-drop.ts、default-page-body.tsx、spreadsheet-grid viewport/constants、use-selection.ts）核实 drop 回退链与维度截断；`flux-renderers-form`（form.tsx、field-handlers.tsx）核实表单初值捕获与 defaultValue 重推语义；`flux-compiler`（schema-compiler/fields.ts）核实未声明字段默认 `kind:'prop'`。
4. i18n 核对：包内使用的 34 个 `flux.reportDesigner.*` key 与 `flux.common.saveFailed` 在 `flux-i18n/src/locales/{en-US,zh-CN}.ts` 全部存在（含 `insertFieldToSelection` 的 `{{field}}`、`fieldCount` 的 `{{count}}` 插值参数）。D7 通过。
5. 反误报排除（重要）：
   - **换 sheet 后 selectionTarget 残留旧 sheetId**：排除——`spreadsheet:setActiveSheet` 同步重置 `selection: {kind:'none'}`（selection-handlers.ts:16-26），canvas mirror 的 none 分支会清 core target；
   - **shell 路径 inspector 草稿残留**：排除（但转化为 F-03/F-12）——`setSelectionTarget` 的 loading 翻转使 shell 在每次换目标时卸载重挂表单，`form.tsx` 的初值捕获语义因此不构成残留；直接使用 `report-inspector` 的路径无此门控，单列 F-12；
   - **report→ss / ss→report 同步回声死循环**：排除——`lastSyncedSpreadsheetRef` + `spreadsheetSyncSource` 双守卫（page-renderer.tsx:443-448, 459-465）；
   - **no-args 命名空间 action（undo/save）被 payload 校验拒绝**：排除——`page-renderer-shell.test.tsx:208-257` 经真实 dispatch 链验证 undo/redo 可用；
   - **toolbar preview 无取消能力**：排除——core 侧单 owner 请求序 + `stopPreview` abort（core.ts:191-207, core-dispatch.ts:279-286）符合 design.md 取消基线，toolbar stopPreview 可见性绑定 `preview.running`。
6. 契约符合项（通过）：五 region + statusPath 摘要字段（kind/dirty/busy/canUndo/canRedo/previewRunning/selectionKind/fieldSourceCount）；toolbar 直接声明 canonical action、无双重前缀；undo/redo 读取 report-owned `designer.canUndo/canRedo`（design.md:455）；action result envelope 以 `FluxValueShape` 显式声明（report-designer-manifest.ts:156-219）；inspector 空态覆盖 no-selection/no-schema/loading/error 四态（inspector-design.md §5.1/§17）；`defensiveCopyWorkbook` 单一 canonical workbook 三引用同源（design.md:449）；`spreadsheet.selection` 结构化投影含 rows[]/columns[]（design.md:485）。
7. 工具约束遵守：仅 Read/Grep/grep/find/ls/wc；未修改 `packages/` 任何文件；未运行 pnpm；本报告为唯一写入文件。
