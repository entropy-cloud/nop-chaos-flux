# 31 spreadsheet-renderers 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/spreadsheet-renderers/src/` 排除 `*.test.*` 与 `__tests__/` 后 48 个实现文件共 7111 行（spreadsheet-grid/table-shell.tsx 531 / spreadsheet-grid.tsx 436 / spreadsheet-host-method-contracts-formatting.ts 418 / use-spreadsheet-interactions.ts 417 / spreadsheet-host-method-contracts-core.ts 379 / spreadsheet-interactions/use-selection.ts 372 / spreadsheet-grid/use-context-menu-actions.ts 356 / spreadsheet-toolbar/toolbar-groups.tsx 283 / page-renderer.tsx 263 / default-page-body.tsx 252 / spreadsheet-manifest-shapes.ts 237 / spreadsheet-interactions/use-sheet-commands.ts 216 / use-fill-handle.ts 215 / sheet-tab-bar.tsx 214 / spreadsheet-grid-context-menu.tsx 203 / use-resize.ts 176 / constants.ts 154 / cell-style-map.ts 147 / viewport.ts 139 / use-keyboard.ts 138 / use-style-commands.ts 133 / use-editing.ts 128 / overlay-controls.tsx 125 / bridge.ts 96 / 其余 25 个文件共约 900 行；另有 canvas-styles.css 894 行按关键选择器扫读）。**精读覆盖率：全部 48 个 .ts/.tsx 文件 100% 精读**。另核对 `docs/architecture/report-designer/design.md`（架构契约）、`package.json`，并读 `packages/spreadsheet-core` 的 dispatch/selection/sort/internal-state 实现核实跨包结论与反误报。
- 结论概览：**P0 x1 / P1 x5 / P2 x9 / P3 x6**。总评：分层清晰（bridge 派生 host snapshot、interactions hooks 拆分、host-method contract 显式声明），D3 全局监听清理无遗漏，无 `as any`/`@ts-ignore`/空 catch/硬编码中文。但**硬编码 100×26 工作表尺寸与动态网格维度（`resolveGridDimensions`）直接冲突**（P0）：选区操作被静默截断、编辑提交被丢弃，违反设计文档"更大的 workbook 不能被默认壳层静默截断"的明令基线。P1 集中在表格 UI 经典缺陷面：合并单元格跨虚拟化窗口列错位、Delete 对 range 选区失效、公式栏逐键 dispatch 污染 undo 历史、默认宿主评论输入完全失效、排序 hasHeader 暴露面。跨包结论核实：27 号 F-01（P0 sortRange 清表头）在默认右键菜单**不直接触发**（未传 hasHeader→core 默认 false），但 published action 契约暴露 `hasHeader` 可达；27 号 F-03（结构操作不平移 frozen/filters）在 UI 侧冻结/筛选/插删行列入口完全共存、无任何缓解。

## P0 缺陷

