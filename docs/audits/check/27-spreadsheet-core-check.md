# 27 spreadsheet-core 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/spreadsheet-core/src/` 排除 `*.test.*` 与 `__tests__/` 后 25 个实现文件共 4015 行（types.ts 395 / cell-operations.ts 501 / commands-base.ts 275 / cell-handlers.ts 239 / sheet-operations.ts 231 / search-operations.ts 228 / commands.ts 228 / clipboard-operations.ts 221 / sheet-handlers.ts 213 / structure-operations.ts 197 / index.ts 129 / core.ts 147 / commands-style.ts 153 / selection-handlers.ts 112 / sort-operations.ts 108 / history-handlers.ts 98 / internal-state.ts 90 / filter-operations.ts 79 / clipboard-handlers.ts 67 / document-access.ts 85 / core-dispatch.ts 32 / command-handlers/{index,types,structure-handlers,search-handlers}.ts 共 187）。**精读覆盖率 100%**。另核对了 `docs/architecture/report-designer/design.md`（架构契约）、`package.json`，并扫读 `__tests__/core-basics.test.ts` 等测试佐证反误报（sort 仅覆盖无 header 用例）。
- 结论概览：**P0 x1 / P1 x9 / P2 x12 / P3 x9**。总评：包结构清晰（commands → handlers → core/\*-operations 纯函数分层、COW 不可变更新纪律总体执行到位、undo 栈共享子树引用内存友好），公式执行引擎按架构明确不内建。但经典电子表格缺陷面命中较多：**排序带表头时直接丢表头行（P0）**；行列删除与合并区部分相交的收缩规则缺失、冻结/筛选索引不随结构变更平移、replace 静默改变值类型、findNext 遍历顺序与跨 sheet 语义错误构成 P1 主体。P2 集中在"契约声明了但未实现且静默"模式（PasteOptions、protection、layout snapshot）与瞬态状态（editing/clipboard/activeSheetId）同结构变更不同步。

## P0 缺陷

### F-01 sortRange `hasHeader=true` 时表头行数据全部丢失：排除区间含 header 行，写回区间不含，header cells 无任何写回路径

