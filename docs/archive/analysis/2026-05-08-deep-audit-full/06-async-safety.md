# 06 Async Safety

- 深挖轮次: 1
- 深挖发现数: 4

## 第 1 轮初审

### [维度06-01] action retry 未接入父级 AbortSignal，取消后仍会继续重试

- **文件**: `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\action-dispatcher\action-execution.ts:257-264`, `C:\can\nop\nop-chaos-flux\packages\flux-action-core\src\operation-control.ts:164-187`
- **行号范围**: `action-execution.ts:257-264`; `operation-control.ts:164-187`
- **证据片段**:
  ```ts
  } = await withRetry(
    () => runSingleActionWithTimeout(ctx, action, actionCtx),
    {
      times: retry?.times ?? 0,
      delay: retry?.delay ?? 0,
      strategy: retry?.strategy ?? 'fixed',
      maxDelay: retry?.maxDelay,
    },
  ```
  ```ts
  function throwIfAborted() {
    if (options.signal?.aborted) {
      throw abortError();
    }
  }
  ```
- **严重程度**: P1
- **问题类别**: 取消安全 / 竞态
- **异步操作**: 带 `retry` 控制的 action dispatch；单次 attempt 通过 `runSingleActionWithTimeout(..., actionCtx.signal)` 能看到父级取消，但 retry 调度层没有收到同一个 signal。
- **竞态场景或吞掉路径**: 用户触发带 retry 的 action → 组件卸载、dynamic renderer 换 schema、form init cleanup 或上层 action timeout 触发 `AbortController.abort()` → 当前 attempt 可能被 `withTimeout` 取消，但 `withRetry` 的 `options.signal` 为空，`throwIfAborted()` 不生效，后续 retry delay 和下一次 attempt 仍会继续执行。
- **用户可见故障**: 页面或 surface 已关闭后后台请求仍继续；按钮/加载态可能等待完整 retry 延迟才结束；后续 attempt 可能写入过期 runtime/scope 或产生延迟通知。
- **建议**: 在 `runSingleActionWithRetry` 调用 `withRetry` 时传入 `signal: actionCtx.signal`；同时在 `waitWithAbort()` 开头补 `if (options.signal?.aborted) reject/throw abortError()`，覆盖 `onFailedAttempt` 同步 abort 后再进入 delay 的窗口。
- **为什么值得现在做**: 这是 action 层公共控制流，影响所有非 request-backed retry action；修复面小，但能把已存在的 AbortController 语义贯通到 retry 调度层。
- **误报排除**: 这不是计划 229 已收口的 create confirm guard、quick-edit same-tick guard 或 field-source signal handoff；当前 live residual 位于 `withRetry` 参数传递，计划 229 未覆盖该 retry abort 传播缺口。
- **历史模式对应**: 对应 `performance-design-requirements.md` P5 “abort in-flight tasks + ignore stale results” 的取消一致性要求，也延续 `docs/bugs/07-submit-concurrent-guard-fix.md` 中“异步副作用必须有方法级防护”的模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/bugs/07-submit-concurrent-guard-fix.md`; `docs/plans/229-async-lifecycle-and-error-integrity-plan.md`
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度06-05] spreadsheet 快捷键与右键菜单把 Promise 命令悬空触发，失败结果与 rejection 都会丢失

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-keyboard.ts:21-52`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid\spreadsheet-grid-context-menu.tsx:41-64`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid\use-context-menu-actions.ts:52-88`
- **行号范围**: `use-keyboard.ts:21-52`; `spreadsheet-grid-context-menu.tsx:41-64`; `use-context-menu-actions.ts:52-88`
- **证据片段**:
  ```ts
  if (ctrl && e.key === 'c') {
    e.preventDefault();
    handleCopy();
  } else if (ctrl && e.key === 'x') {
    e.preventDefault();
    handleCut();
  } else if (ctrl && e.key === 'v') {
    e.preventDefault();
    handlePaste();
  ```
  ```tsx
  <ContextMenuItem onClick={() => void actions.handleContextCopy()} disabled={!selectedRange}>
    {t('flux.spreadsheet.copy')}
  </ContextMenuItem>
  <ContextMenuItem onClick={() => void actions.handleContextCut()} disabled={!selectedRange}>
    {t('flux.spreadsheet.cut')}
  </ContextMenuItem>
  ```
  ```ts
  const handleContextCopy = useCallback(async () => {
    if (!selectedRange) {
      return;
    }
    await bridge.dispatch({ type: 'spreadsheet:copyCells', range: selectedRange });
  }, [bridge, selectedRange]);
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉 / `ok:false` 未检查 / same-tick guard 缺失
- **异步操作**: spreadsheet copy/cut/paste/clear/style/undo/redo 等快捷键与右键菜单命令，通过 `bridge.dispatch()` 写入 spreadsheet core。
- **竞态场景或吞掉路径**: 用户按 Ctrl+C/Ctrl+X/Ctrl+V 或点击右键菜单 → handler 返回 Promise，但键盘路径直接调用不 `await`/不 `.catch()`，菜单路径 `void actions.handle...()` 也无 `.catch()` → `bridge.dispatch()` reject 时形成悬空失败；即使 dispatch resolve 为 `{ ok:false }`，多数 handler 也不检查 `result.ok`。快速重复按键/点击时，没有同步 pending latch 阻止多个写命令同 tick 并发进入 core。
- **用户可见故障**: readonly、空剪贴板、非法选择、core 命令失败时，菜单关闭或快捷键被拦截，但用户没有错误反馈；快速重复触发时还可能发出多次互相覆盖的写命令。
- **建议**: 为 spreadsheet 命令入口统一封装 `settleCommandDispatch()`：捕获 rejection、检查 `result.ok`、写入 `addLog`/notify；键盘与菜单调用点使用 `void handler().catch(...)`；对写命令加同步 pending latch 或 per-command guard。
- **为什么值得现在做**: spreadsheet 是高频编辑面，快捷键与右键菜单是主操作入口；现有第 1 轮只覆盖 inline edit/drop/selection，未覆盖这些批量命令入口。
- **误报排除**: 不是纯装饰性 fire-and-forget；`SpreadsheetCommandResult` 明确定义 `ok/error`，且 core 多条命令会返回 `ok:false`，当前调用点确实丢弃了结构化失败。也不是第 1 轮 `[维度06-04]` 的 inline edit save 或 `[维度06-03]` 的 report field drop，本条覆盖 spreadsheet 快捷键/右键菜单命令入口。
- **历史模式对应**: 对应 `docs/bugs/07-submit-concurrent-guard-fix.md` 中“异步副作用必须在方法入口有并发防护，而不是只靠 UI 状态”的模式，也对应维度 06 对 `void promise` 必须有 `.catch()`、`ActionResult`/命令结果 `ok:false` 不可静默丢弃的历史要求。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/bugs/07-submit-concurrent-guard-fix.md`; `docs/plans/229-async-lifecycle-and-error-integrity-plan.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度06-06] report toolbar 的 save/preview/switch 命令直接 `void dispatch`，保存失败与重复点击无反馈

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-designer-toolbar.tsx:41-45`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-designer-toolbar.tsx:93-113`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-designer-toolbar-defaults.ts:23-40`
- **行号范围**: `report-designer-toolbar.tsx:41-45,93-113`; `report-designer-toolbar-defaults.ts:23-40`
- **证据片段**:
  ```ts
  function handleButtonClick(item: ToolbarItem) {
    const command = toCommand(item.action);
    if (!command) return;
    void props.helpers.dispatch(command);
  }
  ```
  ```tsx
  <Button
    key={item.id ?? `button-${index}`}
    type="button"
    disabled={disabled}
    data-active={active || undefined}
    onClick={() => handleButtonClick(item)}
  >
  ```
  ```ts
  {
    id: 'preview',
    type: 'button',
    label: 'Preview',
    action: 'report-designer:preview',
    variant: 'primary',
  },
  { id: 'save', type: 'button', label: 'Save', action: 'report-designer:save' },
  ```