### F-01 交互层硬编码 `totalRows=100 / totalCols=26`，与动态网格维度冲突：行/列/整表选区操作被静默截断到 demo 尺寸，超出 100×26 的编辑提交被丢弃

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts:67-68`（硬编码）、`:109-112`（编辑丢弃分支）、`:188-198`（选区范围截断）；对照 `packages/spreadsheet-renderers/src/default-page-body.tsx:13-41`（`resolveGridDimensions` 从已用边界推导维度）；`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-fill-handle.ts:83,104`（双击填充同样限 26 列/100 行）；`packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:145`（`config.rows/cols` 声明了却从未解构使用）
- 关键源码摘录（use-selection.ts:67-68, 109-112, 188-194）：
  ```ts
  const totalRows = 100;
  const totalCols = 26;
  // ...
  if (cell.row < 0 || cell.col < 0 || cell.row >= totalRows || cell.col >= totalCols) {
    core.clearEditing();
    return; // 超界编辑值被静默丢弃
  }
  // ...
  if (snapshot.selection.kind === 'row' && snapshot.selection.rows?.length) {
    const rows = [...snapshot.selection.rows].sort((a, b) => a - b);
    return createRange(sheetId, rows[0]!, 0, rows[rows.length - 1]!, totalCols - 1);
  }
  if (snapshot.selection.kind === 'column' && snapshot.selection.columns?.length) {
    const columns = [...snapshot.selection.columns].sort((a, b) => a - b);
    return createRange(sheetId, 0, columns[0]!, totalRows - 1, columns[columns.length - 1]!);
  }
  ```
- 输入 → 路径 → 错误结果推理链（默认宿主即可复现）：
  1. 输入：workbook 数据边界到 row 149（`resolveGridDimensions` 据此渲染 150 行网格；`bridge.ts` 的 `activeRange` 仅在 `kind==='range'` 时设置，行/列选区时为 null）。
  2. 路径：用户点击列头 B（`kind==='column'`）→ 右键"升序排序"（`canSort` 对 column 选区为 true）→ `sortRange = expandSortRangeToUsedColumns(getSelectedRange(), …)` → `getSelectedRange()` 走 column 分支 → `createRange(sheetId, 0, 1, 99, 1)`（`totalRows-1=99`）→ core 只对 rows 0..99 排序。
  3. 错误结果：rows 100..149 未参与排序，用户看到的是**半排序数据集且无任何提示**；同样路径下工具栏/菜单的清除、填充、复制、列选排序、行选清除（截到 25 列）、整表选择（100×26）全部静默截断。`commitEditingCell` 的 100/26 边界检查（:109-112）在默认宿主被 `default-page-body.tsx:142-148` 的 mousedown 保存路径遮蔽，但 `SpreadsheetGrid`/`useSpreadsheetInteractions` 是 `index.ts` 公开导出 API，自定义宿主无该包装时 click-away 提交直接丢值（`core.clearEditing()` 后无任何 dispatch）。
- 影响：违反 `docs/architecture/report-designer/design.md` §5.2 明令（"保持 100x26 仅作为最小空白工作表基线；更大的 workbook 不能再被默认壳层静默截断到固定 demo 尺寸"）。所有以 `getSelectedRange()` 为源的命令面（copy/cut/clear/fill/sort/merge/style）在 >100 行或 >26 列的工作表上产生静默错误结果。
- 修复方向：把 `resolveGridDimensions` 的维度（已作为 `config.rows/cols` 传入 `useSpreadsheetInteractions` 却被忽略）下发到 `useSelection`/`useFillHandle`；`commitEditingCell` 的界检查改用动态维度或直接删除（core `setCellValue` 自身按地址写、无界损失必要）；补 >100 行工作表的列选排序/清除回归测试。

## P1 隐患

### F-02 合并单元格跨虚拟化窗口边界时列错位：非左上格返回 null 但左上格未渲染，colSpan 补偿缺失导致整行左移

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:186-188`（非左上格返回 null）、`:227-228`（rowSpan/colSpan 仅在左上格存在时生效）；`packages/spreadsheet-renderers/src/spreadsheet-grid/viewport.ts:61-76`（可见窗口计算完全不考虑 merges）
- 关键源码摘录（table-shell.tsx:186-188）：
  ```ts
  if (mergeInfo.isMerged && !mergeInfo.isTopLeft) {
    return null;
  }
  ```
- 问题与触发链：合并区左上行落在 top spacer 区（`merge.startRow < visStartRow <= merge.endRow`）时，左上格不在 `visibleRowIndices` 中不被渲染；合并区内部仍可见的行对合并列的单元格返回 null——该行缺失一个 td，`table-layout: fixed` 下后续所有单元格整体左移一列。纵向合并区高度超过视口 + OVERSCAN(5) 行（默认行高 24px，约 >30 行的合并或滚动位置使 visStartRow 落入合并区中段）即触发；横向大合并（跨超出可视列窗口）同理。rowSpan 超出 bottom spacer 时还会溢出表底。
- 影响：大合并单元格 + 滚动 = 可见区域列错位/内容缺失，虚拟化正确性缺口。
- 修复方向：`buildSpreadsheetGridViewport` 计算可见行/列窗口时把与窗口相交的 merge 的 `startRow/startCol` 并入渲染集合（或为跨窗 merge 渲染占位 td 并保留 colSpan）；至少在 viewport 层过滤"左上不可见的 merge"并给相交行补空 td。

