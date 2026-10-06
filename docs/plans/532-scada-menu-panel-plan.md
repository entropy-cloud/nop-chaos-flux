# 532 SCADA 菜单与面板收尾（S3）Plan

> Plan Status: completed
> Last Reviewed: 2026-10-06
> Source: `docs/backlog/scada-3d-ux-parity-roadmap.md`（S3 工作项）/ `packages/page-designer-renderers/src/page-designer-context-menu.tsx`（菜单组件模式：viewport 钳制/Escape/外点/方向键/items 子内构建）/ `docs/plans/528-report-designer-shell-remediation-plan.md`（WorkbenchShell 宽度回调裁决：本地 useState 会话内）/ Ignition Perspective 8.3 layering 语义（roadmap 对标小节）
> Related: plan 530（S1 done）、531（S2 done）；HCA roadmap（事务/交互边界）

## Purpose

补齐 SCADA 编辑器最后一块 UX 面：画布右键/键盘上下文菜单（图元态/空白态双集，层级操作对齐 Ignition 置顶/上移/下移/置底语义）、WorkbenchShell 左右面板宽度回调接线（会话内）、编辑器空态升级（图标 + 标题 + 引导）。收口状态：SCADA 编辑器菜单/面板/空态与 527/528 已交付 designer 同水位，S1–S3 三项全部收口。

## Current Baseline

2026-10-06 live repo 探查（证据到文件行号）：

- **全包无右键菜单**：`packages/flux-renderers-industrial/src/editor` grep context-menu/onContextMenu 0 命中。
- **菜单组件模式**：`page-designer-renderers/src/page-designer-context-menu.tsx`——固定定位 client 坐标、`VIEWPORT_MARGIN = 8` 防溢出钳制、Escape/外部点击关闭、方向键项间移动、items 在组件内构建（React Compiler refs 规则）、`role="menuitem"` + testid。
- **runtime 动作面已齐**：`reorderZOrder(action: 'toTop'|'toBottom'|'moveUp'|'moveDown')`（use-editor-engine.ts:75、toolbox-runtime.ts:160，经 symbols 数组重排防 T3 双源化，z-order.ts:7）、`paste(): string[]`（:81）、`copySelection(): number`（:77）、`getClipboard()`（:83）、`fitView()`（:63）、`removeWorkingSymbol(ids)`、`setSelection(ids)`。**无 selectAll**（需组件侧组合 `setSelection(顶层 ids)`）。
- **键盘层既有**：scada-editor-canvas.tsx onKeyDown（delete/undo/redo/clipboard/group/arrows，isEditable 守卫）——右键菜单的键盘交互（Escape/方向键）在菜单组件内部处理（527 同款），不进 canvas 键盘层。
- **WorkbenchShell 可拖宽未接线**：scada-editor-canvas.tsx:384-390 `<WorkbenchShell density="flush" header/leftPanel/rightPanel/footer/canvas>`——**未传** `leftResizable/rightResizable/leftWidth/onLeftWidthChange/rightWidth/onRightWidthChange`；Shell API 齐备（workbench-shell.tsx:24-26,118-143）；528 已裁决形态 = 本地 useState 会话内（report page-renderer.tsx:657-679 同款全套接线）。
- **空态纯文案**：`.nop-scada-editor-empty`（editor/styles.css，pointer-events:none）内仅 `t('industrial.scada.editor.emptyScene')` 一行（scada-editor-canvas.tsx 渲染处）；既有断言仅覆盖 `[data-slot="scada-editor-empty"]` 元素存在性（`scada-editor-canvas-viewport-region.test.tsx:367,384`），**无文案级断言**（draft review 就地勘误：起草时「测试断言该文案」声称不实）。
- **readOnly 收敛**：canvas 容器 `disabled`（meta.disabled）门控已有（inert + aria-disabled，[G5-R3] 模式）——菜单必须同门控（disabled 时不弹出）。
- **命中检测**：无现成 symbolFromPoint——需组件侧自实现。原语必须用 **`collectWorldBounds(symbols)`**（`editor-working-helpers.ts:42-63`，累计父链偏移的世界系 rect `{id,x,y,width,height}`）——**不可用 `collectAllSymbols` 裸节点 rect**（其 (x,y) 为 parent-relative，:32-36 明文警告，group 子图元命中会整体错位）；取序 = 返回序（前序 DFS = 绘制序，末尾最顶层，与 z-order 数组序语义一致，z-order.ts:6-7）。
- **HCA 已治理（不重复）**：undo 事务（z-order/paste 各自既有 undo entry；copy 为纯 clipboard 操作不改 working copy 故无 undo entry）、交互正确性、a11y、性能、序列化校验。
- **对标水位**（roadmap 对标小节）：Ignition 8.3 layering 工具 = 置顶/上移/下移/置底四操作（与既有 ZOrderAction 一一对应，菜单只需暴露）。

