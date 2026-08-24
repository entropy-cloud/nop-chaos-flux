# 33 word-editor-renderers 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/word-editor-renderers/src/` 全部 29 个源文件（共 4567 行，排除 `*.test.*` 与 `__tests__/`），**精读覆盖率 100%**。同时对照 `packages/word-editor-core/src/`（bridge/store/document-io/template-expr/chart-model/code-model，共 7 个文件）核实跨包契约，对照唯一真实消费方 `apps/playground/src/pages/word-editor-page.tsx` 与 `apps/playground/src/main.tsx`（确认启用 `React.StrictMode`）。
- 结论概览：**P0 x1 / P1 x5 / P2 x8 / P3 x11**

总评：本包是 word-editor 的 React 渲染层（页面骨架 + 工具栏 + 侧栏 + 对话框），整体结构清晰：RendererComponentProps 契约、useSyncExternalStoreWithSelector 订阅、UI 组件全部来自 `@nop-chaos/ui`、i18n 键全量核对无缺失（108 个使用键在 zh-CN/en-US 双语言全部存在，wordEditor 节 178 键双语对齐）。核心问题集中在四条线：(1) **29 号报告 F-01（readonly 不传导）的消费侧暴露面完整确认**——只读页画布可编辑，且 `onContentChange → debouncedSave → persistSavedDocument` 会把篡改内容写入 localStorage 恢复存储（P0）；(2) **两条数据丢失路径**——卸载时清掉 pending 防抖保存、字数只在挂载时统计一次；(3) **恢复快照无条件遮蔽受控 initialDocument/datasets**（配合 core 的全局单一 storage key，跨文档内容串扰）；(4) **长文档性能**——每次选区变更触发整页重渲染，OutlinePanel 在渲染体内做全文档 `getValue()` 序列化。29 号 F-02（属性值不转义双引号）的消费侧入口也全部确认：图表名/代码名/标签属性值/数据集名四处输入均无字符限制。

---

## P0 缺陷

### F-01 readonly 页面画布可编辑，篡改内容经 `onContentChange → debouncedSave → persistSavedDocument` 持久化（29 号报告 F-01 消费侧接线核实）

- 位置：`packages/word-editor-renderers/src/editor-canvas.tsx:83-123`、`packages/word-editor-renderers/src/word-editor-page.tsx:90-97`、`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:74-75`
- 维度：D1 正确性 / D2 契约
- 摘录：

```tsx
// use-word-editor-state.ts:74-75 —— 消费侧确实把 readOnly 传进了 bridge 构造器
const readOnly = props.props.readOnly ?? false;
const bridge = useMemo(() => new CanvasEditorBridge(readOnly ? true : undefined), [readOnly]);

// editor-canvas.tsx:83-90 —— mount 回调接线与编辑态完全相同，readonly 无任何分支
bridge.mount(container, editorData, {
  onContentChange: () => {
    debouncedSave();
    editorStore.setDirty(true);
  },

// word-editor-page.tsx:90-97 —— autosave 无条件持久化到 localStorage
const handleAutosave = useCallback((saved: SavedDocumentData) => {
  setSavedDocument(saved);
  try {
    persistSavedDocument(saved);
  } catch { /* best-effort */ }
}, [setSavedDocument]);
```

- 输入→路径→错误结果推理链：
  1. 输入：schema `{ type: 'word-editor-page', readOnly: true, initialDocument: docA }`。
  2. `use-word-editor-state.ts:75` 正确构造 `new CanvasEditorBridge(true)`，readonly 只落在 `bridge._readonly`；core 侧 `canvas-editor-bridge.ts:55` `new Editor(container, data)` 未传任何 mode/readonly（29 号 F-01 根因）。
  3. 本包 UI 层的只读防护只是"隐藏"：工具栏隐藏（`word-editor-page.tsx:167`）、保存按钮隐藏（`:142`）、左面板隐藏（`:259`）、快捷键 readOnly 早退（`use-word-editor-shortcuts.ts:38`）。画布本身与编辑态接线完全一致。
  4. 用户在"只读"页直接在画布键入 → `instance.listener.contentChange` → `editor-canvas.tsx:87-90` `debouncedSave() + setDirty(true)`。
  5. 500ms 后 `captureDocumentSnapshot(bridge, ...)` → `onAutosaveRef.current?.(saved)` → `word-editor-page.tsx:90-97`：`setSavedDocument(篡改文档)` + `persistSavedDocument(篡改文档)` → 写入 localStorage `nop-word-editor-document`。
  6. 错误结果：(a) 篡改内容进入恢复存储，下次打开任意 word-editor-page 恢复的都是篡改版（联动本包 F-05 的"恢复无条件遮蔽 initialDocument"）；(b) `hostScope.document` 与页头"文档预览"条即时显示篡改文本；(c) 只读页出现"未保存"脏态并经 statusPath 向宿主发布 `dirty: true`。