- **严重程度**: P2
- **问题类别**: `void promise` 无 catch / `ok:false` 未检查 / same-tick guard 缺失
- **异步操作**: report designer toolbar 的 save、preview、stopPreview、undo/redo 以及 switch 类 action 通过 `props.helpers.dispatch()` 派发。
- **竞态场景或吞掉路径**: 用户点击 Save 或 Preview → `handleButtonClick` 直接 `void props.helpers.dispatch(command)` → action reject 时没有 `.catch()`；action resolve 为 `{ ok:false }` 时也没有检查；按钮没有同步 pending guard，快速双击 Save/Preview 可并发派发两次。
- **用户可见故障**: 保存失败时 toolbar 无 warning/toast/状态回退，用户可能误以为已保存；preview 或 stopPreview 失败时按钮状态可能与 report runtime 不一致。
- **建议**: 将 `handleButtonClick` 改为 async guarded 命令入口：同步设置 pending command ref，`await dispatch` 后检查 `result.ok`，失败走 `env.notify` 或 report status；调用点使用 `.catch()` 兜底；Save/Preview 等写命令在 pending 期间禁用。
- **为什么值得现在做**: 第 1 轮已发现 report field insert/drop 命令链路丢失败；toolbar save 是更核心的持久化入口，同类盲区会直接影响用户数据可信度。
- **误报排除**: 这不是已报告的 `field-panel-renderer` 键盘插入，也不是 `report-spreadsheet-canvas` 字段 drop；当前残留位于 report toolbar 通用命令入口，默认配置明确包含 `report-designer:save`。也不是合理的同步 UI toggle：`props.helpers.dispatch()` 返回 Promise，且 action 结果存在 `ok:false` 语义。
- **历史模式对应**: 对应 `docs/bugs/07-submit-concurrent-guard-fix.md` 中“保存/提交类 mutating async 方法需要方法级 guard”的模式，也对应维度 06 对 fire-and-forget Promise 必须接住 rejection、用户命令链路失败必须可见的要求。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/bugs/07-submit-concurrent-guard-fix.md`; `docs/plans/229-async-lifecycle-and-error-integrity-plan.md`; `docs/skills/deep-audit-prompts.md`
- **复核状态**: 未复核

### [维度06-02] report field panel 的键盘插入 fire-and-forget 丢弃失败和并发状态

- **文件**: `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\field-panel-renderer.tsx:62-96`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\field-panel-renderer.tsx:140-150`
- **行号范围**: `field-panel-renderer.tsx:62-96,140-150`
- **证据片段**:

  ```tsx
  async function handleKeyboardInsert(
    source: FieldSourceSnapshot,
    field: FieldSourceSnapshot['groups'][number]['fields'][number],
  ) {
    if (!canInsertToSelection(selectionTarget)) {
      return;
    }

    const resolved = actionScope?.resolve('report-designer:dropFieldToTarget');
  ```

  ```tsx
  <Button
    type="button"
    size="xs"
    variant="ghost"
    disabled={!canInsertToSelection(selectionTarget)}
    aria-label={t('flux.reportDesigner.insertFieldToSelection', {
      field: field.label,
    })}
    onClick={() => {
      void handleKeyboardInsert(source, field);
  ```

