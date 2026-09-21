# 481 视觉质量 V11a：Scheduling 族视觉补齐 Plan

> Plan Status: draft
> Last Reviewed: 2026-09-21
> Source: `docs/analysis/visual-quality/V11a-scheduling.md`（已独立核实 pass，本 plan 以其 Findings/候选/裁决表为准）、`docs/backlog/visual-quality-roadmap.md` V11a（:104-106）、证据卡 `docs/audits/visual-quality/scheduling.md`、owner docs `docs/components/roadmap-scheduling.md` 与 `docs/components/{gantt,kanban,calendar}/design.md`
> Related: `docs/plans/476-visual-quality-v6-spreadsheet-tokenization-plan.md`（token 收敛先例）、`docs/plans/477-visual-quality-v7-report-designer-plan.md`（守卫单测先例）、`docs/plans/470-visual-quality-v0-baseline-infra-plan.md`（visual-assert helper / V0 基线设施）

## Purpose

把路线图 V11a 收口：研究报告 §3 裁决 A1-A8 的落地。gantt 关键路径高亮补齐（store 纯函数派生 + CSS 高亮）+ 选中视觉修复；calendar 拖拽 ok/conflict CSS 断链修复 + 事件色双轨消解；域内字面色/rgba 残余令牌化（R1-R8）；scheduling 族 e2e light/dark 双态断言补齐（17 spec 零回归）；owner docs 失实状态（S3.2/S17.7）与契约漂移订正。F2/F3/R9-R12 按研究裁决显式落卡，不做静默 deferred。

## Current Baseline

以下事实均经本 plan 起草轮对 live repo 复核（行号为 2026-09-21 master 实测；研究报告已独立核实 pass）。

### 层叠与令牌前提（本域 dark 现状的解读前提）

- 域内 5 个包 CSS（`src/styles.css` barrel → gantt/kanban/calendar/barcode-input 分文件）全部无 `@layer`，经 playground `styles.css` 以 unlayered 方式跟在 `@import 'tailwindcss'` 之后加载；unlayered 作者样式胜过 layer 内同特异性样式。域内「结构色」多数实际由包 CSS 的 `var(--color-*)` 决定（dark 自适应）；无包 CSS 竞争者的语义态类（选中/今日/WIP 等）原样生效、light 锁定。
- darkMode 触发器已由 V1 统一为 `[data-mode="dark"]`（`tailwind-preset/src/index.ts:142`）；域内 TSX `dark:` 变体零命中。
- 包 CSS 消费的 `var(--color-primary)` 等由宿主 playground `styles.css:30-40` `@theme inline` 映射发布（theme-tokens 直接发布的是 `--primary` HSL 三元组）；裸 theme-tokens 宿主下这些 var 不存在——既有宿主依赖，域内无契约测试，本 plan 维持现状不新增依赖面。

### F1/A1 gantt 关键路径：契约在、实现零、owner doc 状态失实

- grep `critical` 在包 src（非测试）零命中：`gantt-store.ts` 无 criticalPath 派生、`gantt-bars.tsx`/`gantt.css` 无关键路径渲染、`schemas.ts` 无声明。
- 契约在 `docs/components/gantt/design.md:637-650`：`calculateCriticalPath`（拓扑排序 → 正向最早 → 反向最晚 → 浮动为零集）、渲染为红边框或 2px 红顶标、底部图例、`getCriticalPath()` 返回 id 数组。
- 数据通道全在：`links: Map<GanttId, GanttLink>`（`gantt-store.ts:18/:128`）、4 种 link 类型（`gantt.types.ts:48`）、任务像素坐标预计算 `$x/$y/$w`。最近邻实现 baseline 条已挂载（`gantt.tsx:601-603`）。
- `docs/components/roadmap-scheduling.md:109` S3.2 标 `done` 且明文「`criticalPath` 高亮关键路径红色」——与零实现构成状态失实。S3.3 autoScheduling 不失实（`design.md:652-654` 明文后端契约，排除出修复面）。

### F4/A2 gantt 选中视觉：网格行 dark 击穿 + 任务条无选中视觉

