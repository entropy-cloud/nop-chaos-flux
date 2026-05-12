# 维度 06：异步模式与取消安全

## 范围与状态

- 审核维度：异步模式与取消安全。
- 来源范围：仅汇总 `stage-1-full-findings-06-10.md`、`raw-findings-03-06.md`、`final-review-results-06-10.md` 与 `summary.md` 中本维度记录。
- 覆盖对象：schema preparation/import preload、report/flow/CRUD/spreadsheet/word/code editor 等异步操作路径。
- 最终状态：17 项全部保留；P2 7 项，P3 10 项。

## 深挖轮次与收敛说明

第 1 轮初审记录 4 项。第 2-5 轮追加 raw findings 继续补充 13 项。本次审核在第 5 轮达到执行上限时仍有新增，因此按“达到执行上限后进入最终复核”处理，不声称自然收敛。

## 最终复核摘要

最终复核确认本维度问题集中在三类：取消信号未传递或 await 后未复查、fire-and-forget Promise 缺 catch 或用户反馈、异步成功前过早清理本地草稿/状态。复核对 [06-05] 从 P2 降级为 P3，因为 source rejection 已由 `allSettled` 处理，剩余风险限于 `.then` 处理或 listener notification 意外失败。

## 最终保留项

### [06-01] Schema import preload 未把 `AbortSignal` 传到底层 prepare/import loader

- 文件：`packages/flux-react/src/schema-renderer.tsx:299-352`
- 证据片段：

```ts
const { signal } = controller;

void prepare(props.schema, {
  schemaUrl: props.schemaUrl,
})
  .then((result) => {
    if (signal.aborted || prepareRequestIdRef.current !== requestId) {
      return;
    }
    setPreparedImports(result.preparedImports);
```

- 严重程度：P2
- 当前行为：local `AbortController` 创建后只在 `prepare()` resolve/reject 后检查；signal 未传入 `runtime.prepareSchema`。
- 风险：schema replacement 或 unmount 后，import preload 与底层 `importLoader` 仍可能继续执行，浪费网络/CPU，并与新 schema prepare 竞争。
- 建议：扩展 `prepareSchema`/compiler import preload API 接收 `AbortSignal`，并向 import resolution/loading 传递。
- 误报排除：stale guard 能防止 React setState，但不能取消底层 async import work。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 `AbortSignal` 只在 `prepare()` settle 后检查，未传入 `prepareSchema/importLoader.load`。

### [06-02] Report Designer field source refresh 缺少局部 stale guard

- 文件：`packages/report-designer-renderers/src/page-renderer.tsx:272-279`
- 证据片段：

```ts
useEffect(() => {
  void core.refreshFieldSources().catch((error) => {
    env.notify?.(
      'warning',
      error instanceof Error && error.message
        ? error.message
        : t('flux.reportDesigner.loadPanelsFailed'),
    );
  });
}, [core, env]);
```

- 严重程度：P3
- 当前行为：effect 启动 `core.refreshFieldSources()` 并在失败时 notify，但没有 request id、mounted flag 或 abort/stale guard。
- 风险：旧 core 的失败可能在 renderer 切到新 core/config 后仍弹出 warning。
- 建议：在 effect cleanup 中设置 stale flag/request id，notify 前检查。
- 误报排除：core disposal 可能减少 state mutation，但当前 React effect 的 warning publication 未受保护。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 field-source refresh failure 可发布 stale warning。

### [06-03] Flow Designer auto-layout cleanup 未使 pending request id 失效

- 文件：`packages/flow-designer-renderers/src/use-designer-auto-layout.ts:123-135`
- 证据片段：

```ts
.finally(() => {
  if (layoutRequestRef.current === requestId) {
    setLayoutBusy(false);
  }
});
}, [config.documentMode, core]);

useEffect(() => {
  const elkOwner = elkOwnerRef.current;

  return () => {
    elkOwner.invalidate();
  };
```

- 严重程度：P2
- 当前行为：async layout completion 用 `layoutRequestRef` 判断是否 setState；unmount cleanup 只 invalidate ELK owner，未 bump/invalidate `layoutRequestRef`。
- 风险：pending layout promise 在 unmount 后仍可能通过 request-id check 并尝试 React state update。
- 建议：cleanup 中递增/失效 `layoutRequestRef.current`，或添加 mounted guard。
- 误报排除：`elkOwner.invalidate()` 不会让 React request id stale。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 unmount 后 promise 仍可 setState。

### [06-04] Flow Designer create dialog failure 缺用户可见反馈

- 文件：`packages/flow-designer-renderers/src/designer-page-body.tsx:185-199`, `packages/flow-designer-renderers/src/designer-page-body.tsx:431-437`
- 证据片段：

