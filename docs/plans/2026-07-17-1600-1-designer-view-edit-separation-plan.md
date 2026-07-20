# Designer View/Edit 分离实现计划

> Plan Status: active
> Last Reviewed: 2026-07-17
> Source: `docs/architecture/designer-view-vs-edit.md`
> Related: `docs/architecture/designer-workbench-shell.md`, `docs/architecture/spreadsheet/design.md`, `docs/architecture/flow-designer/design.md`, `docs/architecture/report-designer/design.md`

## Purpose

在 Flux 四个设计器家族（Spreadsheet、Flow Designer、Report Designer、Word Editor）中实现 View/Edit 分离，使得各设计器可通过顶层 `readOnly: true` 开关切换为只读查看模式，无需业务方手动关闭每个子能力。

## Current Baseline

- `spreadsheet-core`: 已有完整的 `readonly` 模式——`createSpreadsheetCore({ readonly: true })` 初始化，`READ_ONLY_COMMANDS` 白名单守卫 mutation 命令，`snapshot.readonly` 暴露给 renderer。但 `spreadsheet:undo`/`spreadsheet:redo` 仍在白名单中，与 View 模式"不产生 undo/redo"的原则矛盾。
- `spreadsheet-page` schema: 已有 `readOnly?: boolean` 字段。
- `spreadsheet-renderers`: `use-spreadsheet-interactions.ts` 已消费 `snapshot.runtime.readonly`。但 renderer 层快捷键和 toolbar 的 readonly 处理不完整——键盘编辑通过 `use-keyboard.ts` 的 `readOnly` 参数守卫，但 toolbar 按钮缺乏基于 readonly 的自动过滤机制。
- `flow-designer-core`: 使用直接方法（`addNode()`、`deleteNode()` 等），**没有**中央命令调度模式。`DesignerCore` 接口和 `DesignerSnapshot` 均无 `readonly` 字段。`createDesignerCore()` 接收位置参数而不是 options 对象。
- `designer-page` schema: **没有** `readOnly` 字段。`DesignerPageSchemaInput` 仅包含 `config`、`document`、`toolbar`、`inspector`、`dialogs`。
- `DesignerFeatures`：包含 `undo`/`redo`/`clipboard`/`grid`/`minimap` 等开关，但 view-safe vs mutation-related 的分类未定义。
- `report-designer-core`: **没有** `readonly` 支持。`ReportDesignerCore` 工厂函数和 `ReportDesignerPageSchemaInput` 均缺少相关字段。
- `report-designer-renderers`: `ReportDesignerPageSchemaInput` 没有 `readOnly` 字段。
- `word-editor`: Core 和 Renderer 均**没有** `readOnly` 支持。关于 `WordEditorPageSchemaInput` 和 `WordEditorCore` 是否存在需要进一步确认——当前代码库中 `packages/word-editor-core` 和 `packages/word-editor-renderers` 目录可能存在但 `readOnly` 支持未实现。
- 设计文档 `docs/architecture/designer-view-vs-edit.md` 已在起草/审核阶段完成，定义了完整的 View/Edit 分离原则、command firewall 模式、features 分类、工具栏变换规则。
- `docs/architecture/designer-workbench-shell.md` 定义了侧面板可见性规则，但未覆盖 View/Edit 模式下的差异。

## Goals

1. Spreadsheet Core 的 `READ_ONLY_COMMANDS` 白名单修正（移除 undo/redo），使参考模式与设计原则一致
2. Flow Designer 实现 readOnly 支持（方法级守卫 + schema 字段 + renderer 层短路）
3. Report Designer 实现 readOnly 支持（含透传到 spreadsheet-core）
4. Word Editor 实现 readOnly 支持
5. 所有受影响的设计文档同步更新

## Non-Goals

- 不为 Flow Designer 引入中央命令调度模式（留作未来重构目标）
- 不改变 `DesignerFeatures` 的现有 schema 结构（仅在运行时做 view-safe vs mutation-related 分类）
- 不实现 SchemaRenderer 框架层面的自动组件降级机制（inspector 只读渲染由 config 或 renderer 层面的独立只读 schema 处理）
- 不涉及 nop-entropy（Java 后端）的改动

## Scope

### In Scope