- 消费侧核实结论：29 号 F-01 的持久化放大链在本包**完整成立**。修复需要 core 在 mount 时传导 readonly；本包应做双保险——readOnly 时不接线 `debouncedSave → persistSavedDocument`（只读页不应有任何自动持久化）。

---

## P1 隐患

### F-02 图表/代码命名、模板标签属性值输入允许双引号（及逗号、点号），消费侧零拦截（29 号报告 F-02 消费侧暴露面核实）

- 位置：`packages/word-editor-renderers/src/dialogs/chart-dialog.tsx:179-185,215-256`、`src/dialogs/code-dialog.tsx:79-85,104-125`、`src/dialogs/expr-insert-dialog.tsx:145-162`、`src/dialogs/dataset-dialog.tsx:115-126`
- 维度：D1 正确性 / D5 错误处理
- 摘录：

```tsx
// chart-dialog.tsx:179-185 —— chartName 自由文本，无字符限制
<Input
  id={`${dialogIdPrefix}-name`}
  value={chartName}
  onChange={(e) => setChartName(e.target.value)}

// chart-dialog.tsx:69-76 —— valueField 以逗号切分，天然无法表达含逗号的字段名
valueField: valueField.split(',').map((v) => v.trim()).filter((v) => v),
```

- 推理链：名称 `我的"图表` 通过 `validateDocChart`（word-editor-core `chart-model.ts:35-59` 仅查非空）→ `use-word-editor-actions.ts:121-129` → `bridge.insertChart` → core `canvas-editor-bridge.ts:170-180`（attrs.name）→ `buildTagSelfcloseString`（`template-expr.ts:108-113`，`name="${v}"` 不转义）→ url 变成 `xpl:<nop:chart name="我的"图表" ... />` → 保存时 `extractDocChartsFromDocument`（`document-io.ts:265-292`）经 `parseTagAttributes` 正则 `"([^"]*)"` 在第一个引号截断 → attrs 错乱 → `validateDocChart` 失败 → **该图表从保存文档的 `charts[]` 中静默丢弃**。
- 暴露入口共四处（全部确认无字符校验）：
  1. `chart-dialog.tsx`：chartName / categoryField / valueField / seriesField / datasetId；
  2. `code-dialog.tsx`：codeName / datasetId / valueField；
  3. `expr-insert-dialog.tsx:150-158`：XPL 标签属性值（经 `buildTagOpenString` 同样不转义）；
  4. `dataset-dialog.tsx:119-125`：数据集/列名（含点号、空格时 `${dataset.field}` 引用无法被 `parseFieldReference` 正则解析——core 已有 `validateFieldReference` 但本包从未调用，见 F-23）。
- 影响：保存-加载往返后图表/条码元数据静默丢失、模板标签损坏，且损坏过程无任何用户可见错误（校验失败一律静默 return，见 F-24）。
- 修复方向：输入侧限制或转义（禁用 `"`/`<`/`>`，标识符走 `validateFieldReference`）；core 序列化侧转义（29 号 F-02）；`valueField` 改用非歧义分隔符或数组编码。

### F-03 卸载竞态：pending 防抖自动保存被直接清除，进行中的手动保存被 abort，最后 500ms 编辑丢失

- 位置：`packages/word-editor-renderers/src/editor-canvas.tsx:141-147`、`src/hooks/use-word-editor-save.ts:40-45`
- 维度：D1 正确性 / D5 错误处理
- 摘录：