- `gantt-grid.tsx:130-133`：:131 `hover:bg-blue-50/50`（已被 `gantt.css:17-19` unlayered color-mix hover 规则遮蔽，死类）；:132 选中 `bg-blue-50` 无竞争者、按字面生效——dark 下选中行保持亮蓝底（#eff6ff），浮在全 dark 网格上，是域内最确定的 dark 击穿。
- 时间线任务条无任何选中视觉：`selectedTaskId` 仅传给 `GanttGrid`（`gantt.tsx:560`），`GanttBars` 不接收该值，`gantt.css` 无 bar 选中规则。

### N1 calendar 拖拽 ok/conflict：发射端在、CSS 端断链（S17.7 失实）

- 发射端在 `calendar.tsx:364-386`：:380-384 对目标格 set `data-drop-target='true'`、`data-drop-valid`、add/remove `drag-ok`/`drag-conflict`。
- CSS 端不在：`calendar.css` 零 `drop-target`/`drag-ok`/`drag-conflict` 规则；全仓 `*.css` 零命中；构建产物 `drag-ok` 计数 0。即单元格拖拽悬停没有任何视觉反馈（含 ok/conflict 可拖性区分）。
- `docs/components/roadmap-scheduling.md:287` S17.7 标 `done`——与 S3.2 同款「只做了发射端即标 done」。
- 对照：kanban 同链路发射端 + CSS 双在（`kanban.css:144-146` box-shadow ring + :148-155 放置指示线），证明 N1 是 calendar 侧真实缺陷而非机制缺失。

### N2/N3 calendar 事件色双轨 + 未定义 var 族

- 双轨：`calendar.css:8-22` `[data-event-type=shift/leave/appointment/maintenance]` 语义 token 规则（success/destructive/primary/warning，dark 自适应）vs `calendar/components/calendar-event-block.tsx:19-24` `TYPE_COLORS` 映射 4 个全仓未定义 var（`--color-calendar-*`）+ 浅色 fallback；默认渲染路径 :118 `backgroundColor: color` 是 inline style，胜过任何 CSS 规则 → 语义 token 规则在默认路径恒不生效，事件色恒为 `#4ade80/#f87171/#60a5fa/#fbbf24`，dark 不翻。仅 eventTemplate 自定义路径落到 CSS 规则。（行号勘误：研究报告核实轮订正为 :120，起草轮 live 复核实为 :118，以 :118 为准。）
- 同族：`gantt-bars.tsx:144` `var(--color-gantt-milestone-stroke, #d97706)` 全仓未定义，milestone 菱形恒为常量琥珀色（带 fallback，渲染不空白）。

### F2/A3 calendar 月视图：设计取舍，非缺陷

- 月视图为资源×日期排班矩阵（`calendar-month-view.tsx` 行=资源、行级虚拟滚动、48px 行高）；「非 6 周网格」是 `docs/components/calendar/design.md:254-255` 风险表明文设计取舍。密度视图（density）在包 src 与 design.md 全文零命中——能力型空白，非「声明无实现」。

### F3/A4 kanban 拖拽悬停：链路 + dark 双实证健康（watch-only）

- 链路逐环在：`use-kanban-dnd.ts:169-175/:140-146`（状态）→ `use-kanban-board-effects.ts:131-138`（:135-136 set/remove `data-drop-target`）→ `kanban-column.tsx:218`（接收属性）→ `kanban.css:144-146`（box-shadow `var(--color-primary)`）+ :148-155 指示线；dark 下 `--color-primary` 翻转、2px 亮蓝 ring 可辨识。
- `kanban-demo.spec.ts:103` 有功能性跨列拖拽 test，但不断言高亮视觉。
- 文档漂移：`docs/components/kanban/design.md:330` 写「放置目标列**边框**高亮 2px **#3b82f6**」——实现为 **box-shadow** `var(--color-primary)`，随回写修正。

### R4-R8 字面色/语义态残余池