### F-03 Delete/Backspace 只对单格选区生效：`selectedCell` 仅在 `kind==='cell'` 时非空，拖拽 range / 行 / 列 / 整表选区按 Delete 无任何反应

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-keyboard.ts:110-117`（以 `selectedCell` 为门槛）；`packages/spreadsheet-renderers/src/bridge.ts:43-48`（`activeCell` 仅 `kind==='cell'` 派生）；对照 `default-page-body.tsx:157`（`hasSelection={Boolean(selectedCell)}` 使工具栏清除按钮同样禁用）
- 关键源码摘录（use-keyboard.ts:110-117）：
  ```ts
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (readOnly) {
      return;
    }
    if (selectedCell && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      invokeWithCatch(handleClear, onCommandError);
    }
  }
  ```
- 问题：`useClipboard.handleClear` 本身基于 `getSelectedRange()`（range 选区可用），但键盘入口被 `selectedCell`（= `snapshot.activeCell`，仅 cell 选区非空）拦截。拖拽形成 range 选区后按 Delete → 条件为假 → 不 preventDefault、不清除、无反馈；行/列/整表选区同理。此时清除仅剩右键菜单一条路径（工具栏按钮也因 `hasSelection` 为 false 被禁用）。
- 影响：核心删除操作在最常见的"拖拽选区后按 Delete"流程中失效，与 Excel 基线（§9.1 直接操控基线）不符。
- 修复方向：Delete/Backspace 门槛改为 `getSelectedRange()` 非空（或 `selection.kind !== 'none'`），与 `handleClear` 的实际能力对齐；补 range 选区 Delete 回归测试。

### F-04 公式栏每个击键 dispatch 一次 `setCellValue`：每字符压一条 undo 历史 + 全页快照重渲染，undo 语义被逐字符打碎

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-cell-value-sync.ts:11-27`（onChange 直接 dispatch）；`packages/spreadsheet-renderers/src/spreadsheet-toolbar/cell-editor.tsx:20-21`（value 直连 snapshot 无本地草稿）；core 侧已核实 `packages/spreadsheet-core/src/core/internal-state.ts:81-90`（`applySimpleDocumentMutation` 每次 `pushUndo`）
- 关键源码摘录（use-cell-value-sync.ts:11-27）：
  ```ts
  return useCallback(
    async (value: string) => {
      if (!input.selectedCell || input.readOnly) {
        return;
      }
      await input.bridge.dispatch({
        type: 'spreadsheet:setCellValue',
        cell: { sheetId: input.sheetId /* ... */ },
        value,
      });
    },
    [input],
  );
  ```
- 问题：公式栏 Input 的 `onChange` → `handleCellValueChange` → 每次 keydown 都 dispatch `setCellValue`。core 每次 `pushUndo`（已核实无值相同去重）。在公式栏输入 "hello" = 5 条 undo 记录；用户按一次 Ctrl+Z 只回退一个字符。同时每次 dispatch 产生新 runtime snapshot → `SpreadsheetPageRenderer`（订阅含 `document`/`history` 的 slice）与整个默认宿主树每字符重渲染一次。
- 影响：undo/redo 对公式栏编辑不可用（逐字符回退），大文档下逐键全页重渲染造成输入卡顿。
- 修复方向：公式栏引入本地草稿 state，Enter/blur 时一次性 dispatch（与单元格内编辑器的 commit 语义对齐）；或 core 为同 cell 连续编辑提供合并历史条目。

### F-05 默认宿主评论功能失效：评论输入框 onChange 是 no-op，"添加"按钮提交的是单元格旧评论文本

- 位置：`packages/spreadsheet-renderers/src/default-page-body.tsx:191`（`onCommentTextChange={() => undefined}`）；`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:22-23`（`commentText` 来自单元格已有 comment）；`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-comments.ts:15-30`（`handleAddComment` 以 `commentText.trim()` 为文本且为空时静默 return）
- 关键源码摘录（default-page-body.tsx:188-193）：
  ```tsx
  showCommentInput={showCommentInput}
  onToggleCommentInput={() => setShowCommentInput((value) => !value)}
  commentText={commentText}
  onCommentTextChange={() => undefined}
  onAddComment={() => fire(handleAddComment)}
  ```
- 问题：评论 Input 的 value 绑定到单元格**已有**评论（`useSpreadsheetShell` 派生），onChange 被替换为 no-op——用户键入无任何效果。点"添加"时：无旧评论 → `!commentText.trim()` → 静默 return（输入框也不关闭）；有旧评论 → 把旧文本原样重写一遍。新评论在默认宿主中无法创建。
- 影响：默认宿主 `spreadsheet-page` 的评论功能（工具栏评论按钮 → 输入 → 添加）整链路不可用。
- 修复方向：给 `useComments` 增加本地 `draftComment` state（与 `showCommentInput` 同级），输入框 onChange 更新草稿，添加成功后清空；或复用公式栏的受控模式但补上写回。