- 位置：`packages/spreadsheet-core/src/core/sort-operations.ts:43-48`（startRow 计算）、`:67-77`（preservedCells 排除条件用 `normalized.startRow`）、`:79-94`（写回只覆盖 `startRow..endRow`）
- 关键源码摘录（sort-operations.ts:43, 67-77, 79-81）：
  ```ts
  const startRow = normalized.startRow + (hasHeader ? 1 : 0);
  // ...
  for (const [address, cell] of Object.entries(sheet.cells)) {
    if (
      cell.row < normalized.startRow ||   // 注意：用的是 range 起点（含 header 行）
      cell.row > normalized.endRow ||
      cell.col < normalized.startCol ||
      cell.col > normalized.endCol
    ) { preservedCells[address] = cell; }
  }
  sortedRows.forEach((rowEntry, rowIndex) => {
    const targetRow = startRow + rowIndex;  // 从 startRow（= start+1）开始写
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：A1:B6 有数据（rows 0..5），dispatch `sortRange { range: rows 0..5, keyCol: 0, direction: 'asc', hasHeader: true }`（该参数在 `SortRangeCommand` 中是公开契约，`commands-base.ts:261`）。
  2. 路径：`startRow = 0 + 1 = 1`；`rowEntries` 只装载 rows 1..5；`preservedCells` 的保留条件是"range 之外"，即 rows 0..5 的**全部** cells（含 header 行 row 0）都被排除；写回循环只写 `targetRow = 1..5`。
  3. 错误结果：row 0（表头行）的 cells 从新的 cells 字典中消失——表头被清空，数据行排序本身正确但表头永久丢失（只能靠 undo 找回）。`hasHeader=false` 时无此问题（排除区间与写回区间重合）。
- 为什么现有测试没抓到：`__tests__/core-basics.test.ts:608-653` 仅覆盖无 header 的两行排序，`hasHeader` 参数在全包测试中零引用。
- 影响：任何带表头排序的宿主调用都会触发；表头样式、值、批注全部丢失。
- 修复方向：`preservedCells` 的排除下界改为 `startRow`（数据区起点）而非 `normalized.startRow`，或将 header 行 cells 显式并入 preservedCells；补 `hasHeader=true` 回归测试。

## P1 隐患

### F-02 deleteRow/deleteColumn 与合并区"部分相交"时 merge 处理错误：只看 startRow 决定去留，且尾部相交不收缩——merge 被整体误删或悬空吞并外来行

- 位置：`packages/spreadsheet-core/src/core/structure-operations.ts:130-136`（行）、`:181-187`（列，同构）
- 关键源码摘录（structure-operations.ts:130-136）：
  ```ts
  const newMerges = merges
    .filter((merge) => merge.startRow < row || merge.startRow >= row + count)
    .map((merge) => ({
      ...merge,
      startRow: merge.startRow >= row + count ? merge.startRow - count : merge.startRow,
      endRow: merge.endRow >= row + count ? merge.endRow - count : merge.endRow,
    }));
  ```
- 问题与两条触发链：
  1. **锚行被删、尾行未删 → 整个 merge 被误删**：merge 覆盖 rows 3..6，`deleteRow(row=3, count=1)`。filter：`3 < 3` false、`3 >= 4` false → merge 被移除；但 rows 4..6（合并区残余）仍存在，合并关系与样式丢失。Excel 语义应收缩保留。
  2. **尾行部分被删 → merge 不收缩，吞并外来行**：merge 覆盖 rows 2..4，`deleteRow(row=3, count=2)`（删 3、4）。filter：`2 < 3` → 保留；map：`endRow=4 >= 5` false → endRow 保持 4。删除后实际存活行 2、3（原 5）、4（原 6），merge(2..4) 把原 5、6 两行外来数据圈进合并区，渲染吞行。
- 影响：任何在合并区内部/边界做行（列）删除的编辑流，合并几何损坏；错误结果在渲染层表现为合并区覆盖错误内容或合并莫名消失。
- 修复方向：删除区间与 merge 相交时按相交行数收缩 `endRow`（`newEnd = max(newStart, endRow - deletedInside)`），收缩后 `endRow <= startRow`（单格）才移除 merge；补 merge 部分相交矩阵测试。

### F-03 insertRow/insertColumn/deleteRow/deleteColumn 不平移 `frozen` 与 `filters.columns[].col`：冻结边界与筛选列索引在结构变更后失效

- 位置：`packages/spreadsheet-core/src/core/structure-operations.ts:5-197`（四个函数的 `newSheet` 构造只处理 cells/rows|columns/merges，`frozen`、`filters` 原样引用保留）
- 关键源码摘录（structure-operations.ts:41, 90, 138, 189）：
  ```ts
  const newSheet = { ...sheet, cells: newCells, rows: newRows, merges: newMerges };
  // insertColumn / deleteRow / deleteColumn 同构，均未触碰 sheet.frozen / sheet.filters
  ```
- 问题（特定条件 + 后果）：
  1. `freezePanes(row: 2)` 后在 row 0 上方插入 1 行 → `frozen.row` 仍为 2，冻结区少冻结一行，原冻结内容滚出冻结窗格；在冻结区内删除行同理反向错位。
  2. `filterRowsByCellValue(col: 5)` 后 `insertColumn(col: 0)` → filter 条件仍指向 col 5（已是原 col 6 的数据），筛选静默作用于错误列；`deleteColumn` 删掉筛选列本身则产生悬空 filter 条目，后续 `clearRowFilters` 前一直生效于错误列。design.md §9.1 明确要求"worksheet 显式保存筛选条件本身"，但结构变更不维护该模型一致性。
- 影响：冻结/筛选 + 行列操作组合编辑流中，冻结窗格错位、筛选结果错误。
- 修复方向：结构操作中对同 sheet 的 `frozen`（插入/删除位置小于冻结边界时 ±count，收缩到 0 清除）与 `filters.columns[].col`（≥ 位置 +count；删除区内条目移除，之后 -count）做同步平移。

### F-04 replaceInDocument 无条件把单元格值字符串化：数字 123 变 "123"，即使查询根本不匹配

- 位置：`packages/spreadsheet-core/src/core/search-operations.ts:122-135`
- 关键源码摘录（search-operations.ts:122-135）：
  ```ts
  let newValue = String(existing.value ?? '');
  if (options.matchWholeCell) {
    // 不匹配时 newValue 保持 String(existing.value)
  } else {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    newValue = newValue.replace(new RegExp(escapedQuery, flags), replacement);
  }
  const cells = { ...sheet.cells, [key]: { ...existing, value: newValue } }; // 无条件写回
  ```
- 问题：替换计算前先把 value 强转字符串，且无论是否发生实际替换都写回。输入：cell.value = 123（number）、replace(query='zzz') → `String(123)` = "123"，两分支都不匹配/不替换，但 `{ ...existing, value: "123" }` 照样落盘。
- 影响：任何单格 replace 命令都会把数字/日期/布尔值静默降级为字符串——数字对齐、numberFormat 数字格式、后续 filter 的 `cell?.value === f.value` 严格相等比较全部失效；且 changed:true + dirty 被置位，污染保存状态。`replaceAllInDocument` 无此问题（只 patch 匹配项），两条路径行为不一致。
- 修复方向：先在原值上判定是否匹配（matchWholeCell 用原值比较、子串用 String 局部比较），仅匹配时才构造替换值；无变化时返回原 doc。

### F-05 find/findNext 按 cells 字典插入序遍历而非行列序：搜索结果顺序不确定，findNext 提前终止或循环

- 位置：`packages/spreadsheet-core/src/core/search-operations.ts:44`（`Object.entries(sheet.cells)` 遍历）
- 关键源码摘录（search-operations.ts:44, 84-88）：
  ```ts
  for (const [address, cell] of Object.entries(sheet.cells)) {   // 插入序，非行列序
  // ...
  if (fromRow !== undefined && fromCol !== undefined) {
    if (cell.row < fromRow || (cell.row === fromRow && cell.col <= fromCol)) {
      continue;
  ```
- 问题：cells 键为 "A1" 式非整型字符串键，JS 对象按**插入序**遍历。用户先填 A2 再填 A1 时遍历序为 A2→A1。输入：两格都匹配查询，`find` 返回 A2（行列序中靠后的）；`findNext(from=A2)` 用 `cell.row < fromRow` 过滤，A1 因 `0 < 1` 被跳过 → 返回 null，明明还存在匹配 A1。
- 影响：查找/查找下一个的导航顺序错乱、提前宣告"无更多结果"，或反复命中同一格；依赖插入历史，难以稳定复现，属高危静默错误。
- 修复方向：遍历前按 `(row, col)` 排序 entries（可接受一次性 O(N logN)），或按行桶聚合后顺序扫描。

### F-06 findNext 的 fromRow/fromCol 对所有 sheet 一视同仁地过滤：跨 sheet 继续查找时丢失后续 sheet 的前部匹配

- 位置：`packages/spreadsheet-core/src/core/search-operations.ts:84-88`（过滤逻辑）；`packages/spreadsheet-core/src/command-handlers/search-handlers.ts:26-39`（from 只传 row/col，未传 sheetId）
- 关键源码摘录（search-operations.ts:84-88，见 F-05 摘录）
- 问题：`from` 是 `SpreadsheetCellRef`（含 sheetId），但 `findInDocument` 在遍历每个 sheet 时都对 cell 应用 `cell.row < fromRow` 过滤。输入：workbook 范围 `findNext(from=Sheet1!C5)`（row=4）→ Sheet1 中 row>4 的匹配正常；轮到 Sheet2 时，Sheet2 的 row 0..3 匹配全部被 `cell.row < 4` 跳过。
- 影响：跨 sheet 查找提前返回 null 或跳到 Sheet2 中部，找不到明明存在的匹配；searchScope='workbook' 是 `FindOptions` 公开契约。
- 修复方向：from 过滤只应用于 from 所在 sheet（遍历到目标 sheet 之后的 sheet 不过滤，之前的 sheet 整体跳过）。

### F-07 applyClearCells 永远丢弃 linkUrl 与 numberFormat：无论 clear 选项组合如何，两个字段都被静默清除

- 位置：`packages/spreadsheet-core/src/core/clipboard-operations.ts:170-181`（range 分支）、`:201-212`（单格分支）
- 关键源码摘录（clipboard-operations.ts:170-181）：
  ```ts
  const cleared: CellDocument = { address: key, row, col };
  if (!clearValues) {
    cleared.value = existing.value;
    cleared.formula = existing.formula;
  }
  if (!clearFormats) {
    cleared.style = existing.style;
    cleared.styleId = existing.styleId;
  }
  if (!clearComments) {
    cleared.comment = existing.comment;
  }
  // linkUrl、numberFormat 从未被回填
  ```
- 问题：`cleared` 的保留清单漏掉 `linkUrl` 和 `numberFormat`。输入：cell `{ value: 1, numberFormat: '0.00', linkUrl: 'https://…' }`，`clearCells(target, clearValues=true, clearFormats=false, clearComments=false)`（只清值）→ numberFormat 属于格式、本应保留却被清空；linkUrl 无论选项如何一律丢失。
- 影响：任何清除操作（包括最常见的 Delete 清值）都会静默破坏数字格式与超链接；与命令默认参数（clearValues 默认 true、其余 false）组合即触发。
- 修复方向：`!clearFormats` 分支补 `cleared.numberFormat = existing.numberFormat`；`!clearValues`（或独立选项）分支补 `cleared.linkUrl = existing.linkUrl`；补回归测试。

### F-08 applySetCellFormula(formula=undefined) 作用在空单元格时写入畸形 cell：`{...undefined}` 得 `{}`，缺 address/row/col

- 位置：`packages/spreadsheet-core/src/core/cell-operations.ts:61-64`
- 关键源码摘录（cell-operations.ts:61-74）：
  ```ts
  if (formula === undefined) {
    const rest = { ...existing };          // existing 为 undefined 时得 {}
    delete rest.formula;
    newCell = rest as CellDocument;        // 强转掩盖缺字段
  } else {
    newCell = { ...(existing ?? { address: key, row: cell.row, col: cell.col }), ... };
  ```
- 问题：`SetCellFormulaCommand.formula?: string` 是可选契约（清除公式的合法路径），但 `formula === undefined` 分支没有走 `existing ?? { address, row, col }` 兜底。输入：对不存在的 cell 调 `setCellFormula { formula: undefined }` → `cells["A1"] = {}`。
- 影响：cells 字典出现无 address/row/col/value 的空条目；下游 `findInDocument` 读 `cell.row = undefined` 产出 `row: undefined` 的 FindResult、结构操作遍历 cells 时 `cell.row >= row` 恒 false、序列化文档含畸形节点；且 handler 返回 changed:true。else 分支有兜底，唯独此分支遗漏。
- 修复方向：清除分支同样用 `existing ?? { address: key, row, col }` 兜底；或 existing 为空时直接返回原 doc。

### F-09 filter 的 maxRow 只统计筛选列上的单元格：更长尾的数据行不被评估，不匹配的行保持可见

- 位置：`packages/spreadsheet-core/src/core/filter-operations.ts:20-27`
- 关键源码摘录（filter-operations.ts:20-27）：
  ```ts
  const candidateRows = Object.values(cells)
    .filter((cell) => newFilterColumns.some((f) => f.col === cell.col))
    .map((cell) => cell.row);
  const maxRow = candidateRows.length > 0 ? Math.max(...candidateRows) : -1;
  // ...
  for (let row = hasHeader ? 1 : 0; row <= maxRow; row++) {
    /* 设置 filteredOut */
  }
  ```
- 问题：行评估上界 `maxRow` 只取筛选列自身的最大行号。输入：col 0（筛选列）有值到 row 10，col 1（数据列）有值到 row 20，`filterRowsByCellValue(col: 0, value: 'x')` → rows 11..20 不进循环，`filteredOut` 保持原状（默认可见）→ 这些行 col 0 为空、不等于 'x'，本应被过滤却全部显示。
- 影响：筛选结果泄漏不匹配行；shape 不规则（筛选列比数据列短）的真实数据必然触发。附带问题：`Math.max(...candidateRows)` 对超长数组（10 万+ 行）有调用栈溢出风险。
- 修复方向：maxRow 取全 sheet 所有 cells 的最大行号（或按行索引结构计算 used range），而非仅筛选列；Math.max 改为循环归约。

### F-10 editComment/deleteComment/sortRange 空操作仍 pushUndo + dirty + changed:true：undo 栈被无效步骤污染、误置未保存状态

- 位置：`packages/spreadsheet-core/src/command-handlers/cell-handlers.ts:183-208`；对应 `core/cell-operations.ts:462-464`（editComment 空返回）、`:488-490`（deleteComment 空返回）、`core/sort-operations.ts:39-46`（不可排序空返回）
- 关键源码摘录（cell-handlers.ts:183-188 与 cell-operations.ts:462-464）：
  ```ts
  export const handleEditComment: CommandHandler<EditCommentCommand> = (store, command) => {
    const state = store.getState();
    const nextDoc = applyEditComment(state.document, command.cell, command.text);
    store.setState(applySimpleDocumentMutation(store.getState(), nextDoc));  // 无条件
    return { ok: true, changed: true };
  // applyEditComment: if (!existing?.comment) { return doc; }  // 原样返回
  ```
- 问题：operation 层对"目标不存在/无可排序内容"返回**原 doc 引用**，handler 不检测 `nextDoc === state.document` 就走 `applySimpleDocumentMutation`（pushUndo 旧引用 + `dirty: true`）并返回 `changed: true`。
- 影响：对无批注 cell 调 editComment / 对空区域调 sortRange → undo 栈新增一个"撤销后什么都没变"的假步骤（用户按一次 Ctrl+Z 看似失灵），`dirty` 被误置 → 宿主提示未保存、关闭确认误弹。`handleReplace`（search-handlers.ts:41-52）对空 cell 同模式同病。
- 修复方向：handler 统一改为 `if (nextDoc === state.document) return { ok: true, changed: false }`；或 operation 层返回 changed 标志。

## P2 风险

### F-11 applySetCellValue 不清除既有 formula：值与公式并存，字段语义自相矛盾

- 位置：`packages/spreadsheet-core/src/core/cell-operations.ts:27-50`
- 关键源码摘录（cell-operations.ts:35-41）：
  ```ts
  const newCell: CellDocument = {
    ...(existing ?? { address: key, row: cell.row, col: cell.col }),
    value, // formula 原样保留在 spread 结果里
    address: key,
    row: cell.row,
    col: cell.col,
  };
  ```
- 问题：用户直接输入新值是 `setCellValue` 的主路径，但旧 formula 保留 → cell 同时携带新 value 与旧 formula。包内无公式引擎（design.md §1.2），但宿主/未来引擎读取时"以谁为准"无契约；一旦按 formula 重算，用户手输的值会被旧公式覆盖。
- 影响：编辑含公式单元格后文档处于歧义状态；两个入口（setValue / setFormula）互相不清理对方。
- 修复方向：`applySetCellValue` 显式 `delete newCell.formula`（或提供 `clearFormula` 选项并在文档契约中声明 value 优先）。

### F-12 applyMergeRange 不校验与现有 merges 重叠，也不收敛被覆盖单元格的值

- 位置：`packages/spreadsheet-core/src/core/cell-operations.ts:227-251`
- 关键源码摘录（cell-operations.ts:233-243）：
  ```ts
  const merges = [...(sheet.merges ?? [])];
  const exists = merges.some((merge) => /* 仅完全相同判重 */);
  if (!exists) { merges.push(normalized); }
  ```
- 问题：可在已有合并区上再叠加任意相交合并，merges 集合出现重叠几何，渲染与命中测试行为未定义；合并时非左上格的值不清除（Excel 语义只保留左上值），取消合并后旧值"复活"。
- 影响：重叠 merges 导致渲染层合并解析冲突；隐藏数据随 unmerge 重现，与用户预期不符。
- 修复方向：merge 前做相交检测（`rangeIntersects` 已有），相交则先展开旧 merges 再合并；合并时清除非锚点 cell 的 value/formula。

### F-13 runtime snapshot 直接暴露可变 document/selection 引用：下游任何原地修改都会绕过 undo 与 COW 纪律污染 store

- 位置：`packages/spreadsheet-core/src/core/internal-state.ts:29-46`（buildSnapshot 直接引用 state 字段）；`core.ts:66-73`（缓存快照同样持有引用）
- 关键源码摘录（internal-state.ts:30-34）：
  ```ts
  return {
    document: state.document,      // 引用共享，非防御性拷贝
    activeSheetId: state.activeSheetId,
    selection: state.selection,
  ```
- 问题：整个包的正确性建立在"所有变更走 command → COW 新 document"之上，但快照把当前 document 原引用交出去。消费方（renderer/inspector schema 表达式）若原地改 `snapshot.document.workbook.sheets[0].cells.A1.value`，直接改写当前文档且 undo 栈中的共享子树一并被污染（undo 失效）。design.md §9 要求 bridge "暴露稳定快照"，当前依赖下游自觉。
- 影响：一个下游失误即静默破坏 undo 完整性，且难以定位（引用共享无告警）。
- 修复方向：至少在文档契约中声明 snapshot 为 frozen/只读；或对 document 做结构共享的浅冻结（Object.freeze 一层）；宿主侧已做 defensive copy 的（design.md §11 提到）应在包契约中显式化。

### F-14 replaceDocument 不清空 clipboard：旧文档的剪贴板数据残留，可跨文档粘贴

- 位置：`packages/spreadsheet-core/src/core.ts:81-94`
- 关键源码摘录（core.ts:84-93）：
  ```ts
  store.setState({
    document: replacedDocument,
    activeSheetId,
    selection: { kind: 'none' },
    editing: undefined,
    dirty: false,
    undoStack: [],
    redoStack: [],
    transactionDoc: null,
    // clipboard 未重置
  });
  ```
- 问题：替换文档重置了 selection/editing/history/transaction，唯独保留 clipboard。cut 型剪贴板的 `sourceSheetId` 在新文档中已不存在，`applyPasteCells` 的跨 sheet cut 清源分支会静默跳过（clipboard-operations.ts:119-120），paste 行为退化为 copy；copy 型则把旧文档数据贴入新文档。
- 影响：模板切换/导入新文档后粘贴出旧文档内容，或 cut 语义静默变化；数据跨文档意外泄漏。
- 修复方向：replaceDocument 时 `clipboard: null`。

### F-15 PasteOptions 与 ClipboardCell.merge 契约声明了但完全未实现：handler 静默忽略命令参数

- 位置：`packages/spreadsheet-core/src/command-handlers/clipboard-handlers.ts:39-47`（不读 `command.options`）；`types.ts:231-247`（`PasteOptions`、`ClipboardCell.merge` 定义）；`core/clipboard-operations.ts:49-60`（copy 从不填充 merge）
- 关键源码摘录（clipboard-handlers.ts:39-47）：
  ```ts
  export const handlePasteCells: CommandHandler<PasteCellsCommand> = (store, command) => {
    const state = store.getState();
    if (!state.clipboard) return { ok: false, changed: false, error: 'Clipboard is empty' };
    const nextDoc = applyPasteCells(state.document, state.clipboard, command.target);
    // command.options（values/formats/transpose/comments）被完全忽略
  ```
- 问题：`PasteCellsCommand.options?: PasteOptions` 是公开命令契约，但 `applyPasteCells` 没有 options 参数，选择性粘贴/转置全部静默按全量粘贴执行；`ClipboardCell.merge` 字段无任何读写路径（死契约）。跨合并区复制时合并信息丢失。
- 影响：宿主传入 `options.values=true` 期待只贴值，实际覆盖样式/批注，错误结果无任何报错。
- 修复方向：要么实现 options 过滤与 transpose，要么先从类型中移除/标注未实现，避免静默错误契约。

### F-16 buildSnapshot 的 layout 恒为 createDefaultLayout()：visibleRange 永远是 100x26 且 sheetId 为空串的假数据

- 位置：`packages/spreadsheet-core/src/core/internal-state.ts:42`；`types.ts:279-289`
- 关键源码摘录（internal-state.ts:41-43）：
  ```ts
  viewport: state.viewport,
  layout: createDefaultLayout(),   // 恒 { sheetId: '', 0,0,100,26 }
  ```
- 问题：`SpreadsheetRuntimeSnapshot.layout` 是公开快照契约，但永远是硬编码默认值：不反映 active sheet、不反映真实 used range（design.md §5 明确"grid 维度必须从 active sheet 已用边界推导，100x26 仅是空白基线"）、不含 frozen（`SpreadsheetLayoutSummary.frozen` 字段有定义但从未填充）。viewport 命令更新了 `state.viewport` 却不影响 layout。
- 影响：任何按 snapshot.layout 做可视区/命中计算的消费方拿到的是与文档无关的假数据；契约字段"看似有值实则恒定"比缺失更危险。
- 修复方向：layout 从 active sheet 的 rows/columns/cells 推导 used range 并携带 frozen；或在契约中显式标注 layout 未实现、值无效。

### F-17 工作表保护无任何强制执行路径，password 被静默丢弃

- 位置：`packages/spreadsheet-core/src/core/sheet-operations.ts:192-203`；全包对 `protected`/`protectionOptions`/`cell.protected` 无读取 enforcement
- 关键源码摘录（sheet-operations.ts:197-201）：
  ```ts
  export function applyProtectSheet(doc, sheetId, password?, options?) {
    void password;   // 静默丢弃
    const sheets = doc.workbook.sheets.map((sheet) =>
      sheet.id === sheetId ? { ...sheet, protected: true, protectionOptions: options } : sheet,
  ```
- 问题：`protectSheet` 只是写入元数据；`SheetProtectionOptions` 声明了 insertRows/deleteRows/formatCells 等细粒度权限（types.ts:61-71），但 dispatch 层与所有 mutation handler 都不检查——锁定 sheet/cell 后照常编辑；`password` 参数被 `void` 丢弃，也没有 unprotect 命令与解锁校验。
- 影响：保护功能是"装饰性"的，给用户已锁定的错觉；密码静默无效。
- 修复方向：短期在契约/文档中明确 protection 未生效；实现上在 dispatch 或 handler 层按 protectionOptions 拦截对应命令，补 unprotectSheet 命令。

### F-18 handleSetSelection 保留 editing 时不比较 sheetId：editing 可能悬空指向另一 sheet 的同坐标格

- 位置：`packages/spreadsheet-core/src/command-handlers/selection-handlers.ts:33-41`
- 关键源码摘录（selection-handlers.ts:33-40）：
  ```ts
  const nextEditing =
    editingCell &&
    command.selection.kind === 'cell' &&
    command.selection.anchor?.row === editingCell.row &&
    command.selection.anchor?.col === editingCell.col // 缺 sheetId 比较
      ? state.editing
      : undefined;
  ```
- 问题：只比较 row/col。特定条件下（宿主直接 setSelection 到另一 sheet 的同坐标 cell，未先走 setActiveSheet 清 editing），editing.cell.sheetId 与新 anchor.sheetId 不一致，编辑态锚定在非当前展示的 sheet。
- 影响：保存编辑值时写入不可见 sheet 的单元格；suspect 级（取决于宿主是否总是成对调用 setActiveSheet，但 core 层契约不应依赖）。
- 修复方向：补 `command.selection.anchor?.sheetId === editingCell.sheetId`（以及与 activeSheetId 的一致性校验）。

### F-19 addSheet 自动命名与 renameSheet 均不查重：sheet 名可重复

- 位置：`packages/spreadsheet-core/src/core/sheet-operations.ts:92`（`Sheet${length+1}`）、`:121-130`（rename 无重名校验）
- 关键源码摘录（sheet-operations.ts:91-92）：
  ```ts
  const id = crypto.randomUUID();
  const sheetName = name ?? `Sheet${doc.workbook.sheets.length + 1}`;
  ```
- 问题：删除 Sheet2 后（剩 Sheet1、Sheet3，length=2），addSheet 自动命名为 "Sheet3" 与现存撞名；renameSheet 传入任意已有名也不拒绝。sheet name 是用户可见标识与未来跨 sheet 引用（"Sheet2!A1"）的寻址基础。
- 影响：tab 显示混淆；公式/引用解析按名称寻址时二义性。
- 修复方向：自动命名循环避开已用名；rename 撞名返回 `ok: false`。

### F-20 fill 系列不平移公式相对引用：fillDown/fillRight 原文复制 formula，fillSeries 干脆丢弃 formula

- 位置：`packages/spreadsheet-core/src/core/cell-operations.ts:372-398`（fillDown `...sourceCell` 整体浅拷贝含 formula）、`:308-370`（fillSeries 只写 value/style）
- 关键源码摘录（cell-operations.ts:386-393）：
  ```ts
  entries.push({
    row,
    col,
    cell: {
      ...sourceCell, // formula 原文随拷贝，A1 引用不平移
      address: cellAddress(row, col),
      row,
      col,
    },
  });
  ```
- 问题：Excel 填充的核心语义是相对引用按位移平移（A1→A2）。此处 fillDown 把 `=A1+B1` 原样复制到下方所有格（引用恒为 A1+B1）；fillSeries 则不复制 formula（有公式的源格填充后目标格只剩数值）。design.md 声明不内建公式引擎，但"复制公式却不平移"是半实现状态，比不复制更易产生静默错误引用。
- 影响：宿主若展示/重算 formula，填充结果整列引用同一源格，数据错误；两种 fill 行为还不一致。
- 修复方向：短期在契约中声明 formula 为不透明字符串、fill 不做引用平移，宿主自行处理；长期提供可选的引用平移工具函数（解析 A1 相对段按位移重写）。

### F-21 结构/历史变更与瞬态状态不同步：removeSheet 清 selection 不清 editing；undo/rollback 不恢复 activeSheetId

- 位置：`packages/spreadsheet-core/src/command-handlers/sheet-handlers.ts:56-62`；`command-handlers/history-handlers.ts:50-57, 66-72`
- 关键源码摘录（sheet-handlers.ts:56-62 与 history-handlers.ts:66-72）：
  ```ts
  store.setState({
    ...updated, document: nextDoc, activeSheetId,
    selection: { kind: 'none' },
    dirty: true,                       // editing 未清除
  });
  // undo:
  store.setState({
    document: prevDoc, undoStack,
    redoStack: [...current.redoStack, current.document],
    dirty: true, ...clearTransientState(current),   // activeSheetId 未校正
  ```
- 问题：
  1. 删除 sheet 时若 editing 正锚定在被删 sheet 的 cell 上，editing 悬空（selection 清了、editing 没清），后续 `updateEditValue`/`setEditSaveStatus` 会写值到不存在的 sheet。
  2. undo/rollback 恢复 document 但不校正 `activeSheetId`：removeSheet 把 active 切到 sheets[0] 后 undo，active 停留在 sheets[0] 而非用户原本所在 sheet；极端时序下 activeSheetId 可能指向恢复后仍不存在的 sheet（redo/undo 与 replaceDocument 交错）。
- 影响：编辑态写入丢失/落错位置；undo 后视图跳到错误 sheet。
- 修复方向：removeSheet 复用 `clearTransientState`；undo/redo/rollback 后校验 activeSheetId 仍存在于恢复的 document，否则回落 sheets[0]。

### F-22 事务进行中未禁止 undo/redo：transactionDoc 活跃时弹事务前 undo 栈，历史语义混乱（suspect）

- 位置：`packages/spreadsheet-core/src/command-handlers/history-handlers.ts:60-90`（handleUndo/handleRedo 不检查 `state.transactionDoc`）；对照 `core/internal-state.ts:60-62`（pushUndoDocument 在事务中抑制入栈）
- 关键源码摘录（internal-state.ts:60-62）：
  ```ts
  if (state.transactionDoc) {
    return { ...state, redoStack: [] }; // 事务中 mutation 不入 undo 栈
  }
  ```
- 问题：事务内的普通 mutation 被设计为不进 undo 栈（commit 时统一以 transactionDoc 入栈），但事务中 dispatch `spreadsheet:undo` 会直接弹出**事务前**的 undo 栈顶并替换 document；随后 commit 时 `state.document !== state.transactionDoc` 又把 transactionDoc 压栈——最终 undo 栈语义与用户操作历史错位。
- 影响：宿主在事务窗口内触发 undo（如快捷键未禁用）时历史错乱；标记 suspect 因正常宿主时序可能不组合这两种命令，但 core 层无防护。
- 修复方向：handleUndo/handleRedo 开头检测 `transactionDoc` 非空即返回 `ok: false, error: 'Transaction in progress'`。

## P3 提示

### F-23 parseCellAddress 无行号下限校验："A0" 返回 row=-1；各命令坐标亦不校验负值

- 位置：`packages/spreadsheet-core/src/types.ts:301-311`
- 摘录：`return { row: parseInt(rowStr, 10) - 1, col: col - 1 };`
- 问题：`parseCellAddress('A0')` → `{row: -1, col: 0}` 不抛错；`cellAddress(-1, 0)` 生成 "A0"、`cellAddress(0, -1)` 生成仅行号的 "1"（列段为空串）。命令层（setCellValue/insertRow 等）对 row/col 也不做 `>= 0` 校验，负坐标沿 COW 链路静默产出畸形 key。当前包内无调用方传入负值，公开 API 面暴露即风险。修复：parse 时校验行号 ≥ 1；命令入口 clamp/拒绝负坐标。

### F-24 isRangeEmpty 命名误导：实际语义是"单格区间"

- 位置：`packages/spreadsheet-core/src/types.ts:317-319`
- 摘录：`return range.startRow === range.endRow && range.startCol === range.endCol;`
- 问题：函数名说的是"空"，判断的是 start==end（1x1 区间，并非空）。作为公开导出（index.ts:42）易被下游误用（例如把"选区为空"写成 `isRangeEmpty(range)`）。修复：更名 `isSingleCellRange` 或补充真语义函数。

### F-25 useRegex 的 ReDoS 黑名单防护不完备，且循环内每 cell 重新编译正则

- 位置：`packages/spreadsheet-core/src/core/search-operations.ts:6`（黑名单正则）、`:51`（循环内 createSearchRegex）
- 摘录：`const UNSAFE_REGEX_PATTERN = /(\([^)]*[+*][^)]*\)[+*])|(\.\*)|(\.\+)|(\[[^\]]*\][+*]\+?)/;`
- 问题：黑名单式防回溯爆炸挡不住 `(?:a+)+b`、`a{2,}{3}` 等变体；同时 `findInDocument` 对每个 cell 调 `createSearchRegex` 重复 `new RegExp`。修复：改用安全的超时/步数限制或长度限制；正则提到循环外编译一次。

### F-26 crypto.randomUUID 环境依赖：非安全上下文（HTTP/部分 WebView）直接抛错

- 位置：`packages/spreadsheet-core/src/types.ts:351`、`core/sheet-operations.ts:91, 162`
- 摘录：`id: id ?? crypto.randomUUID(),`
- 问题：`createEmptyDocument`/addSheet/copySheet 都裸调 `crypto.randomUUID()`，在不安全上下文（design.md 目标是可单独复用的通用控件）抛 `TypeError: crypto.randomUUID is not a function`。修复：封装 uuid fallback（`crypto.getRandomValues` 手拼 v4）。

### F-27 cloneSpreadsheetDocument 用 JSON.parse(JSON.stringify())：丢 undefined 属性、Date 变字符串、无法处理 bigint

- 位置：`packages/spreadsheet-core/src/core/internal-state.ts:25-27`
- 摘录：`return JSON.parse(JSON.stringify(document)) as SpreadsheetDocument;`
- 问题：作为事务快照与文档导入/导出（replaceDocument/exportDocument）的唯一深拷贝手段，`CellDocument.richText: unknown`、meta 中的 Date 等会被静默改形。当前数据模型恰好可序列化，属边界提示。修复：改用 `structuredClone`（applyCopySheet 已在用）并统一。

### F-28 index.ts 漏导出 SetViewportCommand 类型

- 位置：`packages/spreadsheet-core/src/index.ts:52-123`（类型导出清单无 `SetViewportCommand`）；`commands.ts:151` 联合类型中包含它
- 问题：`spreadsheet:setViewport` 是注册在案的命令（selection-handlers.ts:108）且在 READ_ONLY_COMMANDS 白名单中，但其命令类型无法从包入口导入，宿主只能 `as` 断言构造。修复：index.ts 补导出。

### F-29 applyMergeCellsCenter 重复实现：sheet-operations.ts 中的版本是死代码

- 位置：`packages/spreadsheet-core/src/core/sheet-operations.ts:224-231`；实际生效版本在 `core/cell-operations.ts:277-284`（cell-handlers.ts:37 导入后者）
- 摘录（sheet-operations.ts:224-231）：`export function applyMergeCellsCenter(doc, range) { let result = applyMergeRange(doc, range); result = applyCellStyleChange(result, range, {...}); return result; }`
- 问题：两处逐行等价的重复实现，修改其中一处（如修 F-12 的重叠校验）极易漏改另一处；未导出的那份纯死代码。修复：删除 sheet-operations.ts 中的副本。

### F-30 性能面：dispatch 强制 async 包装同步 handler；逐格命令全量重建 cells 字典与 sheets 数组；大范围样式操作逐格建 cell 条目

- 位置：`packages/spreadsheet-core/src/core-dispatch.ts:12-32`（async 包装）、`core/cell-operations.ts:42-49`（每次 setCellValue 新 cells 字典 + map 全 sheets）、`:88-131`（setCellStyle 对范围内每格创建 cell 文档）
- 问题：单格编辑路径是"复制整字典 + map 整 sheets 数组"，10 万格文档逐格输入（`__tests__/batch-cell-operations.test.ts` 表明批量写入是现实场景）为 O(N²) 级别；`dispatch` 返回 Promise 使每个命令多一次微任务跳转。当前规模可接受，属可预见的扩展瓶颈。修复：提供批量 setCells 命令或事务内复用可变构建；dispatch 对同步 handler 直接返回。

### F-31 undo/rollback 的杂项语义瑕疵：undo 到底 dirty 恒真；rollback 无事务时 changed:true；handler 双重 getState

- 位置：`packages/spreadsheet-core/src/command-handlers/history-handlers.ts:57`（rollback 无条件 changed: true）、`:66-73`（undo 恒 dirty: true）；`command-handlers/cell-handlers.ts:50-52`（`state` 与 `store.getState()` 两次取态的模式遍布全部 handler）
- 问题：(1) 连续 undo 回到保存基线后 `dirty` 仍是 true（无法表达"回到已保存状态"），宿主保存提示无法自动熄灭；(2) 无事务时 rollbackTransaction 什么都没做却返回 changed: true；(3) 每个 handler 先 `const state = store.getState()` 再在 `applySimpleDocumentMutation(store.getState(), …)` 二次取态，冗余且在并发 dispatch 场景下有读取不一致的理论窗口（当前 handler 全同步，实际无害）。修复：undo 后与保存基线比对重算 dirty；rollback 空事务返回 changed: false；handler 统一单次取态。

## 检查过程记录

1. 读 `docs/architecture/report-designer/design.md` 全文，确认 spreadsheet-core 的架构契约：纯表格运行时（无 React/SchemaRenderer 依赖）、不内建公式执行引擎、undo/redo、稀疏 cells、merge/hidden/resize、筛选显式建模（§9.1）、快照与 dirty 语义（§11）、性能策略（§12）。
2. 读 `package.json`（peerDeps 仅 zustand，符合无 React 依赖约束）。
3. 精读全部 25 个实现文件（4015 行）：入口/类型（index.ts、types.ts、commands.ts、commands-base.ts、commands-style.ts）→ 运行时（core.ts、core-dispatch.ts、core/internal-state.ts、core/document-access.ts）→ 操作层（cell/structure/sheet/clipboard/sort/filter/search-operations.ts）→ 命令层（command-handlers/ 全部 9 文件）。
4. 重点验证（反误报核查）：
   - `cellAddress`/`parseCellAddress` 双向边界手算验证（Z→AA、ZZ=701、bijective base-26 往返一致），未发现转换错误；
   - F-01（sort header 丢失）：核对 `__tests__/core-basics.test.ts:608-653` 仅有无 header 用例，全测试目录 `grep hasHeader` 零命中，确认无测试锁定相反行为；
   - F-02（merge 部分删除）：对 filter/map 逻辑代入 4 组数值案例手算确认；
   - F-04/F-05/F-06/F-07/F-08/F-09：逐条代入具体输入复核代码路径成立；
   - COW 纪律全文件核查：所有 mutation 均为浅拷贝重建，未发现原地修改导致 undo 栈污染的路径（undo 栈引用共享子树是安全的）；
   - cut 后剪贴板清空（clipboard-handlers.ts:44）确认存在，排除"cut 可重复粘贴"误报；
   - `applyMergeCellsCenter` 双实现经 grep 确认 sheet-operations 版本无引用（F-29）。
5. 覆盖率自查：25/25 文件精读；测试文件仅扫读用于反误报（按任务范围排除）。