- R4：`baseline-bars.tsx` 字面色——:42-43 `rgba(156,163,175,.4)`/`rgba(107,114,128,.6)`、:56/:65 `#ef4444`/`#f59e0b`。
- R5：gantt 临时连线/放置指示线 `#3b82f6`——`use-gantt-link-draw.ts:49/:129`、`use-gantt-drag.ts:38`（cssText）。
- R6：今日线 `bg-red-400`/`text-red-500`——`gantt-markers.tsx:33/:36`。
- R7 亮锁语义态类池：calendar today 三视图（month:238 `bg-blue-50 ring-2 ring-inset ring-blue-400`、week:91、day:71 `bg-blue-50`）、隐藏周末格 `bg-gray-50`（month:209）、weekend `bg-gray-50/50`（month:239）；kanban WIP（`kanban-column-header.tsx:94` `border-red-400 bg-red-50`、:133 `bg-red-100 text-red-600`）、column-adder `border-blue-400 bg-blue-50`（`kanban-column-adder.tsx:31`）、resize handle `hover:bg-blue-500`（`kanban-column-header.tsx:73/:108`）；gantt 表头 `bg-gray-100 text-gray-600`（`gantt-grid.tsx:107`）。
- R8 中性灰 utility 池（约 22 文件 116 hits，扣 barcode 27 后约 89）：已被包 CSS 遮蔽的死类——`kanban-card.tsx:103` `bg-white border-gray-200`、`gantt-cellgrid.tsx:37-38` `border-gray-100 bg-gray-50/50`、`gantt-grid.tsx:131` hover 死类（F4 项一并删）等；其余为无竞争者的中性灰 utility。

### F5/A7 e2e 现状

- spec 全量 17 个：gantt 11（bars-and-links/coverage-gaps/demo/drag-links-advanced/editor-and-keyboard/editor-fields/keyboard-advanced/perf/scale-today/splitter-scroll/states）、kanban 2、calendar 2、diff 2。计算样式断言仅 2 处且均非色彩语义；色彩/dark 断言 0（17 spec `data-mode` 零命中）。
- 可复用资产：V0 helper `tests/e2e/helpers/visual-assert.ts`（`getComputedStyleValue`/`expectComputedStyle`/`expectCssVarResolves`/`captureVisualEvidence`）；`theme-switcher.spec.ts:25-36/:40-54` 四态切换 + light↔dark 计算样式翻转先例。

### R14 豁免对账基线

- `scripts/audit/find-ui-consistency-gaps.mjs:73-82` 对 `packages/flux-renderers-scheduling/src/` 整包豁免（V0 快照 413/121/32 的 scheduling 子集）。本 plan 修复应使豁免命中实例数可归因下降、不新增；豁免移除本身归 V12a。

## Goals

- A1：gantt 关键路径高亮——store 内只读纯函数派生（拓扑 + 正/反向 + 浮动为零集）→ `GanttBars` 打 `data-critical` → `gantt.css` 2px 红顶标（`--color-destructive`）；零 schema 变更、零新数据通道。
- A2：gantt 选中视觉——网格行选中 `bg-blue-50` → `color-mix(in srgb, var(--color-primary) 10%, transparent)` + 删死类 hover；任务条补最小选中视觉（`data-selected` + CSS 规则）。
- N1/R1：calendar 拖拽 ok/conflict CSS 断链修复——补 `data-drop-target` ring + `drag-ok`（success 系）+ `drag-conflict`（destructive 系）token 驱动规则。
- N2/R2：calendar 事件色双轨消解——删 inline bg 与未定义 var 映射，默认路径落 `calendar.css:8-22` 语义 token 规则；`event.color` 显式覆盖与 eventTemplate 路径行为不变。
- N3/R3：未定义 var 族消除——calendar 4 var 随 N2 消亡；milestone stroke 直连既有语义 token。
- R4/R5/R6/R7：语义态字面色批 token 收敛（基线偏差/今日线 → destructive/warning；拖拽临时线 → primary；today 三视图 → primary 系；WIP/adder → destructive/primary 系）。
- R8：中性灰池两半收口——遮蔽死类删除；其余按 R7 批顺手映射，不做全域大扫除。
- A7：e2e 视觉断言——gantt 选中 + 关键路径顶标、calendar today + drag-ok/conflict、kanban drop-target ring 三组 light/dark 双态断言；17 个既有 spec 零回归。
- A4 代价 + owner docs：kanban/design.md:330 漂移修正；S3.2/S17.7 勘误回写；gantt/calendar design.md 渲染细则增补；证据卡 scheduling.md 全量回写；roadmap、daily log。
- 守卫：包级「禁新增字面 hex / 禁新增语义色类」grep 守卫单测先红后绿。