### F-06 排序入口无 hasHeader 语义：默认菜单把表头行当数据排序；published action 暴露 `hasHeader:true` 直达 27 号 F-01 P0（清空表头行）

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid/use-context-menu-actions.ts:267-280`（dispatch 不传 hasHeader）；`packages/spreadsheet-renderers/src/spreadsheet-host-method-contracts-formatting.ts:327-346`（`sortRange` 契约公开 `hasHeader?: boolean`）；core 侧已核实 `packages/spreadsheet-core/src/core/sort-operations.ts:35`（默认 `hasHeader = false`）与 27 号报告 F-01（`hasHeader=true` 时表头行 cells 无写回路径、全部丢失）
- 关键源码摘录（use-context-menu-actions.ts:272-277）：
  ```ts
  await bridge.dispatch({
    type: 'spreadsheet:sortRange',
    range: sortRange,
    keyCol: selectionAnchorCell.col,
    direction,
  });
  ```
- 跨包核实结论（27 号 F-01 P0 消费侧暴露面）：
  1. **默认 UI 路径不触发清表头**：右键菜单与 `use-context-menu-actions` 从不传 `hasHeader` → undefined → core 默认 false → 表头行被当作数据行参与排序（含表头的表格排序后表头字母序混入数据行，可见数据错乱，可 undo）。即 UI 侧没有任何"声明表头"的入口，`hasHeader` 参数在已交付 UI 中零使用。
  2. **action 面可达 P0**：`spreadsheet:sortRange` 是已发布的 host action（契约明确列出可选 `hasHeader`），任何 schema 工具栏/对话框传 `hasHeader: true` 即触发 27 号 F-01（表头行数据、样式、批注全部丢失）。
- 影响：带表头数据表的排序结果错误（默认路径）；schema 驱动路径存在直达 core P0 的数据丢失入口。
- 修复方向：core 修复 27-F-01 前，UI 侧排序入口应显式传 `hasHeader: false` 并在契约/文档标注 `hasHeader:true` 暂不可用；中期为排序菜单提供"首行为表头"选项（依赖 core 修复）。

## P2 风险

### F-07 上下文菜单动作完全忽略 command result：`ok:false` 静默无反馈，非连续多行/列删除不检查中间结果即 commit

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid/spreadsheet-grid-context-menu.tsx:51-199`（全部 `onClick={() => void actions.handleXxx()}`）；`packages/spreadsheet-renderers/src/spreadsheet-grid/use-context-menu-actions.ts:79-88, 112-121`（事务循环不检查结果）；`packages/spreadsheet-renderers/src/fire.ts:1-3`（`void fn()` 无 catch）
- 关键源码摘录（use-context-menu-actions.ts:79-88）：
  ```ts
  await bridge.dispatch({ type: 'spreadsheet:beginTransaction', label: 'Delete rows' });
  for (let i = indexes.length - 1; i >= 0; i--) {
    await bridge.dispatch({
      type: 'spreadsheet:deleteRow',
      sheetId: activeSheetId,
      row: indexes[i],
      count: 1,
    });
  }
  await bridge.dispatch({ type: 'spreadsheet:commitTransaction' });
  ```
- 问题：core `dispatchSpreadsheetCommand` 已核实从不 reject（handler 异常被捕获转 `ok:false`），因此 `fire()` 不产生 unhandled rejection；但代价是所有失败只以 `ok:false` 返回——上下文菜单 18 个动作与 `fire()` 调用点均不读取 result，失败（如空内部剪贴板粘贴、readonly 拒绝）零反馈。非连续删除循环中某步 `ok:false` 仍继续循环并 commit，部分失败被当作成功静默提交。`fire()` 同时与包内其他路径的 `settleSelectionDispatch`/`onCommandError`（AbortError 过滤 + 日志）错误处理约定不一致。
- 影响：命令失败无诊断；部分删除被静默提交进单个 undo 条目。
- 修复方向：context actions 返回 result 并走统一 `reportCommandResult` 风格处理；事务循环检查每步 `ok`，失败时 `rollbackTransaction`（try/finally 保底）。

### F-08 OS 剪贴板互操作缺失：Ctrl+C/V 被 preventDefault 后只有内部剪贴板，复制内容带不出、外部内容贴不进

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-keyboard.ts:62-77`（preventDefault + 内部 handleCopy/handlePaste）；`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-clipboard.ts:13-50`（仅 dispatch copyCells/pasteCells）；core 已核实无 `navigator.clipboard.writeText`；全包无 `paste` 事件监听（grep 核实仅 7 处 addEventListener，均为 mousemove/mouseup/keydown）
- 问题：Ctrl+C 拦截原生复制但不写 OS 剪贴板——用户从应用复制后在外部程序粘贴无内容；Ctrl+V 拦截原生粘贴只 dispatch 内部 pasteCells——从 Excel/文本编辑器复制的内容无法贴入。"内部复制 vs 外部粘贴"完全未区分也未实现互通。另外 Ctrl+C 在无选区时仍 preventDefault（`handleCopy` 早退但默认行为已被拦截）。
- 影响：与任何外部程序的数据交换被切断；对用户表现为"复制粘贴坏了"。
- 修复方向：`copyCells` 成功后用 `navigator.clipboard.writeText` 写 TSV；粘贴改为监听 `paste` 事件读 `clipboardData`（保留内部富格式优先），或至少不要在无法提供替代行为时 preventDefault。

### F-09 滚动 → setViewport → 全页 + 全表重渲染：每单元格组件无 memo、viewport 模型每渲染重建、spacer 计算含 O(总行数) 循环

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:242-255`（`buildSpreadsheetGridViewport` 未 memo）；`packages/spreadsheet-renderers/src/spreadsheet-grid/table-shell.tsx:100-278`（`SpreadsheetGridCell` 未 memo，约 20 个 props 含每次渲染新引用的回调）；`packages/spreadsheet-renderers/src/spreadsheet-grid/viewport.ts:80-99`（`filteredRowHeight` 对 `visEndRow+1..model.rows` 全量循环）；`packages/spreadsheet-renderers/src/page-renderer.tsx:165-171`（页面订阅 slice 含 `viewport`）
- 关键源码摘录（viewport.ts:96-99）：
  ```ts
  const bottomSpacerHeight =
    visEndRow < model.rows - 1
      ? rowOffsets[model.rows] -
        rowOffsets[visEndRow + 1] -
        filteredRowHeight(visEndRow + 1, model.rows)
      : 0;
  ```