- `packages/spreadsheet-core/src/command-handlers/index.ts` — READ_ONLY_COMMANDS 修正
- `packages/spreadsheet-renderers/src/` — toolbar/shortcuts readonly 补齐
- `packages/flow-designer-core/src/` — `readonly` 参数 + 方法级守卫 + snapshot 字段
- `packages/flow-designer-renderers/src/` — schema 字段 + toolbar 变换 + palette/inspector 隐藏
- `packages/report-designer-core/src/` — `readonly` 参数 + 透传到 spreadsheet
- `packages/report-designer-renderers/src/` — schema 字段 + toolbar 变换 + panel 隐藏
- `packages/word-editor-core/src/` — `readonly` 参数 + READ_ONLY_COMMANDS
- `packages/word-editor-renderers/src/` — schema 字段 + toolbar 变换
- `docs/architecture/designer-view-vs-edit.md` — 维护更新
- `docs/architecture/designer-workbench-shell.md` — 补充 View/Edit 差异
- 每个设计器家族的 owner doc 同步

### Out Of Scope

- 引入中央命令调度到 Flow Designer Core
- SchemaRenderer 框架层面的全局 readonly 组件降级
- 纯文档计划不涉及的代码变更

## Failure Paths

| 场景                                                | 触发                                                         | 行为                                    | 可重试         | 用户可见表现            |
| --------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------- | -------------- | ----------------------- |
| `readOnly: true` 时 mutation 命令绕过守卫           | Flow Designer 方法级守卫遗漏某个 mutation 方法               | 文档被意外修改，dirty 状态出现          | 否             | 只读视图下数据被修改    |
| `readOnly: true` 时 toolbar 仍显示编辑按钮          | renderer 层 toolbar filter 遗漏                              | 用户点击后 action 被 core 层拒绝        | 是（刷新页面） | 按钮可见但点击无效      |
| `features.export` 在 View 模式下被错误覆盖          | §3.4 的 VIEW_SAFE_FEATURES 分类遗漏 `export`                 | 导出按钮被隐藏                          | 否             | View 模式下无法导出数据 |
| Flow Designer `autoLayout` 在 View 模式下 push 历史 | layout 方法未区分 readonly 路径                              | dirty 标志被置为 true                   | 否             | 只读视图显示"未保存"    |
| `readOnly: true` + `disabled: true` 交互优先级颠倒  | 设计 doc §3.3.1 定义 disabled > readonly，但实现检查顺序错误 | disabled 导航被 readonly 短路而仍可交互 | 否             | 禁用状态下仍可缩放/平移 |

## Test Strategy

`必须自动化`：command firewall（每个设计器 core 的 readonly 守卫）、toolbar filter（View 模式不渲染编辑按钮）、panel visibility（View 模式隐藏 palette/字段面板）。设计器核心的只读模式直接影响数据安全，必须自动化覆盖。

级别区分：Core 层守卫 → focused unit tests（Vitest + happy-dom，与现有 core 测试框架一致）；Renderer 层守卫 → component integration tests（Vitest + jsdom，使用标准 Flux renderer 测试工具函数）。

## Execution Plan

### Phase 0 — Spreadsheet Core 修正 + 文档固化

Status: planned
Targets: `packages/spreadsheet-core/src/command-handlers/index.ts`, `packages/spreadsheet-renderers/src/`

- Item Types: `Fix | Proof`

- [ ] Fix: 从 `READ_ONLY_COMMANDS` 白名单中移除 `spreadsheet:undo` 和 `spreadsheet:redo`
- [ ] Proof: 确认现有 readonly 模式测试（`core-advanced.test.ts` 的 `readonly mode` describe block）不受影响
- [ ] Fix: 更新白名单的代码注释说明"这是一份 view-safe commands 白名单"
- [ ] Proof: 在 `core-advanced.test.ts` 中增加验证——readonly 模式下 `spreadsheet:undo`/`spreadsheet:redo` 被拒绝

Exit Criteria:

- [ ] `READ_ONLY_COMMANDS` 白名单中不再包含 `spreadsheet:undo` 和 `spreadsheet:redo`
- [ ] `pnpm test -- --filter=@nop-chaos/spreadsheet-core` 通过
- [ ] 新增 focused 测试：readonly 模式下 undo/redo 命令被拒绝

### Phase 1 — Flow Designer readOnly 支持

Status: planned
Targets: `packages/flow-designer-core/src/`, `packages/flow-designer-renderers/src/`, `docs/architecture/flow-designer/`

- Item Types: `Fix | Decision | Proof`

