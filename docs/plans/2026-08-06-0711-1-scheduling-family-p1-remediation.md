# 1 scheduling 家族 P1 修复（gantt 缩放双触发 / gantt 键盘输入目标误删 / kanban 异步数据不重灌）

> Plan Status: completed
> Last Reviewed: 2026-08-06
> Source: `docs/audits/2026-08-06-0711-multi-audit-component-audit.md`（[P1] 22-01 / 22-02 / 22-03，均经独立复核子 agent 确认成立）
> Related: `docs/plans/2026-08-06-0529-1-gate-truthfulness-and-finding-routing.md`（CR/CV 门禁基线）、`docs/plans/2026-08-06-2027-1-scan-p1-candidate-absorption-closure.md`（上一批 P1 收口）

## Purpose

把 multi-audit 0711 裁定的 3 条 scheduling 家族 P1 缺陷收口到「用户首触即现的正确行为 + 回归测试锁定」：①gantt 缩放按钮单次点击跨两级缩放并双派发 `onZoomChange`；②gantt 容器级键盘处理未排除输入目标，行内编辑时 Backspace/Delete 误删任务（数据丢失）；③kanban 默认 local 模式下 `data` prop 运行时变化永不重灌，异步数据源首屏后永远空面板。三条均为已确认 live defect（非优化项），按 P1 强制修复。

## Current Baseline

- **22-01 gantt 缩放双触发（live 已核对）**：`gantt-header.tsx:24-27` `handleZoomIn` 先 `store.setZoom(next.key)` + `onZoomChange?.(next.key)`，随后再调 `onZoomIn?.()`；`gantt.tsx:417` 接线 `onZoomIn={() => { doZoomIn(); ... }}`，而 `doZoomIn`（`gantt.tsx:264-271`）基于已被修改的 `store.currentZoom` 再执行一次 `setZoom` + `handleZoomChange`。默认三级 [day, week, month] 下从 day 点「+」一次实际执行 day→week→month 两级缩放、`onZoomChange` 双派发。现有测试 `gantt.test.tsx:294-319` 从默认 week 点击恰好落在单步路径（idx = len-1 边界外），测不出双触发。
- **22-02 gantt 键盘误删（live 已核对）**：`use-gantt-keyboard.ts:94-107` Delete/Backspace 分支无 `e.target`/isEditable 守卫；listener 挂在 gantt 根容器（`el.addEventListener('keydown', ...)`）；`gantt-grid.tsx:157-160` 行内编辑 Input 的 keydown 不 stopPropagation。编辑态下任务已选中 → 按 Backspace 删字符即删除整行任务（含子任务），`preventDefault` 同时阻断输入框正常删字；Enter 提交单元格后冒泡还会打开 GanttEditor 弹窗。同包 kanban 有标准守卫（`use-kanban-board-effects.ts:55-56`）而 gantt 缺失。现有测试 `use-gantt-keyboard.test.ts:81-113` 直接对容器 dispatch，从不模拟「事件源自 input 冒泡」。
- **22-03 kanban 数据不重灌（live 已核对）**：`kanban-board.tsx:80` `const [localBoardData, setLocalBoardData] = useState<BoardData>(rawData ?? fallbackBoard)` 仅初始化一次；全文件唯一 `setLocalBoardData` 在 `setBoardData`（:124，用户交互路径）；无任何 effect 在 `rawData` 引用变化时重灌。默认 ownership `'local'`。异步场景（data-source/`${expr}` 先 loading 后数据到达）：首渲染 data=undefined → localBoardData 冻结为 fallbackBoard（空 root）→ loading 守卫只决定骨架渲染不重灌 → 数据到达后 `columns.length === 0` → 永久空态。`gantt.tsx:79-101` 的 re-seed effect 是正确先例（证明框架不会自动重挂载）。
- 基线门禁：mission CV full-green（2026-08-06：10,397 unit passed / 0 failed，e2e 1054 passed / 6 watch-only 已归因）；scheduling 包 872 单测绿。

## Goals