- 问题：每个 scroll 事件 → `handleScroll` dispatch setViewport（core 去重相等值已核实，但滚动值必变）→ 新 snapshot → `SpreadsheetPageRenderer`（header/状态标签/regions）与 `DefaultSpreadsheetPageBody` 全树重渲染 → 全部可见单元格（典型 600×800 视口约 35×20≈700 个 td）重执行 render，`SpreadsheetGridCell` 无 memo 且 props 多为不稳定引用；`filteredRowHeight(visEndRow+1, rows)` 对尾部所有行 O(N) 扫描，10 万行工作表每次滚动帧 10 万次字典查找。
- 影响：大工作表快速滚动掉帧/白屏风险；与设计文档 §12.2"不让整个 designer 因单个 cell 改动全局重渲染"的局部订阅目标不符（滚动是最高频触发器）。
- 修复方向：`SpreadsheetGridCell` 用 `React.memo` + 稳定回调（或改为列/行粒度子组件）；`buildSpreadsheetGridViewport` 以 scrollX/Y/尺寸为 deps memo；`filteredOut` 行高维护前缀和，spacer 计算改 O(log n)/O(1)。

### F-10 页面渲染器 core 重建风险：`sanitizeSpreadsheetConfig`/`createEmptyDocument` 每次 render 产生新对象身份，`useMemo` 依赖失稳（suspect，当前依赖 React Compiler 记忆化兜底）

- 位置：`packages/spreadsheet-renderers/src/page-renderer.tsx:131-145`；问题链：`resolvedConfig = sanitizeSpreadsheetConfig(props.props.config)` 每次调用返回新对象（有合法键时）、`resolvedDocument` 在 document 缺失/非法时每 render `createEmptyDocument(...)` 新对象 → `useMemo([resolvedConfig, resolvedDocument, resolvedReadOnly])` 身份比较恒不等 → core/bridge/provider 整体重建 → undo 历史、选区、编辑态、滚动位置全部清零
- 关键源码摘录（page-renderer.tsx:131-145）：
  ```tsx
  const resolvedDocument = isSpreadsheetDocument(props.props.document)
    ? props.props.document
    : createEmptyDocument(`spreadsheet-page:${props.id}`);
  const resolvedConfig = sanitizeSpreadsheetConfig(props.props.config);
  // ...
  const spreadsheetCore = useMemo(
    () =>
      createSpreadsheetCore({
        document: resolvedDocument,
        config: resolvedConfig,
        readonly: resolvedReadOnly,
      }),
    [resolvedConfig, resolvedDocument, resolvedReadOnly],
  );
  ```
- 反误报说明：工作区启用 React Compiler 时 `sanitizeSpreadsheetConfig`/`createEmptyDocument` 的结果会被自动记忆化（props.props.config 身份稳定时 deps 稳定），故标注 suspect；但正确性依赖编译器优化而非代码本身，且 document 来自 scope 表达式时身份仍可能漂移。
- 影响：一旦记忆化失效（组件被排除编译、document 为动态表达式），每次父级重渲染都重置电子表格全部状态。
- 修复方向：config 归一化结果做深比较或序列化键（如 `JSON.stringify` deps），document 回退改为 `useMemo(() => createEmptyDocument(...), [props.id])`；或以 `props.id` 为 key 只建一次 core，document 变化走显式 `loadDocument` 命令。

### F-11 编辑提交多路径竞态：mousedown 保存 + blur 保存可双触发，重复 `setCellValue` 产生双 undo 条目（suspect，事件时序推理）

