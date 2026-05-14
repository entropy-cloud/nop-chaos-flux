# 维度 04：状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] Word Editor host scope `document` 在空 persisted 路径下混入 live `charts/codes`

- **文件**: `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:163-176`
- **证据片段**:
  ```ts
  document: savedDocument?.data ?? {
    header: [],
    main: [],
    footer: [],
    charts,
    codes,
  },
  ```
- **严重程度**: P2
- **现状**: `savedDocument` 为空时，对外 host scope 的 `document` 不是纯 persisted/autosaved snapshot，而是空正文骨架叠加 live `charts/codes`。
- **风险**: 同一个 schema-visible `document` 字段在空态时混入 live 子结构，弱化了“document 表示 persisted/autosaved snapshot”的单一语义。
- **建议**: 让 `document` 始终只代表 persisted/autosaved snapshot；空态回退也应是纯空骨架，live extras 通过独立字段发布。
- **双状态详情**: `savedDocument.data` 与本地 `charts/codes` 被折叠进同一个 `document` 发布面。
- **同步失败症状**: 无 recovered 文档时，消费方可能看到空正文但又读到最新 `charts/codes`。
- **误报排除**: 问题发生在对 schema 可见的 host projection，不是纯局部 UI state。
- **复核状态**: 未复核

## 深挖第 2 轮追加

### [维度04-02] Report Designer 同时发布 canonical `selectionTarget` 与 spreadsheet convenience 选择字段

- **文件**: `packages/report-designer-renderers/src/host-data.ts:180-187`, `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:86-140`
- **证据片段**:
  ```ts
  selectionTarget: snapshot.selectionTarget,
  selection: snapshot.selectionTarget,
  target: snapshot.selectionTarget,
  activeCell: spreadsheet?.activeCell,
  activeRange: spreadsheet?.activeRange,
  ```
- **严重程度**: P2
- **现状**: host scope 同时发布报表层 canonical `selectionTarget` 与 spreadsheet convenience 字段，二者通过 effect 同步，不是同一时刻的单 owner 快照。
- **风险**: 在短暂同步窗口内，消费方可能读到 canonical target 与 spreadsheet convenience 选择不一致。
- **建议**: 明确 convenience 字段的从属地位，或只在与 canonical 选择一致时发布。
- **双状态详情**: `ReportDesignerCore.selectionTarget` 与 spreadsheet-derived `activeCell/activeRange` 在同一发布面并列出现。
- **同步失败症状**: inspector/toolbar 读取 canonical target，其他 schema 读取 convenience 字段时可能出现短暂分叉。
- **误报排除**: 当前 docs 已支持 convenience 字段存在；问题仅是存在短暂不同步窗口，不是把 convenience 本身误判成违规。
- **复核状态**: 未复核

### [维度04-03] 默认 Undo/Redo 按钮的启用态与执行 owner 不一致

- **文件**: `packages/report-designer-renderers/src/host-data.ts:148-150`, `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:11-20`, `packages/report-designer-core/src/core-dispatch.ts:283-317`
- **证据片段**:
  ```ts
  canUndo: runtimeCanUndo,
  canRedo: runtimeCanRedo,
  ```
  ```ts
  { id: 'undo', action: 'report-designer:undo', disabled: '${!canUndo}' }
  { id: 'redo', action: 'report-designer:redo', disabled: '${!canRedo}' }
  ```
- **严重程度**: P1
- **现状**: host scope 发布的是聚合 `canUndo/canRedo`，默认按钮却固定执行 report owner 的 `undo/redo`。
- **风险**: 当聚合值由非 report owner 历史驱动时，按钮可能被启用但语义上并不是同一个 owner 的可撤销状态。
- **建议**: 让按钮启用态与执行路径来自同一 owner，或把动作升级为真正的聚合命令。
- **双状态详情**: 读取的是聚合历史真相，写入的是 report owner 历史真相。
- **同步失败症状**: UI 显示可撤销，但默认命令只触达 report owner。
- **误报排除**: 这不是单纯“多 history 共存”架构问题，而是默认 toolbar 合同把读写 owner 错接到一起。
- **复核状态**: 未复核

## 深挖第 3 轮追加

### [维度04-04] Word Editor 的 `dirty` 由 autosave 与 explicit save 两条路径同时清零

- **文件**: `packages/word-editor-renderers/src/editor-canvas.tsx:52-73`, `packages/word-editor-renderers/src/word-editor-action-provider.ts:61-73`, `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:217-230`
- **证据片段**:
  ```ts
  localStorage.setItem('nop-word-editor-document', JSON.stringify(saved));
  onAutosaveRef.current?.(saved);
  editorStore.setDirty(false);
  ```
  ```ts
  input.editorStore.setDirty(false);
  input.onDocumentSaved?.(saved);
  ```
