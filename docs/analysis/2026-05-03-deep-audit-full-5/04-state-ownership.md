# 04 状态所有权与单一事实来源

- 初审发现数: 2
- 维度复核: 完成
- 子项复核: 0
- 最终结果: 保留 1 / 降级 1 / 驳回 0

## 保留

### [维度04] spreadsheet shell 的 `cellValue/commentText` 会与 core snapshot 脱节

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-spreadsheet-shell.ts:10-11`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-selection.ts:193-196`
- **证据片段**:

  ```ts
  const [cellValue, setCellValue] = useState('');
  const [commentText, setCommentText] = useState('');

  setCellValue(String(cell?.value ?? ''));
  setCommentText(typeof comment === 'string' ? comment : (comment?.text ?? ''));
  ```

- **严重程度**: P2
- **现状**: 工具栏/外壳层把当前单元格值和评论保存在本地镜像里，只在选中变化时从 snapshot 灌入，没有对同一单元格的外部更新做回同步。
- **风险**: undo/redo、外部 bridge/core 更新、程序化改单元格后，toolbar/editor 可能继续显示旧值，直到再次选中该格。
- **建议**: 将已提交值改为从 snapshot 派生；本地 state 仅保留未提交 draft，并显式区分 draft 与 committed value。
- **为什么值得现在做**: 这已经是 live UI 风险，不只是架构理想态未收敛。
- **误报排除**: 复核明确排除了“合理的局部草稿 state”误报；问题在于本地 state 当前还承担 committed 值展示职责，却没有反向同步。
- **历史模式对应**: shell 层镜像 canonical data 且缺少回同步。
- **参考文档**: `docs/components/spreadsheet-page/design.md`
- **复核状态**: 维度复核通过

## 已降级

- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts` 与 core `snapshot.editing` 双事实源: **已降级**
  - 复核认为这更像 owner drift / 未完全接通的中间态；当前 live code 里真正生效的编辑态主要仍在 renderer 本地，不足以定性为两个同时生效的事实源。