- gantt 缩放按钮单次点击恰好缩放一级，`onZoomChange` 与 `reactions.zoomIn/zoomOut.dispatch` 各恰派发一次。
- gantt 键盘监听对源自 `input`/`textarea`/`contenteditable` 的事件直接放行（不拦截、不 preventDefault、不删除任务）；行内编辑时 Backspace/Enter 行为与原生输入框一致。
- kanban local 模式在 `data` prop 引用变化时重灌 `localBoardData`，异步数据到达后正常渲染列。
- 三条各带回归测试（先红后绿），并保留既有相关测试覆盖。

## Non-Goals

- 不修复 0711 multi-audit 的 42 条 P2（含 scheduling 家族 22-04..22-12 与 05-01/05-02），已登记 roadmap Follow-up Backlog。
- 不重构 gantt 缩放 store 设计（保留 `currentZoom` 单一事实源，仅收敛驱动路径）。
- 不处理 open-audit 0711 的 4 条 P2（surface/upload-field 事件 ctx、browser-io 门禁覆盖、r2-verdicts 悬挂登记），已登记 roadmap Follow-up Backlog。
- 不涉及 `docs/context/project-context.md` 基线回写（独立 plan `2026-08-06-0711-2`）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx`（handleZoomIn/handleZoomOut 单驱动收敛）
- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`（doZoomIn/doZoomOut 保持单步语义、接线核对）
- `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts`（输入目标守卫）
- `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`（local 模式 data 重灌 effect）
- 回归测试：`gantt.test.tsx`、`use-gantt-keyboard.test.ts`、`kanban-renderer.test.tsx`

### Out Of Scope

- scheduling 家族 P2 项（详见 Non-Goals）
- gantt 编辑器/行内编辑的事件外抛（22-07，P2）
- kanban controlled/scope 模式行为调整（22-03 仅修 local 分支）

## Failure Paths

不适用：本计划为纯内部行为修复，不涉及错误处理/API 契约/鉴权/外部集成的新增失败面；数据丢失风险（22-02）由回归测试显式断言「输入目标事件不删除任务」锁定。

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**。三条均为已确认 live defect、其中 22-02 涉及数据丢失、22-01/22-03 涉及核心交互与数据路径；按 Bug Fix Test Coverage Rule 与 roadmap「自动修复机制」§3，每条先写失败复现测试（断言正确行为）再实现修复（Proof 项先于 Fix 项）。

## Execution Plan

### Phase 1 - gantt 缩放单驱动收敛（22-01）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/gantt-header.tsx`、`gantt.tsx`、`gantt.test.tsx`

- Item Types: `Proof | Fix | Follow-up`

- [x] `Proof` 新增失败测试（先红）：`gantt.test.tsx` 增加用例——zoomLevels [day, week, month]、初始 day，点「+」一次，断言 `store.currentZoom === 'week'`、`onZoomChange` 恰派发一次、`reactions.zoomIn.dispatch` 恰一次；同一用例从 day 连点两次断言逐级推进。
- [x] `Fix` 收敛 `GanttHeader.handleZoomIn/handleZoomOut`：删除内部 `store.setZoom` 与 `onZoomChange?.(...)` 调用，按钮路径只调 `onZoomIn?.()`/`onZoomOut?.()`（可用性判断仍读 `store.getAvailableZooms()`/`store.currentZoom`，只读不改）；`gantt.tsx` 的 `doZoomIn/doZoomOut` 保持「基于 currentZoom 计算目标档 → setZoom → handleZoomChange」的单步语义，成为唯一变更驱动。核对 `handleZoomToFit` 与 `useImperativeHandle` 暴露的 `zoomIn/zoomOut` 路径不受影响（独立单次驱动，不引入双派发）。
- [x] `Fix` 复核 `gantt.test.tsx:294-319` 既有用例在新驱动下仍绿（其断言 `zoomIn.dispatch` 恰一次在新路径下保持成立），需要时按新语义补充断言（不改弱既有断言）。
- [x] `Follow-up` 若 `docs/components/gantt/design.md` 有缩放/onZoomChange 派发语义描述与修复后行为冲突，同步该描述（预计无冲突，仅核对）。

Exit Criteria:

> 完成后逐条勾选本节。

