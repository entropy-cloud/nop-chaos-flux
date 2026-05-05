# 对抗性审查 — 2026-05-05 第 1 轮

## 发现 1：Report Designer bridge 对 designer-only 变更静默失明

- 在哪里
  - `packages/report-designer-renderers/src/bridge.ts:97-118`
  - `packages/spreadsheet-renderers/src/bridge.ts:64-90`
  - `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:31-44`
- 是什么
  - `createReportDesignerBridge()` 直接展开 `spreadsheetBridge`，但没有覆盖 `subscribe()`。
  - 结果 `designerBridge.subscribe()` 只监听 spreadsheet core 变化，纯 designer 侧状态变化不会触发订阅者，例如 inspector 开关、metadata 更新、field drag、preview 状态。
- 为什么值得关心
  - 这个 bridge 的命名和 `getDesignerSnapshot()` 都在暗示它是“统一宿主桥”，但实际订阅语义只覆盖了一半状态。
  - 任何通过 `useSyncExternalStore` 或类似方式把它当作单一 truth source 的消费者，都会在 designer-only 更新时读到陈旧快照。
  - 这类问题最容易在“有些操作刷新，有些操作不刷新”时表现为间歇性 UI 失步，排查成本很高。
- 信心水平
  - 确定

## 发现 2：Range metadata 读取总是落到同 sheet 的第一个 range

- 在哪里
  - `packages/report-designer-core/src/types.ts:334-355`
  - `packages/report-designer-core/src/runtime/metadata.ts:279-299`
  - `packages/report-designer-core/src/core-dispatch.ts:106-137`
- 是什么
  - `updateMetadata()` 对 range 写入时按 `sheetId:startRow:startCol:endRow:endCol` 生成稳定 id，并正确按 id 查找/更新。
  - 但 `getTargetMeta()` 读取 range metadata 时没有按目标 range 匹配，只要该 sheet 下存在任何 range 条目，就直接返回 `rangeEntries[0].meta`。
- 为什么值得关心
  - 同一张 sheet 上存在多个 range 注解时，inspector 读取、merge patch、后续命令逻辑都可能基于错误的 meta 工作。
  - 这不是单点 UI 偏差，而是“写入按精确 id，读取按第一个元素”的读写契约撕裂，后续 range 功能越多，污染越严重。
- 信心水平
  - 确定

## 发现 3：批量 field drop 到 range 在第 27 列后生成非法地址

- 在哪里
  - `packages/report-designer-core/src/runtime/metadata.ts:333-352`
  - `packages/spreadsheet-core/src/types.ts`（已有 `cellAddress` 语义供其他调用方使用）
  - 对照：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:130,141,150`
- 是什么
  - `applyFieldDrop()` 给 range 内每个 cell 生成地址时使用 `String.fromCharCode(65 + col)`，这只对 `A-Z` 有效。
  - 当 `col >= 26` 时会生成 `[`、`\` 之类非法地址，而不是 `AA`、`AB`。
- 为什么值得关心
  - 这是一个典型“看起来能跑到 demo、规模一上来就坏”的宽表缺陷。
  - spreadsheet/renderers 其他地方已经把地址生成收敛到 `cellAddress()`，这里只有一条手写分支悄悄背离基线，导致 metadata 写到错误 key，下游显示和语义绑定一起错位。
- 信心水平
  - 确定

## 发现 4：Spreadsheet `replaceDocument()` 会把旧文档剪贴板和事务残留带进新文档

- 在哪里
  - `packages/spreadsheet-core/src/core.ts:69-80`
  - `packages/spreadsheet-core/src/command-handlers/history-handlers.ts:11-37`
  - `packages/spreadsheet-core/src/command-handlers/clipboard-handlers.ts:15-46`
- 是什么
  - `replaceDocument()` 只重置了 document、activeSheet、selection、editing、dirty、undo/redo。
  - 但 store 初始状态里还存在 `transactionDoc` 和 `clipboard`，而 Zustand 的 `setState({...})` 是浅合并，不会自动清掉未提及字段。
  - 因此切换到新文档后，旧文档的复制内容和未完成事务仍可能残留。
- 为什么值得关心
  - 新文档上执行 paste 可能粘贴出旧文档内容；rollback transaction 甚至可能把整个新文档回滚到旧文档快照。
  - 这是跨文档边界泄漏，不只是 UX 小问题，而是状态隔离模型被破坏。
  - 任何以 `replaceDocument()` 作为“打开新文件 / 重载模板”基础语义的上层功能都会继承这个风险。
- 信心水平
  - 很可能

## 本轮小结

- 本轮切入视角：跨 bridge 契约、设计器语义元数据、跨文档状态隔离。
- 4 个问题里有 3 个属于“读写/订阅契约左右不对称”，1 个属于“文档边界切换未彻底重置运行时状态”。这类问题的共同特点是：单点单测不一定暴露，但一旦进入集成场景就会表现为难复现的陈旧状态或错绑语义。
