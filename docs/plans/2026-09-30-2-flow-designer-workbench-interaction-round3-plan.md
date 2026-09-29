# 02 flow designer 与 workbench 交互性能与 UX（round-3）

> Plan Status: completed
> Last Reviewed: 2026-09-30
> Source: `docs/analysis/2026-09-30-perf-ux-round3-deep-optimization-analysis.md`（R3-P11、P17、P18、P19 + R3-U4、U10、U12、U19、U20、U21）
> Related: `docs/architecture/flow-designer/design.md`、`docs/plans/2026-09-29-4-core-pipeline-and-peripheral-hotspots-plan.md`（inspector 击键已修，本 plan 是同族交互路径的延续）

## Purpose

收口 flow designer 最高频交互路径（平移/缩放、边 hover、拖拽辅助线、面板 resize）上的每帧全量成本，并补齐 flow designer 的 UX 基线（默认工具栏、快捷键、落点预览、ARIA 状态、i18n）。核心修复是把 viewport 移出 document/undo/dirty 语义，这是该包所有交互路径上的公共帧成本。

## Current Baseline

- flow designer inspector 每击键全树布局 + JSON round-trip 已由 round-2 Plan 4 修复（`relayoutTree` 已用 `documentsEquivalent`）。
- `shell-controls.ts:139-150` `setViewport` 每帧 `setDocument` + `pushHistory` + `updateDirtyState`——live 核实（执行者抽查成立）。
- `designer-canvas.tsx:405-411` 每帧 dispatch setViewport → `xyflow-utils.ts:50-93` 每帧 O(N) 重建节点——live 核实。
- `use-xyflow-sync.ts:125-135` 边 hover 全边重建；`use-alignment-guides.ts:119-142` 每帧 O(N) + 无条件 setState；`workbench-shell.tsx:191-195,220-225` resize 每 pointermove dispatch——live 核实。
- `flow-designer-core/src/core/config.ts` 无默认 toolbar items（toolbar items 空则 `designer-toolbar.tsx:162-164` return null）；快捷键表无 Ctrl+A/Ctrl+D——live 核实。
- `workbench-shell.tsx:322,376` resize 手柄 aria-label 硬编码英文；`apps/playground/src/flow-designer/flow-designer-toolbar.tsx:70-86` 视图切换仅 data-active——live 核实。
- flow-designer 相关单测与 e2e 现状全绿（round-2 收口基线；gantt/kanban perf watch-only 与本 plan 无关）。

## Goals

- 平移/缩放期间零 document clone、零 undo 入栈、零 dirty 误报、零全节点重建；`onMoveEnd` 一次性落盘 viewport。
- 边 hover / 对齐辅助线 / 面板 resize 不再触发全量重渲染。
- flow designer 默认具备 undo/redo/save 工具栏入口与 Ctrl+A/Ctrl+D 快捷键。
- palette 拖放有落点预览；视图切换有 ARIA 状态；resize 手柄 aria-label 国际化。

## Non-Goals

- 不改 flow designer 的 document schema、命令语义、undo/redo 事务模型（仅 viewport 移出历史栈这一处语义修正）。
- 不处理 print/spreadsheet/word/report（Plan 3 承接）。
- 不做 xyflow 升级或渲染引擎替换。

## Scope

### In Scope

- `packages/flow-designer-core/src/core/shell-controls.ts`、`core/config.ts`、`core/history.ts`（如需 dirty 判定修正）
- `packages/flow-designer-renderers/src/designer-canvas.tsx`、`designer-xyflow-canvas/`（canvas、use-xyflow-sync、use-alignment-guides）、`designer-toolbar.tsx`、palette 拖放路径
- `packages/flux-react/src/workbench/workbench-shell.tsx`
- `apps/playground/src/flow-designer/flow-designer-toolbar.tsx`
- flux-i18n locale 键（resize 手柄 label、工具栏 undo/redo/save 若需新键）
- 各改动点 focused 单测

### Out Of Scope

- flow 自动布局（ELK）路径、创建对话框、JSON 面板（已 clean）
- 移动端/触屏专属手势

## Failure Paths

| 可测场景编号     | 触发                            | 行为                                             | 可重试 | 用户可见表现                     |
| ---------------- | ------------------------------- | ------------------------------------------------ | ------ | -------------------------------- |
| viewport-restore | 打开文档 → 平移/缩放 → 关闭重开 | viewport 恢复为 onMoveEnd 落盘值（最后一次位置） | 是     | 画布位置符合预期，无中间帧被保存 |
| undo-after-pan   | 连续平移 60 帧 → Ctrl+Z         | 一步撤销回到最近一次**内容**编辑前状态           | 是     | 无需连按数十次                   |
| pan-not-dirty    | 打开已保存文档 → 仅平移/缩放    | `isDirty()` 为 false，无保存提示/离开守卫        | 是     | 无误报                           |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（viewport 移出 document/undo/dirty 是用户可见行为变更——Failure Paths 三场景即测试用例；Phase 1 Proof 先于 Phase 2 依赖它）。