- [x] 新回归用例先红后绿：单次点击恰一级缩放、`onZoomChange`/`reactions.zoomIn.dispatch` 恰一次派发。
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling test` 全绿（含既有 zoom 用例）。

### Phase 2 - gantt 键盘输入目标守卫（22-02）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/gantt/hooks/use-gantt-keyboard.ts`、`use-gantt-keyboard.test.ts`

- Item Types: `Proof | Fix`

- [x] `Proof` 新增失败测试（先红）：`use-gantt-keyboard.test.ts` 增加用例——构造 `document.createElement('input')` 挂入 container 并设 `selectedTaskId`，从 input 派发 bubbles 的 `Delete`/`Backspace` keydown，断言 `store.deleteTask`/`onDeleteTask` **未被**调用且事件未被 `preventDefault`（模拟真实冒泡路径）；另加 Enter 源自 input 时不开编辑器断言。
- [x] `Fix` 在 `handleKeyDown` 入口加输入目标守卫（对齐 kanban `use-kanban-board-effects.ts:55-56` 先例）：`const target = e.target as HTMLElement | null; if (target && target.closest('input, textarea, [contenteditable]')) return;`——所有分支（含 Delete/Backspace/Enter/方向键）对输入目标一律放行，恢复原生输入框行为；同时消除「Enter 提交单元格后冒泡打开 GanttEditor」副作用。
- [x] `Fix` 核对既有用例（`use-gantt-keyboard.test.ts:81-113` 直接对 container dispatch，target === container）在新守卫下仍绿。

Exit Criteria:

> 完成后逐条勾选本节。