## Non-Goals

- autoScheduling 前端化（`design.md:652-654` 后端契约）。
- F2：6 周网格月视图（设计意图，显式否决）；密度视图实现（能力型缺口，归 scheduling roadmap 后续立项）。
- F3：kanban 拖拽悬停链路修复（无缺陷；仅付断言 + 文档修正代价）。
- R9 barcode overlay 恒暗重设计；R10 导出白底；R12 打印白底；R11 阴影 rgba 黑 token 化（watch-only）。
- diff-view（物理在 `flux-renderers-content` 包，非本域 owner docs 清单）；多选批量（S3.9 已 removed 死模块）。
- `--color-*` 宿主发布层改造与 spreadsheet 式宿主契约测试（现状无，不新增依赖面）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/`：新增 CPM 纯函数模块（store 只读派生）、`gantt-store.ts`（派生接入 + `getCriticalPath()`）、`gantt-bars.tsx`（`data-critical`/`data-selected`）、`gantt.tsx`（传参）、`gantt-grid.tsx`（选中/hover 类清理）、`gantt.css`（critical/selected 规则）、`baseline-bars.tsx`、`gantt-markers.tsx`、`hooks/use-gantt-link-draw.ts`、`hooks/use-gantt-drag.ts`、相关单测。
- `packages/flux-renderers-scheduling/src/calendar/`：`calendar.css`（drop-target/ok/conflict 规则 + R11 浅锁三项）、`calendar/components/calendar-event-block.tsx`（双轨消解）、`calendar-month-view.tsx`/`calendar-week-view.tsx`/`calendar-day-view.tsx`（today/weekend 语义态）、相关组件测试。
- `packages/flux-renderers-scheduling/src/kanban/`：`kanban-column-header.tsx`、`kanban-column-adder.tsx`、`kanban-card.tsx` 死类清理。
- 守卫单测（包内，477 先例）；`tests/e2e/` scheduling 视觉断言（新增 spec 或扩展现有）。
- owner docs：`docs/components/roadmap-scheduling.md`、`docs/components/{gantt,kanban,calendar}/design.md`、`docs/audits/visual-quality/scheduling.md`、`docs/backlog/visual-quality-roadmap.md`、`docs/logs/`。

硬约束（研究报告 §4）：

- 渲染器契约（`props.props/meta/regions/events/helpers`，不经 store 直取）；CPM 为 store 只读派生，不改 parse/update 通道与 schema。
- 包间 Rule 3 隔离（gantt/kanban/calendar 互不依赖）维持。
- 新增 CSS 规则落包内分文件并保持 unlayered 现状，但**不得把「遮蔽 Tailwind 层」当机制依赖**——新语义一律写 token 驱动规则。
- `--color-*` 宿主发布依赖维持现状。

### Out Of Scope

- Non-Goals 所列各项；`flux-renderers-content` 包内任何文件；barcode-input 包内重设计（guard allowlist 之外不改 barcode）。

## Failure Paths

| 场景                      | 触发                                      | 行为                                                       | 可重试         | 用户可见表现             |
| ------------------------- | ----------------------------------------- | ---------------------------------------------------------- | -------------- | ------------------------ |
| cpm-cycle-input           | links 含环（脏数据）                      | 拓扑排序安全终止，环上任务不入关键集，渲染零中断、不抛错   | 否             | 环边不参与高亮，其余正常 |
| cpm-empty-links           | 无 links 或单任务                         | 关键集为空/全浮动，无高亮渲染                              | 否             | 无顶标，布局不变         |
| svg-presentation-attr-var | SVG 呈现属性不接受 `var()`                | 改经 style/class 通道直写 token（以 e2e 计算样式断言为准） | 是             | 颜色仍随主题翻转         |
| host-var-missing          | 裸 theme-tokens 宿主无 `--color-*` 映射层 | 既有宿主依赖维持，fallback 行为与修复前同类                | 是（宿主接入） | token fallback 色        |

## Test Strategy

档位选择（三选一）：`必须自动化`

本档选择：**必须自动化**——CPM 是核心回归路径（单测先红后绿）；token 收敛守卫是防回跳的固定规则；e2e 双态断言消费 V0 工具链（light/dark 计算样式），17 个既有 spec 零回归是硬红线。

## Execution Plan

### Phase 1 - gantt 域：CPM 关键路径 + 选中视觉 + 字面色批 + 守卫单测（红）

Status: planned
Targets: `gantt-store.ts`、新增 CPM 纯函数模块、`gantt-bars.tsx`、`gantt.tsx`、`gantt-grid.tsx`、`gantt.css`、`baseline-bars.tsx`、`gantt-markers.tsx`、`hooks/use-gantt-link-draw.ts`、`hooks/use-gantt-drag.ts`、包内守卫单测

- Item Types: `Proof | Fix | Decision`

- [ ] Proof：CPM 纯函数单测先红——拓扑排序、正向最早/反向最晚、浮动为零集、环输入安全终止（环任务不入集）、空 links 边界；用例含手算期望集
- [ ] Proof：守卫单测先红——包级「禁新增字面 hex / 禁新增语义色类（blue/red/green/amber 等色相类）」grep 守卫（477 先例），两级断言：①本 plan 修复目录（allowlist 外）零命中——对修复前代码为红；②全包中性灰（gray/slate/zinc）utility 计数不高于落地基线（禁新增）。allowlist 常驻登记：barcode-input 恒暗族、export/print 白底、watch-only 阴影
- [ ] Fix：store 内只读纯函数派生 `calculateCriticalPath`（`links` Map + tasks，拓扑 + 正/反向 + 浮动为零集，无 IO，不改 parse/update 通道与 schema）+ `getCriticalPath()` 暴露
- [ ] Fix：`GanttBars` 按派生集打 `data-critical='true'`（`gantt.tsx` 传参）+ `gantt.css` 一条规则——2px 红顶标 `var(--color-destructive)`
- [ ] Decision：design.md 契约中的「底部图例」——实现最小图例（token 驱动）或在 `gantt/design.md` §12.6 渲染细则中显式登记「图例后置」；二选一落定，不得悬置
- [ ] Fix：A2 必选面——`gantt-grid.tsx:131` 死类 `hover:bg-blue-50/50` 删除；:132 选中 `bg-blue-50` 改 token 规则 `color-mix(in srgb, var(--color-primary) 10%, transparent)`（与 :17-19 hover 同法）
- [ ] Fix：A2 bar 侧最小面——`GanttBars` 接收 `selectedTaskId` 打 `data-selected` + `gantt.css` 最小选中视觉规则
- [ ] Fix：R4——`baseline-bars.tsx:42-43` rgba 灰 → muted-foreground 系、:56/:65 `#ef4444`/`#f59e0b` → destructive/warning（SVG 通道以计算样式断言锁定）
- [ ] Fix：R5——`use-gantt-link-draw.ts:49/:129`、`use-gantt-drag.ts:38` `#3b82f6` → `var(--color-primary)`（cssText/style 通道直写；呈现属性不接受 var() 时改走 style/class）
- [ ] Fix：R6——`gantt-markers.tsx:33/:36` `bg-red-400`/`text-red-500` → destructive 系 token
- [ ] Decision：R3-gantt——`gantt-bars.tsx:144` `--color-gantt-milestone-stroke` 未定义 var 消除，直连既有语义 token（`--color-warning`，琥珀语义最近邻，零宿主改动）；如裁决需保品牌色则定义专用 var（宿主 `@theme inline` 发布层 + dark 变体对称）。落定其一并同步证据卡

Exit Criteria:

- [ ] CPM 单测先红后绿有记录；环/空输入行为与 Failure Paths 表一致；`grep critical` 在包 src（非测试）由 0 → 计算与渲染双命中
- [ ] 守卫单测落地且对修复前代码为红有记录；gantt 目录（allowlist 外）字面 hex/语义色类清零后该目录断言转绿（全包转绿归 Phase 3）
- [ ] 选中行 computed background-color 为 primary color-mix、非 `#eff6ff`（组件测试锁定）；`bg-blue-50` 及死类 hover 自 `gantt-grid.tsx` 消失；bar 侧 `data-selected` + CSS 规则在
- [ ] gantt 域 focused typecheck 通过，gantt 既有单测零回归

### Phase 2 - calendar 域：拖拽 CSS 断链 + 事件色双轨消解 + today/weekend 语义态 + R11 浅锁

Status: planned
Targets: `calendar.css`、`calendar/components/calendar-event-block.tsx`、`calendar-month-view.tsx`、`calendar-week-view.tsx`、`calendar-day-view.tsx`、calendar 组件测试

- Item Types: `Proof | Fix`

- [ ] Proof：组件测试先红——①拖拽目标格 `data-drop-target`/`data-drop-valid`/`drag-ok`/`drag-conflict` set/remove 断言（发射端已有，固化行为）；②`calendar.css` 含三条新规则的存在性断言（规则文本级）
- [ ] Fix：N1/R1——`calendar.css` 补 3 条 token 驱动规则（kanban.css:144 同法）：`.nop-calendar [data-slot='calendar-cell'][data-drop-target='true']`（ring，`var(--color-primary)`）、`.drag-ok`（`--color-success` 系）、`.drag-conflict`（`--color-destructive` 系）
- [ ] Fix：N2/R2——消双轨：删 `calendar-event-block.tsx:118` inline `backgroundColor` 与 :19-24 `TYPE_COLORS` 未定义 var 映射，默认路径落 `calendar.css:8-22` 语义 token 规则（success/destructive/primary/warning，dark 自适应）；`event.color` 显式覆盖路径与 eventTemplate 路径行为不变
- [ ] Fix：R7-calendar——today 三视图（month:238/week:91/day:71）→ primary 系（color-mix ring+bg）；隐藏周末格 `bg-gray-50`（month:209）与 weekend `bg-gray-50/50`（month:239）→ muted 系 token；机制 token 驱动（data 标记 + 包 CSS 规则或 token arbitrary 类），dark 计算样式断言锁定（归 Phase 4）
- [ ] Fix：R11 部分——`calendar.css:25` 事件 hover 白描边 `rgba(255,255,255,.8)`、:45 is-split 白左边、:310/:396 `color-mix … white` → 混 `--color-background`
- [ ] Proof：守卫单测 calendar 目录断言转绿（allowlist 外）

Exit Criteria:

- [ ] 拖拽类 set/remove 组件测试先红后绿；`calendar.css` 三条新规则在且 token 驱动
- [ ] 默认路径事件块 computed background-color 来自语义 token（组件测试锁定）；`--color-calendar-*` 全仓消费归零（grep 证）
- [ ] today/weekend 类收敛后 `calendar-month/week/day-view.tsx` 无 `bg-blue-50`/`ring-blue-400` 字面语义色类；R11 三处 white 浅锁消除
- [ ] calendar 域 focused typecheck 通过，calendar 既有单测零回归

### Phase 3 - kanban 语义态 + 域内中性灰收敛批 + 守卫全包转绿

Status: planned
Targets: `kanban-column-header.tsx`、`kanban-column-adder.tsx`、`kanban-card.tsx`、`gantt-cellgrid.tsx`、`gantt-grid.tsx` 及 R8 死类清单文件

- Item Types: `Fix`

- [ ] Fix：R7-kanban——WIP `border-red-400 bg-red-50`（column-header:94）与 `bg-red-100 text-red-600`（:133）→ destructive 系；column-adder `border-blue-400 bg-blue-50`（:31）→ primary 系；resize handle `hover:bg-blue-500`（:73/:108）→ primary 系
- [ ] Fix：R7-gantt——表头 `bg-gray-100 text-gray-600`（gantt-grid:107）→ muted/border 系 token（dark 自适应）
- [ ] Fix：R8 两半——①遮蔽死类删除（逐一核对确有 unlayered 竞争者后再删）：`kanban-card.tsx:103` `bg-white border-gray-200`、`gantt-cellgrid.tsx:37-38`、`gantt-grid.tsx:131`（Phase 1 已删）等研究报告 R8 清单；②其余中性灰在本批触碰文件内顺手映射 `--color-muted-foreground`/`--color-border`，不做全域大扫除，剩余维持既有计数（守卫②断言不增）
- [ ] Proof：守卫单测全包转绿（①修复目录零命中 + ②中性灰计数不高于基线）

