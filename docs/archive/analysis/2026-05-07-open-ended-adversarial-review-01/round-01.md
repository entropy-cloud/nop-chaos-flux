# 开放式对抗性审查 — 2026-05-07 — 第一轮

> 审查方式：按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行。
> 先读 `AGENTS.md`、`docs/index.md`，快速扫描 `docs/analysis/2026-05-05-open-ended-adversarial-review-01/`、`docs/analysis/2026-05-06-open-ended-adversarial-review-01/` 与 `docs/references/reopened-design-decisions-and-audit-adjudications.md` 做去重。
> 本轮切入点：跨包 owner 边界、宿主 scope 契约、实例隔离，以及“一个子系统看起来在跟另一个同步，实际却各自维护状态”的 split-brain 模式。

---

## 发现 1：Report Designer 与 Spreadsheet Core 已经分裂成两份 spreadsheet 真相源

**在哪里**

- `packages/report-designer-renderers/src/page-renderer.tsx:121-128`
- `packages/report-designer-core/src/core.ts:404-413`
- `packages/report-designer-core/src/core-dispatch.ts:228-254,282-315`
- `packages/report-designer-renderers/src/host-data.ts:151-153`

**是什么**

- renderer 侧只在 `spreadsheetSnapshot.document` 变化时调用 `core.syncSpreadsheetDocument(...)`，把 spreadsheet core 的文档单向同步回 report core。
- 但 report core 自己的写路径，如 `importTemplate`、`undo`、`redo`，都会直接替换 `store.document`，其中也包含 `document.spreadsheet`，却没有任何反向同步把这个新文档推回 `spreadsheetCore`。
- `host-data.ts` 又进一步把矛盾遮住了：它在 host scope 里强行发布

```ts
const reportDocument = spreadsheetSnapshot
  ? { ...snapshot.document, spreadsheet: spreadsheetSnapshot.document }
  : snapshot.document;
```

- 结果是 report core 内部保存/导出的文档，与 host scope 暴露给 toolbar/inspector/schema 的 `reportDocument.spreadsheet`，可以来自两份不同的状态。

**为什么值得关心**

- 这是典型的跨边界 split-brain：可视画布、host scope、`save/exportDocument()`、undo/redo 可能分别读取不同版本的 spreadsheet。
- 一旦用户执行 `importTemplate` 或 report-core 侧 undo/redo，UI 仍可能继续显示旧 spreadsheet 快照，但保存出的 report 文档已经换成另一份内容。
- 这类 bug 很难排查，因为每一层单看都“像是真的”，只是彼此不再共享同一个真相源。

**信心水平**：确定

---

## 发现 2：Word Editor 挂载时恢复了持久化草稿，但 host scope `document` 仍停留在初始 schema 值

**在哪里**

- `packages/word-editor-renderers/src/word-editor-page.tsx:70-75,167-180`
- `packages/word-editor-renderers/src/editor-canvas.tsx:75-93,103-145`
- 对照文档：`docs/components/word-editor-page/design.md` 中 host scope `document` 契约

**是什么**

- `WordEditorPage` 的 `savedDocument` state 只从 `props.props.initialDocument` 初始化。
- 但真正挂载编辑器时，`EditorCanvas` 会先执行 `loadDocument()`，然后把本地持久化草稿作为 `documentSource` 装入 canvas。
- 如果本地草稿存在且与 `initialDocument` 不同，用户看到的编辑器内容已经是恢复后的草稿；但 `hostScopeData.document` 仍然来自旧的 `savedDocument?.data ?? initial schema fallback`，直到后续一次 autosave 或 save 回调才会纠正。

**为什么值得关心**

- `toolbar`、`leftPanel`、`rightPanel` 等宿主区域通过 host scope 读取的 `document`，在首屏阶段可能与真实编辑器内容不一致。
- 这不是简单的 UI 延迟，而是公开宿主契约失真：外部 schema/slot 以为自己拿到的是当前文档，实际拿到的是“还没被恢复流程更新的旧文档”。
- 它会让基于 `document` 做条件判断、摘要展示、辅助编辑的外部区域在最需要恢复语义的时候读到错误内容。

**信心水平**：确定

---

## 发现 3：Schema 提供了 `datasets` 时，Word Editor 每次挂载都会覆盖本地已保存的数据集修改

**在哪里**

- `packages/word-editor-renderers/src/word-editor-page.tsx:212-220`
- `packages/word-editor-core/src/document-io.ts:122-137`

**是什么**

挂载 effect 的顺序是：

1. 先 `loadDatasets()` 读取本地持久化数据集并 `datasetStore.load(savedDatasets)`。
2. 然后只要 schema 里有 `props.props.datasets`，就无条件再执行一次 `datasetStore.load(initialDatasets)`。

也就是说，schema 里的“初始数据集”在 live code 里并不是只用于首次引导，而是每次挂载都覆盖本地已保存的用户修改。

**为什么值得关心**

- 这是直接的数据丢失路径：用户在运行时编辑并保存过的数据集，只要页面重载且 schema 仍带 `datasets`，就会被旧初始值静默覆盖。
- 项目其它地方大量强调实例级 state/host scope，而这里的持久化恢复优先级却反过来让静态 schema 永远压过用户最近一次保存结果。
- 这种“看起来支持 autosave，实际上 reload 后又回退”的行为，对编辑器类产品尤其危险。