```tsx
onClick={() => {
  handleConfirmCreateDialog().catch((error) => {
    console.warn('[flow-designer] create dialog confirm failed', error);
  });
}}
disabled={creatingNode}
```

- 严重程度：P2
- 当前行为：create operation rejected 时仅 `console.warn`；non-ok result 也没有明确用户反馈。
- 风险：用户无法知道节点创建失败原因；host/runtime failure 只进开发者控制台。
- 建议：通过 `reportHostIssue`、`env.notify` 或 dialog-local error state 报告失败。
- 误报排除：Promise 已 catch，因此不是 unhandled rejection；问题是用户反馈与可观测性。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 create-dialog failures 仅 console.warn 或静默忽略。

### [06-05] SourceObserver 的 `allSettled().then(...)` 链尾无 `.catch()`

- 文件：`packages/flux-runtime/src/async-data/source-observer.ts:74-83`
- 证据片段：

```ts
void Promise.allSettled(
  input.entries.map(async (entry) => {
    const result = await runtime.executeSource({
      source: entry.source,
      scope: input.scope,
      ctx: { signal: controller.signal },
    });
    return [entry, result] as const;
  }),
).then((settled) => {
```

- 严重程度：P3
- 当前行为：`Promise.allSettled(...)` resolve 后 `.then` 回调内仍可能抛错，但链路是 `void ... .then(...)` 且无 `.catch()`。
- 风险：source UI 可能停留在 loading 或旧值状态；宿主只能看到 unhandled rejection，无法通过 runtime monitor 定位。
- 建议：链尾追加 `.catch(...)`，对非 abort 错误上报并写入 transient error state；或改成内部 async 函数统一 try/catch。
- 误报排除：问题发生在 `allSettled` resolve 后的 `.then` 同步处理阶段，不是“allSettled 已处理 rejection”的误报。
- 最终复核结论：降级保留 P3。
- 修订标题/理由：source rejection 已由 `allSettled` 处理，剩余风险是 then processing/listener notification 意外失败。

### [06-06] WordEditor save provider 未在 host onSave 返回后检查 AbortSignal

- 文件：`packages/word-editor-renderers/src/word-editor-action-provider.ts:51-59`
- 证据片段：

```ts
if (input.saveEvent) {
  const result = await input.saveEvent(undefined, ctx);
  if (!result.ok) {
    return result;
  }
}
input.editorStore.setDirty(false);
input.onDocumentSaved?.(saved);
return ok({ saved: true });
```

- 严重程度：P2
- 当前行为：`onSave` 执行期间若组件卸载或下一次保存触发 abort，`saveEvent` 正常返回 ok 后 provider 不检查 `ctx.signal.aborted`，继续清 dirty 并发布 saved document。
- 风险：已取消或已卸载的保存仍可能把旧 document 标记为已保存，dirty 状态被清除。
- 建议：在 `await input.saveEvent(...)` 后、写入 store 前检查 `ctx.signal.aborted`，返回 cancelled result。
- 误报排除：UI 层 mounted guard 无法阻止 provider 内部已发生的 `editorStore.setDirty(false)` 和 `onDocumentSaved(saved)`。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 await host save hook 后不检查 abort，可能清 dirty/发布 stale saved。

### [06-07] CRUD 查询按钮丢弃异步提交 Promise，失败无反馈

- 文件：`packages/flux-renderers-data/src/crud-renderer.tsx:409`, `packages/flux-renderers-data/src/crud-renderer-ownership.ts:189-204`
- 证据片段：

```tsx
<Button onClick={() => void handleQuerySubmit()}>{queryLabel}</Button>
```

```ts
const valid = await queryForm.validate();
const values = await queryForm.getValues();
```

- 严重程度：P3
- 当前行为：`handleQuerySubmit` 内部 await query form validate/getValues capability，但调用处 `void handleQuerySubmit()` 没有 catch。
- 风险：表单校验运行时异常或 capability reject 时，用户点击搜索后无 UI 反馈，并可能产生 unhandled rejection。
- 建议：调用处 `.catch()` 并通过 `env.notify` 或表单错误状态反馈。
- 误报排除：不重复 create dialog feedback；这是 CRUD query form capability 路径。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 capability reject 无反馈。

### [06-08] Spreadsheet 单元格编辑保存先清草稿，再 await dispatch