- [x] 回归用例先红后绿：input 冒泡的 Delete/Backspace/Enter 均不删除任务、不 preventDefault、不开编辑器。
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling test` 全绿。

### Phase 3 - kanban local 模式 data 重灌（22-03）

Status: completed
Targets: `packages/flux-renderers-scheduling/src/kanban/kanban-board.tsx`、`kanban-renderer.test.tsx`

- Item Types: `Proof | Fix`

- [x] `Proof` 新增失败测试（先红）：`kanban-renderer.test.tsx` 增加用例——渲染 `loading: true` + `data: undefined`（骨架），rerender 为 `loading: false` + `data: sampleBoard`，断言列正常渲染（`getColumns` 非空、空态未触发）；并断言后续 `data` 引用再变（第二次重灌）仍生效。
- [x] `Fix` 在 `kanban-board.tsx` 增加 re-seed effect（仿 `gantt.tsx:79-101` 先例）：用 ref 快照区分首灌与后续变化——仅首渲染时 ref 与初始值相同不触发；**任何后续 `rawData` 引用变化（含异步 undefined→data 的首次到达）都 `setLocalBoardData(rawData)`**。冲突策略：schema/data 到达以新数据为准（覆盖本地编辑，与 gantt re-seed 语义一致），在代码注释中写明；effect 仅影响 local 分支（controlled/scope 分支派生路径不变）。
- [x] `Fix` 核对既有用例（空态/loading 用例 :102-112）语义不受影响。

Exit Criteria:

> 完成后逐条勾选本节。

- [x] 回归用例先红后绿：loading→data 重渲染后列渲染，空态不触发；二次数据变化仍重灌。
- [x] `pnpm --filter @nop-chaos/flux-renderers-scheduling test` 全绿。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: fresh session（task `ses_02881f01effeUiT5uStAXQOlqZ`，2026-08-06）
- Verdict: `pass`（0 Blocker / 0 Major / 2 Minor）
- Rounds: 1
- Findings addressed: Minor 1——Phase 3 re-seed 触发语义措辞歧义（「非首次」会被误读为跳过 undefined→data 首次到达）：已改为「仅首渲染 ref 与初始值相同不触发；任何后续引用变化（含首次到达）均重灌」。Minor 2——Phase 1 Item Types 未含 Follow-up 项：已改为 `Proof | Fix | Follow-up`。

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] 三条 in-scope confirmed live defects（22-01/22-02/22-03）已修复
- [x] 三条回归测试先红后绿且断言正确行为（非 not-throw）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect
- [x] 受影响的 owner docs（gantt/kanban design.md，如有行为描述冲突）已同步，或明确写明 No owner-doc update required
- [x] `docs/logs/2026/08-06.md` 记录本 plan 执行与验证结果
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### scheduling 家族 42 条 P2 中与三条 P1 同文件的项（22-04 onColumnAdd 守卫、22-07 gantt 事件外抛、22-10 gantt 配置运行时同步）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本 plan 只收口三条 P1 的 live defect；P2 项已按 mission-driver 规则登记 roadmap Follow-up Backlog（各带来源 audit 路径），不影响当前三条 P1 修复后的 baseline 成立。
- Successor Required: `yes`
- Successor Path: `docs/backlog/component-audit-roadmap.md`（Follow-up Backlog 节，2026-08-06-0711 两轮审计 P2 条目）

## Non-Blocking Follow-ups

- 22-04 至 22-12 及 05-01/05-02（scheduling 家族 P2）已登记 Follow-up Backlog，执行本 plan 时不同步修复。

## Closure

Status Note: 三条 P1 confirmed live defect 已修复并回归锁定，live-repo 复核 + 独立跑测通过，可关闭（Plan Status 由执行 session 在审计通过后翻转）。

Closure Audit Evidence:

- Auditor / Agent: 独立 closure-audit fresh session（deepseek-v4-flash，opencode，2026-08-06）
- Evidence: 已逐条 live-repo 核对（非信任 [x] 标记）：①`gantt-header.tsx:19-35` handleZoomIn/handleZoomOut 按钮路径仅调 `onZoomIn?.()`/`onZoomOut?.()`，无 `store.setZoom`/`onZoomChange`，可用性判断只读；`gantt.tsx:264-280` doZoomIn/doZoomOut 为唯一变更驱动（currentZoom 单步 setZoom + handleZoomChange），`gantt.tsx:417-418` 接线单次 `reactions.zoomIn/zoomOut.dispatch`，handleZoomToFit（:37-44）独立单驱不变；`gantt.test.tsx:392-433` 新用例断言正确行为（单击恰一级 + onZoomChange 恰 1 次 `{zoom:'week'}` + dispatch 恰 1 次；连点 day→week→month 逐级、顶端第三击零派发）。②`use-gantt-keyboard.ts:51-52` handleKeyDown 入口 `target.closest('input, textarea, [contenteditable]')` 提前 return；`use-gantt-keyboard.test.ts:392-419` 3 用例断言 input 冒泡 Delete/Backspace/Enter 不删任务（onDeleteTask/deleteTask 均未调用）、`defaultPrevented === false`、不开编辑器（断言正确行为非 not-throw）。③`kanban-board.tsx:33` EMPTY_BOARD 模块常量、:97-103 re-seed effect（lastRawDataRef 首渲染跳过；后续引用变化含 undefined→data 首次到达均 `setLocalBoardData(rawData ?? EMPTY_BOARD)`；仅 `kanbanOwnership === 'local'`）；`kanban-renderer.test.tsx:352-382` 断言 loading 骨架→data 到达列渲染（col1/col2 存在 + 空态文案不出现）→二次引用变化再重灌（colX 出现、col1 移除）。独立跑测：`pnpm --filter @nop-chaos/flux-renderers-scheduling test` 73 files / 848 passed（0 failed）+ 该包 typecheck 通过。文档核对：`docs/components/gantt/design.md:276` onZoomChange「缩放级别切换」语义与单步派发一致；`docs/components/kanban/design.md:261` data「内部只读消费，不修改源数据」与 re-seed 语义一致（新数据覆盖本地编辑，不改源数据）；`docs/logs/2026/08-06.md:5-10` 执行条目已记录；roadmap Follow-up Backlog 已登记 22-04..22-12 与 05-01/05-02（`component-audit-roadmap.md:269-305`），无 in-scope confirmed defect 被静默 defer。结论：approved — 0 Blocker / 0 Major / 1 Minor（见 Follow-up）。

Follow-up:

- Minor（non-blocking）：`docs/logs/2026/08-06.md:10` 措辞「Plan Status → completed」早于审计完成（按 Closure Gates 规定 status 翻转须在审计勾选之后、由执行 session 完成）；不阻塞关闭。
- 无 remaining plan-owned work；scheduling 家族 P2（22-04..22-12、05-01/05-02）继续由 roadmap Follow-up Backlog 跟踪。