- [ ] Decision: `createDesignerCore()` 从位置参数改为 options 对象 `{ document, config, readonly? }`，或保持位置参数但增加第三个参数 `options?: { readonly?: boolean }`。推荐后者以最小化 break change
- [ ] Fix: `DesignerCore` 接口增加 `readonly` 参数支持。每个 mutation 方法入口加 `readonly` 守卫（选项 A）
- [ ] Fix: `DesignerSnapshot` 增加 `readonly: boolean` 字段
- [ ] Fix: `autoLayout` 在 View 模式下走只读路径——执行布局算法但不 push 历史、不设 dirty 标志、不触发 `documentChanged` 事件。需要将 layout 与历史/脏状态解耦
- [ ] Fix: `DesignerPageSchemaInput` 增加 `readOnly?: boolean` 字段
- [ ] Fix: designer-page renderer 根据 `readOnly` 选择默认 toolbar（viewToolbar vs editToolbar）
- [ ] Fix: designer-page renderer 在 View 模式下隐藏 palette
- [ ] Fix: designer-page renderer 在 View 模式下 inspector 降级为只读（或隐藏，取决于 config 是否提供只读版 inspector.body）
- [ ] Fix: View 模式下快捷键仅保留方向键平移 + Ctrl+滚轮缩放
- [ ] Fix: renderer 层 toolbar item 自动过滤——View 模式下不渲染 mutation action buttons
- [ ] Proof: 新增 focused 测试——view 模式下 method rejection、toolbar filter、palette visibility、shortcut isolation
- [ ] Proof: 更新 `docs/architecture/flow-designer/design.md` — DesignerPageSchema 增加 readOnly 字段
- [ ] Proof: 更新 `docs/architecture/flow-designer/config-schema.md` — DesignerPageSchemaInput 增加 readOnly

Exit Criteria:

- [ ] `DesignerCore` 所有 mutation 方法在 `readonly: true` 时返回 `{ ok: false, error: 'Document is readonly' }`
- [ ] `DesignerSnapshot.readonly` 在 `readonly: true` 时为 `true`
- [ ] View 模式下 toolbar 不包含 undo/redo/save 按钮
- [ ] View 模式下 toolbar 仍显示 `fitView`/`export`/`toggleGrid`/`toggleMinimap` 等 view-safe 按钮
- [ ] View 模式下 palette 隐藏
- [ ] View 模式下快捷键不能触发 mutation
- [ ] `pnpm test -- --filter=@nop-chaos/flow-designer-core` 通过
- [ ] `pnpm test -- --filter=@nop-chaos/flow-designer-renderers` 通过
- [ ] 受影响的 owner docs 已同步

### Phase 2 — Report Designer readOnly 支持

Status: planned
Targets: `packages/report-designer-core/src/`, `packages/report-designer-renderers/src/`, `docs/architecture/report-designer/`

- Item Types: `Fix | Decision | Proof`

- [ ] Decision: `CreateReportDesignerCoreOptions` 增加 `readonly?: boolean`
- [ ] Fix: Report Designer Core 初始化时透传 `readonly` 到 `createSpreadsheetCore()`
- [ ] Fix: `ReportDesignerPageSchemaInput` 增加 `readOnly?: boolean` 字段
- [ ] Fix: report-designer-page renderer 根据 `readOnly` 选择默认 toolbar
- [ ] Fix: View 模式下隐藏字段面板
- [ ] Fix: View 模式下 inspector 降级为只读（或隐藏，取决于 config 是否提供只读版 inspector.body）
- [ ] Fix: View 模式下字段拖拽不可用（含 use-field-drop 的 readOnly 守卫——已有实现，确认即可）
- [ ] Fix: View 模式下 `report-designer:preview`/`stopPreview`/`exportTemplate` 可调用，`dropFieldToTarget`/`updateMeta`/`importTemplate` 被拒绝
- [ ] Proof: 新增 focused 测试——view 模式下 command rejection、toolbar filter、panel visibility
- [ ] Proof: 更新 `docs/architecture/report-designer/design.md`
- [ ] Proof: 更新 `docs/architecture/report-designer/config-schema.md`

Exit Criteria:

- [ ] `readonly: true` 时 spreadsheet core 初始化为 `readonly: true`
- [ ] View 模式下字段面板隐藏
- [ ] View 模式下字段拖拽不可用
- [ ] View 模式下 preview 可正常触发
- [ ] View 模式下 `exportTemplate` 被允许，`importTemplate` 被拒绝
- [ ] `pnpm test -- --filter=@nop-chaos/report-designer-core` 通过
- [ ] `pnpm test -- --filter=@nop-chaos/report-designer-renderers` 通过
- [ ] 受影响的 owner docs 已同步

### Phase 3 — Word Editor readOnly 支持

Status: planned
Targets: `packages/word-editor-core/src/`, `packages/word-editor-renderers/src/`, `docs/architecture/word-editor/`

- Item Types: `Fix | Decision | Proof`