```tsx
// editor-canvas.tsx:141-147 —— 卸载只清 timer，不做最终 flush
return () => {
  controller.abort();
  if (saveTimer) clearTimeout(saveTimer);
  bridge.unmount();

// use-word-editor-save.ts:40-45 —— 卸载直接 abort 进行中的保存
useEffect(() => {
  return () => {
    saveAbortRef.current?.abort();
    if (saveMessageTimerRef.current) clearTimeout(saveMessageTimerRef);
  };
}, []);
```

- 特定条件：用户在最后一次击键后 500ms 内导航离开（onBack / 路由切换），或点击保存后立刻离开。
- 后果：防抖 timer 被清除且画布随 `bridge.unmount()` 销毁，最后 ≤500ms 的编辑既不进 `savedDocument` 状态也不进 localStorage 恢复存储，**静默丢失**；手动保存路径中，`ctx.signal` 被 abort 后 `word-editor-action-provider.ts:118-124` 返回 cancelled，`persistSavedDocument`/`setDirty(false)` 被跳过——若 `saveEvent`（服务端保存）尚未发出则保存整体丢失。
- 修复方向：cleanup 中在 `bridge.unmount()` 之前同步执行最终快照（无 timer 时直接 `captureDocumentSnapshot` 一次）或至少 flush pending timer；卸载时对"保存已在途"给出提示/等待。

### F-04 wordCount 只在挂载后取一次，任何编辑后计数永久过期

- 位置：`packages/word-editor-renderers/src/editor-canvas.tsx:132-139`（全包唯一 `setWordCount` 调用点）
- 维度：D1 正确性
- 摘录：

```tsx
const wordCountPromise = bridge.getWordCount();
wordCountPromise.then((count) => {
  if (!controller.signal.aborted) editorStore.setWordCount(count);
});
```

- `onContentChange`（editor-canvas.tsx:87-90）只做 `debouncedSave + setDirty`，从不刷新字数；页头 `word-editor-page.tsx:138` 与 statusPath 发布的 `wordCount` 均来自该 store。
- 特定条件+后果：打开 100 字文档 → 连续输入 2000 字 → 页头"字数"与 `statusPath` 摘要一直显示 100。用户可见指标错误，且宿主依赖该摘要做统计时数据失真。
- 修复方向：在 `onContentChange` 的防抖里同时 `bridge.getWordCount()` 刷新 store。

### F-05 恢复快照无条件遮蔽受控 `initialDocument` / `datasets`，配合 core 全局单一 storage key 形成跨文档串扰

- 位置：`packages/word-editor-renderers/src/editor-canvas.tsx:54-61`、`src/hooks/use-word-editor-state.ts:70-73,80-85,205-209`
- 维度：D1 正确性 / D2 契约（受控 value 语义）
- 摘录：

```tsx
// editor-canvas.tsx:54-56 —— recoveredDocument 无条件优先于 initialDocument
const documentSource =
  recoveredDocument ??
  (initialDocument
    ? createSavedDocumentData({ data: initialDocument, paperSettings: null })
    : null);

// use-word-editor-state.ts:70-73 —— 挂载时一次性读 localStorage（key 为全局 'nop-word-editor-document'）
const recoveredState = useMemo(() => loadRecoveredState(initialDatasets), [initialDatasets]);
```

- 特定条件：core 的 `loadRecoveredState`（`document-io.ts:541-549`）使用全局唯一 key 且 `persistedDatasets.length > 0 ? persisted : initial`。两个场景：
  1. 文档 A 编辑后未保存离开 → 打开文档 B 的编辑页（`initialDocument: B`）→ localStorage 仍是 A → 编辑器加载 **A 的内容**，页头却处于 B 的会话 → 下一次保存把 A 内容写入 B（数据污染）。
  2. 当前唯一消费方 playground 不传 `initialDocument`：一旦编辑过，之后每次打开永远恢复上次内容，没有"放弃恢复/回到初始文档"的出口。
- 后果：schema 受控 `initialDocument`/`datasets` 声明被静默忽略；恢复内容没有任何文档身份校验（无 docId 比对、无 savedAt 新旧比较）。
- 修复方向：恢复 key 按文档身份（pageId/docId）隔离；`recoveredDocument` 仅在与当前 `initialDocument` 身份匹配时生效；提供"丢弃恢复"交互。

### F-06 长文档性能：每次选区/内容变更触发整页重渲染，OutlinePanel 在渲染体内做全文档 `getValue()` 序列化

- 位置：`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:125-130`、`src/panels/outline-panel.tsx:104-107`、`src/word-editor-page.tsx:86-88`
- 维度：D6 性能
- 摘录：

```tsx
// use-word-editor-state.ts:125-130 —— identity 选择器：setSelection 每次都产生新对象 → 页面必重渲染
const selection = useSyncExternalStoreWithSelector(
  editorStore.subscribe,
  editorStore.getState,
  editorStore.getState,
  (state) => state.selection,
);

// outline-panel.tsx:107 —— 渲染体内同步全文档序列化（无缓存、无 useMemo）
const outline = applyExpandedState(readOutline(bridge), expandedState);
// readOutline → bridge.command.getValue() → 整份文档 JSON 遍历 + buildHeadingTree

// word-editor-page.tsx:86-88 —— 每次渲染全量遍历 main 数组拼接预览文本
const savedPreviewText = collectDocumentText(savedDocument?.data.main);
```

- 链路：canvas-editor 每次选区/内容变更触发 `onRangeStyleChange` → `editorStore.setSelection`（`editor-store.ts:111-115` 无条件展开新对象）→ `selection` 订阅以 identity 判变 → **WordEditorPage 整页重渲染**（含 header 槽、regions.render、三个面板元素重建）→ `OutlinePanel` 重渲染 → 渲染体执行 `bridge.command.getValue()` 全文档序列化 + `collectDocumentText` 全量遍历。OutlinePanel 自身的 500ms 防抖（`outline-panel.tsx:126-133`）只能触发额外重渲染，挡不住父级重渲染带动的渲染体执行。
- 特定条件+后果：百页文档/数千元素时，每击键一次全量序列化 + 整页 reconcile，输入明显卡顿。
- 修复方向：`selection` 订阅改 `shallowEqual`（页面并未直接消费 selection）；`readOutline` 结果用 `useMemo` + revision 缓存；预览文本派生记忆化。

---

## P2 风险

### F-07 DocPreviewPage 预览页完全不设 readonly，且每次渲染新建 CanvasEditorBridge 实例；组件无任何外部消费者（死代码）

- 位置：`packages/word-editor-renderers/src/preview/doc-preview-page.tsx:15,33-38`
- 维度：D1 / D3 / D8 结构
- 摘录：

```tsx
const bridge = useRef<CanvasEditorBridge>(new CanvasEditorBridge());  // 无参 → 非只读
...
instance.mount(container, editorData, {
  onContentChange: () => {},   // 编辑不持久化，但画布本身可编辑
```

- 预览页语义是只读查看，但 bridge 连构造参数都没传 readonly——即使 core 侧 F-01 修复（mount 传导构造 readonly），本页也不会受益。`useRef(new CanvasEditorBridge())` 是 React 反模式：参数每次渲染都求值，每次 render 丢弃一个新建实例。另外 `index.ts` 未导出该组件、包 exports map 封锁深导入，全仓 grep 仅其自测文件引用——属于不可达死代码。
- 影响：一旦未来有人启用它，将得到"可编辑但不保存"的预览；当前则维护两套 mount 逻辑漂移。
- 修复方向：`new CanvasEditorBridge(true)` + 懒初始化（`useRef(null)` 判空）；或删除该组件。

### F-08 StrictMode 下 `mountedRef` 永久为 false，保存成功消息与失败通知在 dev 全部失效

- 位置：`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:79,102-106`、`src/hooks/use-word-editor-save.ts:66,72,86`；`apps/playground/src/main.tsx:18`（确认启用 `React.StrictMode`）
- 维度：D3 React19
- 摘录：

```tsx
const mountedRef = useRef(true);
useEffect(() => {
  return () => {
    mountedRef.current = false; // StrictMode: 挂载→清理(false)→再挂载(不重置 true)
  };
}, []);
```

