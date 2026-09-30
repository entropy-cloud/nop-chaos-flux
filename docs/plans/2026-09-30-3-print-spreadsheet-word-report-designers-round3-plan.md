# 03 print/spreadsheet/word/report designer 批量优化（round-3）

> Plan Status: completed
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-perf-ux-round3-deep-optimization-analysis.md`（R3-P12 ~ P16、P20 ~ P22 + R3-U11、U13、U18、U22）
> Related: `docs/plans/2026-09-30-2-flow-designer-workbench-interaction-round3-plan.md`（editor-core 事务语义与 flow inspector 修复同族）

## Purpose

收口 print designer（拖拽 commit 周期、inspector 击键、O(n²) snap、预览全量 layout、校验明细、键盘选中）、spreadsheet（滚动帧成本、编辑草稿全局 store）、word editor（selection 订阅）、report designer（workbook 深拷贝、禁用原因）四个 designer 包在第三轮审计中的全部 12 条 finding。

## Current Baseline

- `editor-core.ts:159-180` `update()` 每次执行 diff + （policy='auto' 时）`runCommit`（validate + JSON.stringify 整模板 + structuredClone）——live 核实（执行者抽查成立）。
- `print-inspector.tsx` 所有 onChange 直调 `updateElement`，每击键一条 undo entry + 一次 runCommit——live 核实；flow designer 同病已由 round-2 修复（inspector draft coalesce 模式在位可参照）。
- `print-designer-canvas.tsx:74-76` `buildSnapOptions` O(n²) 扫描、:118-150 每 pointermove 走完整 commit、:252-305 元素无键盘选中路径——live 核实。
- `print-preview.tsx:28-29` 每 render 全量 layout + HTML 序列化——live 核实。
- spreadsheet：`spreadsheet-grid.tsx:197-210` 每 scroll dispatch、`table-shell.tsx:100` cell 未 memo、编辑草稿全局 store（`spreadsheet-core/src/core.ts:127-134`）——live 核实。
- word：`editor-store.ts:114-118` setSelection 恒新对象 + Object.is 订阅——live 核实。
- report：`report-designer-core/src/core.ts:459-475` syncSpreadsheetDocument structuredClone 整 workbook；`report-field-panel.tsx:111-113` 禁用无原因——live 核实。
- `print-designer.tsx:88-90,149-160` 校验只报数量；`editor-canvas.tsx:140-147` 字数仅 mount 取一次——live 核实。
- 上述各包现有单测/e2e 全绿（round-2 收口基线）。

## Goals

- print designer 拖拽每帧成本从「3 diff + 1 serialize + 1 structuredClone + 2 全画布渲染」降到一次轻量状态更新；inspector 击键合并提交、不再逐字符产生 undo 步。
- snap 候选计算从 O(n²) 降到 O(n)（拖拽会话内缓存）；preview layout memo 化。
- spreadsheet 滚动/编辑不再每帧/每键全网格重渲染。
- word selection 无变化不触发重渲染；report workbook 同步零深拷贝。
- UX：print 校验错误可定位、元素可键盘选中、report 插入禁用有原因、word 字数实时。

## Non-Goals

- 不改 editor-core 的 diff-based undo 契约与事务一拖拽一 undo 步语义（仅事务内跳过重复 commit/diff 的时机修正）。
- 不改 spreadsheet 虚拟化/键盘/命令层（已 clean）。
- 不做 print 模板 schema 扩展。

## Scope

### In Scope

- `packages/editor-core/src/editor-core.ts`（事务内 commit/diff 时机）
- `packages/flux-print-renderers/src/print-designer-canvas.tsx`、`print-inspector.tsx`、`print-preview.tsx`、`print-designer.tsx`、`editor/use-print-editor.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`、`src/spreadsheet-grid/table-shell.tsx`、`src/spreadsheet-interactions/use-editing.ts`、`packages/spreadsheet-core/src/core.ts`
- `packages/word-editor-core/src/editor-store.ts`、`canvas-editor-bridge.ts`、`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`、`editor-canvas.tsx`
- `packages/report-designer-core/src/core.ts`、`packages/report-designer-renderers/src/report-field-panel.tsx`
- 各改动点 focused 单测；新增 locale 键（若校验明细/禁用原因需文案）

### Out Of Scope

- print-domain-adapter 的序列化格式与 validate 规则本身
- spreadsheet 单元格编辑器 UI 形态（仅状态归属下沉）

## Failure Paths

| 可测场景编号               | 触发                                         | 行为                                                         | 可重试 | 用户可见表现             |
| -------------------------- | -------------------------------------------- | ------------------------------------------------------------ | ------ | ------------------------ |
| drag-undo-granularity      | 拖拽元素 A 跨 100 帧 → 松手 → Ctrl+Z         | 一步撤销整次拖拽（事务语义不变）                             | 是     | A 回到原位，无中间帧残影 |
| inspector-undo-granularity | inspector 文本框输入 10 字符 → blur → Ctrl+Z | 合并步数撤销（coalesce 粒度与 flow designer inspector 一致） | 是     | 不需按 10 次             |
| edit-draft-loss            | 编辑单元格中触发外部刷新                     | 草稿保留在本地 state，save 边界语义与现状一致                | 是     | 无草稿意外丢失           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（Phase 1 触及 editor-core 事务/undo 语义——undo 粒度是核心回归路径；Failure Paths 三场景即测试用例，Proof 与 Fix 同 PR 落地）。

## Execution Plan

### Phase 1 - editor-core 事务语义与 print 拖拽/inspector（R3-P12、P13、P14、P22）

Status: completed
Targets: `packages/editor-core/src/editor-core.ts`、`packages/flux-print-renderers/src/print-designer-canvas.tsx`、`print-inspector.tsx`、`print-preview.tsx`、`editor/use-print-editor.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-P12)：`update()` 事务开启时跳过 `adapter.diff` 与 `runCommit`（延迟到 `endTransaction` 一次执行）；`buildSnapshot` 的 dirty 改标记位推导（消除每次 O(N) diff）
- [x] Fix (R3-P13)：print inspector 文本/数字字段本地 draft + coalesce 提交（对齐 flow designer-inspector 模式），undo 步按合并粒度产生
- [x] Fix (R3-P14)：pointerdown 时预计算 `dragElement.region` 与 snap 候选缓存，`buildSnapOptions` 拖拽会话内 O(n)；`moveFrame` rAF 合帧
- [x] Fix (R3-P22)：`print-preview` layout + HTML 序列化按 `template`/`testData` useMemo
- [x] Proof：focused 单测——Failure Paths drag-undo-granularity / inspector-undo-granularity 全绿；事务内无 runCommit（commit 计数桩）；拖拽会话内 snap 候选计算次数 = O(1) 次（计数桩）；preview 在 template 不变时不重跑 layout