- **严重程度**: P1
- **现状**: autosave 本地持久化成功会清 `dirty`，显式 save 在 host `saveEvent` 成功后也清同一个 `dirty`。
- **风险**: `runtime.dirty` / `statusPath` 被同时拿来表达“本地恢复点已落盘”和“宿主保存已完成”，外部看到的是混合保存语义。
- **建议**: 把 dirty 的 canonical owner 收敛到显式保存语义；若需要保留 autosave 状态，应拆出独立状态位。
- **双状态详情**: autosave/localStorage 成功与 host save 成功都争夺同一个 `editorStore.isDirty`。
- **同步失败症状**: 停顿 500ms 后 UI 可能显示 clean，但 host `saveEvent` 从未执行。
- **误报排除**: `dirty` 已发布到 host runtime/statusPath，不是纯视觉提示态。
- **复核状态**: 未复核

### [维度04-05] `reportDocument.spreadsheet` 对外发布面可先于 save/export 的 canonical 文档

- **文件**: `packages/report-designer-renderers/src/host-data.ts:145-153,180-187`, `packages/report-designer-renderers/src/page-renderer.tsx:407-419`, `packages/report-designer-core/src/core-dispatch.ts:319-322`
- **证据片段**:
  ```ts
  const reportDocument = spreadsheetSnapshot
    ? { ...snapshot.document, spreadsheet: spreadsheetSnapshot.document }
    : snapshot.document;
  ```
- **严重程度**: P1
- **现状**: host scope 发布的 `reportDocument.spreadsheet` 优先读取 spreadsheet live snapshot，而 save/export 读取 report core document。
- **风险**: 在 sync effect 落地前，UI 读到的 `reportDocument` 与实际 save/export 读面可能不是同一个 canonical snapshot。
- **建议**: 对外 schema-visible `reportDocument` 应只发布 report core canonical 文档。
- **双状态详情**: spreadsheet live document 与 report core document 争夺同一对外文档发布面。
- **同步失败症状**: 界面已显示最新 workbook，但立即保存时导出的仍可能是旧 workbook。
- **误报排除**: 这不是内部双 core bridge 本身，而是公共读面越过了 canonical 文档边界。
- **复核状态**: 未复核

## 深挖第 4 轮追加

### [维度04-06] Report Designer 的 save 成功语义与 `dirty`/status 发布缺少统一 saved baseline owner

- **文件**: `packages/report-designer-core/src/core.ts:55-72`, `packages/report-designer-core/src/core-dispatch.ts:319-322`, `packages/report-designer-renderers/src/page-renderer.tsx:480-493`
- **证据片段**:
  ```ts
  dirty: state.undoStack.length > 0,
  ```
  ```ts
  return { ok: true, changed: false, data: exported };
  ```
- **严重程度**: P1
- **现状**: 默认 save 命令只返回当前 document clone，不推进任何 saved baseline；dirty 仍只按 undo 栈与 spreadsheet dirty 聚合发布。
- **风险**: 同一份文档会同时呈现“save 成功”和“仍未保存”的两套真相，后续 leave guard/status badge 容易失真。
- **建议**: 引入显式 saved baseline owner，或由 host `onSave`/ack 正式推进 baseline。
- **双状态详情**: save 命令结果与 `dirty/statusPath` 共同表达“是否已保存”，但没有共同基线。
- **同步失败症状**: 点击 save 成功后，status 仍持续报告 dirty。
- **误报排除**: 这不是“保存后仍可 undo”的编辑器常见取舍，问题是 save-success 与 dirty 发布没有共同 owner。
- **复核状态**: 未复核

## 深挖第 5 轮追加

### [维度04-07] Report field-drop 一次手势跨了 spreadsheet history、report sync history 与 metadata history

- **文件**: `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:151-170`, `packages/report-designer-renderers/src/page-renderer.tsx:407-419`, `packages/report-designer-core/src/core.ts:407-418`, `packages/report-designer-core/src/core-dispatch.ts:76-127`
- **证据片段**:
  ```ts
  await dispatch({ actionType: 'spreadsheet:setCellValue', ... });
  await dispatch({ actionType: 'report-designer:dropFieldToTarget', ... });
  ```
- **严重程度**: P1
- **现状**: 一次 field drop 先改 spreadsheet，再改 report metadata，之后 spreadsheet 变化又经 sync effect 回灌到 report core history。
- **风险**: 单次拖放手势不再是一个 canonical 事务，用户可落入公式值、同步文档、metadata 分裂撤销的半状态。
- **建议**: 把 field-drop 收敛为单一 canonical report 文档事务，或确保 sync 回灌不再重复入 history。
- **双状态详情**: 同一手势同时写入 spreadsheet owner 历史、report sync 历史、report metadata 历史。
- **同步失败症状**: 撤销时可能只能回退其中一部分效果，而不是整次拖放手势。
- **误报排除**: 这不同于默认 undo/redo 按钮 wiring 问题；这里是手势本身被拆成多个 owner-local 历史单元。
- **复核状态**: 未复核