- [ ] Decision: 确认 Word Editor Core 的当前架构——是否使用命令调度模式还是直接方法。若使用直接方法，参考 Flow Designer 选项 A（方法级守卫）；若使用命令调度，参考 Spreadsheet Core 模式
- [ ] Fix: Word Editor Core 工厂函数增加 `readonly?: boolean` 参数
- [ ] Fix: Word Editor Core 实现 READ_ONLY_COMMANDS 白名单（如适用），或在 mutation 方法入口加守卫
- [ ] Fix: `WordEditorPageSchemaInput` 增加 `readOnly?: boolean` 字段
- [ ] Fix: word-editor-page renderer 根据 `readOnly` 调整 UI（隐藏编辑工具栏按钮、只读文档渲染）
- [ ] Proof: 新增 focused 测试——view 模式下 command rejection
- [ ] Proof: 更新 `docs/architecture/word-editor/design.md`

Exit Criteria:

- [ ] Word Editor 支持 `readOnly: true` 初始化
- [ ] View 模式下不渲染编辑 UI
- [ ] View 模式下大纲面板保持可见（导航用途）
- [ ] `pnpm test -- --filter=@nop-chaos/word-editor-core` 通过
- [ ] `pnpm test -- --filter=@nop-chaos/word-editor-renderers` 通过
- [ ] 受影响的 owner docs 已同步

### Phase 4 — 跨设计器文档同步

Status: planned
Targets: `docs/architecture/`

- Item Types: `Fix | Proof`

- [ ] Fix: 更新 `docs/architecture/designer-workbench-shell.md`——补充 View/Edit 模式下侧面板可见性规则（View 模式隐藏左侧编辑面板，保留右侧只读导航面板）
- [ ] Proof: 在 `docs/architecture/designer-view-vs-edit.md` 中添加本次实现的 closure note（可选，主题设计文档不记录历史）
- [ ] Fix: 确认所有 owner doc 中的 `readOnly`/`readonly` 字段已添加（§6 清单逐项核对）
- [ ] Fix: 检查 `docs/architecture/spreadsheet/design.md`（如存在）是否固化 spreadsheet readonly 行为
- [ ] Proof: 运行 `pnpm test` 全量通过

Exit Criteria:

- [ ] `docs/architecture/designer-workbench-shell.md` 包含 View/Edit 侧面板规则
- [ ] 所有 owner doc 的 readOnly 字段已同步

## Draft Review Record

- Reviewer / Agent: ses_091c95b85ffePQKC8cAgS5JGAL (general, fresh session)
- Verdict: PASS_WITH_MINOR_ISSUES
- Rounds: 1
- Findings addressed: 6 minor issues resolved — (1) Phase 1 exit criteria expanded with view-safe toolbar visibility check, (2) Phase 2 exit criteria added `exportTemplate`/`importTemplate` checks, (3) Phase 3 exit criteria added outline panel visibility check, (4) Phase 4 exit criteria deduplicated from Closure Gates, (5) Failure paths added `readOnly`+`disabled` interaction row, (6) Test Strategy clarified core vs renderer test levels.

## Closure Gates

- [ ] 所有 in-scope 设计器 core 的 readonly 守卫已实现并通过测试
- [ ] 所有 in-scope design page schema 已增加 `readOnly` 字段
- [ ] View 模式下 toolbar 不包含 mutation action
- [ ] View 模式下 palette/字段面板隐藏
- [ ] View 模式下 inspector 不渲染编辑控件
- [ ] View 模式下 dirty/canUndo/canRedo 正确
- [ ] `readOnly: false`（缺省）行为与现有 Edit 模式完全一致，零回归
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect
- [ ] 受影响的 owner docs 已同步到 live baseline
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### Flow Designer 中央命令调度

- Classification: `optimization candidate`
- Why Not Blocking Closure: 方法级守卫（选项 A）已足够实现 View/Edit 分离功能。命令调度是代码组织优化，不是功能必需。目前 Flow Designer Core 的方法数量有限（约 15 个 mutation 方法），方法级守卫的维护成本可控。未来若方法数量增长到需要统一调度时再重构。
- Successor Required: `no`
- Successor Path: N/A

### SchemaRenderer 全局 readonly 组件降级

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本文档的 Inspector 规则已明确建议"config 提供独立只读 schema"，不依赖框架层面的自动降级。此功能属于框架增强，不影响当前设计器 View/Edit 分离的实现。
- Successor Required: `no`
- Successor Path: N/A

## Non-Blocking Follow-ups

- 评估 Flow Designer `createDesignerCore()` 的位置参数改为 options 对象，以保持与 Spreadsheet/Report Designer 的 API 风格一致（但非功能必需，可 defer）
- 调研 Flow Designer Core 是否适合引入中央命令调度模式（作为长期代码健康改进）

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:
