# 01 Industrial HMI Editor Internal Correctness — Reactivity, Grouping, Undo Integrity

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/audits/2026-08-07-1835-open-audit-industrial-hmi-editor.md`（5×P1：P1-A / P1-C1 / P1-C2 / P1-C3 / P1-D / P1-E）+ `docs/audits/2026-08-07-1835-multi-audit-industrial-hmi-editor.md`（P1-01 / P1-02 / P1-07），mission `industrial-hmi-editor` / `packages/flux-renderers-industrial/src/editor/`
> Related: `docs/plans/2026-08-07-1835-2-industrial-hmi-editor-contract-wiring-structure-affordances.md`（successor {2}，承接 P1-03 文件拆分等结构/契约/性能项；本 plan 的 session 反应式通道是 {2} UI 接线可验证的前置）、`docs/components/roadmap-industrial-hmi-editor.md`（Follow-up Backlog 收 40 条 P2）

## Purpose

把 2026-08-07 两份 open 审计（open-ended adversarial + multi-dimensional）中**同属「编辑器内部数据模型 / 反应式 / 撤销完整性」结果面**的 9 条 P1 全部收口到：

- live 缺陷已修（grouped-child 数据不再丢失/错位，undo 栈如实记录全部 op kind，面板对 session 变化反应式刷新）；
- focused regression proof 已入库（断言结果值/反应式行为，非仅 `not.toThrow`；且全部使用 offset-group 或 grouped-child fixture，关闭「测试套件系统性回避嵌套/偏移 group」盲点）；
- 受影响 owner doc（`design-undo-redo.md` / `design-connection.md` / `design-renderer.md §4.6`）同步到 live baseline。

两份审计的 40 条 P2（open 8 + multi 32；两份审计自带的 summary 表（7/22）系统性少计，实际 finding 逐条点数为 40）不进本 plan，已 triage 到 roadmap `## Follow-up Backlog` 新子节「2026-08-07-1835 post-remediation audit P2」（各带源审计路径 + 逐条可追溯）。同批 P1 中的「公开契约接线 / 文件结构 / UI affordance / 性能 / 测试有效性」结果面（11 条：multi P1-03/04/05/06/08/09/10/11/12/13 + open P1-B）由 successor plan {2} 收口——拆分理由见 `Non-Goals` 与本 plan 末尾的拆分裁定。

9 条 P1 均已逐条核对 live repo（2026-08-07），均经源码确认：

- **open P1-A（反应式根因）**：`scada-editor-canvas.tsx:135-150` `handleSessionChange` 仅 `dispatchEvent(...)`，无任何 `setState`；画布仅有的 React state 是 `status`/`errorInfo`/`selection`（`:68-70`）。所有 panel 在 render 时直接读 ref-held 可变 `runtime.session.*`（toolbox `:152-153` 读 `canUndo`/`canRedo`、inspector `:40-44` `fieldErrors` deps 仅 `[runtime, selectedNodeId]`）→ session 变更后 panel 过期，直到一次无关 selection 变更才重渲染。
- **multi P1-07（selection 双源同步）**：P1-A 的一片叶子。`selection` 同时存于 `session.selection`（canonical）与 React `useState`（`canvas:70`）；`use-editor-engine.ts:216` 唯一一条 mutation 调 `onSelectionChange`，`:305/345/359/490/506` 五条路径直接 `session.selection = …` 不触发回调 → React mirror 过期。
- **multi P1-02（连线坐标空间）**：`connection/connection-adapter.ts:52-68` `collectSymbolBounds` 遍历 children **不累加 parent x/y**，把 group child 的 local `(x,y)` 当 world；`findJunctionAtPoint`/`containsPoint`/`recomputeJunctionAfterMove` 消费这些 bounds → group 内设备的命中/吸附/联动全错位（hand-computed：group world x=300 时偏差 300px）。
- **open P1-C1（联动 junction 发现扁平）**：`editor-working-helpers.ts:60` junction 发现循环 `for (const node of symbols)` **仅顶层**，不递归 `node.children` → 嵌套 pipe-junction 的 target 移动后 connection x/y 永不重算（不同 root cause 于 P1-02：这里嵌套 junction 根本未被到达）。
- **open P1-C2（selectionNodes 顶层过滤）**：`use-editor-engine.ts:417-420` `selectionNodes = workingConfig.symbols.filter(s => set.has(s.id))`（仅顶层）→ align/distribute/copy/cut 对 group-child 多选静默丢弃 / 误报 `insufficient-selection`。
- **open P1-C3（computeBounds 维度缺失）**：`use-editor-engine.ts:372-391` 遍历顶层 symbols 读 `node.width/height`；`groupSymbols`（`:336-343`）建 group 用 `x:0,y:0` **无 width/height**，忽略 grouped children 的世界范围 → 全选 group 后 `computeBounds` 返 `{0,0,0,0}`，`fit` 退化视口。
- **open P1-D（group id 碰撞）**：`use-editor-engine.ts:336` `groupId = \`scada-group-${Date.now()}\``无存在性检查、无单调计数器；同毫秒两次 group → 重复顶层 id，破坏`nodeById` O(1) 索引 + 序列化往返（对比兄弟 clipboard/connection id 站点均有 guard）。
- **open P1-E（z-order undo 全量替换）**：`use-editor-engine.ts:451-469` `reorderZOrderFn` 的 forward = `removed: 全部顶层 id` + `added: 全部顶层 node`；`compute-inverse.ts:60-63` 对全量 id 拷贝 `inverse.added` → 单次「上移一位」在栈上记录 ~2× 全量 symbol。R4「栈元素只持 forward+inverse 增量，无全量快照」对 z-order op 不成立（E8/E10 shape 检查通过但 O(n) 内容违约）。
- **multi P1-01（grouped-child undo 丢失）**：`editor-working-helpers.ts:13-19` `cloneConfigSnapshot` **浅克隆**（顶层 spread，children 数组共享）；`:34-43` `applyPatchToWorkingNode` 就地 mutate 解析到的 child ref → 该 child 同时可达于 prevSnapshot 与 working → `diff.ts:85`+`equality.ts:29` `a===b` 返 true → diff 为空 → `undo-redo-adapter.ts:99-100` 不入栈。grouped-symbol 属性编辑 / group 内设备移动联动 **无法 undo**（transform-drag 路径走 `commitTransaction` 深克隆，安全；仅 per-op `pushOperation` 路径受影响）。

## Current Baseline

> 起草前已逐条核对 live repo（2026-08-07），下列事实均经源码确认。

- **包级机械健康**：`pnpm --filter @nop-chaos/flux-renderers-industrial typecheck/lint/test` 全绿（mission E10 收口态，见 `docs/logs/2026/08-07.md`）。`pnpm check:oversized-code-files` 对 `use-editor-engine.ts`（824 行）FAIL——**该 gate 属 successor {2} 的 P1-03 收口面**（见 `Deferred But Adjudicated`），本 plan 的数据模型修复会进一步增大该文件，gate 在本 plan 期间保持 red，由 {2} Phase 1 拆分恢复。
- **R5 双态隔离健全**（multi-audit 确认）：`@leafer-in/editor` 单一消费者，runtime 入口从不 import `src/editor/`，`editable` 从不序列化，无 `symbol:*` 在编辑态派发。本 plan 不触及隔离边界。
- **反应式根因已确认（P1-A）**：`handleSessionChange` 是 session 变更到达画布的唯一入口；`notifySession()`（每个 mutator 触发）经它只派发 schema 事件，不触发 React 重渲染。`selection` 是唯一例外（`onSelectionChange → setSelection`）。
- **grouping 盲点系统性**：两份审计共 ≥7 条独立 grouping-blind 路径（multi P1-01/P1-02 + open P1-C1/C2/C3 + multi P1-07 的 group 路径 + open P1-D）。**每个现有测试 fixture 都把 group 放在 world (0,0) 或从不 group 被操作节点**，故套件对所有 grouping 缺陷系统性失明。本 plan 的 proof 项必须用 offset-group / grouped-child fixture。
- **共享修复路径**：P1-02 + P1-C1 + P1-C3 共享同一递归 walker（`collectAllSymbols` 递归发现 + `collectWorldBounds(ox,oy)` 累加 parent offset）；P1-C2 共享同 walker 的 selection 解析；P1-01 共享 `undo-redo-adapter.ts:214-217` 已有的 `cloneNodeDeep` 递归。本 plan 优先落地共享 walker / 深克隆，再在各路径消费。
- **z-order 增量化**：`z-order.ts:73` 已计算 `movedIds`（真正改变位置的 id 子集），可直接作为增量 diff 的依据；无需新数据。
- **受影响 owner doc**：`design-undo-redo.md`（§4.1.2 forward+inverse diff 增量语义 + §2 内存上限）、`design-connection.md`（§4 anchor-snap + §4.4/§4.5 联动 world 坐标）、`design-renderer.md`（§4.6 selection 同步 + §4.1 session 反应式契约）。

## Goals

- **9 条 P1 live 缺陷全部修复**并各配 focused regression proof：
  - 反应式：session 任意 mutator（undo/redo 入栈、属性编辑、移动联动）后，panel 不依赖 selection 变更即重渲染——Undo/Redo `disabled`、inspector `fieldErrors` 实时刷新。
  - grouping 坐标/树遍历：group-child 的 world 坐标在命中/吸附/联动/对齐/复制/fit/center/junction 重算中全部正确；嵌套 junction 被递归发现。
  - undo 完整性：grouped-child 属性编辑产生非空 forward diff 并可 undo；z-order 单次操作只持增量（movedIds）；group id 单调唯一不碰撞。
- **共享基础设施落地**：`collectAllSymbols`/`collectWorldBounds` 递归 walker + `cloneConfigSnapshot` 深克隆 + `mintNodeId(prefix)` 唯一 id 助手，供本 plan 各路径及 successor {2} 复用。
- **grouping 盲点结构性关闭**：所有 proof 使用 offset-group / grouped-child fixture，关掉「套件回避嵌套 group」类。
- **owner doc 同步**到 live baseline（仅限真正改变行为/契约的项）。

## Non-Goals

- 不处理 40 条 P2（已 triage 到 roadmap Follow-up Backlog 新子节，各带源审计路径）。
- 不做文件拆分（P1-03，属 {2}）；不做公开契约接线 onSave/onLoad/commitPolicy/runtime-handles/controlled-push-back（P1-04/05/06/08/09，属 {2}）；不做 UI affordance/键盘层/raw-textarea/palette-drop（P1-B/10/11，属 {2}）；不做测试有效性修复（P1-12，属 {2}）；不做 perf O(n²)（P1-13，属 {2}，且依赖 {2} 的文件拆分）。
- 不改 runtime `scada-canvas` 复用面（10 个 editor 复用 touchpoint）的运行态行为。
- 不引入 React Context / prop-drilling 替代标准 hooks（AGENTS.md 禁止）；反应式通道用 `useReducer` 计数器或 `useSyncExternalStore` 适配，二选一在 Phase 1 裁定。

## Scope

### In Scope

