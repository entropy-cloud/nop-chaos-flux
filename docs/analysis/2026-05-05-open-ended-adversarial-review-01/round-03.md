# 对抗性审查 — 2026-05-05 第 3 轮

## 发现 1：ReportDesignerCore 公开 `setMetadata()` 会改文档，但不会留下 dirty/undo 痕迹

- 在哪里
  - `packages/report-designer-core/src/core.ts:54-70`
  - `packages/report-designer-core/src/core.ts:333-338`
  - 对照文档：`docs/architecture/report-designer/design.md:309-312`
- 是什么
  - `buildSnapshot()` 把 `dirty`、`canUndo`、`canRedo` 都建立在 `undoStack/redoStack` 上。
  - 但公开 API `setMetadata(target, nextMeta)` 只是直接改 `document`，没有调用 `pushUndoEntry()`，也没有补任何派生状态刷新。
  - 结果通过 core API 改 metadata 后，`exportDocument()` 已经变了，但外部看到的 runtime 仍可能是 `dirty=false`、`canUndo=false`。
- 为什么值得关心
  - 这是公开 API 与状态摘要语义的正面冲突：同一个 core 既允许你修改文档，又告诉宿主“没有脏变更”。
  - 一旦外部适配器、调试器、测试或未来 host action 直接使用这个 API，就会出现保存提示不亮、撤销不可用、状态栏误报的集成级缺陷。
  - 文档强调 schema 层写操作应通过统一 action/command 链提交；当前公开旁路 API 破坏了这条约束。
- 信心水平
  - 确定

## 发现 2：`report-field-panel` 从 host scope 取错了 `fieldSources` 路径

- 在哪里
  - `packages/report-designer-renderers/src/field-panel-renderer.tsx:15-25`
  - `packages/report-designer-renderers/src/host-data.ts:153-190`
  - 对照文档：`docs/architecture/report-designer/design.md:402-406`
- 是什么
  - `ReportFieldPanelRenderer` 只查 `scopeData.fieldSources`，没有查 live host scope 真正发布的 `scopeData.designer.fieldSources`。
  - 但 `buildReportDesignerScopeData()` 把 `fieldSources` 放在 `designer.fieldSources` 下，并没有发布顶层 `fieldSources` alias。
- 为什么值得关心
  - 这会让“字段面板读取宿主 scope”的默认直觉失效：custom field-panel region 如果按 live host scope 使用，很容易拿到空数组，除非再手工从 schema props 重传一次。
  - 更糟的是，文档又在强调 host scope 应暴露 `designer` 主投影和兼容 alias；现在 live code 与 renderer fallback 路径互相错位，属于内部契约自相矛盾。
- 信心水平
  - 确定

## 发现 3：Word Editor selection snapshot 丢了 `superscript/subscript`，工具栏 active 状态会撒谎

- 在哪里
  - `packages/word-editor-renderers/src/editor-canvas.tsx:96-113`
  - `packages/word-editor-core/src/editor-store.ts:6-44`
  - `packages/word-editor-renderers/src/toolbar/font-controls.tsx:97-108`
  - `packages/word-editor-renderers/src/word-editor-manifest.ts:98-122`
- 是什么
  - `EditorSelectionState` 明确定义了 `superscript`、`subscript`。
  - `FontControls` 也用这两个字段决定按钮 active 态。
  - 但 `EditorCanvas` 在 `onRangeStyleChange` 里同步 selection 时，只复制了 bold/italic/underline/strikeout 等字段，没有把 `payload.superscript`、`payload.subscript` 写入 store。
- 为什么值得关心
  - 这不是单纯 UI 漏一个高亮，而是 host-published `selection` 契约已经对外宣称支持 superscript/subscript，live 数据却系统性缺失。
  - 结果工具栏状态、宿主 scope、下游 schema 读取到的 selection 快照都会把上标/下标错误地当成 false，形成“编辑器真实状态”和“外部观察状态”分叉。
- 信心水平
  - 确定

## 发现 4：Report Designer 文档承诺了 `selection` / `target` alias，live host scope 没兑现

- 在哪里
  - 文档：`docs/architecture/report-designer/design.md:283-285,402-406`
  - 实现：`packages/report-designer-renderers/src/host-data.ts:153-190`
- 是什么
  - 文档明确写了 canonical 字段是 `selectionTarget`，同时保留 `selection` / `target` 作为兼容 alias。
  - 但 live host scope 只发布了 `selectionTarget`，没有 `selection`、`target`。
- 为什么值得关心
  - 这是直接面向 schema 作者的契约偏差。按照当前文档写的 schema 片段会静默失效，而不是在编译期暴露问题。
  - 这种错位尤其危险，因为它发生在“设计器 host scope 约定”层，用户看到的是表达式取不到值、面板空白，而不是显式错误。
- 信心水平
  - 很可能

## 本轮小结

- 本轮切入视角：公开 API 旁路、host scope 契约、manifest/toolbar/live state 一致性。
- 几个问题的共同模式是“文档/类型/manifest 已承诺某件事，但运行时只实现了一半”，这会对扩展作者和集成方产生比内部开发者更高的误导成本。