- StrictMode 双调用 effect：第一次 cleanup 置 false，第二次 effect 体为空不会置回 true → 组件存活期内 `mountedRef.current === false` 恒成立。`handleSave` 中 `if (!mountedRef.current) return;` 在 `await` 之后执行 → dev 下保存已实际发生（invoke 内部已 persist），但成功消息、2s 自动清除、失败 `env.notify` 全部被跳过，表现为"保存无反馈"。
- 修复方向：effect 体内 `mountedRef.current = true`（经典写法），或改用 `useEffectEvent`/丢弃 mountedRef 模式（React 18+ setState 卸载后不再告警）。

### F-09 搜索结果计数是硬编码假值 `searchText ? 1 : 0`

- 位置：`packages/word-editor-renderers/src/toolbar/search-replace.tsx:18,89`
- 维度：D1 正确性
- 摘录：

```tsx
const resultCount = searchText ? 1 : 0;
...
{resultCount > 0 && <span className="text-xs text-muted-foreground">{resultCount}</span>}
```

- 只要搜索框非空就显示"1"：零命中也显示 1，多命中也显示 1。canvas-editor 的搜索 API 不回传命中数，此处用假数据占位。用户被误导"有且只有一个匹配"。
- 修复方向：接 canvas-editor 搜索结果回调获取真实计数，或去掉该展示。

### F-10 超链接插入无 URL scheme 校验，`javascript:` 等危险 URL 可写入文档

- 位置：`packages/word-editor-renderers/src/toolbar/insert-controls.tsx:76-85`
- 维度：D5 错误处理 / 安全
- 摘录：

```tsx
const handleInsertHyperlink = () => {
  if (!hyperlinkUrl.trim()) return;
  bridge?.command?.executeHyperlink({
    valueList: [{ value: hyperlinkDisplay.trim() || hyperlinkUrl.trim() }],
    url: hyperlinkUrl.trim(),
  });
```

- 这是 29 号报告 F-04（恢复侧不校验 URL scheme）的**入口侧**：插入时不限制 scheme，`javascript:`/`data:` URL 直接进入文档元素并随保存/恢复流转。本包模板表达式（`expr:`/`xpl:`）也走同一个 hyperlink url 字段，插入侧完全无法区分"表达式"与"任意 URL"。
- 修复方向：插入前校验 scheme 白名单（http/https/mailto/expr:/xpl:），与 core 侧恢复校验形成双层防御。

### F-11 保存动作中：服务端 `saveEvent` 成功后 localStorage 持久化失败 → 整体判为失败，UI 报"保存失败"且脏态不清

- 位置：`packages/word-editor-renderers/src/word-editor-action-provider.ts:112-139`
- 维度：D5 错误处理
- 摘录：

```ts
if (input.saveEvent) {
  const result = await input.saveEvent(saved, ctx);
  if (!result.ok) return result;
}
...
try {
  persistSavedDocument(saved);
  saveDatasets(input.datasetStore.getAll());
} catch (error) {
  ...
  return failWithError(new Error('Unable to save word document.', { cause: normalizedError }));
}
input.editorStore.setDirty(false);
```

- 特定条件：服务端保存成功，随后 `persistSavedDocument` 因配额溢出抛 `storage-write-failed`（大文档/大图片极易触发，见 F-14）。
- 后果：返回 `{ok:false}` → 页面 `env.notify('warning', 'Unable to save word document.')` → 用户看到"保存失败"，实际服务端已保存；`setDirty(false)` 未执行 → 保存按钮保持高亮，用户可能重复保存。
- 修复方向：本地持久化失败降级为非致命（提示"已保存到服务器，本地恢复快照写入失败"），仍清脏态。

### F-12 纸张设置 store 与编辑器实际状态可背离，快照持久化优先采用 store 旧值（方向切换不交换宽高）

- 位置：`packages/word-editor-renderers/src/toolbar/page-controls.tsx:64-96`、`src/editor-canvas.tsx:44-46`
- 维度：D1 / D2（suspect：依赖 canvas-editor `executePaperDirection` 语义）
- 摘录：