- 位置：`packages/spreadsheet-renderers/src/default-page-body.tsx:142-148`（host mousedown 保存）、`packages/spreadsheet-renderers/src/spreadsheet-grid/inline-controls.tsx:40`（`onBlur={onSave}`）、`packages/spreadsheet-interactions/use-selection.ts:101-128` 与 `use-editing.ts:47-88`（三条提交路径：`commitEditingCell`/`handleEditSave`×2）
- 问题：编辑中点击工具栏按钮时——td 路径的 `e.preventDefault()`（use-selection.ts:253）会阻止 blur，但工具栏按钮不在 td 内，mousedown 默认动作先触发 input blur → `onSave`（handleEditSave #1），同一次 mousedown 冒泡到 host div → `handleEditSave` #2；#1 的 `clearEditing` 在 await 微任务后才执行，#2 读取 `core.getSnapshot().editing` 仍存在 → 同值 `setCellValue` 双 dispatch。core 已核实 `applySimpleDocumentMutation` 无值相同去重 → 双 undo 条目 + 双快照更新。单元格间点击路径因 preventDefault 阻止 blur 而单次提交（此路径正确）。
- 影响：从编辑切到工具栏的常规操作产生冗余 undo 步骤；三条提交路径并存也使 `commitEditingCell` 的结果（`ok:false`）被完全忽略。
- 修复方向：收敛为单一提交入口（如 editing 保存互斥锁/以 core editing 状态为准的幂等提交），`commitEditingCell` 检查 dispatch result。

### F-12 readonly 模式阻止切换 sheet：只读工作簿无法查看其他工作表

- 位置：`packages/spreadsheet-renderers/src/sheet-tab-bar.tsx:47-51`（`handleTabClick` 以 readOnly 早退），`:148`（tab 按钮 `disabled={readOnly}`）
- 关键源码摘录（sheet-tab-bar.tsx:47-51）：
  ```ts
  const handleTabClick = (sheetId: string) => {
    if (readOnly) return;
    if (renamingSheetId === sheetId) return;
    onSwitchSheet(sheetId);
  };
  ```
- 问题：设计文档 §5.2 将 readOnly 定义为"共享 host 级交互约束：除了 core mutation dispatch 以外……锁定 mutation 入口"，`setActiveSheet` 在 core 的 `READ_ONLY_COMMANDS` 语义中是导航而非变更；当前把 sheet 切换也锁死，只读文档（如预览/归档场景）只能看到 activeSheet。
- 影响：只读模式下多 sheet 文档不可浏览。
- 修复方向：tab 切换不受 readOnly 限制，仅重命名/删除/新增保持禁用。

### F-13 视口尺寸无 ResizeObserver：容器尺寸变化后虚拟化窗口使用陈旧高度/宽度，直到下一次滚动

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:113-114`（初始 600/800 魔法值）、`:197-229`（尺寸仅在 onScroll 与 scroll 同步 effect 中测量）
- 问题：`viewportHeight/viewportWidth` 只在 `handleScroll` 和 viewport 同步 effect 里更新；窗口 resize / 侧栏开合改变容器尺寸时不触发 scroll → 可见窗口按旧尺寸计算（偏小则底部/右侧空白，偏大则浪费渲染），且 `spreadsheet:setViewport` 发布的尺寸相关状态不同步。
- 影响：容器 resize 后渲染空白带或过度渲染，首次布局前使用 600×800 假值。
- 修复方向：对 `scrollRef` 挂 `ResizeObserver` 同步 clientWidth/clientHeight。

### F-14 网格直接键入路径不支持 IME：composition 期间 keydown 不满足 `key.length===1`，中文直接输入无响应

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:348-361`（字符键直录逻辑）
- 关键源码摘录（spreadsheet-grid.tsx:348-361）：
  ```tsx
  if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
    if (readonly) {
      return;
    }
    event.preventDefault();
    onCellClick(active.row, active.col);
    onCellDoubleClick(active.row, active.col);
    onEditValueChange(event.key);
  }
  ```
- 问题：IME 组合期间 Chromium keydown 的 `key==='Process'`（长度 8）→ 直录路径跳过 → 用户选中单元格直接打中文无任何反应，必须先双击进入编辑器（编辑器是原生 input，IME 正常）。部分浏览器组合期间 key 可能是单个字符，则又会把未确认的组字字母直接写入编辑值，行为不可预测。
- 影响：中文用户"选中即打字"主路径失效或脏输入。
- 修复方向：直录路径排除 `event.isComposing`/`keyCode===229`，或改为进入编辑器后由 input 自然接收首字符。