**信心水平**：确定

---

## 发现 4：Debugger 的 `inspectByCid()` 没有利用现有 `data-runtime-id` 缩小 DOM 查询范围，多个 runtime 并存时会串台

**在哪里**

- `packages/nop-debugger/src/controller-component-inspector.ts:233-277,326-369`
- `packages/flux-react/src/schema-renderer.tsx:328`
- `packages/flux-runtime/src/runtime-factory.ts:88,113,311-314`
- 对照文档：`docs/architecture/debugger-runtime.md`

**是什么**

- 每个 `RendererRuntime` 自己维护 `nextMountedCid`，CID 只在 runtime 内唯一，不是页面全局唯一。
- live DOM 根节点其实已经暴露了 `data-runtime-id`。
- 但 debugger 在做 inspect 时，一边从当前 controller 持有的 `componentRegistry` 里按 CID 取运行时元数据，一边仍直接用 `document.querySelector([data-cid="..."])` 在整个页面上找 DOM，而不是先按 runtime 缩小到对应的 `data-runtime-id` 根节点再查 `data-cid`。
- 当一个页面上存在两个 runtime，且它们各自都有 `data-cid="1"` 之类的节点时，inspect 结果会把 A runtime 的 registry 数据和 B runtime 的 DOM 元素拼在一起。

**为什么值得关心**

- 这破坏了 debugger 最基础的实例隔离。自动化或人工调试都可能拿到“类型/路径来自一个 runtime，tag/className 来自另一个 runtime”的混合结果。
- 问题隐蔽性很高，因为单实例 demo 不会暴露，只有嵌入式宿主、多 renderer 同页、或调试面板同时连接多个实例时才会出现。
- 这比单纯的 API 命名 alias 更严重，因为它让 inspect 数据本身不可信。

**信心水平**：确定

---

## 发现 5：Report toolbar 的 action 命名空间被重复前缀化，默认 undo/redo/save/preview wiring 与 provider 合同互相打架

**在哪里**

- `packages/report-designer-renderers/src/report-designer-toolbar.tsx:26-33`
- `packages/report-designer-renderers/src/report-designer-toolbar-helpers.ts:81-99`
- `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:7-40`
- `packages/report-designer-renderers/src/host-action-provider.ts:42-49`
- 旁证测试：`packages/report-designer-renderers/src/report-designer-toolbar-helpers.test.ts:118-154`

**是什么**

- toolbar 默认项和 helper 都把 action/type 写成带前缀的值，如 `report-designer:undo`。
- 点击时，组件又会额外执行一次：

```ts
props.helpers.dispatch({
  action: 'report-designer:' + (command.type as string),
  ...command,
});
```

- 所以 `toCommand('report-designer:undo')` 产出的 `{ type: 'report-designer:undo' }` 会被再次拼成 `action: 'report-designer:report-designer:undo'`。
- 同时 `createReportDesignerActionProvider()` 又假设自己接收的是未带前缀的方法名，再执行 `type: \\`report-designer:${method}\\``。

这说明当前实现内部存在两套互相冲突的合同：

- 一套认为 toolbar item `action`/command `type` 应该已经带完整前缀。
- 一套认为 provider `method` 应该是不带前缀的裸命令名。

**为什么值得关心**

- 这不是潜在风格问题，而是默认 toolbar 的 live wiring 就处于自相矛盾状态。undo/redo/save/preview 这类最基础动作可能直接 no-op 或落不到真实命令。
- 更严重的是，helper 测试当前还在把“带前缀输入 -> 带前缀输出”锁成正确行为，这会把错误合同继续固化。
- 这是一个“文档/默认值/helper/provider/测试一起协同把错误变成 baseline”的例子，修复成本会随着更多自定义 toolbar 配置继续上升。

**信心水平**：确定

---

## 总评

本轮最值得关注的 3 个方向：

1. **跨子系统 split-brain**：Report Designer 和 Spreadsheet Core 已经不再共享同一份 spreadsheet 真相源，这类问题比普通状态 bug 更危险，因为保存、导出、画布、宿主 scope 可能各自正确但彼此冲突。
2. **编辑器恢复语义不闭合**：Word Editor 的文档/数据集恢复流程暴露出“加载了恢复态，但公开宿主状态仍是旧态或被 schema 覆盖”的模式，用户最关心的数据恢复场景反而最不可信。
3. **实例隔离在宿主/调试边界失守**：Debugger 的全局 DOM 查询和 report toolbar 的命名空间合同冲突，都说明系统在走出单实例 happy path 后，边界契约还不够硬。

## 本次审查的盲区自评

- 这一轮主要追了跨边界状态和宿主契约，没有做性能压测或大规模 schema 的实际运行验证。
- 尚未深入浏览器兼容性、bundle/build 产物、以及更广泛的安全输入面。
- 如果继续下一轮，最适合从 **flow designer tree mode 的 owner/history 边界** 和 **runtime/surface dispose 后残留状态** 继续切入，因为这两条线已经出现新的异常信号，但还需要更深的 live 复核来区分真 defect 和已接受设计。