## Goals

- 画布右键上下文菜单：图元态（复制/删除/层级四操作 + 粘贴）、空白态（粘贴/全选/适应画布）；viewport 钳制、Escape/外点关闭、方向键项间移动、`role="menuitem"` + testid、items 组件内构建（527 组件模式移植）。
- readOnly 收敛：`disabled` 门控下菜单不弹出、动作不可达。
- WorkbenchShell 左右面板 `leftResizable/rightResizable + leftWidth/onLeftWidthChange + rightWidth/onRightWidthChange` 接线，本地 useState（会话内，528 裁决口径）。
- 空态升级：图标（lucide）+ 标题 + 引导文案（保持 pointer-events:none overlay 形态，不引入事件面）。
- owner doc 回写：design-architecture.md（菜单/命中检测契约）+ design-renderer.md（§4.4 regions 面板宽度与空态增补）。

## Non-Goals

- 不碰 undo 事务语义、交互正确性、a11y、性能（HCA 已治理）。
- 不做菜单子菜单/图标列（527 形态为扁平 items，保持）。
- 不做面板宽度持久化（localStorage/会话外，528 裁决 = 会话内）。
- 不做键盘快捷键新增（Ctrl+A 全选等不在本 plan；菜单项只经点击/键盘导航触发）。
- 不含 D1/D2 条目。

## Scope

### In Scope

- 新 `editor/context-menu.tsx`（组件）+ `editor/context-menu-hit.ts`（命中检测纯函数）+ `scada-editor-canvas.tsx` 接线（onContextMenu + 动作分发）。
- `scada-editor-canvas.tsx` WorkbenchShell 宽度接线 + 空态升级 + i18n 双 locale（菜单项/空态标题文案）。
- 单测（菜单组件交互 + 命中检测纯函数 + 面板宽度状态）+ e2e（`scada-editor-context-menu.spec.ts` 新）。
- owner doc 两处回写。

### Out Of Scope

- S1/S2 已收口面、D1/D2、HCA 维度、持久化、新快捷键。

## Failure Paths

| 可测场景编号           | 触发                         | 行为                                                                           | 可重试 | 用户可见表现 |
| ---------------------- | ---------------------------- | ------------------------------------------------------------------------------ | ------ | ------------ |
| menu-disabled-canvas   | meta.disabled 下右键         | 菜单不弹出（readOnly 收敛）                                                    | 是     | 无菜单       |
| menu-empty-canvas      | 空白处右键                   | 空白态 items（粘贴 disabled when 无剪贴板/全选 disabled when 无图元/适应画布） | 是     | 空白态菜单   |
| paste-no-clipboard     | 空剪贴板点粘贴               | 菜单项 disabled 不可达（非点击后报错）                                         | 是     | 灰项         |
| zorder-empty-selection | 图元态菜单但选中已空（竞态） | reorderZOrder 对空选区既有早退（false），菜单先于动作闭合                      | 是     | 无变化       |
| menu-escape-外点       | Escape/菜单外点击            | 菜单关闭不派发动作                                                             | 是     | 菜单消失     |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`（菜单动作直接驱动 working copy 变更，属核心回归路径；且命中检测纯函数天然先行可测）。硬性自动化 Proof 项前置：①命中检测纯函数（图元/空白/嵌套 group/顶层优先/右键选区同步五路）先于接线 Fix；②e2e 菜单交互全链路（右键弹出 → 选区同步 → 动作生效 → undo 回滚）。不落截图判据。

## Execution Plan

### Phase 1 - 上下文菜单组件与画布接线

Status: completed
Targets: `editor/context-menu.tsx`（新）、`scada-editor-canvas.tsx`、`editor/styles.css`、i18n 双 locale

- Item Types: `Fix | Proof`

- [x] Fix：`context-menu.tsx`——527 `page-designer-context-menu` 模式移植（viewport 钳制 VIEWPORT_MARGIN 8、Escape/外点关闭、方向键项间移动 + Enter 触发、items 组件内构建、`role="menu"`/`menuitem` + `scada-editor-context-*` testid、destructive 样式位）。
- [x] Proof（前置）：命中检测纯函数（`editor/context-menu-hit.ts` 新）——`pickSymbolAtPoint(symbols, worldPoint)` 基于 `collectWorldBounds` 世界系 rect 含点判定，取返回序最后（最顶层）；无命中返回 null（空白态）。单测四路：图元命中/空白 null/group 嵌套（子图元世界 rect 命中——判别性：裸节点 rect 原语下 group 子图元错位必挂）/顶层优先（hitId ∉ selection 的右键选区同步属接线/RTL 层断言）。
- [x] Fix：canvas 接线——**右键选区契约：命中图元 ∈ 当前 selection → 保留现选区（支持多选批量层级/删除）；命中图元 ∉ selection → 先 `setSelection([hitId])` 再弹出（动作仍走 selection）；空白右键 → 保留现选区不清除**。`onContextMenu`（disabled 门控早退 + preventDefault + client 坐标 + world 命中 → menu state）；动作分发：图元态 = duplicate（copySelection+paste，副本偏移 +20/+20 并成为新选区）/delete（removeWorkingSymbol(selection)）/层级四操作（reorderZOrder，Ignition 语义）；空白态 = paste（runtime.paste）/selectAll（setSelection(顶层 ids)）/fitView；动作后关菜单。菜单挂载为 keydown 容器（data-slot=scada-editor-canvas div）的兄弟节点（scada-editor-canvas-wrap 内），规避容器 onKeyDown nudge 对菜单方向键导航的冒泡污染。
- [x] Fix：i18n 双 locale——`industrial.scada.editor.menu.*`（duplicate/delete/toTop/moveUp/moveDown/toBottom/paste/selectAll/fitCanvas）。
- [x] Proof：单测（在 Proof 前置项之外）——菜单组件 RTL（弹出项集、Escape 关闭、外点关闭、方向键移动、Enter 触发、disabled 门控不弹出、菜单挂载点与容器键盘层隔离）。

Exit Criteria:

- [x] 菜单组件 + 命中检测 + 接线落地（含右键选区契约），i18n 齐全（menu.\* 10 键双 locale + emptySceneTitle）。
- [x] 单测全绿（命中 5 用例含 group 世界 rect 判别 + 菜单组件 RTL 8 用例 + disabled 门控 RTL 2 用例 = 15 用例；closure audit 计数核验修正——草稿曾误记 17）。

### Phase 2 - 面板宽度接线与空态升级

Status: completed
Targets: `scada-editor-canvas.tsx`、`editor/styles.css`

- Item Types: `Fix | Proof`

- [x] Fix：WorkbenchShell 增 `leftResizable leftWidth={leftWidth} onLeftWidthChange={setLeftWidth} rightResizable rightWidth onRightWidthChange`（本地 useState 初始 undefined = Shell 缺省；528 同款会话内）。
- [x] Fix：空态升级——lucide 图标（如 LayoutGrid）+ 标题（`emptySceneTitle`）+ 引导文案（既有 `emptyScene` 文案复用为引导行）；保持 `.nop-scada-editor-empty` pointer-events:none overlay 形态。
- [x] Proof：单测/RTL——空态渲染图标 + 标题 + 引导行文本级断言（`emptyScene` 复用为引导行——既有断言仅覆盖 data-slot 存在性，本 plan 补文案守卫）；面板宽度回调接线（RTL 触发 onLeftWidthChange → 状态生效）或 Shell props 断言。

Exit Criteria:

- [x] 面板宽度接线落地（左右 handle 挂载 + 键盘 resize → onLeftWidthChange → 受控列宽生效，empty-shell 3 用例）。
- [x] 空态升级落地，RTL 文案级断言全绿（图标 svg + 『空白画面』标题 + 引导行）。

### Phase 3 - e2e 与 owner doc 回写

Status: completed
Targets: `tests/e2e/scada-editor-context-menu.spec.ts`（新）、owner docs

- Item Types: `Proof | Fix`

- [x] Proof：e2e——(a) 图元右键：菜单弹出 + duplicate 生效（symbol +1）+ delete 生效（undo 可回滚）；**判别断言：已选 A 右键 B → 删除的是 B**（右键选区同步契约）；(b) 层级菜单动作生效（reorder 后 working copy symbols 序变化）；(c) 空白右键：全选（selection = 顶层 ids）+ 适应画布（判别断言：先 toolbox.zoomAt ×2 至非 fit 态，fit 后 viewport 必变——closure audit Minor 3 就地强化）；(d) Escape 关闭；(e) disabled 画布不弹出（RTL gating 覆盖）。
- [x] Fix：owner doc 回写——design-architecture.md §10.3（菜单契约：双态 items/命中检测语义/disabled 收敛/动作→runtime 映射）+ design-renderer.md §4.4（面板宽度/空态增补）；roadmap 前提被推翻处就地勘误。

Exit Criteria:

- [x] e2e 全绿（`scada-editor-context-menu.spec.ts` 4/4：右键选区同步判别「已选 A 右键 B 删 B」+ duplicate/delete/undo 回滚、toTop 重排、全选 + Escape、fitCanvas）。
- [x] owner doc 与 live 一致（§10.3 菜单契约 + §4.4 面板宽度/空态增补；执行期计划外项：scada-editor-canvas.tsx 706 行触发 oversized 红线 → 拆出 canvas-view-helpers.ts 视图 helpers 模块，666 行回归限内，collectSiblingRects 同步改用 collectWorldBounds 世界系 rect——与命中检测同正确性口径）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，不复用起草者上下文）
- Verdict: `pass-with-minors`（Round 2；Round 1 fail 3 Major，修订后零 Blocker/零 Major）
- Rounds: 2
- Findings addressed: M1 命中检测原语 collectAllSymbols→collectWorldBounds（世界系 rect + 裸 rect 判别单测）；M2 补右键选区三态契约（∈ selection 保留多选/∉ 先 setSelection([hitId)]/空白保留）+ e2e 判别断言「已选 A 右键 B 删 B」；M3 空态测试声称勘误（仅 data-slot 存在性断言）+ Phase 2 补文案级守卫；m1 菜单挂载点定为 keydown 容器兄弟（canvas-wrap 内）；m2 copy 无 undo entry 措辞勘误；m3 档位升「必须自动化」+ 纯函数 Proof 前置。Round 2 残余 n1-n4（计数七路/`.tsx` 后缀/selection 路归 RTL/勘误标签）已随手吸收。

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（无右键菜单、面板宽度未接线、空态纯文案——Phase 1-3 落地收敛）
- [x] 所有 in-scope confirmed contract drifts 已收敛（菜单动作全部映射既有 runtime 面，无新增事务语义）
- [x] 行为/契约结果已达成（双态菜单/层级四操作/宽度接线/空态升级）
- [x] 必要 focused verification 已完成（命中检测判别单测 + e2e 全链路）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（design-architecture.md §10.3 + design-renderer.md §4.4）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项（证据见 Closure Audit Evidence）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78 任务全绿；industrial 149 文件 1684 用例，含新增 context-menu 家族 15 + empty-shell 3 用例，合计 18 新用例）
- [x] `pnpm check` 零新增红（exit 0；oversized 红触发后拆分 canvas-view-helpers 收敛）
- [x] e2e scada 家族通过（`scada-editor-context-menu` 4/4 新 + 既有 scada-\* 家族 56 用例，合计 60/60；closure audit 实跑核验计数）

## Deferred But Adjudicated

> 执行中推翻/改判条目时当场落本节（When Executing 7）。

（暂无——执行中落账）

## Non-Blocking Follow-ups

- 菜单分组分隔线/图标列（视觉打磨项，非契约）。
- Ctrl+A 全选快捷键（本 plan 仅菜单项入口；快捷键归键盘层统一规划）。

## Closure

Status Note: 三 Phase 全部 completed 且 closure audit（独立子 agent，2026-10-06）approved。右键上下文菜单（双态 items + 右键选区三态契约 + Ignition 层级四操作 + disabled 收敛 + 527 组件模式交互全套）、WorkbenchShell 左右面板宽度受控接线（528 口径）、空态升级（图标+标题+引导行）、命中检测 collectWorldBounds 世界系 rect。执行期计划外项：oversized 红触发 → 拆出 canvas-view-helpers.ts（主文件 706→666 行）且 collectSiblingRects 同步改世界系 rect。审计附 5 Minor 全部随收口 commit 处理（计数修正 2、fitCanvas 判别强化、行数笔误、delete 存活补强断言）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，agent_43f17f12-1b7a-43ad-92e8-7bd47b3fde24）
- Evidence: 2026-10-06 closure audit pass——git 变更面与 diff 摘要完全一致；实跑新增 4 测试文件 18/18 绿 + industrial 全量 1684/1684 + e2e scada 60 用例全过 + pnpm check exit 0 零新增红 + eslint 变更文件 clean；六项行为抽验全过（collectWorldBounds 原语/右键选区三态/disabled 早退/挂载点兄弟/宽度受控回调/空态三件套）；deferred 诚实性核验（无藏匿）；e2e 实跑计数 60（修正声称 57）。

Follow-up:

- 菜单分组分隔线/图标列（视觉打磨）、Ctrl+A 全选快捷键（Non-Blocking Follow-ups 已录）。