- 文件：`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts:31-43`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:321-324`
- 证据片段：

```ts
const currentEditCell = editingCellRef.current;
const currentEditValue = editValueRef.current;
editingCellRef.current = null;
editValueRef.current = '';
setEditingCell(null);
await bridge.dispatch({
  type: 'spreadsheet:setCellValue',
```

- 严重程度：P2
- 当前行为：`handleEditSave` 先清空 editing refs 和退出编辑态，然后才 await `bridge.dispatch(setCellValue)`。`SpreadsheetGrid` 的 blur/Enter 直接调用 `onEditSave`，签名是 `() => void`，无错误反馈路径。
- 风险：保存失败/取消时编辑态和草稿已被清掉，用户会误以为保存成功。
- 建议：dispatch 成功后再退出编辑，失败保留草稿并显示错误；或保留 last draft 供恢复。
- 误报排除：不重复 spreadsheet dispatch ok:false 观察性；这里是编辑草稿生命周期和保存失败顺序。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调 async dispatch 成功前清 draft/退出编辑。

### [06-09] Spreadsheet 全局快捷键调用 async handlers 没有 await/catch

- 文件：`packages/spreadsheet-renderers/src/spreadsheet-interactions/use-keyboard.ts:21-52`
- 证据片段：

```ts
if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
  event.preventDefault();
  handleCopy();
}
if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
  event.preventDefault();
  handlePaste();
}
```

- 严重程度：P3
- 当前行为：快捷键调用 `handleCopy/handleCut/handlePaste/handleUndo/handleRedo/handleStyleTool/handleClear` 时没有 await/catch，这些 handler 是 async 且会调用 `bridge.dispatch`。
- 风险：dispatch reject 时快捷键操作无日志/Toast/状态反馈，并可能产生 unhandled rejection。
- 建议：包装为 `void handler().catch(reportSpreadsheetCommandError)`。
- 误报排除：鼠标路径的部分日志不能覆盖键盘路径。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 async commands 无 catch。

### [06-10] Report Field Panel 键盘插入异步失败未捕获、无反馈

- 文件：`packages/report-designer-renderers/src/field-panel-renderer.tsx:62-97`, `packages/report-designer-renderers/src/field-panel-renderer.tsx:148-150`
- 证据片段：

```tsx
async function handleKeyboardInsert(source, field) {
  const resolved = resolveHostActionProvider(...);
  await resolved.provider.invoke(...);
}
```

```tsx
onClick={() => void handleKeyboardInsert(source, field)}
```

- 严重程度：P3
- 当前行为：`handleKeyboardInsert` await provider.invoke，但点击处 `void handleKeyboardInsert(...)` 无 `.catch()`。
- 风险：字段插入动作失败会形成 unhandled rejection，用户看不到失败提示。
- 建议：调用处补 `.catch()`，通过 `env.notify` 或 runtime host issue 上报错误。
- 误报排除：源文档未记录独立误报排除；最终复核保留该异步失败反馈缺口。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 keyboard insert async failure 被丢弃。

### [06-11] Flow Designer toolbar back 外部动作失败未捕获、无反馈

- 文件：`packages/flow-designer-renderers/src/designer-toolbar.tsx:125-136`, `packages/flow-designer-renderers/src/designer-toolbar.tsx:210-212`
- 证据片段：

```ts
async function invokeAction(action: string) {
  const resolved = resolveActionProvider(action);
  return await resolved.provider.invoke(...);
}
```

```tsx
onClick={() => void invokeAction('designer:navigate-back')}
```

- 严重程度：P3
- 当前行为：`designer:navigate-back` 等宿主动作失败时没有 catch，也不会提示用户。
- 风险：导航失败静默且可能产生 unhandled rejection。
- 建议：对 `invokeAction` 调用补 catch，并复用 `notifyCommandFailure` / `env.notify`。
- 误报排除：源文档未记录独立误报排除；最终复核保留该 toolbar host action failure feedback 缺口。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 host actions floated without failure feedback。

### [06-12] object-field 非表单提交后的异步重校验 rejection 会漏出

- 文件：`packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:70-78`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:277-282`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:306-311`
- 证据片段：

```ts
async function applyNonFormObjectFieldCommit(...) {
  await revalidateProjectedOwner(...);
}
```

```tsx
void applyNonFormObjectFieldCommit(...);
```

- 严重程度：P3
- 当前行为：`applyNonFormObjectFieldCommit` 会 await `parentValidationOwner.validateSubtree`，调用处用 `void` 且没有 catch。
- 风险：非 form 场景下 validateSubtree 拒绝会产生 unhandled rejection，UI 也不会展示提交/校验失败。
- 建议：await 或 `.catch()`，将错误写入字段错误状态或通知。
- 误报排除：源文档未记录独立误报排除；最终复核保留该 non-form commit revalidation rejection leak。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 revalidation rejection can leak。

### [06-13] object-field transformOut 异步结果无卸载取消保护，可能过期写回

- 文件：`packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx:263-295`
- 证据片段：

```ts
const result = await runTransformOut(...);
if (parentForm) {
  await parentForm.setValue(name, result.value);
} else {
  parentScope.update(name, result.value);
}
```

- 严重程度：P2
- 当前行为：transformOut Promise resolve 后直接写回 parent form/scope，没有 cleanup、AbortController 或 mounted guard。
- 风险：组件卸载、字段切换或父作用域变化后，旧 transformOut 仍可能把过期值写回父表单/作用域。
- 建议：为 transformOut 增加 sequence/mounted guard，卸载或依赖变化时 invalidate。
- 误报排除：源文档未记录独立误报排除；最终复核确认有 overlap sequence guard，但仍缺 unmount/dependency invalidation。
- 最终复核结论：保留 P2。
- 修订标题/理由：最终理由修订为“有 overlap sequence guard，但没有 unmount/dependency invalidation，最后一个 pending transform 仍可能 stale write”。

### [06-14] detail-view/detail-field 打开编辑面板失败仅 console.warn

- 文件：`packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:206-234`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:427-429`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:128-160`, `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:274-276`
- 证据片段：

```tsx
onClick={() => {
  handleOpen().catch((error) => {
    console.warn('[detail-view] open failed', error);
  });
}}
```

- 严重程度：P3
- 当前行为：`handleOpen` 会 await `runTransformIn`，点击 catch 仅 `console.warn`。
- 风险：transformIn/load 初始化失败时，弹层不打开且用户无可见提示。
- 建议：设置可见错误状态或调用 `env.notify`。
- 误报排除：源文档未记录独立误报排除；最终复核保留 transform failures 仅 console.warn 的用户反馈缺口。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 detail open transform failures 仅 console.warn。

### [06-15] ReportSpreadsheetCanvas 字段拖拽落格异步失败未捕获/无反馈

- 文件：`packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:147-165`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-field-drop.ts:7-15`
- 证据片段：

