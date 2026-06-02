# 维度 04: 状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] Spreadsheet inline edit session 由 renderer-local state 持有，绕过 core 的 editing owner 契约

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:22-27,46-63,118-129`
- **核心类型文件**: `packages/spreadsheet-core/src/types.ts:193-198,245-254`
- **证据片段**:

```ts
// use-editing.ts
const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
const [editValue, setEditValue] = useState('');
const [editSaveState, setEditSaveState] = useState<EditSaveState>({ status: 'idle' });
const editingCellRef = useRef<{ row: number; col: number } | null>(null);
const editValueRef = useRef('');
```

```ts
// types.ts — core 已声明 runtim editing owner 契约
export interface SpreadsheetRuntimeSnapshot {
  editing?: SpreadsheetEditingState;
  // ...
}
```

- **严重程度**: P2
- **现状**: `useEditing` 用 `useState`/`useRef` 持有 `editingCell`/`editValue`/`editSaveState`；spreadsheet-core 的 `SpreadsheetRuntimeSnapshot` 已声明 `editing?: SpreadsheetEditingState`。renderer-local state 与 core-owned 契约表达同一份"当前编辑会话"事实，但互不知晓。
- **风险**: 外部 runtime/host scope/动作通道看不到真实 editing session；当 selection、document replace、撤销恢复等 core 路径变化时，core 与 UI 对"是否仍在编辑、编辑哪个单元格、草稿值是什么"可能分叉，导致保存到旧单元格、UI 仍显示编辑器但 core 已无 editing session 等结构性风险。
- **建议**: 把 inline editing session 收敛到 spreadsheet core 或明确的 spreadsheet editing owner；renderer-local state 只保留 IME/focus/composition 这类纯 DOM 临时态，不再持有 `editingCell`/`editValue` 这类业务事实。
- **为什么值得现在做**: 这是用户数据编辑主路径，且当前 v1 基线不接受过渡态；editing owner 不诚实会直接影响 host projection、一致性调试和后续动作/恢复语义。
- **误报排除**: 不是 hover/展开之类纯 UI transient state。`editingCell` 决定保存目标，`editValue` 决定将写入 workbook 的值，`editSaveState` 决定提交反馈。也不属于 reopened adjudication 已裁定的旧 tradeoff（与 `object-field`/`table-quick-edit-controller` 情况不同）。
- **历史模式对应**: 属于"复杂控件用本地 state 持有 store 已有 owner 契约的数据"，与历史 ArrayEditor/CheckboxGroup 的本地草稿 vs store 事实源分叉模式同类。
- **参考文档**: `docs/components/spreadsheet-page/design.md`、`docs/architecture/scope-ownership-and-isolation.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度04-02] Report Designer host scope 同时发布两条 workbook 真源，文档要求的单一基线已被三方打破

- **文件**: `packages/report-designer-renderers/src/host-data.ts:195-233`、`docs/components/report-designer-page/design.md:105-110`、`packages/report-designer-renderers/src/host-data.test.ts:241-264`
- **证据片段**:

```ts
// host-data.ts — buildReportDesignerScopeData 同时发布两条可能不同的 workbook
{
  reportDocument: snapshot.document,
  spreadsheet: spreadsheetSnapshot ? buildSpreadsheetScopeData(spreadsheetSnapshot) : undefined,
  workbook: reportDocument.spreadsheet.workbook,
}
```

```md
// design.md — 文档要求单一基线
workbook / spreadsheet.workbook / reportDocument.spreadsheet 必须指向同一条 canonical workbook baseline
```

```ts
// host-data.test.ts — 测试显式锁定了分叉行为
it('does not replace canonical reportDocument/workbook with spreadsheet snapshot aliases', async () => {
  expect(scopeData.reportDocument.spreadsheet.workbook).not.toBe(scopeData.spreadsheet?.workbook);
});
```

- **严重程度**: P1
- **现状**: owner doc 明确要求三者同基线，但 `buildReportDesignerScopeData` 在 `spreadsheetSnapshot` 存在时发布两个不同 workbook 引用；测试显式断言它们不同。
- **风险**: toolbar、inspector、body、schema region 分别读取不同字段时会在同一页面看到不同文档事实。save/export/status 写回容易基于不同基线推理。
- **建议**: 选定唯一 workbook owner 统一 host projection。若 live 编辑期以 spreadsheet runtime 为准，则 `reportDocument`/顶层 `workbook` 也必须投影同一基线。
- **误报排除**: 不是单纯"便捷镜像字段不同步"——owner doc 已明确要求同基线，且测试锁定相反行为，因此是确定性问题。
- **历史模式对应**: 公开投影层双状态/双 owner 发布。
- **复核状态**: 未复核

### [维度04-03] Spreadsheet host bridge 把 editing 从公开快照中抹掉，相邻 surface 无法接入 core-owned editing 真源

- **文件**: `packages/spreadsheet-renderers/src/bridge.ts:13-27,36-63`、`packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:148-184`、`packages/spreadsheet-core/src/types.ts:245-250`
- **证据片段**:

```ts
// types.ts — core 声明了 editing
export interface SpreadsheetRuntimeSnapshot {
  editing?: SpreadsheetEditingState;
}

// bridge.ts — host snapshot 把 editing 丢掉
export interface SpreadsheetHostSnapshot {
  // 没有 editing
}
```

- **严重程度**: P2
- **现状**: core 类型声明了 `editing` 但桥接层 `SpreadsheetHostSnapshot` 没有对应字段，`deriveHostSnapshot()` 完全不映射 `runtime.editing`。相邻 spreadsheet/report surface 无法从 public seam 拿到 editing 真源。
- **风险**: 即使 core 声明了 editing owner，桥接层不补齐，相邻 surface 只能继续依赖 renderer-local edit session 或 selection 推断。
- **建议**: 把 `editing` 纳入 `SpreadsheetHostSnapshot` 与 bridge selector 基线，让 page/report host projection 直接消费它。
- **误报排除**: 这里只针对已被 owner doc 和 runtime 类型同时声明为 core-owned 的 `editing`，不是要求把所有瞬时 UI 状态塞进 bridge。
- **历史模式对应**: "owner truth 被 projection seam 截断"。
- **复核状态**: 未复核

## 维度复核结论

- [维度04-01]: 保留 P2。core 的 editing owner contract 类型声明与实现脱节（core 从未 populate editing），renderer 本地状态填补但未与 core 协调。新增子项 04-01-A：core 声明了 editing 但从未写入。
- [维度04-02]: 保留 P1。live code 确认 `buildReportDesignerScopeData` 分两条路径发布 workbook；owner doc 要求同基线但测试显式锁定分叉行为。新增子项 04-02-A：`createHostData` 与 `buildReportDesignerScopeData` 引用策略不一致。
- [维度04-03]: 保留 P2。桥接层不映射 `editing`；当前 runtime 影响为零（core 也不提供 editing），但修复 04-01 时必须一并修复。
- [维度04-04 复核新增]: P3。`use-selection.ts:105-129` 的 `commitEditingCell` 不校验 editing cell 是否仍有效。
- [维度04-05 复核新增]: P3。`buildReportDesignerScopeData` 的 workbook 引用因 deep-freeze/mutability 问题可能导致未定义行为。

### 子项复核结论

#### 子项 04-01-A: spreadsheet-core 声明了 SpreadsheetEditingState 但从未 populated

- **复核判决**: 保留并归入父项 04-01
- **追踪**: `editing?` 字段在 `SpreadsheetRuntimeSnapshot` (`spreadsheet-core/src/types.ts:249`) 和 `SpreadsheetInternalState` (`spreadsheet-core/src/core/internal-state.ts:14`) 中声明，但全仓库无代码生产符合 `SpreadsheetEditingState` 形状的对象。实际 editing session 完全由 `spreadsheet-renderers` 的 `useEditing` (React useState/useRef) 持有。
- **严重程度**: P3（类型系统声称但从不 populate，但无 consumer 读取所以无损运行）
- **归并**: 修正父项描述:「core」→「spreadsheet-core」

#### 子项 04-02-A: createHostData 与 buildReportDesignerScopeData 的 workbook 引用策略不一致

- **复核判决**: 确认，保留为独立子项归入 04-02
- **追踪**:
  - `createHostData` (host-data.ts:145-187): shallow copy `reportDocument` + `workbook`，返回副本
  - `buildReportDesignerScopeData` (host-data.ts:189-246): 直接引用 `snapshot.document` + `workbook`，返回原始对象
  - 前者目前是 dead code（exported but never imported）
  - `buildReportDesignerScopeData` 返回的是写入 zustand store 的可变引用——消费者直接修改会污染 core state
- **严重程度**: P2（scope path 给 renderer 提供可变引用，与 createHostData 的防御性 copy 不一致）

## 最终保留项

| 编号    | 严重程度 | 文件                                                        | 摘要                                                                    |
| ------- | -------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- |
| 04-01   | P2       | `spreadsheet-renderers/src/use-editing.ts:22-27`            | inline edit session 由 renderer-local state 持有                        |
| 04-01-A | P3       | `spreadsheet-core/src/types.ts:249`, `internal-state.ts:14` | SpreadsheetEditingState 声明但从不 populate                             |
| 04-02   | P1       | `report-designer-renderers/src/host-data.ts:195-233`        | host scope 同时发布两条 workbook 真源                                   |
| 04-02-A | P2       | `report-designer-renderers/src/host-data.ts:145-246`        | createHostData 与 buildReportDesignerScopeData copy-vs-reference 不一致 |
| 04-03   | P2       | `spreadsheet-renderers/src/bridge.ts:13-27`                 | host bridge 把 editing 从快照抹掉                                       |
| 04-04   | P3       | `spreadsheet-renderers/use-selection.ts:105-129`            | commitEditingCell 不校验坐标有效性                                      |
| 04-05   | P3       | `report-designer-renderers/host-data.ts:199-200`            | scope data workbook 引用原始对象                                        |