Exit Criteria:

- [ ] kanban/gantt 语义态类字面语义色清零（allowlist 外 grep 证）；死类删除清单登记（每项注明遮蔽竞争者出处）
- [ ] 守卫单测全包绿；kanban/gantt 既有单测零回归；包 focused typecheck 通过

### Phase 4 - e2e 双态断言 + owner docs 回写 + 豁免对账

Status: planned
Targets: `tests/e2e/`（新增 scheduling 视觉 spec 或扩展现有）、17 个既有 scheduling spec、owner docs、证据卡、roadmap、daily log

- Item Types: `Proof | Fix`

- [ ] Proof：e2e 三组 light/dark 双态断言（V0 helper + theme-switcher 四态先例；不做截图基线）：①gantt 网格行选中 color-mix + 关键路径顶标 destructive；②calendar today 格 + drag-ok/drag-conflict；③kanban drop-target ring（A4 代价断言，固化 watch-only 结论）
- [ ] Proof：17 个既有 scheduling spec 全量零回归记录（gantt 11 + kanban 2 + calendar 2 + diff 2）
- [ ] Fix：owner docs 回写——`roadmap-scheduling.md:109` S3.2（criticalPath 落地后描述与实现对齐：data-critical + destructive 顶标；勘误经过记证据卡）、:287 S17.7（CSS 补齐后成立性复核 + 勘误记录）；`kanban/design.md:330` 「边框 2px #3b82f6」→ box-shadow ring `var(--color-primary)`；`gantt/design.md` §12.6（:637-650）渲染细则补（store 纯函数派生 + data-critical + 图例裁决结果）；`calendar/design.md` 增补 drag-ok/conflict 规则行（6 周网格风险表 :254-255 维持，A3 无需改）；证据卡 `scheduling.md` 全量回写（F1-F5、N1-N3、R1-R14 裁决与状态）；`visual-quality-roadmap.md` V11a 状态；daily log
- [ ] Proof：`pnpm check` 对账——scheduling 整包豁免零新增命中；豁免命中实例数相对修复前下降并记录下降数（供 V12a/V12b 对账）
- [ ] Proof：构建产物抽查——dist css `drag-ok` 计数 0 → >0、`data-drop-target` kanban/calendar 双规则在、`--color-primary` 发射在案

Exit Criteria:

- [ ] e2e 三组断言绿（light/dark 双态各有计算样式断言）+ 17 spec 零回归有记录
- [ ] owner docs 与 live baseline 一致（逐文件可观测）；豁免对账数字登记 daily log；构建产物抽查三项通过

## Draft Review Record

- Reviewer / Agent: （独立子 agent fresh session 填写）
- Verdict:
- Rounds:
- Findings addressed:

## Closure Gates

- [ ] 全部 in-scope 交付落地（Phase 1-4 Exit Criteria 全勾）
- [ ] in-scope confirmed live defects 已修复：gantt 选中行 dark 击穿、calendar 拖拽 CSS 断链、calendar 事件色双轨死锁、域内字面色/未定义 var 残余
- [ ] in-scope contract drift 已收敛：S3.2/S17.7 owner-doc 状态失实、kanban/design.md:330 契约漂移、gantt/design.md:637-650 关键路径契约实现落地
- [ ] F2（6 周网格/密度视图）、F3、R9-R12、R14 显式裁决落卡（非静默 deferred）
- [ ] 行为/契约结果已达成：CPM 高亮、选中视觉、拖拽 ok/conflict、事件色随主题在单测与 e2e 成立
- [ ] 必要 focused verification 已完成（CPM/守卫单测先红后绿 + e2e 双态断言）
- [ ] 17 个既有 scheduling e2e spec 零回归
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响 owner docs 已同步：roadmap-scheduling.md、gantt/kanban/calendar design.md、证据卡 scheduling.md、visual-quality-roadmap.md、daily log
- [ ] `pnpm check` 零新 hit + scheduling 豁免命中实例数不增（对账已记录）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### F2-a 6 周网格月视图

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 非缺陷——`calendar/design.md:254-255` 风险表明文设计取舍（资源×日期排班矩阵，不硬套通用月历模板），研究报告 A3 显式否决，design.md 无需改
- Successor Required: `no`

### F2-b calendar 密度视图

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 能力型空白（非「声明无实现」），design.md 无该能力声明；归 scheduling roadmap 后续立项（判例同 V6 R9）
- Successor Required: `yes`
- Successor Path: `docs/components/roadmap-scheduling.md` 后续阶段清单立项（非 `docs/plans/` 新 plan）

### F3 kanban 拖拽悬停高亮（链路维护）

- Classification: `watch-only residual`
- Why Not Blocking Closure: 发射端 + CSS + dark 表现逐环双实证健康（Current Baseline F3 节），无缺陷可立项；固化代价已在本 plan 内支付（Phase 4 双态断言 + kanban/design.md:330 漂移修正 in-scope）
- Successor Required: `no`

### R9 barcode-scanner-overlay 恒暗表面白字族

- Classification: `watch-only residual`
- Why Not Blocking Closure: 相机 overlay 刻意恒暗（`bg-black/80`），白字为对比度设计而非 dark 缺陷；进守卫 allowlist 常驻登记
- Successor Required: `no`

### R10 导出白底 `#ffffff`

- Classification: `watch-only residual`
- Why Not Blocking Closure: 导出介质固定白底合理（`use-calendar-export.ts`/`kanban-export.ts`）；进守卫 allowlist
- Successor Required: `no`

### R12 calendar-print.css `#fff`

- Classification: `watch-only residual`
- Why Not Blocking Closure: 打印介质固定白底为介质语义，非屏幕主题范畴；进守卫 allowlist
- Successor Required: `no`

### R11 尾项：calendar.css 阴影 rgba 黑

- Classification: `watch-only residual`
- Why Not Blocking Closure: 阴影在 light/dark 下均为加深语义，黑 rgba 视觉可接受；非本 plan 强约束（白描边/split 边/color-mix 白三项已 in-scope）
- Successor Required: `no`

### R14 scheduling 整包豁免移除

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 豁免移除涉及全包零字面色终态，归 V12a（路线图已登记范围）；本 plan 仅承担对账义务（命中实例数可归因下降、不新增），Phase 4 已覆盖
- Successor Required: `yes`
- Successor Path: `docs/backlog/visual-quality-roadmap.md` V12a

## Non-Blocking Follow-ups

- 豁免命中实例数下降数登记 daily log，作为 V12a/V12b 对账基数（报告 V0 快照 413/121/32 的 scheduling 子集）。
- barcode-input 27 hits 与导出/打印白底维持守卫 allowlist 常驻登记，allowlist 变更需随证据卡同步。
- e2e「scheduling 零色彩/dark 断言」口径经 Phase 4 三组断言后消除；如后续新增断言面，沿用 V0 helper + theme-switcher 先例扩展。

## Closure

Status Note: （closure audit 通过后填写）

Closure Audit Evidence:

- Auditor / Agent: （独立子 agent fresh session 填写）
- Evidence: （task id / daily log link / findings 摘要）

Follow-up:

- （closure 时填写，或写 no remaining plan-owned work）