```ts
function handleFieldDrop(cb: (targetCell: SpreadsheetCellRef) => void) {
  if (!dropTargetCell) return;
  cb(dropTargetCell);
  setDropTargetCell(null);
}
```

- 严重程度：P3
- 当前行为：`handleFieldDropOnCell` 是 async，会 await spreadsheet/report designer dispatch，但 `useFieldDrop` callback 类型是 sync 且内部直接调用，无 await/catch。
- 风险：dispatch reject 会形成 unhandled rejection；dropTargetCell 清空，用户看到拖拽结束但字段可能未写入。
- 建议：让 `useFieldDrop` 支持 Promise 回调并捕获错误，或调用处包装 `.catch()`。
- 误报排除：源文档未记录独立误报排除；最终复核保留 async reject 后 drop state 已清的问题。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调 field-drop callback typed/called as sync。

### [06-16] CodeEditor SQL 执行缺少取消/竞态保护，旧请求可覆盖新结果

- 文件：`packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts:161-192`
- 证据片段：

```ts
setSqlResult({ status: 'loading' });
const result = await props.helpers.dispatch(action, ...);
setSqlResult({ status: 'success', data: result.data });
```

- 严重程度：P2
- 当前行为：连续点击 SQL Run 时没有 request id、AbortSignal、mounted guard；旧请求后返回会覆盖新结果。
- 风险：结果显示过期；组件卸载后异步返回仍可能 setState；无法取消正在执行的 SQL action。
- 建议：增加 requestIdRef 或 AbortController，只允许最新请求提交结果，cleanup 时 abort/ignore。
- 误报排除：源文档未记录独立误报排除；最终复核保留 latest-request/unmount guard 缺口。
- 最终复核结论：保留 P2。
- 修订标题/理由：无标题修订；最终理由强调旧请求可覆盖新结果。

### [06-17] WordEditor 图片插入 FileReader 异步失败无反馈

- 文件：`packages/word-editor-renderers/src/toolbar/insert-controls.tsx:42-55`
- 证据片段：

```ts
const reader = new FileReader();
reader.onload = () => {
  bridge?.command?.executeImage(String(reader.result));
};
reader.readAsDataURL(file);
```

- 严重程度：P3
- 当前行为：FileReader 只绑定 `onload`，没有 `onerror/onabort`；`executeImage` 也无错误处理。
- 风险：文件读取失败、被中止或编辑器命令执行失败时用户无反馈。
- 建议：增加 `onerror/onabort` 和 try/catch，通过 toolbar error、toast 或上层日志反馈。
- 误报排除：源文档未记录独立误报排除；最终复核保留 FileReader/command error handling 缺口。
- 最终复核结论：保留 P3。
- 修订标题/理由：无标题修订；最终理由强调只处理 onload，缺 onerror/onabort/command error handling。

## 驳回项

本维度最终复核没有驳回项。