- **严重程度**: P2
- **问题类别**: 异常吞掉 / same-tick 并发保护缺失
- **异步操作**: 点击字段旁的插入按钮后调用 `report-designer:dropFieldToTarget` action provider。
- **竞态场景或吞掉路径**: 用户快速双击插入按钮 → 两个 `handleKeyboardInsert` 同 tick 启动，按钮没有 pending latch/disabled 状态 → provider 返回 `ok:false` 或 reject 时，调用点使用 `void handleKeyboardInsert(...)`，没有 `.catch()`，也没有检查 `ActionResult.ok`。
- **用户可见故障**: 同一字段可能被插入两次；失败时界面没有 warning/toast，用户只看到字段没有插入或插入状态不一致。
- **建议**: 为每个字段插入路径增加同步 pending guard；`await resolved.provider.invoke(...)` 后检查 `result.ok`，失败时通过 `env.notify` 或结构化状态反馈；onClick 层至少追加 `.catch()` 兜底。
- **为什么值得现在做**: 这是 report designer 的显式用户操作入口，失败静默会直接造成编辑器状态与用户预期不一致；修复局部且可加 focused test 覆盖双击与 `ok:false`。
- **误报排除**: 这不是计划 229 的 report field-source refresh `AbortSignal` handoff；该问题发生在 field panel 用户插入 action，不是字段源加载刷新。
- **历史模式对应**: 对应 `docs/bugs/07-submit-concurrent-guard-fix.md` 中“双击触发重复副作用”的 same-tick guard 模式，以及维度 06 对 `void promise` 必须有失败处理的要求。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/bugs/07-submit-concurrent-guard-fix.md`; `docs/plans/229-async-lifecycle-and-error-integrity-plan.md`
- **复核状态**: 未复核

### [维度06-03] report spreadsheet 字段拖放把 async 回调传给 void 契约，drop 失败会静默丢失

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-field-drop.ts:7-15`, `C:\can\nop\nop-chaos-flux\packages\report-designer-renderers\src\report-spreadsheet-canvas.tsx:147-165`
- **行号范围**: `use-field-drop.ts:7-15`; `report-spreadsheet-canvas.tsx:147-165`
- **证据片段**:
  ```ts
  const handleFieldDrop = useCallback(
    (cb: (target: { row: number; col: number }) => void) => {
      const targetCell = dropTargetCellRef.current || dropTargetCell || selectedCell;
      if (targetCell) {
        cb(targetCell);
      }
      setDropTargetCell(null);
      dropTargetCellRef.current = null;
    },
  ```
  ```tsx
  const handleFieldDropOnCell = useCallback(() => {
    handleFieldDrop(async (targetCell) => {
      const dragState = core.getSnapshot().fieldDrag;
      if (!dragState.active || !dragState.payload) return;
      const addr = cellAddress(targetCell.row, targetCell.col);
      await spreadsheetBridge.dispatch({
        type: 'spreadsheet:setCellValue',
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉 / 设计器异步竞态
- **异步操作**: 报表设计器中把字段拖到 spreadsheet cell，依次执行 spreadsheet 写值与 report-designer drop metadata dispatch。
- **竞态场景或吞掉路径**: `useFieldDrop` 的回调类型是 `void`，直接调用 `cb(targetCell)`；调用方传入 `async` 回调后，返回的 Promise 被丢弃。若 `spreadsheetBridge.dispatch` 或 `designerBridge.dispatchDesigner` reject，或返回失败结果未检查，drop 流程没有 catch/notify。
- **用户可见故障**: 用户拖放字段后可能只写入单元格模板值，但 report metadata 没有同步；或者整次 drop 失败但 drop target 被清空，没有错误提示。
- **建议**: 将 `handleFieldDrop` 契约改成支持 `Promise<void>` 并在内部 `void Promise.resolve(cb(...)).catch(...)` 处理；调用方检查两个 dispatch 的 `ok`，任一失败时通知用户并考虑回滚已写入的 spreadsheet cell。
- **为什么值得现在做**: 字段拖放是 report designer 的核心交互，一旦半成功会造成 spreadsheet 与 report metadata 分裂；当前证据显示 async Promise 在通用 hook 边界被类型擦掉，后续复用也容易复制该问题。
- **误报排除**: 这不是 plan 229 已关闭的 field-source signal handoff；field-source refresh 已有 signal，这里是 drag/drop 用户命令链路的 async Promise 丢弃。
- **历史模式对应**: 对应维度 06 “fire-and-forget Promise 必须有 `.catch()`”与 report designer 异步操作取消/失败可见性的历史模式。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/bugs/07-submit-concurrent-guard-fix.md`; `docs/plans/229-async-lifecycle-and-error-integrity-plan.md`
- **复核状态**: 未复核

