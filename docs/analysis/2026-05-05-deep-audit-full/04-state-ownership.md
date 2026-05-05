# 维度 04：状态所有权与单一事实来源

## 初审

- 初审发现 2 条保留项，并对 `commentText` 提出观察项。

## 维度复核

- 保留：`word-editor` `pageMode` 本地镜像。
- 保留：spreadsheet toolbar `cellValue` 本地镜像。
- 降级：`commentText` 更像 staged draft。

## 最终结论

### [维度04] word editor `pageMode` 成为 bridge/local 双事实源

- **文件**: `packages/word-editor-renderers/src/toolbar/page-controls.tsx:60-66`, `packages/word-editor-core/src/editor-store.ts:46-55`
- **证据片段**:
  ```ts
  const [pageMode, setPageMode] = useState<string>(PageMode.PAGING);
  bridge?.command?.executePageMode(nextMode);
  setPageMode(nextMode);
  ```
- **严重程度**: P2
- **现状**: 编辑器运行模式没有 owner 到 store，而是由 toolbar 本地 state 镜像。
- **风险**: 外部路径改 mode 时 UI 不跟随，下一次 toggle 可能基于 stale state 计算。
- **建议**: 将 `pageMode` 收敛到 `editor-store`。
- **参考文档**: `docs/components/word-editor-page/design.md`, `docs/architecture/word-editor/design.md`
- **复核状态**: `维度复核通过`

### [维度04] spreadsheet `cellValue` 已写回 core 后仍保留本地镜像

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:10-12`, `use-selection.ts:193-195`, `use-cell-value-sync.ts:11-18`
- **证据片段**:
  ```ts
  const [cellValue, setCellValue] = useState('');
  setCellValue(String(cell?.value ?? ''));
  input.bridge.dispatch({ type: 'spreadsheet:setCellValue', ... })
  ```
- **严重程度**: P2
- **现状**: toolbar 输入值每次输入都会写回 core，但本地仍保留第二份 committed 值。
- **风险**: undo/redo、外部命令或其它编辑路径更新 cell 后，toolbar 值可能漂移。
- **建议**: 直接从 snapshot 当前选中 cell 派生显示值，或明确把本地值改成 commit 前 draft。
- **参考文档**: `docs/components/spreadsheet-page/design.md`
- **复核状态**: `维度复核通过`

### [维度04] `commentText` 更像 staged draft

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:11`, `use-comments.ts:15-33`
- **证据片段**:
  ```ts
  const [commentText, setCommentText] = useState('');
  // submit path writes comment on explicit action
  ```
- **严重程度**: P3
- **现状**: comment 文本目前更接近提交前草稿，而非已 committed 值镜像。
- **风险**: 若未来出现外部 comment 更新路径，可能演变为同类双状态。
- **建议**: 保持观察，后续若加外部更新路径再重新复核。
- **参考文档**: `docs/references/deep-audit-calibration-patterns.md`
- **复核状态**: `已降级`