### F-15 冻结/筛选与结构变更共存场景在 UI 侧全暴露、无缓解（27 号 F-03 消费侧核实）

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid/spreadsheet-grid-context-menu.tsx:129-142`（冻结/解冻菜单项）与 `:159-200`（插入/删除行列菜单项同面板共存）；`packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-groups.tsx:226-280`（工具栏冻结 + 插删行列同组共存）；core 侧已核实 `packages/spreadsheet-core/src/core/sheet-operations.ts:212-219`（frozen 仅在 freezePanes/unfreezePanes 设置，结构操作不平移）
- 跨包核实结论：冻结（右键菜单 + 工具栏）与插入/删除行列（右键菜单 + 工具栏）在同一交互面同时可用，UI 层既不平移冻结坐标、不调整 filters 列索引，也无任何禁用/警告。触发链：冻结 row=3 → 右键"在上方插入行"→ core `insertRow` 不更新 `frozen` → 冻结线错位（第 4 行起的数据被错误冻结/未冻结）；筛选激活（`hasActiveRowFilters` 菜单项可见）后删除左侧列 → `filters.columns[].col` 指向错列，筛选反馈标记（`filteredColumnSet`）挂到错误列头。
- 影响：冻结/筛选状态下做结构编辑必然产生错位状态，UI 无提示。
- 修复方向：core 平移修复前，UI 侧在 frozen/filters 激活时对结构操作给出确认提示或禁用；中期依赖 core 按 27 号 F-03 平移 frozen/filters。

## P3 提示

### F-16 行头宽度常量与 CSS 双源漂移：`ROW_HEADER_WIDTH=40` vs CSS `width:36px`

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid/constants.ts:6-7`（40/22）；`packages/spreadsheet-renderers/src/canvas-styles.css:153-154, 166-167`（row-header/corner `width: 36px`）
- 说明：冻结列 sticky left 与容器宽度都用 TS 常量 40 计算，行头实际宽度由 CSS 定为 36；当前靠 corner th 的 inline `width:40`（table-shell.tsx:335）+ `table-layout: fixed` 恰好对齐为 40。任意一侧调整（改 CSS 或去掉 inline width）即出现 4px 缝隙/重叠。建议收敛为单一来源（CSS 变量或统一常量注入 inline style）。

### F-17 硬编码英文用户可见字符串（D7）

- 位置：`use-selection.ts:241,299,324,342,354`（'Selected …'）、`use-sheet-commands.ts:49,55,61,67,95,103,115`（'Inserted row at …'/'Sheet${n}'/'Cannot remove last sheet' 等）、`use-comments.ts:29,44`（'Added comment'）、`use-clipboard.ts:46,48,56`、`use-fill-handle.ts:129-131,180-182`、`sheet-tab-bar.tsx:199`（`|| 'this sheet'` 兜底）、`overlay-controls.tsx:106`（resize dialog aria-label 'Row height'/'Column width' 未走 `t()`）、`use-context-menu-actions.ts:79,112`（事务 label 'Delete rows'）
- 说明：默认宿主 `onLog` 未传入时 addLog 为 no-op，故默认路径不可见；但 `SpreadsheetToolbar`/`SheetTabBar` 是公开导出组件，自定义宿主接入 onLog 后英文消息直接面向用户。包内其余 UI 文案均已走 `flux-i18n`，仅这批遗漏。

### F-18 上下文菜单快捷键标签用正则从本地化字符串截取：`t('…Shortcut').replace(/^.*\s/, '')`

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid/spreadsheet-grid-context-menu.tsx:54,63,72,82`
- 说明：从"复制 (Ctrl+C)"类文案中取最后一个空格后内容，任何文案措辞调整（或译文不含空格/含尾随空格）都会显示错误快捷键。建议拆成 label 与 shortcut 两个 i18n key。

### F-19 键盘导航与 Excel 基线差距：无 Tab 提交右移、Enter 提交后不下移、无 Ctrl+方向/Home/End/PageUp/PageDown/Shift+方向扩展选区

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:305-362`（仅四方向 ±1 与 Enter/F2/直录）；`packages/spreadsheet-renderers/src/spreadsheet-grid/inline-controls.tsx:43-49`（编辑器 Enter 仅 onSave、无 preventDefault/移动、Tab 依赖 blur 逃逸焦点）
- 说明：设计文档 §9.1 将快捷键定位为增强能力，故列 P3；但 Enter 后移动与 Tab 右移属于编辑流肌肉记忆，建议优先补。

### F-20 工具栏 undo/redo 未接 `canUndo/canRedo`、resize 相关魔法数字重复、resize 对话框非法输入静默

