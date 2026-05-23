# 2026-05-02 对抗性审查 review-4

本次审查按 `docs/skills/open-ended-adversarial-review-prompt.md` 执行，先阅读了 `AGENTS.md`、`docs/index.md` 以及核心架构约束文档，然后在 runtime / designer / host-bridge / editor 相关代码中做了开放式对抗性检查。

## 发现 1: Flow Designer 的 ELK 取消令牌是模块级全局状态，多个实例会互相取消

- 在哪里
  - `packages/flow-designer-core/src/elk-layout.ts:4-8`
  - `packages/flow-designer-core/src/elk-layout.ts:23`
  - `packages/flow-designer-core/src/elk-layout.ts:60-61`
  - `packages/flow-designer-renderers/src/designer-page.tsx:278-281`
- 是什么
  - `layoutRequestId` 是模块级共享变量，`invalidateElkLayoutRequests()` 直接递增这个全局计数。
  - `layoutWithElk()` 在开始时捕获 `requestId`，结束时用 `requestId !== layoutRequestId` 判定结果是否 stale。
  - `DesignerPage` 卸载时会无条件调用 `invalidateElkLayoutRequests()`。
  - 结果是：任意一个 designer 实例卸载、或别的实例发起新布局，都会让当前实例的在途布局结果被全局判 stale。
- 为什么值得关心
  - 这是典型的跨实例并发污染，违反了文档里强调的词法所有权和宿主边界隔离。
  - 在同页多个设计器、嵌套预览、保活切换、并行测试里，会出现布局结果“偶发不生效”的毛刺，而且非常难定位，因为每个实例本地代码看起来都没错。
  - 这也是一个可扩散模式：只要以后别的 host 也复用同一个 layout helper，问题会继续放大。
- 信心水平
  - 确定

## 发现 2: Report Designer bridge 把 `designer.dirty` 错绑到 spreadsheet dirty，和同包其它出口语义冲突

- 在哪里
  - `packages/report-designer-renderers/src/bridge.ts:70-79`
  - `packages/report-designer-core/src/core.ts:59-69`
  - `packages/report-designer-renderers/src/page-renderer.tsx:224-233`
  - `packages/report-designer-renderers/src/host-data.ts:144-171`
  - `packages/report-designer-renderers/src/bridge.test.ts:123-136`
- 是什么
  - `ReportDesignerCore` 的 `snapshot.dirty` 明确由 designer 自己的 `undoStack` 决定，包含纯语义层改动，例如 metadata 更新。
  - 但 `deriveDesignerHostSnapshot()` 却把 `designer.dirty` 赋值为 `spreadsheet.runtime.dirty`，完全忽略了 `designer.dirty`。
  - 同一个包内，`page-renderer.tsx` 和 `host-data.ts` 又都把运行时 dirty 处理为 `snapshot.dirty || spreadsheetSnapshot.dirty`。
  - `bridge.test.ts` 还把这个错误行为固化成了测试预期，只验证 spreadsheet dirty 能透传到 `designer.dirty`，没有验证 designer 自己的 dirty。
- 是什么问题
  - 这不是单点实现瑕疵，而是同一子系统对“designer.dirty 究竟代表什么”给出了三套不同答案。
- 为什么值得关心
  - 纯 inspector / metadata 变更可以让 designer 已脏，但通过 bridge 暴露给宿主、工具栏或外层集成方时仍可能是 clean。
  - 结果会直接影响未保存提示、关闭保护、外层状态徽标、自动保存策略判断。
  - 更糟的是，这类问题很容易被局部 UI 掩盖，因为同包另一些路径又碰巧用了正确的合并 dirty 逻辑，导致行为看起来“有时对有时错”。
- 信心水平
  - 确定

## 发现 3: `report-designer:importTemplate` 替换文档后没有刷新派生状态，会遗留旧 field sources / inspector

- 在哪里
  - `packages/report-designer-core/src/core-dispatch.ts:67-71`
  - `packages/report-designer-core/src/core-dispatch.ts:214-232`
  - `packages/report-designer-core/src/core.ts:154-193`
  - `packages/report-designer-core/src/core.ts:229`
  - `packages/report-designer-core/src/core.ts:331-333`