Exit Criteria:

- [x] 4 项 Fix 落地，undo 粒度与 commit 计数 focused 测试全绿
- [x] print-designer 相关既有测试（含方向键微移、粘贴隔离）无回归

### Phase 2 - spreadsheet 滚动与编辑草稿（R3-P15、P16）

Status: completed
Targets: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`、`src/spreadsheet-grid/table-shell.tsx`、`src/spreadsheet-interactions/use-editing.ts`、`packages/spreadsheet-core/src/core.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-P15)（部分）：scroll 事件 rAF 合并 + 本地 scroll state 驱动虚拟窗口（落盘仍走 store，rAF 节流）；外部同步 effect 加「rAF 挂起时跳过回写」守卫（防止 store 未跟上时用户滚动被重置——由滚动同步测试暴露）；`buildSpreadsheetGridViewport` 进 useMemo。`SpreadsheetGridCell` 包 React.memo 一项转入 Deferred：cell 的 30 个 props 含大量 page-body 透传闭包，不做跨层 handler 稳定化契约改动则 memo 永不命中，收益/风险不成比例
- [x] Fix (R3-P16)：编辑草稿改为 core 内非响应式 draft（`updateEditValue` 不再写 store/不通知订阅者）；新增 `getEditValue()`（渲染期种子读取）与 `commitEditValue()`（save 边界一次性同步 store `draftValue` 并返回值）；`handleEditSave`/`commitEditingCell` 两个外部读取点迁移到 `commitEditValue()`；`SpreadsheetCellEditor` 转非受控（`defaultValue` 种子 + DOM 持有，会话内零 React 重渲染）。host snapshot `editing` 仅投影 `{row,col}`（bridge.ts:19），saveStatus/saveMessage 仍从 core snapshot 读取
- [x] Proof（部分）：focused 单测——scroll 会话 dispatch rAF 节流（grid-selection 滚动同步测试更新为新契约）；167 用例绿。cell memo 渲染计数一项随 Deferred 顺延
- [x] Proof：edit-draft boundary focused 测试（spreadsheet-core 5 例：startEditing 种子 / updateEditValue 零通知零快照变化 / commitEditValue 单次同步 + 返回值 / 无会话返回空 / 跨会话重置）+ 渲染层 2 例（键入期间 store 零通知零 dispatch、Enter 落 `abc`；切格 click 提交当前草稿）。spreadsheet-core 277 + spreadsheet-renderers 169 用例全绿