- 位置：`packages/spreadsheet-renderers/src/spreadsheet-toolbar/toolbar-groups.tsx:44-56`（仅 readOnly 禁用，`runtime.canUndo` 在 snapshot 中可用却未透传，types.ts 无对应 prop）；`use-resize.ts:81,96`（`?? 80` / `?? 24` 与 `DEFAULT_COL_WIDTH/DEFAULT_ROW_HEIGHT` 重复定义）；`spreadsheet-grid.tsx:146-163`（`submitResizeDialog` 对 NaN/<=0 直接 return，对话框不关闭无提示）
- 说明：均为一致性/可用性打磨项。

### F-21 零散低风险项：`getMergeInfo` 每单元格线性扫描 merges、rAF 聚焦在虚拟化下可能落空、编辑提交闭包 sheetId 与 `editing.cell.sheetId` 不一致

- 位置：`use-sheet-commands.ts:171-195`（O(merges)×每可见单元格×每次渲染，大量合并时放大重渲染成本）；`spreadsheet-grid.tsx:169-174`（`requestAnimationFrame` + `querySelector` 聚焦 td，若目标行在虚拟化窗口外/尚未挂载则静默失败）；`use-editing.ts:59-68`（校验 `targetSheet` 用 `cell.sheetId`、dispatch 却用闭包 `sheetId`——已核实 core `setSelection`/`setActiveSheet` 会清除 editing，实际难触发，属死守卫不一致）；`use-cell-value-sync.ts:28`（deps `[input]`，input 每 render 新对象使回调身份恒变）
- 说明：单独均不构成缺陷，重构时顺手收敛。

## 检查过程记录

1. **基线阅读**：`docs/architecture/report-designer/design.md`（§5.2 页面契约、§9.1 直接操控基线、§11 宿主 scope、§12 性能策略）、`package.json`（依赖 spreadsheet-core/flux-react/flux-i18n/ui，peer react 19）。
2. **全量精读**：48 个实现文件按"网格渲染（spreadsheet-grid.tsx / table-shell.tsx / viewport.ts / constants.ts / inline-controls.tsx / overlay-controls.tsx / 上下文菜单 2 文件）→ 选区/编辑/剪贴板/填充/缩放/键盘（spreadsheet-interactions/ 15 文件 + use-spreadsheet-interactions.ts）→ 宿主层（page-renderer / default-page-body / bridge / host-action-provider / manifest×3 / contracts×2）→ 工具栏与页签（spreadsheet-toolbar×6 / sheet-tab-bar）"顺序读完，canvas-styles.css 按 sticky/z-index/table-layout/冻结标记/行头宽度关键段扫读。
3. **跨包核实**（只读 spreadsheet-core）：`core-dispatch.ts`（dispatch 从不 reject、readonly 拒绝转 `ok:false`）、`selection-handlers.ts`（setSelection/setActiveSheet 清 editing、setViewport 去重）、`internal-state.ts`（applySimpleDocumentMutation 每次调用 pushUndo → 公式栏逐键污染 undo 实锤）、`sort-operations.ts`（hasHeader 默认 false；hasHeader=true 时 header 行无写回路径 → 27 号 F-01 属实）、`sheet-operations.ts`（frozen 仅 freeze/unfreeze 设置）、core 全包无 `navigator.clipboard`（OS 剪贴板缺失实锤）。
4. **维度扫描**：grep 全部 `addEventListener`（7 处，逐一核对均有对应 removeEventListener 清理，D3 通过）；grep `as any` / `@ts-ignore` / `@ts-expect-error` / 空 catch / 硬编码中文（`[一-龥]`）均为零命中；非空断言仅 `sorted[0]!` 类窄化（constants.ts:90,95,116-117，安全）。
5. **反误报核验**：commitEditingCell 丢值链在默认宿主被 mousedown 保存遮蔽（事件时序推演：mousedown → handleEditSave 同步执行至 await，dispatch 内 handler 同步完成状态更新，微任务 clearEditing 先于 click 任务）→ P0 主链改用列选排序截断（默认宿主直接可达）；fire() unhandled rejection 因 dispatch 从不 reject 降级并入 F-07；page-renderer core 重建因 React Compiler 记忆化兜底标注 suspect。
6. **测试佐证**：`src/__tests__/grid-selection.test.tsx`、`grid-editing.test.tsx`、`freeze-pinning.test.tsx`、`context-menu-*.test.tsx`、`keyboard-escape.test.tsx` 等存在，但均基于 ≤100 行默认维度与无 config 的 schema 构造，未覆盖 >100 行截断、合并跨窗、公式栏 undo、评论输入、range Delete 等本报告缺陷面。