### [维度06-04] spreadsheet 单元格编辑保存清空编辑态后才 await，失败结果无反馈且 Enter/blur 可并发触发

- **文件**: `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-interactions\use-editing.ts:31-43`, `C:\can\nop\nop-chaos-flux\packages\spreadsheet-renderers\src\spreadsheet-grid.tsx:321-324`
- **行号范围**: `use-editing.ts:31-43`; `spreadsheet-grid.tsx:321-324`
- **证据片段**:
  ```ts
  const handleEditSave = useCallback(async () => {
    const currentEditCell = editingCellRef.current;
    if (!currentEditCell) return;
    const currentEditValue = editValueRef.current;
    const addr = cellAddress(currentEditCell.row, currentEditCell.col);
    editingCellRef.current = null;
    editValueRef.current = '';
    setEditingCell(null);
    await bridge.dispatch({
  ```
  ```tsx
  onBlur={onEditSave}
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      onEditSave();
  ```
- **严重程度**: P2
- **问题类别**: 异常吞掉 / same-tick guard 缺失
- **异步操作**: spreadsheet cell inline edit save，`bridge.dispatch({ type: 'spreadsheet:setCellValue' })`。
- **竞态场景或吞掉路径**: 用户按 Enter 时触发 `onEditSave()`，输入框随后 blur 也可能触发 `onBlur={onEditSave}`；函数先清空 `editingCellRef`、`editValueRef` 并关闭编辑态，再 await dispatch。若 dispatch reject 或返回 `ok:false`，当前函数没有 catch，也没有检查返回结果。
- **用户可见故障**: 保存失败时编辑框已关闭且草稿值被清空，用户可能以为保存成功；Enter/blur 双触发下其中一次可能被 ref 清空吞掉，失败信息也不会显示。
- **建议**: 增加 `savingEditRef` same-tick latch；先 await dispatch 并检查 `result.ok`，成功后再清空编辑态，失败时保留编辑态并通过 log/notify 暴露错误；传给 DOM handler 时用 `void handleEditSave().catch(...)` 兜底。
- **为什么值得现在做**: spreadsheet 编辑是高频输入路径，失败后丢草稿属于直接用户数据风险；修复可以复用已有 `use-selection.ts` 中记录 edit-save failure 的模式。
- **误报排除**: 这不是 plan 229 已收口的 table quick-edit same-tick guard；当前 residual 在 spreadsheet inline editor，文件和 owner 均不同。
- **历史模式对应**: 对应 `docs/bugs/07-submit-concurrent-guard-fix.md` 中“方法入口必须防并发，而非只靠 UI 状态”的模式，也对应维度 06 对 Promise rejection/失败结果不可静默丢弃的要求。
- **参考文档**: `docs/architecture/performance-design-requirements.md`; `docs/bugs/07-submit-concurrent-guard-fix.md`; `docs/plans/229-async-lifecycle-and-error-integrity-plan.md`
- **复核状态**: 未复核

