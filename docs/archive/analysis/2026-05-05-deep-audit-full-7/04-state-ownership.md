# 维度04：状态所有权与单一事实来源

> 深挖状态：已在第4轮结束
> 说明：本文件仅记录初审与各轮深挖结果，暂不包含复核结论。

## 第1轮初审

### [维度04-初审-F01] designer tree mode 保留 `treeDocument` props-to-state 同步链，形成双事实源

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flow-designer-renderers\src\designer-page.tsx`
- **行号范围**: `74-81`
- **核心证据**:

```tsx
74:   const [initialTreeDocument] = React.useState(() => inputTreeDocument);
75:   const [treeDocument, setTreeDocument] = React.useState<TreeDocument | undefined>(
76:     inputTreeDocument,
77:   );
79:   useEffect(() => {
80:     setTreeDocument(inputTreeDocument);
81:   }, [inputTreeDocument]);
```

- **结论**: `inputTreeDocument`、本地 `treeDocument`、以及 core 内 graph document 形成多层状态链；外部 prop 回推时可能覆盖内部编辑中的树状态，属于典型 props-to-state 双事实源。

### [维度04-初审-F02] declarative surface 同时用 `localOpen` 与 `SurfaceRuntime` 表达 open 状态

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-basic\src\use-surface-renderer.ts`
- **行号范围**: `36-38, 68-70, 192-203`
- **核心证据**:

```tsx
36:   const controlledOpen = resolvedProps.open;
37:   const [localOpen, setLocalOpen] = React.useState(Boolean(resolvedProps.defaultOpen ?? false));
38:   const effectiveOpen = controlledOpen !== undefined ? Boolean(controlledOpen) : localOpen;
68:       __handleOpenChange: (nextOpen: boolean) => {
69:         if (controlledOpen === undefined) {
70:           setLocalOpen(nextOpen);
...
192:     if (effectiveOpen) {
193:       openSurface();
...
197:     surfaceRuntime.close(id);
198:     surfaceRuntime.publishClosed({
```

- **结论**: `localOpen/effectiveOpen` 与 `SurfaceRuntime` 的 `SurfaceEntry`/closed summary 同时表达 surface open；一旦 runtime 被外部关闭而本地 state 未同步，存在被重新打开的风险。

### [维度04-初审-F03] table quick edit 同时维护本地 draft/saved 值与 row scope 里的同一字段

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-renderers-data\src\table-renderer\table-quick-edit-controller.ts`
- **行号范围**: `26-38, 74-79`
- **核心证据**:

```tsx
26:   const [draftValue, setDraftValue] = useState(initialValue);
27:   const [savedValue, setSavedValue] = useState(initialValue);
30:   const [dialogOpen, setDialogOpen] = useState(false);
32:   useEffect(() => {
33:     const nextValue = toOptionalDraftValue(record, field);
34:     setDraftValue(nextValue);
35:     setSavedValue(nextValue);
36:     setBodyDirty(false);
37:     setDialogOpen(false);
38:   }, [field, record]);
76:       setDraftValue(nextValue);
78:         rowScope.update(`record.${field}`, nextValue);
```

- **结论**: `draftValue/savedValue` 与 `rowScope.record[field]` 双存同一字段值；`record` 刷新时本地 draft 会被重置，属于 table inline quick-edit 的双状态问题。

## 深挖第2轮追加

### [维度04-深挖-F04] spreadsheet toolbar 把当前单元格值/批注双存为本地 state，与运行时快照脱节

- **文件**:
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-spreadsheet-shell.ts:10-11`
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-selection.ts:193-196`
  - `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\use-spreadsheet-interactions.ts:289-299`
- **行号范围**: `10-11`, `193-196`, `289-299`
- **核心证据**:

```ts
10:   const [cellValue, setCellValue] = useState('');
11:   const [commentText, setCommentText] = useState('');
193:         const cell = snapshot.activeSheet?.cells?.[cellAddress(row, col)];
194:         setCellValue(String(cell?.value ?? ''));
196:         setCommentText(typeof comment === 'string' ? comment : (comment?.text ?? ''));
289:   const currentCell = selectedCell
290:     ? snapshot.activeSheet?.cells?.[cellAddress(selectedCell.row, selectedCell.col)]
291:     : undefined;
293:   const hasComment = !!currentCell?.comment;
```

- **结论**: toolbar 本地 `cellValue/commentText` 与 `snapshot.activeSheet.cells[selectedCell]` 同时表示当前单元格内容/批注；保持选区不变时若外部命令更新 cell，toolbar 可能显示旧值并把旧值覆盖回去。

## 深挖第3轮追加

### [维度04-深挖-F05] word-editor `PageControls` 把 page mode 维护为本地 state，脱离 editor store/bridge 真实状态

- **文件**: `C:\can\nop\nop-chaos-flux\packages\word-editor-renderers\src\toolbar\page-controls.tsx`
- **行号范围**: `60-66`
- **核心证据**:

```tsx
60:   const [pageMode, setPageMode] = useState<string>(PageMode.PAGING);
62:   const handlePageModeToggle = () => {
63:     const nextMode = pageMode === PageMode.PAGING ? PageMode.CONTINUITY : PageMode.PAGING;
64:     bridge?.command?.executePageMode(nextMode);
65:     setPageMode(nextMode);
66:   };
```

- **结论**: `PageControls.pageMode` 与 canvas editor 当前 page mode 双存；本地 state 没有从 store/bridge 回读，外部改 mode 后 toggle 可能基于错误前态计算出相反的 nextMode。

## 深挖第4轮追加

未发现新的问题。深挖结束。

## 维度复核结论

- 初审与深挖共 5 项，独立复核后保留 3 项、降级 1 项、驳回 1 项。
- 需要优先关注的是真实双事实源或脱离 runtime/store 的本地状态；显式编辑缓冲不应机械判成重复事实源。

## 子项复核结论

- `[维度04-初审-F01] designer tree mode 保留 treeDocument props-to-state 同步链，形成双事实源`: 降级。双层状态确实存在，但这是为了保持 core/选择/撤销连续性的有意设计，问题更像受控覆盖风险。
- `[维度04-初审-F02] declarative surface 同时用 localOpen 与 SurfaceRuntime 表达 open 状态`: 保留。`effectiveOpen` 与 runtime entry 可独立变化，外部若直接 `surfaceRuntime.close()` 而未回写本地 open，effect 会按旧声明态重新打开。
- `[维度04-初审-F03] table quick edit 同时维护本地 draft/saved 值与 row scope 里的同一字段`: 驳回。`draftValue/savedValue` 属于显式编辑缓冲与回滚语义，不应直接判定为错误双事实源。
- `[维度04-深挖-F04] spreadsheet toolbar 把当前单元格值/批注双存为本地 state，与运行时快照脱节`: 保留。`cellValue/commentText` 只在选区变化时回填，当前单元格被外部命令更新时会与 snapshot 脱节。
- `[维度04-深挖-F05] word-editor PageControls 把 page mode 维护为本地 state，脱离 editor store/bridge 真实状态`: 保留。本地 `pageMode` 不从 store/bridge 回读，外部切换后 toggle 会基于过期前态计算下一模式。
