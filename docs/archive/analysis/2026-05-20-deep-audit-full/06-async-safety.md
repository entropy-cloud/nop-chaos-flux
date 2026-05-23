# 维度 06: 异步模式与取消安全

## 第 1 轮（初审）

### [维度06-01] Spreadsheet 工具栏单元格编辑把异步保存当同步状态写入，失败结果没有回滚或反馈

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-cell-value-sync.ts:12-30`
- **行号范围**: `use-cell-value-sync.ts:12-30`
- **证据片段**:

  ```ts
  return useCallback(
    (value: string) => {
      if (!input.selectedCell || input.readOnly) {
        return;
      }

      input.setCellValue(value);
      input.bridge.dispatch({
        type: 'spreadsheet:setCellValue',
        cell: {
          sheetId: input.sheetId,
          address: cellAddress(input.selectedCell.row, input.selectedCell.col),
  ```

- **严重程度**: P1
- **问题类别**: 异常吞掉 / 竞态 / 状态卡死风险
- **异步操作**: 工具栏 cell value 输入框 `onCellValueChange` 触发 `spreadsheet:setCellValue`，本地 draft 先更新，再 fire-and-forget 调用 `bridge.dispatch(...)`。
- **竞态场景或吞掉路径**: 用户在工具栏输入值 -> `setCellValue(value)` 立即更新 UI draft -> `bridge.dispatch` 返回 `{ ok:false }` 或 reject 时没有 await、没有 `.catch()`、没有检查 `ok/cancelled` -> 本地 draft 继续显示新值，但 core/store 没有成功保存或宿主异步失败被完全丢弃。
- **用户可见故障**: 用户看到工具栏输入框已经变成新值，以为单元格已保存；切换选择、刷新 snapshot、撤销/重做或宿主拒绝命令后，单元格值可能回到旧值且没有错误提示。
- **现状**: 同一 spreadsheet 编辑路径里的 cell editor `handleEditSave` 已显式处理 `cancelled` / `!ok` 并保留编辑框和错误状态；但 toolbar cell value 直写路径没有任何结构化失败路径。
- **风险**: 该路径是公开 spreadsheet page 默认工具栏的主交互路径之一；异步失败被吞会造成表格数据静默丢失、用户误以为保存成功，并让后续调试只看到状态不一致而看不到原始失败。
- **建议**: 将 `useCellValueSync` 改为受控的 async command pipeline：至少 `void input.bridge.dispatch(...).then(result => report ok/cancelled/failure).catch(report)`；更好的做法是复用 `useEditing` 的保存状态或统一 spreadsheet command failure reporter，对失败回滚 draft 或显示明确错误。
- **为什么值得现在做**: 当前审计基线不接受主路径过渡态；该问题位于默认 spreadsheet 工具栏，且自动化 suspect 没覆盖这一处裸 promise 调用（没有 `void` / `.then` 特征），属于 live code 复核后仍会导致用户可见数据错觉的漏洞。
- **误报排除**: 不是单纯“Promise 未 await”的风格问题；`SpreadsheetBridge.dispatch` 的契约返回 `Promise<SpreadsheetCommandResult>`，同包已有失败保持编辑框的测试覆盖 `handleEditSave`，说明命令失败是被支持和预期展示的业务路径。
- **历史模式对应**: 命中 `docs/skills/deep-audit-prompts.md` 维度 06 中“Promise 链无失败路径曾导致表单值静默丢失”的历史模式；也对应 `docs/architecture/performance-design-requirements.md` P6 “runtime-critical path 不允许吞掉可导致隐藏降级的错误”。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P5/P6；`docs/skills/deep-audit-prompts.md` 维度 06；`docs/references/audit-tooling.md` 的 async suspect 解释。
- **复核状态**: 未复核

### [维度06-02] Report spreadsheet 选择同步用 fire-and-forget setSelectionTarget，异步失败会让 inspector 长期处于 loading 且无诊断

- **文件**: `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:92-146`
- **行号范围**: `report-spreadsheet-canvas.tsx:92-146`
- **证据片段**:
  ```ts
  if (selection.kind === 'column' && selection.columns?.length) {
    prevSelectedCell.current = null;
    hasMirroredSpreadsheetSelection.current = true;
    void core.setSelectionTarget({ kind: 'column', sheetId, col: selection.columns[0]! });
    return;
  }
  if (selection.kind === 'row' && selection.rows?.length) {
    prevSelectedCell.current = null;
    hasMirroredSpreadsheetSelection.current = true;
    void core.setSelectionTarget({ kind: 'row', sheetId, row: selection.rows[0]! });
  ```
- **严重程度**: P1
- **问题类别**: 异常吞掉 / 取消安全 / 状态卡死
- **异步操作**: React effect 把 spreadsheet selection mirror 到 report designer core：`core.setSelectionTarget(...)` 内部先把 inspector 置为 `loading: true`，再 `await refreshDerivedState()`。
- **竞态场景或吞掉路径**: 用户快速选择单元格/行/列 -> effect 发起 `setSelectionTarget` -> report designer adapter / field source / inspector schema 刷新失败并 reject -> caller 使用 `void` 且没有 `.catch()` / `reportRuntimeHostIssue` / `env.notify` -> promise rejection 丢到全局，当前 canvas 层无结构化失败路径。
- **用户可见故障**: 属性面板可能持续显示 loading 或停留在错误/旧 schema，用户不知道选择同步失败；后续 selection mirror ref 已经更新，重复点击同一目标也可能被 `prevSelectedCell` guard 跳过，难以恢复。
- **现状**: `report-designer-core` 的 `setSelectionTarget` 在调用时会把 inspector loading 设为 true；虽然 `refreshDerivedState` 内部捕获部分错误并写入 inspector.error，但 `setSelectionTarget` 本身仍是 async owner 边界，renderer 端完全忽略其完成/失败/取消结果。
- **风险**: 该路径是 Report Designer canvas 与 inspector owner 的主同步链路；失败不可见会导致 owner 漂移（spreadsheet selection 已变，designer inspector 未正确完成），并影响后续字段插入/metadata 编辑。
- **建议**: 将 selection mirror 提取为带 requestId/AbortController 的 effect helper：每次 selection 变化 supersede 旧请求；await `core.setSelectionTarget` 后检查 stale；catch 中调用 `reportRuntimeHostIssue` 并通知或写入可见 inspector error，同时不要在失败前提交去重 ref，或失败时允许重试。
- **为什么值得现在做**: 当前 suspect 清单只列出 `catch-without-structured-failure-path` 和部分 `void` 位置；这里 live code 的 fire-and-forget 位于设计器主交互路径，且 `setSelectionTarget` 明确触发异步派生状态刷新，具备用户可见卡死风险。
- **误报排除**: 不是无害的 selection best-effort mirror；`setSelectionTarget` 会改变 designer core 的 inspector loading/error/schema 状态，且 report canvas 其他异步路径（field drop）已经使用 `.catch(reportRuntimeHostIssue + notify)`，说明该层应有结构化失败路径。
- **历史模式对应**: 对应维度 06 “设计器 async 操作需有取消机制、竞态防护、异常不可静默吞掉”；也对应 `performance-design-requirements.md` P5 对 async effect stale/abort 的要求。
- **参考文档**: `docs/architecture/performance-design-requirements.md` P5/P6；`docs/skills/deep-audit-prompts.md` 维度 06；`docs/architecture/report-designer/design.md`（设计器主路径 owner 背景，未作为豁免）。
- **复核状态**: 未复核

### [维度06-03] Spreadsheet 默认页鼠标离开编辑态时 fire-and-forget 保存，失败只进入内部状态但默认页没有渲染该状态

- **文件**: `packages/spreadsheet-renderers/src/default-page-body.tsx:121-127`
- **行号范围**: `default-page-body.tsx:121-127`
- **证据片段**:
  ```ts
  onMouseDown={(event) => {
    const target = event.target as HTMLElement | null;
    const isEditingInput = target?.closest('input.ss-cell-edit-input');
    if (editingCellRef.current && !isEditingInput) {
      void handleEditSave();
    }
  }}
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉 / 用户反馈丢失
- **异步操作**: 默认 spreadsheet 页面在用户点击编辑框外时自动保存当前 cell editor，调用 `handleEditSave()` 但不接收 promise 结果或 catch reject。
- **竞态场景或吞掉路径**: 用户编辑单元格 -> 点击工具栏、sheet tab 或 canvas 其它区域 -> `onMouseDown` fire-and-forget 保存 -> 如果 `bridge.dispatch` reject（例如宿主异步命令抛出、插件 provider 抛出）则没有 local catch；如果返回 `{ ok:false }`，`useEditing` 设置 `editSaveState`，但 `DefaultSpreadsheetPageBody` 没有把 `editSaveState` 传给 `SpreadsheetGrid`。
- **用户可见故障**: 保存失败时用户可能既看不到单元格编辑错误，也看不到通知；draft 仍可能停留或被下一次交互覆盖，表现为“点击别处后值没保存/偶发消失”。
- **现状**: `useSpreadsheetInteractions` 已为 `onCanvasMouseDown` 封装了 `.catch(addLog)`，`SpreadsheetGridHarness`/grid path 也能展示 `editSaveState`；但默认页自己直接调用 `handleEditSave`，且 `SpreadsheetGrid` props 未包含 `editSaveState`。
- **风险**: 默认 spreadsheet page 是公开 renderer 主路径；此处失败反馈丢失会降低数据编辑可信度，尤其当 bridge 被 host action provider、远程保存或只读策略扩展时，失败不再只是理论路径。
- **建议**: 默认页应复用 `interactions.onCanvasMouseDown` 或在本地 `void handleEditSave().catch(...)` 进入统一 command failure reporter；同时将 `editSaveState` 传给 `SpreadsheetGrid`，确保 `{ ok:false }` 和 reject 两类失败都有用户可见反馈。
- **为什么值得现在做**: 该问题来自 high `void-promise-no-catch` suspect 的真实语义复核；不是所有 toolbar void 调用都值得报告，但这个位置直接处理用户编辑保存，且已有同包测试证明失败状态应可见。
- **误报排除**: `handleEditSave` 内部确实处理了 `{ ok:false }`，所以不是完整失败路径缺失；但默认页没有渲染 `editSaveState`，且 reject 仍无 catch，因此仍会造成用户可见反馈丢失。
- **历史模式对应**: 对应 `docs/bugs/07-submit-concurrent-guard-fix.md` 中“异步 mutating 方法不能只依赖 UI flag/表象”的教训；也对应维度 06 “fire-and-forget/no catch 需语义判断后报告用户可见失败”。
- **参考文档**: `docs/bugs/07-submit-concurrent-guard-fix.md`; `docs/architecture/performance-design-requirements.md` P6；`docs/skills/deep-audit-prompts.md` 维度 06。
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度06-01]: 保留 (P1)。`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-cell-value-sync.ts:18-28` 仍先 `setCellValue(value)` 再直接 `bridge.dispatch(...)`，没有 await/catch，也没有处理 `SpreadsheetCommandResult`；live code 仍会把 toolbar 输入的本地显示与实际保存结果分裂。
- [维度06-02]: 驳回。`packages/report-designer-core/src/core.ts:262-277` 的 `setSelectionTarget()` 本身不会把失败向外 reject；它在内部将 `inspector.loading` 置为 `true` 后调用 `refreshDerivedState()`，而后者会捕获错误并回写 `inspector.error/loading=false`。因此 `report-spreadsheet-canvas.tsx:92-146` 的 `void core.setSelectionTarget(...)` 虽然是 fire-and-forget，但当前证据不足以成立“长期 loading 且无诊断”的主路径故障。
- [维度06-03]: 保留 (P2)。`packages/spreadsheet-renderers/src/default-page-body.tsx:121-127,179-214` 仍在失焦和 grid save 路径上 `void handleEditSave()`，而 `useEditing.ts:46-85` 的 reject 没有本地 catch；同时 `DefaultSpreadsheetPageBody` 没把 `editSaveState` 传给 `SpreadsheetGrid`，导致 `inline-controls.tsx:40-60` 已存在的错误展示能力在默认页主路径中未接线。

## 子项复核结论

- [维度06-01]: 成立 (P1)。toolbar 输入本地显示与实际保存结果分裂问题保留。
- [维度06-03]: 成立 (P2)。默认页 save 失败反馈未接线问题保留。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                       | 一句话摘要                                                       |
| ----- | -------- | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 06-01 | P1       | `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-cell-value-sync.ts:18-28` | toolbar cell value sync fire-and-forget，未等待/处理真实保存结果 |
| 06-03 | P2       | `packages/spreadsheet-renderers/src/default-page-body.tsx:121-127,179-214`                 | 默认 spreadsheet 页 save 失败反馈能力未接线到主路径              |