## 深挖第 3 轮追加

未发现新的问题。深挖结束。

## 维度复核结论

- [维度06-01] 保留：live code 中 `runSingleActionWithRetry()` 调用 `withRetry()` 仍未传入 `actionCtx.signal`，`withRetry()` 的 abort 检查因此不会生效；retry delay/后续 attempt 可在父级取消后继续。P1 成立。
- [维度06-05] 保留：spreadsheet 快捷键直接调用 Promise handler，右键菜单使用 `void actions.handle...()` 且无 `.catch()`；各 handler `await bridge.dispatch()` 后未检查 `SpreadsheetCommandResult.ok`，失败反馈与并发入口保护缺失仍成立。P2 成立。
- [维度06-06] 降级：toolbar 确实 `void props.helpers.dispatch(command)` 且不检查 `ActionResult.ok`，但当前默认 `save` 只是导出文档而非远程持久化，且 action dispatcher 通常会把失败包装成 `ok:false` 而非直接 rejection；“保存失败导致数据可信度风险”表述偏重。建议降为 P3/P2 边界观察项。
- [维度06-02] 保留：field panel 的 `onClick` 仍 `void handleKeyboardInsert(...)`，内部 `await resolved.provider.invoke(...)` 后不检查 `ActionResult.ok`，也没有 pending guard；provider 若 reject 也无兜底。P2 成立。
- [维度06-03] 保留：`useFieldDrop()` 的回调契约仍是 `(target) => void`，调用方传入 async callback 后 Promise 被丢弃；两个 dispatch 的 `ok:false` 均未检查，drop target 先清空，半成功/静默失败风险成立。P2 成立。
- [维度06-04] 保留：`handleEditSave()` 仍在 dispatch 前清空编辑态和草稿，且不检查 `SpreadsheetCommandResult.ok`；DOM handler 调用 Promise 无 `.catch()`。但 Enter 后 blur 的第二次触发因 ref 已清空大概率 no-op，重复写入并发部分应收窄。P2 成立。

需子项复核：[维度06-01]；[维度06-06]。

## 子项复核结论

- [维度06-01] 保留：`runSingleActionWithRetry()` 调用 `withRetry()` 仍未传入 `actionCtx.signal`，父级取消无法停止 retry delay/后续 attempt。
- [维度06-06] 降级：toolbar 确实 `void dispatch` 且不检查 `ActionResult.ok`，但默认 save 只是本地导出、preview core 已有请求 owner guard，原“保存失败数据可信度”风险表述偏重。

最终进入汇总：06-01；06-06 降级为 P3/P2 边界观察项，不作为 P2 主修复项。