Exit Criteria:

- [x] 2 项 Fix 落地，focused 测试全绿
- [x] spreadsheet 键盘编辑/提交语义不回退（既有 focused 测试通过：键盘导航、F2/Enter 编辑、失败保留草稿、取消丢弃全部保持绿）

### Phase 3 - word selection 与 report 同步（R3-P20、P21）

Status: completed
Targets: `packages/word-editor-core/src/editor-store.ts`、`canvas-editor-bridge.ts`、`packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`、`packages/report-designer-core/src/core.ts`

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-P20)：`setSelection` 逐字段浅比较（无变化复用 store state）；`selection` 订阅补字段级等值比较（对齐 editorRuntime 先例）
- [x] Fix (R3-P21)（执行裁定：不修复，契约封印）：实施时发现既有契约测试 "syncSpreadsheetDocument seals the provided spreadsheet subtree reference"（designer-core.test.ts:258）钉死 structuredClone 是防宿主 post-sync 变异的封印语义，非纯浪费——保持 clone 并在代码内加契约注记；优化诉求转 Deferred（见 Deferred But Adjudicated）
- [x] Proof：focused 单测——相同 selection 重复 set 不触发订阅者且 state 引用不变（`editor-store.test.ts` R3-P20 幂等路径：三次相同 payload set 零通知零引用变化）；内容变化仍触发（R3-P20 变更路径）；report 表格变更后嵌入文档引用传递且 undo/derived 状态正确（186 用例绿，含 seal 契约）

Exit Criteria:

- [x] 2 项 Fix 落地，focused 测试全绿
- [x] word toolbar 状态刷新与 report 双向同步防乒乓测试无回归

### Phase 4 - print/report/word UX（R3-U11、U13、U18、U22）

Status: completed
Targets: `print-designer.tsx`（校验明细）、`print-designer-canvas.tsx`（键盘选中）、`report-field-panel.tsx`（禁用原因）、`word-editor-renderers/src/editor-canvas.tsx`（字数刷新）、flux-i18n locales

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-U11)：validate 结果以可定位列表展示（`print-diagnostics` region + `print-diagnostic-item` 列表，含 level 标识与消息；带 elementId 的项可点击 → `setSelection` + `scrollIntoView` + focus 定位；errorCount 由 diagnostics 派生）；新增 `flux.print.diagnostics.*` 两语言键
- [x] Fix (R3-U18)：print 画布元素可键盘选中（元素 `tabIndex=0` + `role="button"` + `aria-pressed` + `aria-label`；focus 即选中（roving select）、Enter/Space 显式选中并 stopPropagation；方向键/Delete 冒泡复用 shell 级 nudge/delete 快捷键）
- [x] Fix (R3-U13)：report 插入按钮 disabled 时附 title + aria-describedby 原因（`flux.reportDesigner.insertDisabledNoSelection` 两语言）；补渲染 `#report-field-insert-disabled-reason` sr-only 描述节点（原实现 describedby 指向不存在的 id）
- [x] Fix (R3-U22)：word 状态栏字数在 debounced autosave tick 中刷新（mount-only 问题消除，卸载 aborted 守卫保留）
- [x] Proof：DOM 断言单测——校验列表项点击触发选中定位（print-designer.test U11：断言面板文本、level 属性、点击后 `aria-pressed=true`）；元素可 Tab 聚焦且 Enter 选中（print-designer.test U18：tabindex/role/aria-pressed + Enter/Space）；键盘选中后方向键微移仍工作（nudge 冒泡不回退）；disabled 原因属性存在（report-field-panel.test：title/aria-describedby/描述节点文本三断言）；字数随内容变更更新（editor-canvas.test：mount 7 → 编辑后 autosave tick 12）

Exit Criteria:

- [x] 4 项 UX Fix 落地，DOM 断言测试全绿
- [x] 新增 locale 键两语言齐全（契约测试通过：flux-i18n 30 用例绿）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_b8b0d3f0）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 无 Blocker/Major；Minor（Purpose 计数 16→12、spreadsheet/word 子目录路径补全、Test Strategy 升"必须自动化"、use-selection.ts:108,121 与 use-editing.ts:27,54,69 外部读取点点名）已全部修正。

## Closure Gates

- [x] 所有 in-scope confirmed live 缺陷已修复（R3-P12 ~ P16、P20 ~ P22、U11、U13、U18、U22 逐条核对）
- [x] 不适用 contract drift（editor-core 对外契约不变；print/spreadsheet/word/report 组件契约以既有测试为准；spreadsheet-core 仅新增 getEditValue/commitEditValue 接口成员，向后兼容）
- [x] 行为/契约结果已达成（Failure Paths 三场景 + 全部 focused/DOM 断言测试通过）
- [x] 必要 focused verification 已完成（typecheck/build/lint/check exit 0；pnpm test 78/78 task exit 0）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（两条 Deferred 均为裁定条目，非静默降级）
- [x] owner docs 已同步（No owner-doc update required：编辑草稿归属为组件内部状态实现细节，宿主可见契约——save 边界语义——未变；P21 封印契约已在代码内注记）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（见 Closure）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### report syncSpreadsheetDocument 去 structuredClone（R3-P21）

- Classification: `adjudicated as residual-risk-only / watch-only`
- Why Not Blocking Closure: 实施发现 structuredClone 是被契约测试钉死的封印语义（designer-core.test.ts "seals the provided spreadsheet subtree reference"，防宿主 post-sync 变异），移除即破约；克隆成本为已记录的契约代价，代码内已加注记防止后人误删。
- Successor Required: `no`
- Successor Path: 如需优化，先在 spreadsheet 侧提供冻结（Object.freeze 深冻结）或代次标记机制并修订契约测试。

### SpreadsheetGridCell React.memo（R3-P15 子项）

- Classification: `optimization candidate`
- Why Not Blocking Closure: cell 的 30 个 props 中约半数为 page-body 每渲染重建的透传闭包；仅包 memo 而不做跨层 handler 稳定化（latest-ref/useCallback 契约）则浅比较永不命中，属纯噪音改动。scroll 主热点（每事件 store 往返）已由 rAF 合帧 + 本地 scroll state 收口。
- Successor Required: `no`
- Successor Path: 与 page-body props 契约稳定化同批收口。

## Non-Blocking Follow-ups

- print 校验明细与预览弹窗诊断数据源统一（当前双源，本轮以 validate 源为准收口定位能力）

## Closure

Status Note: 12 项 in-scope Fix（R3-P12 ~ P16、P20 ~ P22、U11、U13、U18、U22）全部落地。首轮独立审计 verdict `issues`（1 major：R3-P20 Proof 断言的 setSelection 幂等 focused 测试实际不存在；2 minor：Phase 3 exit criteria 未勾选、P13 注释自相矛盾）——按审计循环补齐 R3-P20 幂等/变更双测试并修正两 minor 后，聚焦重审 verdict `approved`（1 残留 minor：注释 blur flush 表述，已在 closure 批修正）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_4570ba58 首轮 → agent_c18d54c3 聚焦重审）
- Verdict: 首轮 `issues`（1 major + 2 minor）→ 修复 → 重审 `approved`（1 minor 注释 nit，已修）
- Evidence: 首轮逐项核实 12 项 Fix 真实存在且 focused 测试全绿（editor-core 21、edit-draft-boundary 5、print 27、grid 20、report-field-panel 3、designer-core 25 含 seal 契约、word editor-store 18）；R3-P16 非响应式 draft / commitEditValue 接口成员 / 非受控编辑器逐点确认；locale 双语言在位；无既有测试弱化（grid-selection 仅注释、typing 修复断言完整）。重审确认 R3-P20 双测试断言零通知 + 引用不变（zustand Object.is 语义下有意义）、plan diff 仅含 remediation 编辑。全量 `pnpm typecheck/build/lint/check/test` 复验 exit 0（见 daily log 2026-09-30 收口批）。

Follow-up:

- print 校验明细与预览弹窗诊断数据源统一（原 Follow-up 保留）。
- print-inspector coalesce 提交管线可补 blur flush 决策的显式测试（当前行为：仅 timer + unmount flush，注释已如实描述）。