```tsx
// page-controls.tsx:86-92 —— 切换方向只改 direction，宽高不交换
store.setPaperSettings({
  ...paperSettings,
  direction: newDir === PaperDirection.VERTICAL ? 'vertical' : 'horizontal',
});

// editor-canvas.tsx:44-46 —— 快照用 store 值覆盖 bridge 实际值
const saved = captureDocumentSnapshot(bridge, {
  paperSettings: editorStore.getState().paperSettings,
});
```

- `captureDocumentSnapshot`（core `document-io.ts:365`）`options?.paperSettings ?? paperSettings`——消费侧传入的 store 值优先于 `bridge.getPaperSettings()` 实测值。方向切换后编辑器内部（canvas-editor 语义）交换了宽高，store 仍是旧 w/h+新 direction → 保存的 paperSettings 与画布不一致 → 重开文档时 `applyPaperSettings` 应用错误纸张。另：`paperSizeKey`（page-controls.tsx:70-74）自定义尺寸回退显示 'a4' 误导。
- 修复方向：快照不传 store 值，让 core 读 bridge 实测；或方向切换时同步交换 store 宽高。

### F-13 运行时 `readOnly` / `initialDocument` 属性变化 → bridge 重建 / 画布重挂载，静默丢弃当前编辑与 pending 保存

- 位置：`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:62-73,75`、`src/editor-canvas.tsx:148`
- 维度：D2 契约（受控 value）
- 摘录：

```tsx
const initialDocument = useMemo(
  () => normalizeWordDocument(props.props.initialDocument) ?? undefined,
  [props.props.initialDocument],
); // prop 引用变化 → 新对象
const bridge = useMemo(() => new CanvasEditorBridge(readOnly ? true : undefined), [readOnly]);
// EditorCanvas effect deps: [bridge, editorStore, initialDocument, recoveredDocument]
```

- 特定条件：`readOnly` 经响应式绑定在运行时翻转（如权限切换），或 `initialDocument` 绑定表达式产生新引用。
- 后果：bridge 重建 → EditorCanvas effect 重跑：cleanup 清掉 pending 防抖保存（F-03 路径）并 `bridge.unmount()`，随后用 **初始/恢复文档**（而非当前文档）重新挂载——用户当前编辑内容整体丢失且无提示。受控 value 语义缺失：外部值变化 = 无警告硬重置。
- 修复方向：readOnly 变化走 bridge 的动态 readonly API（core 侧补充）；`initialDocument` 变化前比较/提示；重挂载前先快照当前内容。

### F-14 图片插入无大小/类型约束，dataURL 直存文档 → localStorage 配额溢出后自动保存静默失效（恢复链断裂）

- 位置：`packages/word-editor-renderers/src/toolbar/insert-controls.tsx:51-74`、`src/word-editor-page.tsx:92-96`
- 维度：D5 错误处理 / D6
- 摘录：

```tsx
reader.onload = () => {
  const dataUrl = reader.result as string;
  bridge?.command?.executeImage({ value: dataUrl, width: 0, height: 0 });
};
// word-editor-page.tsx:92-96 —— persist 失败被吞
try {
  persistSavedDocument(saved);
} catch {
  /* best-effort */
}
```

- 特定条件：插入一张几 MB 的图片（base64 膨胀 ~33%）→ 每次防抖快照 JSON.stringify 整文档超 localStorage ~5MB 配额 → `persistSavedDocument` 抛 `storage-write-failed` 被 handleAutosave 静默吞掉。
- 后果：此后所有编辑的恢复快照写入失败且无任何提示；页面刷新后回到旧快照，用户以为自动保存一直在工作。文档本身体积也随 dataURL 膨胀。
- 修复方向：插入前限制文件大小/压缩；autosave 持久化失败时更新页头保存状态条提示。

---

## P3 提示

### F-15 命令错误处理不一致：font-controls 有 `runCommand` 包裹，insert/paragraph/page-controls 全部裸调