- `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`（P1-A：`handleSessionChange` 增反应式 tick；P1-07：selection mirror 路由）。
- `packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts`（P1-07 selection 同步 helper；P1-C2 selectionNodes 递归；P1-C3 computeBounds 递归+group 维度；P1-D group id 单调；P1-E z-order 增量 diff；新增共享 walker 导出）。
- `packages/flux-renderers-industrial/src/editor/editor-working-helpers.ts`（P1-01 `cloneConfigSnapshot` 深克隆；P1-C1 junction 发现循环递归；共享 `collectAllSymbols`/`collectWorldBounds`）。
- `packages/flux-renderers-industrial/src/editor/connection/connection-adapter.ts`（P1-02 `collectSymbolBounds` 消费 world bounds walker）+ `connection-drag-controller.ts` / `editor-working-helpers.ts` `recomputeJunctionAfterMove`（消费同一 walker）。
- `packages/flux-renderers-industrial/src/editor/undo-redo/compute-inverse.ts`（P1-E z-order inverse 增量化）。
- 新增/扩展 focused regression proof：反应式 panel 断言（属性编辑后 Undo 按钮启用且无 selection 变更）、offset-group 坐标/吸附/联动 proof、grouped-child undo 往返 proof、z-order 增量断言（栈条目只含 movedIds）、group id 唯一性 proof。
- owner doc 同步：`design-undo-redo.md`（增量 + 内存）、`design-connection.md`（world 坐标）、`design-renderer.md`（§4.1 反应式 + §4.6 selection）。

### Out Of Scope

- 29 条 P2、{2} 全部 11 条 P1、runtime 运行态行为、React 19 冗余 `useMemo`/`useCallback` 清理（multi P2，opportunistic）。

## Failure Paths

> 涉及编辑器数据所有权（undo 栈 / working copy）与反应式刷新，列关键可测场景。

| 场景编号                      | 触发                                                          | 行为                                                                            | 可重试 | 用户可见表现                                                      |
| ----------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| `inspector-edit-enables-undo` | 选中节点，经 inspector 改一属性（无 selection 变更）          | `notifySession` 触发 panel 重渲染；Undo 按钮 `disabled` → `enabled`             | 是     | Undo 按钮立即启用（无需重选）                                     |
| `undo-drain-disables-button`  | 连点 Undo 直到栈空                                            | `canUndo=false` 经反应式通道到达 panel；按钮 `enabled` → `disabled`             | 否     | Undo 按钮置灰，后续点击不静默 no-op                               |
| `grouped-child-edit-undoable` | 选中 group 内子节点，改属性                                   | 深克隆 → forward diff 非空 → 入栈 → undo 还原                                   | 是     | group 内属性编辑可 undo 还原（非永久丢失）                        |
| `offset-group-snap-hit`       | group world (300,200)，内含 device；指针在世界坐标命中 device | `collectWorldBounds` 累加 offset → 吸附/命中落在可见 device 上（非空 local 区） | 否     | 指针拖到可见 device 时吸附生效（非偏移 300px 失效）               |
| `nested-junction-linkage`     | pipe-junction 嵌在 group 内，其 target device 移动            | junction 发现循环递归 → 嵌套 junction 被重算 → connection x/y 更新              | 是     | group 内管路 junction 随 target 移动联动（非 stub endpoint 漂移） |
| `z-order-incremental-stack`   | 1k symbols，单次「上移一位」                                  | forward/inverse 只持 movedIds 对应节点（非全量 2×）                             | 否     | undo 栈单条内存 O(增量) 非 O(n)（R4 成立）                        |
| `group-id-no-collision`       | 同毫秒（键盘连按 / 自动化）连续两次 group                     | group id 单调递增 / 碰撞自增 → 顶层 id 唯一                                     | 否     | 两个 group 各自独立 id（非重复覆盖）                              |

## Test Strategy

档位选择：**必须自动化**。

理由：9 条 P1 均为 confirmed live defect（数据丢失 / 反应式断裂 / 坐标错位 / 契约违约 R4），且当前 CI 由「套件回避 offset/nested group」系统性失明掩盖——属「核心回归路径」且「测试必须先红后绿」。反应式 + undo 项的 Proof **先于** Fix 落地锁定红→绿；grouping 项用 offset-group / grouped-child fixture（区别于现有 (0,0) fixture）。反应式面板断言用 RTL 驱动真实 panel 组件读 `runtime.session.*`。