- 是什么
  - 这个 core 已经有明确的派生状态刷新机制：`withDerivedRefresh()` 会在修改后调用 `refreshDerivedState()`，而 `setSelectionTarget()`、`syncSpreadsheetDocument()` 也会触发同样的刷新。
  - 但 `report-designer:importTemplate` 在导入后只做了 `document = imported` 和 `selectionTarget = undefined`，没有调用 `refreshDerivedState()`。
  - `refreshDerivedState()` 才是 `fieldSources`、`inspector.resolvedSchema`、`inspector.loading/error` 的统一收敛点。
- 为什么值得关心
  - 这是典型的“主文档已替换，但派生缓存没失效”的生命周期错误。
  - 导入模板后，字段面板、inspector schema、错误态可能继续展示旧模板的派生结果，直到后续某个无关操作偶然触发刷新。
  - 这种 bug 非常危险，因为用户看到的是一份文档，编辑器内部某些派生面板却仍在服务上一份文档，等于同时活着两套真相。
- 信心水平
  - 确定

## 发现 4: Word Editor 的 `save` 先清本地 dirty 再等宿主保存，失败时会伪装成“已保存”

- 在哪里
  - `packages/word-editor-renderers/src/word-editor-action-provider.ts:38-53`
- 是什么
  - `save` 流程先执行 `saveDocument()`、`saveDatasets()`、`editorStore.setDirty(false)`，然后才 `await input.saveEvent(...)`。
  - 如果宿主 `saveEvent` 失败，返回的是失败结果，但本地 dirty 已经被清掉了。
- 为什么值得关心
  - 这是 host bridge 上非常典型的时序反转问题：本地 UI 和外部持久化结果分叉。
  - 用户会看到“已保存”或不再提示 dirty，但真实宿主持久化并没有成功；之后如果依赖 dirty 做离开确认、自动重试或草稿保护，就会误丢数据。
  - 该问题还会污染上层 host scope，因为 `word-editor-page` 的运行时摘要直接读取 `editorStore.isDirty`。
- 信心水平
  - 确定

## 发现 5: Word Editor autosave 使用 `initialDocument` 的 charts/codes，后续新增内容会在 autosave 中回退

- 在哪里
  - `packages/word-editor-renderers/src/editor-canvas.tsx:38-50`
  - `packages/word-editor-renderers/src/word-editor-page.tsx:57-68`
  - `packages/word-editor-renderers/src/word-editor-page.tsx:139-152`
  - `packages/word-editor-renderers/src/word-editor-page.tsx:412-416`
  - `packages/word-editor-renderers/src/word-editor-action-provider.ts:63-79`
- 是什么
  - `WordEditorPage` 把图表和代码块维护在 React state `charts` / `codes` 中，`insertChart` / `insertCode` 也只更新这两份运行时 state。
  - 但 `EditorCanvas` 的 autosave 在组装 `SavedDocumentData` 时，用的是 `initialDocument?.charts` 和 `initialDocument?.codes`，不是当前状态。
  - 同时 `WordEditorPage` 又把 `savedDocument?.data` 作为 host scope 中 `document` 的优先来源，并把 `setSavedDocument` 直接传给了 `onAutosave`。
- 为什么值得关心
  - 这意味着：用户新增 chart/code 后，只要发生一次 autosave，`savedDocument` 和 localStorage 中的文档附件就会回退成初始值。
  - 由于 host scope 优先读 autosave 产物，外层宿主、预览、再次加载草稿时都可能看到缺失后的文档，而当前页面内的局部 React state 又还保留着新增内容，形成双轨状态。
  - 这是比“忘记保存某个字段”更危险的 bug，因为它不是静态漏写，而是后续某次 autosave 主动把新数据冲掉。
- 信心水平
  - 确定

## 总评

这次最值得优先关注的 3 个方向：

1. host bridge 语义一致性
   - `report-designer` 和 `word-editor` 都暴露了同一类问题：内部状态语义与 bridge/export 给宿主的语义不一致。这个层面一旦漂移，外层工具栏、保存提示、自动化、集成宿主都会被误导。

2. 派生状态与主状态的失效边界
   - `report-designer:importTemplate` 和 `word-editor` autosave 都说明仓库里存在“主文档更新了，但派生缓存/投影没有同步刷新”的风险模式。这个模式会制造最难查的 UI 错乱，因为每一层局部看起来都合理。

3. 实例隔离与所有权收敛
   - Flow Designer 的全局布局取消令牌说明某些 helper 仍在使用模块级共享状态，而不是实例级 owner。随着 playground、designer、host workbench 越来越多并存，这类问题会从偶发毛刺演变为系统性不稳定。