## Execution Plan

### Phase 1 - viewport 移出 document/undo/dirty（R3-P11 + U4 同根修复）

Status: completed
Targets: `flow-designer-core/src/core/shell-controls.ts`、`flow-designer-renderers/src/designer-canvas.tsx`、`designer-xyflow-canvas/designer-xyflow-canvas.tsx`

- Item Types: `Fix`、`Proof`

- [x] Fix：`setViewport` 不再 `setDocument`/`pushHistory`/`updateDirtyState`，只写 shellState + emit `viewportChanged`
- [x] Fix（落盘机制裁定，三选一已定）：viewport 从 document 写路径迁出，落盘改走 **revision-free 专用通道**——core 新增 `persistViewport(viewport)`：以**顶层浅替换**更新 document（`{...doc, viewport}`，保证 snapshot 缓存按 doc 引用失配而刷新 → host projection `designer-host-projection.ts:263` 与 taskflow 落盘 `taskflow-designer-lib/index.ts:55` 能取到最终 viewport），但**不递增 docRevision、不 pushHistory、不触发 dirty**（history/savedDoc 均为 cloneDocument 深克隆，替换 doc 不污染 undo 栈；`documentsEquivalent` 只比 nodes/edges 不受影响）；`persistViewport` 落盘后 emit 一次 `viewportChanged`；`replaceDocumentFromHost → resetShellViewportFromDocument`（shell-controls.ts:154-160）的恢复路径保持读取 doc.viewport 兼容。undo/redo 裁定：**不再从 history entry 重置 viewport**（`core.ts:322/:345` undo/redo 内的 `resetShellViewportFromDocument` 调用移除）——viewport 移出 undo 语义后 entry 携带的 viewport 是最后一次内容编辑时的值，重置会引发画布跳位
- [x] Fix（渲染侧强制配套一）：受控 viewport 取源重接——`designer-xyflow-canvas.tsx:171-174` 的受控 viewport memo 现优先取 `props.snapshot.doc.viewport`，persistViewport 仅 onMoveEnd 更新后该值在手势期间滞后，xyflow `useViewportSync` 会把画布拽回旧值形成拉锯；改为**活源取 `props.snapshot.viewport`（shellState），`doc.viewport` 降级为落盘/恢复专用字段**
- [x] Fix（渲染侧强制配套二）：`createXyflowNodes` 的 useMemo deps（`designer-xyflow-canvas.tsx:163-166`，现含整个 snapshot）与 `snapshotEdges` 的 useMemo deps（`:167-170`，同病且直接级联 `use-xyflow-sync.ts:125-134` renderedEdges）一并收窄为真实输入——nodes：`snapshot.doc`（nodes）+ `snapshot.selection` + `snapshot.activeBranch`；edges：`snapshot.doc`（edges）+ selectedEdgeIds + `snapshot.activeBranch` + documentMode——使 snapshot.viewport 每帧变化不再触发 O(N)/O(M) 重建（`activeBranch` 必须纳入，避免 branch 聚焦切换时选中/聚焦标记滞后一帧）
- [x] Fix：xyflow canvas 在 `onMoveEnd` 调用 `persistViewport` 一次性落盘（保持刷新后恢复 viewport 的既有产品行为；xyflow 的 pan 与 zoom 手势结束统一触发 onMoveEnd，无独立 onZoomEnd 需求——closure audit r2 措辞校正）
- [x] Proof：focused 单测——Failure Paths 三场景（viewport-restore / undo-after-pan / pan-not-dirty）全绿；`persistViewport` 后 `docRevision` 不变、undo 栈长度不变、`isDirty()` 状态不变（断言三否定）；纯平移后触发 taskflow flush 断言投影 viewport 为最终值（非上一手势值）；undo/redo 后画布 viewport 不回跳（受控源 = snapshot.viewport 断言）；受控 viewport 取源断言（活源为 snapshot.viewport，doc.viewport 仅落盘/恢复）；`createXyflowNodes` 与 edges memo 在 snapshot.viewport 引用变化但 doc/selection/activeBranch 不变时不重跑（计数桩）；既有 viewport 持久化测试（若有）更新并通过
- [x] Proof：渲染路径验证——平移期间 `createXyflowNodes` 不因 viewport 重建（viewport 不再出现在 document snapshot 中驱动节点 memo 失配；以单测或显式断言锁定）

Exit Criteria:

- [x] viewport 退出 document/undo/dirty，三场景 focused 测试全绿
- [x] viewport 持久化产品行为（重开恢复位置）不回退

### Phase 2 - hover / 辅助线 / resize 帧成本

Status: completed
Targets: `designer-xyflow-canvas/use-xyflow-sync.ts`、`use-alignment-guides.ts`、`designer-xyflow-canvas.tsx`（死通道清理）、`packages/flux-react/src/workbench/workbench-shell.tsx`、`packages/flow-designer-renderers/src/designer-page-body.tsx`（:509,:525 的 setPanelWidths 派发路径）

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-P17)：边 hover 仅目标边对象重建（其余边引用保持）；`onNodeHover`/`onEdgeHover` 死通道删除（closure audit r2 确认全仓零消费方，props 声明与 4 处调用点已删）
- [x] Fix (R3-P18)：对齐辅助线 guides 值浅等价则跳过 setState；兄弟节点矩形按距离/视口预剪枝
- [x] Fix (R3-P19)：workbench 面板 resize 过程本地 state/rAF 驱动，pointerup 一次性 dispatch `setPanelWidths`
- [x] Proof：focused 单测——hover 单边变更时其余边对象引用不变；guides 值不变不触发回调；resize pointerup 前零全局 dispatch

Exit Criteria:

- [x] 3 项 Fix 落地，focused 单测全绿
- [x] flow-designer-renderers 与 flux-react（workbench）focused 测试均无回归

### Phase 3 - UX 基线（工具栏 / 快捷键 / 落点预览 / ARIA / i18n）

Status: completed
Targets: `flow-designer-core/src/core/config.ts`、`designer-toolbar.tsx`、palette 拖放路径（`designer-xyflow-canvas.tsx:394-407`）、`workbench-shell.tsx`、`apps/playground/src/flow-designer/flow-designer-toolbar.tsx`、flux-i18n locales

- Item Types: `Fix`、`Proof`

- [x] Fix (R3-U19)：normalizeConfig 提供默认 undo/redo/save 工具栏项（host config 可覆盖）
- [x] Fix (R3-U20)：默认快捷键补 Ctrl+A（selectAllNodes）/ Ctrl+D（duplicateNode），遵守 isEditableTarget 守卫
- [x] Fix (R3-U12)：palette dragover 期间渲染半透明预览节点（screenToFlowPosition + 吸附对齐可选），drop 后消失
- [x] Fix (R3-U10)：playground flow 工具栏视图切换按钮补 `aria-pressed`
- [x] Fix (R3-U21)：workbench resize 手柄 aria-label 经 i18n（新增 locale 键，两语言齐全）
- [x] Proof：focused 单测/DOM 断言——默认 config 渲染出 undo/redo/save 按钮；Ctrl+A/Ctrl+D 触发对应命令且输入框聚焦时不触发；dragover 出现预览节点元素；aria-pressed/aria-label 断言

Exit Criteria:

- [x] 5 项 UX Fix 落地，DOM 断言测试全绿
- [x] 新增 locale 键在 en-US/zh-CN 两边齐全（契约测试通过）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，agent_e8867d4e r1 / agent_d2650012 r2 / agent_027b3750 r3 聚焦确认）
- Verdict: `pass-with-minors`
- Rounds: 3（r1 Major：viewport 落盘与 docRevision 冲突 → persistViewport revision-free 通道裁定；r2 Major×2：受控 viewport 取源、createXyflowNodes memo deps → 渲染侧强制配套子项补入；r3 聚焦确认两配套消解并给 N1/N2/N3 → 顶层浅替换 doc、edges memo 一并收窄、activeBranch 纳入已补入）
- Findings addressed: r1 Major 1 条、r2 Major 2 条全部消解；r3 N1（persistViewport 原地改无法刷新 host projection → 改顶层浅替换 + flush Proof）、N2（edges memo 纳入收窄 + 计数断言）、N3（activeBranch 纳入 deps）均已写入文本。

## Closure Gates

- [x] 所有 in-scope confirmed live 缺陷已修复（R3-P11、P17、P18、P19、U4、U10、U12、U19、U20、U21 逐条核对）
- [x] 不适用 contract drift（viewport 语义修正属内部行为，host 兼容性以 focused + 既有测试为准）
- [x] 行为/契约结果已达成（Failure Paths 三场景 + UX 断言全绿）
- [x] 必要 focused verification 已完成
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] owner docs 已同步：`docs/architecture/flow-designer/design.md` 的 graph runtime 持有状态描述（:117 记载 "`document`、`viewport`、…history、dirty"）已按 persistViewport revision-free 通道落地后的语义更新
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（无——in-scope 全部 Fix）

## Non-Blocking Follow-ups

- palette 落点预览的吸附对齐精细化（当前仅位置预览即可收口）

## Closure

Status Note: 10 条 in-scope 修复全部落地；viewport 移出 content-edit 语义经 Failure Paths 三场景 focused 测试锁定；r2 closure audit 附带的两条 minor（onZoomEnd 措辞、hover 死通道 props 未删）已当场收口；全仓 typecheck/build/lint/test 于收口树实测绿。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，agent_e9080f4a）
- Evidence: verdict `approved`——逐项 live 核对（14 项 file:line 在案）、Failure Paths 三场景断言真实且 25+25 focused 实测绿、persistViewport 门控经「手势结束 shell 已为终值」场景深读确认无 r1 形态 bug、owner-doc design.md 与 live 一致、无静默降级。详见 `docs/logs/2026/09-30.md` Plan 2 段。

Follow-up:

- palette 落点预览的吸附对齐精细化（optimization candidate，位置预览已满足 U12 收口标准）