## Execution Plan

### Phase 1 - Session 反应式通道 + selection mirror 收敛（open P1-A + multi P1-07）

Status: completed
Targets: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx`（`handleSessionChange` 反应式 tick）、`packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts`（selection 同步 helper + 5 条静默路径路由）、`packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx`、`inspector/inspector-panel.tsx`（验证消费端）

- Item Types: `Fix | Proof | Decision`

- [x] `Decision`：裁定反应式通道实现——方案 A（画布 `useReducer` session-version 计数器，`handleSessionChange` bump）vs 方案 B（panel 经 `useSyncExternalStore` 订阅 `notifySession`）。选最小侵入且能让 toolbox Undo/Redo/clipboard-count 与 inspector `fieldErrors` 全部 reactive 的一者；记录裁定理由。
- [x] `Proof`（先红）：反应式 integration test——挂载真实 renderer 边界，经 inspector 改一属性（无 selection 变更），断言 Undo 按钮 `disabled`→`enabled`（红：当前需重选才更新）；连点 Undo 到栈空，断言按钮 `enabled`→`disabled`（红：当前保持 enabled）。
- [x] `Fix`：`handleSessionChange` 接入选定反应式通道，使 session 任意 mutator 后 panel 重渲染。
- [x] `Fix`：引入 `setSessionSelection(next)` 单一 helper（同时 `session.selection = next` + `onSelectionChange?.(next)`），把 `use-editor-engine.ts:305/345/359/490/506` 五条静默 selection 写入 + `editor-session.ts:81` load 重置全部路由过它；或按 Decision 直接消除 React mirror 让 panel 读 `runtime.session.selection` 反应式。
- [x] `Fix`：inspector `fieldErrors` 的 `useMemo` deps 纳入 session-version，使属性编辑后校验实时刷新。

Exit Criteria:

- [x] 反应式 integration test 由红转绿（属性编辑后 Undo 启用且无 selection 变更；Undo 耗尽后按钮置灰）。
- [x] `setSessionSelection` 单一入口成立——grep 确认无 `session.selection =` 直写残留（load 路径除外，若裁定保留）。
- [x] 局部 typecheck 通过（保证后续 Phase 可继续）。

### Phase 2 - grouping 坐标空间 / 树遍历 / id 唯一性收敛（multi P1-02 + open P1-C1 + P1-C2 + P1-C3 + P1-D）

Status: completed
Targets: `editor-working-helpers.ts`（共享 walker + junction 发现递归 + 深克隆）、`connection/connection-adapter.ts`（`collectSymbolBounds` 消费 walker）、`connection-drag-controller.ts` + `editor-working-helpers.ts` `recomputeJunctionAfterMove`（消费 walker）、`use-editor-engine.ts`（selectionNodes/computeBounds/groupSymbols/group id）

- Item Types: `Fix | Proof`

- [x] `Fix`：新增共享 `collectAllSymbols(symbols)`（递归发现全部节点含嵌套）+ `collectWorldBounds(symbols, ox=0, oy=0)`（累加 parent offset）walker 于 `editor-working-helpers.ts`。
- [x] `Fix`（P1-02）：`collectSymbolBounds` 改消费 `collectWorldBounds`；`findJunctionAtPoint`/`containsPoint` 与 `recomputeJunctionAfterMove` 输入随之世界化。
- [x] `Fix`（P1-C1）：`editor-working-helpers.ts:60` junction 发现循环改递归 `collectAllSymbols`，嵌套 pipe-junction 被发现。
- [x] `Fix`（P1-C2）：`selectionNodes` 改用 `collectAllSymbols` 解析，group-child 多选不再被顶层过滤丢弃。
- [x] `Fix`（P1-C3）：`computeBounds` 递归并累加 offset；`groupSymbols` 为 group 节点计算聚合 bounds（含 children 世界范围）或显式标注 group 量纲来源，使 fit/center 对 grouped scene 不退化。
- [x] `Fix`（P1-D）：group id 改单调计数器（`groupCounter`）或 `mintNodeId('scada-group')` 碰撞自增助手（对齐 clipboard/connection id 站点纪律），重复顶层 id 不可能。
- [x] `Proof`（先红→绿，全部用 offset-group / grouped-child fixture，区别于现有 (0,0)）：① offset-group 吸附/命中落点正确；② 嵌套 junction target 移动后 connection x/y 重算；③ group-child 多选 align/copy/cut 不丢弃；④ 全选 group 后 `computeBounds` 非 `{0,0,0,0}`、fit 不退化；⑤ 同毫秒连续 group id 唯一。

Exit Criteria:

- [x] 5 条 grouping proof 全绿（offset/nested fixture），断言结果值（坐标/bounds/id）非仅不抛错。
- [x] `collectWorldBounds` 单一 walker 被 P1-02/P1-C1/P1-C3 共同消费（grep 确认无就地手写扁平遍历残留）。
- [x] group id 单调唯一 proof 绿；grep 确认无 `scada-group-${Date.now()}` 残留。

### Phase 3 - undo / working-copy 完整性（multi P1-01 + open P1-E）

Status: completed
Targets: `editor-working-helpers.ts`（`cloneConfigSnapshot` 深克隆）、`use-editor-engine.ts`（z-order forward 增量）、`undo-redo/compute-inverse.ts`（z-order inverse 增量）

- Item Types: `Fix | Proof`

- [x] `Proof`（先红）：grouped-child undo 往返 test——选中 group 内子节点，inspector 改属性，断言 forward diff 非空 + 入栈 + undo 还原（红：当前 diff 为空不入栈）。
- [x] `Fix`（P1-01）：`cloneConfigSnapshot` 改深克隆（复用 `undo-redo-adapter.ts:214-217` 的 `cloneNodeDeep` 递归），或 `applyPatchToWorkingNode` 改不可变（重建 parent path 使子树 identity 变化）；使 grouped-child 编辑产生非空 diff。
- [x] `Proof`（先红）：z-order 增量 test——1k 配置单次「上移一位」，断言栈条目 forward.added/removed/inverse.added 只含 `movedIds` 对应节点（非全量）。
- [x] `Fix`（P1-E）：`reorderZOrderFn` forward 改增量（`updated` patch 仅 movedIds 对应位置变更节点，`added`/`removed` 收窄）；`compute-inverse.ts:60-63` removed→added 拷贝随之收窄为增量；或新增显式 `reordered` op kind。若保留 full-replace 设计，须同步纠正 R4 doc 主张 + E-gate checklist（记录 Decision）。
- [x] `Proof`（绿）：上述两条 proof 转绿；补 grouped-child 编辑 + undo 后 working/committed 一致性断言。

Exit Criteria:

- [x] grouped-child undo 往返 proof 绿（forward diff 非空 + undo 还原）。
- [x] z-order 增量 proof 绿（栈条目 O(增量) 非 O(n)，R4 对 z-order op 成立）。
- [x] 若 P1-E 采 full-replace 保留裁定，R4 doc（`design-undo-redo.md §2/§4.1.2`）+ 主张已显式收窄并记录。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立子 agent（fresh session）填写。

- Reviewer / Agent: 独立 fresh-session sub-agent `ses_023f88532ffei6YeO2cc5SngZV`（不复用起草上下文）
- Verdict: `pass-with-minors`
- Rounds: 1（Round 1 即达成共识，未超 2 轮上限）
- Findings addressed:
  - 覆盖核对：20/20 P1 全部落位（{1} 9 + {2} 11），无遗漏 / 无重复计数；P2-C4 正确 triage 为 P2；confirmed live defect 全部 `Fix` 类型（Rule 13/15 合规）。
  - 引用准确性：25+ 处代码锚点逐一对 live repo 复核全部准确（`handleSessionChange` dispatch-only / `cloneConfigSnapshot` 浅克隆 / `collectSymbolBounds` 无 offset / group id `Date.now()` / z-order full-replace / 5 条静默 selection 路径等）。
  - 拆分裁定（Rules 22–26）：defensible——两结果面 closure criteria / owner-doc obligations / proof surface 彼此独立；排序依赖是 sequencing 非 closure 耦合。
- Minors（非阻断，已处理）：
  - P2 计数「29」修正为 40（open 8 含 C4 + multi 32；两份审计自带 summary 表少计，实际逐条 finding 点数为 40）——已全文修正。
  - oversized gate 在本 plan 期间进一步 red 的 deferral（`moved to explicit successor ownership`，合法分类）保留。
- 剩余 Minor（接受为非阻断，不返工）：P1-E full-replace 保留裁定的 fallback 语义（默认走增量 Fix，doc-correction 仅作有理由的 Decision fallback）。

> 共识达成（0 Blocker / 0 Major），plan 由 `draft` 升级为 `active`，进入执行队列。

## Closure Gates

> **全量验证归此处**：`pnpm typecheck`/`build`/`lint`/`test` 是 plan 收口时跑一次的仓库级检查。Phase 内只做保证后续 Phase 能继续的局部验证。
>
> **oversized gate 显式除外**：`check:oversized-code-files` 对 `use-editor-engine.ts` 的失败属 successor {2} P1-03 收口面（见 Deferred），本 plan 不关闭该 gate——本 plan 数据模型修复会进一步增大该文件，gate 在本 plan 全程 red，{2} Phase 1 拆分恢复。

- [x] 9 条 P1 confirmed live defect 全部修复（reactivity / grouping 坐标树遍历 / undo 完整性）
- [x] 全部 P1 各配 focused regression proof（断言结果值/反应式行为；offset/nested fixture；非仅 `not.toThrow`）
- [x] grouping 盲点结构性关闭（proof 用 offset-group / grouped-child fixture）
- [x] 共享基础设施（world-bounds walker / 深克隆 / group id 单调）落地并被各路径消费
- [x] 受影响 owner docs（`design-undo-redo.md` / `design-connection.md` / `design-renderer.md`）同步到 live baseline
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### use-editor-engine.ts oversized-code-files gate（824 行 → 进一步增大）

- Classification: `moved to explicit successor ownership`
- Why Not Blocking Closure: 该文件超 700 行的硬 gate 失败属 successor {2} P1-03 的独立收口面（结构 / 文件拆分），与本 plan 的「内部数据模型正确性」结果面正交。本 plan 的反应式 / grouping / undo 修复会向该文件追加代码（短期内 gate 更 red），但 correctness 不依赖文件大小；拆分是机械操作（multi-audit 引 E9 extraction 先例），由 {2} Phase 1 收口。本 plan closure 仅要求 `typecheck`/`build`/`lint`/`test` 绿（这些不含 oversized 脚本）。
- Successor Required: yes
- Successor Path: `docs/plans/2026-08-07-1835-2-industrial-hmi-editor-contract-wiring-structure-affordances.md` Phase 1

## Non-Blocking Follow-ups

- P1-02 的核心数学（`recomputeConnectionAnchor`/`anchor-snap`/`viewportToWorld`）经 multi-audit hand-verify 为 CORRECT，仅输入错误；本 plan 只修输入，不重写已正确数学。
- open-audit P2-C4（`listAllConnections` dangling 检测顶层 id only）与 P1-C2 共享根因，本 plan 的 `collectAllSymbols` 顺手覆盖其发现逻辑，但 dangling 语义校验本身是 P2（diagnostic-only），其 proof 不阻塞 closure。

## Closure

Status Note: 完成（2026-08-07）。9 P1 全部修复并配 focused proof；workspace typecheck/build/lint/test 全绿（industrial 1220/1220 tests）；3 份 owner doc 同步 live baseline；共享基础设施（collectAllSymbols/collectWorldBounds/cloneConfigSnapshot 深克隆/groupCounter）落地并被各路径消费；oversized `use-editor-engine.ts`（859 行）显式 deferred 到 successor {2} P1-03 文件拆分（非本 plan closure blocker）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh-session sub-agent `ses_023c74c7affeB3Z8tLQ9UAGmur`（general subagent，不复用执行上下文，per AGENTS.md "Collaboration Discipline"）。
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 1 Minor / 1 Nit）。
- Evidence: 8 项 checklist（A 反应式 / B grouping walkers / C undo integrity / D proof tests / E owner docs / F workspace verification / G scope discipline / H AGENTS.md conventions）逐项 PASS。Minor = 日志条目补录（已补，见 `docs/logs/2026/08-07.md` 顶部 plan-1 执行条目）；Nit = reactivity test 中 placeholder `within` 断言（非阻断，留作 future field-level assertion 接入点）。

Follow-up:

- 40 条 P2 在 roadmap Follow-up Backlog「2026-08-07-1835 post-remediation audit P2」追踪（实际 40 条；open 8 含 C4 + multi 32，两份审计 summary 表少计）
- 11 条同批 P1（contract wiring / 结构 / UI / 测试 / 性能）由 successor {2} 收口（`docs/plans/2026-08-07-1835-2-industrial-hmi-editor-contract-wiring-structure-affordances.md`）；`use-editor-engine.ts` 文件拆分（>700 行 gate）属 successor {2} Phase 1。
- 或明确写 no remaining plan-owned work：本 plan {1} 范围内的 9 P1 全部 close。

---

## 拆分裁定（为何 2 plan 而非 1）

两份审计共 20 条 P1（13 multi + 7 open，open P1-C 含 C1/C2/C3 三 P1 + C4 一 P2）。按 plan guide Rules 22–26 默认先合并，仅在「closure criteria 彼此独立 / owner-doc obligations 不同 / live result surface 不同」时拆。本 mission 的 P1 清晰分成两个**彼此独立**的结果面：

- **结果面 A（本 plan {1}，9 P1）**：编辑器**内部数据模型 / 反应式 / 撤销完整性**正确性。closure 判据 = grouped-child 数据不丢失、undo 增量记录全部 op kind、panel 对 session 反应式。owner-doc = `design-undo-redo.md` / `design-connection.md` / `design-renderer.md §4.1/§4.6`。proof = offset/nested fixture + 反应式 panel 断言。
- **结果面 B（successor {2}，11 P1）**：编辑器**公开契约接线 / 文件结构 / UI affordance / 测试有效性 / 性能**。closure 判据 = onSave/onLoad/commitPolicy/runtime-handles/controlled-push-back 全部 wired、`use-editor-engine.ts` ≤700 行（gate 绿）、delete/group/ungroup 从默认 UI + 键盘可达、test false-green 修复、perf 达 R7。owner-doc = `design-renderer.md §8` / `design-architecture.md §11` / `flux-guide/design-patterns/scada-editor.md`。

两结果面可**各自独立关闭**（A 成立时 B 仍可 open，反之亦然），owner-doc obligations 不同。存在的是**排序依赖**（A 的反应式通道是 B 的 UI 接线可验证的前置；A 的共享 walker 被 B 复用），故 {1} 先 {2} 后——这是执行顺序，非 closure 耦合。不拆成 3 plan：性能（P1-13）与文件拆分（P1-03）强耦合（拆分 unblock 性能），应同在 {2}；测试有效性（P1-12）锁定 {2} 的契约接线，应同在 {2}。