- 位置：`src/toolbar/insert-controls.tsx:78-81,99,129,135,146`、`src/toolbar/paragraph-controls.tsx:30-101`、`src/toolbar/page-controls.tsx:60-113`
- `font-controls.tsx:26-32` 的注释明确"canvas-editor 在无可编辑选区时可能抛错"并包了 try/catch；但超链接/表格/分隔符/分页/打印、对齐/标题/列表/行距、缩放等命令都直接 `bridge?.command?.xxx()`，同类异常会冒泡到 React 事件处理器。建议统一走 `runCommand` 或在 bridge 层兜底。

### F-16 工具栏禁用态缺失：bridge 未就绪时除 undo/redo 外全部可点；select 值不在候选列表时显示空白

- 位置：`src/toolbar/font-controls.tsx:60-85`、`src/toolbar/paragraph-controls.tsx:57-101`
- undo/redo 有 `disabled={!selection.undo}`，bold/italic/表格/图片等在 `bridge.command` 为 null（未挂载/已卸载）时仍可点击（仅靠 `?.` 吞掉）；`selection.font`/`size`/`rowMargin` 来自文档实测值，不在 FONTS/FONT_SIZES/LINE_SPACINGS 列表时下拉框显示空白项。建议增加 `disabled={!bridge?.command}` 统一禁用。

### F-17 `window.__NOP_WORD_EDITOR_PROBE__` 每次运行时状态变化重注册且生产环境暴露，多实例互相覆盖

- 位置：`src/hooks/use-word-editor-state.ts:234-252`
- effect deps 含 `editorRuntime`/`savedDocument` → 每击键重跑一次赋值；闭包内已用 `savedDocumentRef` 却仍依赖 `savedDocument`。调试探针未按 NODE_ENV 门控，同页两个编辑器实例会互相覆盖探针。

### F-18 插入失败通知复用 `flux.common.saveFailed` 文案

- 位置：`src/toolbar/insert-controls.tsx:44-49`
- 图片读取失败/插入异常提示"保存失败"，语义错位。应使用独立的"插入失败"i18n 键（wordEditor 命名空间已有大量键可扩展）。

### F-19 readOnly 下缩放/打印/搜索随工具栏一并隐藏

- 位置：`src/word-editor-page.tsx:167`
- 只读查看场景通常仍需要缩放、打印、搜索；当前 `readOnly ? null : (toolbar)` 把 PageControls/SearchReplace 一并砍掉。属产品决策，建议按能力拆分而非整体隐藏。

### F-20 页边距输入允许负数与超大值

- 位置：`src/toolbar/page-controls.tsx:173-177`
- `Number(e.target.value) || 0` 不校验范围，`-50` 可直接 `executeSetPaperMargin`。建议 min=0（并给上限）。

### F-21 硬编码英文默认文档 `'Hello World'`；数字格式化未走 i18n locale

- 位置：`src/editor-canvas.tsx:77`、`src/word-editor-page.tsx:138`、`src/preview/doc-preview-page.tsx:109`
- 新建文档默认内容为英文样例；`wordCount.toLocaleString()` 使用运行时默认 locale 而非应用 i18n locale，中英文环境下千分位表现不一致。

### F-22 outline 标题缺 id 时用 `Math.random()` 兜底：key 不稳定、展开状态失效；深层目录无折叠控件；pageNo 恒为 1

- 位置：`src/panels/outline-panel.tsx:37,41,163-188,213-253`
- 每次 `readOutline` 随机 id 不同 → React key 换血 + `expandedState[id]` 永不命中；折叠按钮只渲染在顶层 map，`renderSubCatalog` 内的层级无法折叠；`pageNo: 1` 是从未使用的占位数据。

### F-23 数据集列名/字段名无查重与标识符校验（core `validateFieldReference` 未被消费）

- 位置：`src/dialogs/dataset-dialog.tsx:66-70`、`src/panels/field-list.tsx:83`、`src/hooks/use-word-editor-actions.ts:88-93`
- 列名重复 → `key={column.name}` 冲突 + `${dataset.field}` 引用歧义；名称含 `.`/空格/引号 → 字段引用插入后无法被 `parseFieldReference` 解析（与 F-02 同族）。core 已提供 `validateFieldReference` 但本包创建数据集时未调用。

### F-24 图表/代码对话框重开不复位表单；校验失败静默无提示