### [维度04-08] Word Editor 显式保存会在 host save 成功前前移本地 recovery baseline

- **文件**: `packages/word-editor-renderers/src/word-editor-action-provider.ts:45-64`, `packages/word-editor-core/src/document-io.ts:210-255`, `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:65-81`
- **证据片段**:
  ```ts
  saveDocument(saved);
  saveDatasets(input.datasetStore.getAll());
  const result = await input.saveEvent(undefined, ctx);
  if (!result.ok) {
    return result;
  }
  ```
- **严重程度**: P1
- **现状**: 显式保存先写本地恢复态，再等待 host `saveEvent`；若 host save 失败，当前会话仍 dirty，但下一次 remount 已可能恢复到更前移的本地 baseline。
- **风险**: “本地恢复已前移”与“host save 失败、当前仍未保存”变成两套 competing saved truths。
- **建议**: 仅在 host save 成功后推进 recovery baseline，或把 recovery cache 与 explicit saved baseline 拆成独立存储。
- **双状态详情**: local recovery baseline 与 host persisted baseline 在同一次显式保存中非原子推进。
- **同步失败症状**: 当前会话显示 save 失败，但重载后又恢复到这次失败保存对应的新版本。
- **误报排除**: 这不是 autosave 契约；问题发生在显式 save 主路径，且直接影响 persisted-first recovery。
- **复核状态**: 未复核

## 维度复核结论

- [维度04-01]: 降级为 P3。仅发生在无 recovered/initial persisted 文档的空态 fallback，问题真实但影响较窄。
- [维度04-02]: 驳回。当前 docs 已明确 `selectionTarget` 是 canonical，`activeCell/activeRange` 属 convenience 字段，不宜按 owner 违约上报。
- [维度04-03]: 保留为 P2。默认按钮的启用读面与执行写面来自不同 owner，合同仍不一致。
- [维度04-04]: 保留为 P2。autosave 与 host save 共用 dirty 真相面，违背 Word Editor 当前设计基线。
- [维度04-05]: 保留为 P2。host projection 可先于 canonical save/export 文档，读写面存在不同步窗口。
- [维度04-06]: 降级为 P3。saved baseline owner 缺失真实存在，但当前 docs 对 save-success 后 dirty 是否归零的约束还不够强。
- [维度04-07]: 保留为 P2。field-drop 多 history 分裂是更核心的事务级 truth split。
- [维度04-08]: 保留为 P2。显式保存提前推进 recovery baseline，会制造 competing saved truths。

## 子项复核结论

- [维度04-01]: 降级 (P3)。空态 fallback 确有混投，但只在首轮空态发生。
- [维度04-02]: 降级 (P3)。存在短暂不同步窗口，但 convenience 字段本身是现行支持基线。
- [维度04-03]: 降级 (P3)。默认 wiring 有 contract drift，但大多数 spreadsheet 编辑最终仍会进入 report history。
- [维度04-04]: 成立 (P2)。autosave 与 host save 共享 dirty 真相面。
- [维度04-05]: 驳回。独立子项复核认为 live code 已通过双向同步和 parity 测试基本收口。
- [维度04-06]: 降级 (P3)。更像未完全收口的会话语义，而非已违背强契约。
- [维度04-07]: 成立 (P2)。一次 field-drop 被拆成多个 owner-local 历史单元，违反单事务基线。
- [维度04-08]: 降级 (P3)。问题主要影响失败后刷新/重进时的恢复基线，而非当前会话内主读面。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                               | 一句话摘要                                                 |
| ----- | -------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 04-01 | P3       | `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts:163-176`        | 空态 `document` fallback 混入 live `charts/codes`          |
| 04-02 | P3       | `packages/report-designer-renderers/src/host-data.ts:180-187`                      | canonical 选择与 convenience 选择字段存在短暂不同步窗口    |
| 04-03 | P3       | `packages/report-designer-renderers/src/report-designer-toolbar-defaults.ts:11-20` | 默认 Undo/Redo 的启用态与执行 owner 不一致                 |
| 04-04 | P2       | `packages/word-editor-renderers/src/editor-canvas.tsx:52-73`                       | autosave 与 host save 共用同一个 dirty 真相面              |
| 04-06 | P3       | `packages/report-designer-core/src/core-dispatch.ts:319-322`                       | save 成功语义与 dirty/status 缺少统一 saved baseline owner |
| 04-07 | P2       | `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:151-170`     | field-drop 一次手势被拆成多个 history owner                |
| 04-08 | P3       | `packages/word-editor-renderers/src/word-editor-action-provider.ts:45-64`          | 显式保存会在 host save 成功前前移本地 recovery baseline    |
