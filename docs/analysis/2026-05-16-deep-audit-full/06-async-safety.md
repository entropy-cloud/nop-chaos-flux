# 维度 06：异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] spreadsheet 命令处理在 `ok:false` 时仍记录成功日志

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts:83-89`
- **证据片段**:
  ```ts
  const handleAddSheet = useCallback(async () => {
    await bridge.dispatch({
      type: 'spreadsheet:addSheet',
      name: `Sheet${snapshot.workbook.sheets.length + 1}`,
    });
    addLog('Added new sheet');
  }, [bridge, snapshot, addLog]);
  ```
- **严重程度**: P1
- **现状**: 多个 toolbar mutation handler 只 `await bridge.dispatch(...)`，但不检查返回的 `result.ok`。
- **风险**: 用户界面会显示“操作成功”，但底层命令其实返回了结构化失败结果。
- **建议**: 全量对齐到 `handleUndo` / `handleRedo` 这类显式检查 `result.ok` 的路径。
- **为什么值得现在做**: 这是当前 spreadsheet 主交互路径上的真实误报成功状态。
- **误报排除**: 不是纯 `void promise` 嫌疑；这里已经 `await` 了 Promise，但仍丢失了解析后的失败语义。
- **历史模式对应**: structured-result failure dropped.
- **参考文档**: `docs/bugs/07-submit-concurrent-guard.md`
- **复核状态**: 未复核

### [维度06-02] CRUD 查询提交缺少并发保护，会触发重复副作用窗口

- **文件**: `packages/flux-renderers-data/src/crud-renderer-ownership.ts:189-212`
- **证据片段**:
  ```ts
  const handleQuerySubmit = useCallback(async () => {
    const handle = componentRegistry?.resolve({ componentId: queryFormId });
    if (handle?.capabilities?.hasMethod?.('getValues')) {
      const valuesResult = (await Promise.resolve(
        handle.capabilities.invoke('getValues', undefined, {} as never),
      )) as { ok?: boolean; data?: unknown };
      if (valuesResult.ok && valuesResult.data && typeof valuesResult.data === 'object') {
        submitQueryValues(toRecord(valuesResult.data));
      }
    }
  }, [componentRegistry, queryFormId, submitQueryValues]);
  ```
- **严重程度**: P2
- **现状**: 该路径没有 in-flight guard、request token 或 freshness check。
- **风险**: 重复点击查询可触发多次 `submitQueryValues` / `onQuerySubmit`，形成重复刷新副作用。
- **建议**: 增加并发保护或 latest-only freshness gate。
- **为什么值得现在做**: 查询是 CRUD 高频路径，重复副作用会直接影响用户操作反馈。
- **误报排除**: 复核已把更强的“stale result race”结论降级，这里只保留已被 live code 明确支撑的重复副作用窗口。
- **历史模式对应**: async duplicate side-effect window。
- **参考文档**: `docs/bugs/07-submit-concurrent-guard.md`
- **复核状态**: 未复核

### [维度06-03] spreadsheet 编辑保存对 `ok:false` 的失败反馈不完整

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:34-57`
- **证据片段**:

  ```ts
  const result = await bridge.dispatch({
    type: 'spreadsheet:setCellValue',
    cell: { sheetId, address: addr, row: currentEditCell.row, col: currentEditCell.col },
    value: currentEditValue,
  });

  if (result.ok) {
    editingCellRef.current = null;
    setEditingCell(null);
  }
  ```

- **严重程度**: P2
- **现状**: 只有成功分支有显式后续处理，失败结果未统一转成用户可见反馈。
- **风险**: 编辑失败时，用户可能停留在一个模糊状态，无法区分“未保存”与“保存成功但未退出”。
- **建议**: 对 `ok:false` 增加显式 notify/log，并区分 cancelled 与 failed。
- **为什么值得现在做**: spreadsheet 的点击外部保存流高度依赖明确反馈。
- **误报排除**: 复核已确认并非“所有路径都静默”；因此这里只保留更窄的 failure-feedback gap。
- **历史模式对应**: incomplete structured failure handling。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度06-04] report-spreadsheet 字段拖拽先写单元格再忽略 designer `ok:false`，形成半提交

- **文件**: `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:151-170`
- **证据片段**:
  ```ts
  await spreadsheetBridge.dispatch({
    type: 'spreadsheet:setCellValue',
    cell: { sheetId, address: addr, row: targetCell.row, col: targetCell.col },
    value: `\${${dragState.payload.fieldId}}`,
  });
  await designerBridge.dispatchDesigner({
    type: 'report-designer:dropFieldToTarget',
    field: dragState.payload,
  });
  ```
- **严重程度**: P1
- **现状**: 先改 spreadsheet 文档，再调用 designer 命令；若第二步返回 `{ ok:false }`，当前代码没有检测也没有回滚。
- **风险**: 用户会得到“单元格文本已写入，但设计器语义未接线”的持久化不一致。
- **建议**: 对 designer 结果做 `ok` 检查，并在失败时回滚第一步或改成单一原子命令。
- **为什么值得现在做**: 这是跨包交互的真实半提交缺陷。
- **误报排除**: 不是简单的异常吞掉；这里即便没有抛错，也会因结构化失败结果被忽略而留下半提交状态。
- **历史模式对应**: cross-owner half-commit。
- **参考文档**: `docs/architecture/report-designer/design.md`
- **复核状态**: 未复核

## 维度复核结论

- [维度06-01]：保留 (P1)。多处 mutation handler 确认忽略 `result.ok`。
- [维度06-02]：降级为 P2。复核只确认“重复副作用窗口”，未把更强的 stale-result 版本保留为最终结论。
- [维度06-03]：降级为 P2。问题真实，但并非所有路径都完全静默。
- [维度06-04]：保留 (P1)。先写 cell 后忽略 designer `ok:false` 的半提交由 live code 明确支撑。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                      | 一句话摘要                                     |
| ----- | -------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 06-01 | P1       | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-sheet-commands.ts:83-89` | spreadsheet 命令在 `ok:false` 时仍记录成功日志 |
| 06-04 | P1       | `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:151-170`            | report-spreadsheet 字段拖拽存在半提交          |
| 06-02 | P2       | `packages/flux-renderers-data/src/crud-renderer-ownership.ts:189-212`                     | CRUD 查询提交缺少并发保护                      |
| 06-03 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:34-57`        | spreadsheet 编辑保存对失败反馈不完整           |