- 位置：`src/dialogs/chart-dialog.tsx:53-60`、`src/dialogs/code-dialog.tsx:34-41`、`src/hooks/use-word-editor-actions.ts:121-139`
- ChartDialog/CodeDialog 常驻挂载（insert-controls 只切 open），重开沿用上次草稿；`handleChartSave`/`handleCodeSave` 二次校验失败时静默 `return`，对话框照常关闭、无插入、无提示（保存按钮 disabled 只覆盖 dialog 内的首次校验）。

### F-25 manifest 未声明 `readOnly` 属性契约；index.ts 导出面不含 panels/dialogs/preview（死代码面）

- 位置：`src/renderers.tsx:51-95`、`src/index.ts`
- `propContracts` 声明了 config/statusPath/initialDocument/datasets/initialCharts/initialCodes，唯独运行时真正消费的 `readOnly` 没有契约声明，工具链/校验不感知。`EditorCanvas`/`DocPreviewPage`/`OutlinePanel` 等编译进 dist 但不可从包入口导入（exports map 封锁深导入），与 F-07 一并构成死代码面。（`initialCharts`/`initialCodes` 为 DR-15 已裁定 @reserved 幽灵声明，不计缺陷。）

---

## 检查过程记录

1. **结构清点**：`find` + `wc -l` 列出 `src/` 全部非测试源文件，29 个 / 4567 行，与任务描述一致。`package.json` 确认依赖 `@nop-chaos/word-editor-core`、peer `react@19`、`lucide-react`。
2. **精读全部 29 个源文件**：editor-canvas、word-editor-page、renderers、types、index、template-tag-helpers、word-editor-manifest、word-editor-action-provider；hooks x4（state/save/actions/shortcuts）；toolbar x7（shared/ribbon/font/paragraph/insert/page/search-replace/template）；dialogs x4（chart/code/dataset/expr-insert）；panels x4（outline/dataset/field-list/template-snippets）；preview/doc-preview-page。
3. **跨包契约核实**：grep 定位本包对 word-editor-core 的全部消费点（43 处 import），精读 core 的 `canvas-editor-bridge.ts`、`editor-store.ts`、`document-io.ts`、`template-expr.ts`、`chart-model.ts`、`code-model.ts`、`paper-settings.ts`，逐条验证 29 号报告 F-01（mount 不传导 readonly → 消费侧 onContentChange→debouncedSave→persistSavedDocument 链条完整成立）、F-02（`buildTagOpenString`/`buildTagSelfcloseString` 不转义 + `validateDocChart/Code` 不查特殊字符 → 本包四个输入入口全部放行）、F-04（恢复 URL 无 scheme 校验的入口侧对应本包 F-10）、F-07（DataColumn.type 复用 DatasetSourceType 在本包 dataset-dialog/actions 的回声，并入 F-23 提示）。
4. **消费方核实**：`apps/playground/src/pages/word-editor-page.tsx`（不传 readOnly/initialDocument，config 双面板）、`apps/playground/src/main.tsx:18` 确认 `React.StrictMode`（支撑 F-08）。DocPreviewPage/EditorCanvas 全仓 grep 无外部消费者。
5. **i18n 核对**：提取本包全部 `t('...')` 调用 108 个键，逐一对照 `packages/flux-i18n/src/locales/zh-CN.ts` 与 `en-US.ts`：wordEditor 节 178 键双语完全对齐，**零缺失**（D7 通过）。
6. **专项核查**：`setWordCount` 全包唯一调用点（F-04）；`window.__NOP_WORD_EDITOR_PROBE__` 注册面（F-17）；`DEFAULT_PAPER_SETTINGS` 与 `createSavedDocumentData` 兜底值一致（无缺陷）；`loadRecoveredState` 的 datasets 回退逻辑确认不会漏载 initialDatasets（避免误报）；`initialCharts/initialCodes` 确认为 types.ts 中 DR-15 已裁定的 @reserved 声明（避免误报）。
7. **反误报标注**：F-12 标 suspect（依赖 canvas-editor `executePaperDirection` 是否内部交换宽高的语义，未读 node_modules 内核源码）；F-19 属产品决策层面提示。
