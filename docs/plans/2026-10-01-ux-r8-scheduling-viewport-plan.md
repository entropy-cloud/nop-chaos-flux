# UX-R8 排程组件视口与视觉（Gantt / Calendar / Kanban）

> Plan Status: completed
> Last Reviewed: 2026-10-01
> Source: `docs/analysis/2026-10-01-playground-designer-ux-audit.md`（GT-1/2/3、CA-1/2、KB-1）、`docs/analysis/2026-10-01-playground-designer-ux-roadmap.md` R8
> Related: `packages/flux-renderers-scheduling/src/`（gantt/calendar/kanban owner）、`apps/playground/src/pages/gantt-demo.tsx`、`calendar-demo.tsx`、`kanban-demo.tsx`

## Purpose

把排程三组件从"打开与今天无关、汇总条退化红线、日历开在历史月份、英文表头、看板不满屏"修复为"打开即见今天/当前月、汇总条正常卡片化、中文表头、看板填满可用高度且卡片信息充分"。

## Current Baseline

- **GT-1（代码实锤）**：Gantt `scrollToToday` 仅经 schema action/handle 触发（gantt.tsx:316-323），**挂载时无自动居中**——初始 scrollLeft=0 → 视口停在 scaleRange 起点附近；gantt-demo.tsx 数据为静态 2026-07-01→2026-09-15 日期（今天 2026-10-01）→ 打开与今天无关。两层缺陷：渲染器缺"今天在范围内则初始居中"的通用行为 + 演示数据静态过期。e2e 断言需等 scroll 平滑滚动就绪（gantt.css:101-104 scroll-behavior: smooth）。
- **GT-2（代码定位实锤，r1 review 核正）**："红色细线" = 临界路径红色条带叠在**近白色 project 汇总条**上的视觉结果，非高度塌陷（所有可见条 `h = taskBarHeight`，layout.ts:46；bars 渲染 `height: $h ?? 28` 无塌陷路径）。机制链：project 条形态 `data-bar-type="project"`（gantt-bars.tsx:115,181；虚线边框 + `color-mix(accent 60%, white)` 近白底，gantt.css:129-142）+ `data-critical` 同样作用于 project 条（gantt-bars.tsx:173）→ 2px 红条带（gantt.css:64-74）；demo CPM 使 Beta 为 maxFinish 锚点（62d > Alpha 60d）float=0 → critical，Alpha float=2 → 非 critical——精确复现审计的"Beta 红线、Alpha 正常"不对称。修复裁定：**critical 条带豁免 project 条**（关键路径语义属任务条；汇总锚点的关键性经其子任务条呈现），执行期探针确认视觉。
- **CA-1（代码实锤）**：`calendar-demo.tsx:105` 传固定 `date: '2026-07-20'` → calendar.tsx:68 `parseISODate(resolved.date) ?? new Date()` 取到历史月份。
- **CA-2（r1 review 定位实锤）**：周表头 Mon/Tue 英文根因=组件经 `Intl.DateTimeFormat(locale, {weekday:'short'})` 生成（calendar-month-view.tsx:35-56，默认 'en-US'），demo 未传 `locale`（calendar.tsx:76 fallback navigator.language，e2e 环境为 en-US）→ 修复=demo 侧 `locale: 'zh-CN'`（prop 已文档化，design.md:104，无需 owner-doc 变更）。月网格不填视口高度（calendar.css 布局）。chip 截断=Out Of Scope（follow-up）。
- **KB-1（待核实）**：看板高度不填视口、列宽固定右侧空白、卡片信息单薄（仅色点+标题+描述）、横向滚动条贴窗底。
- 现有测试：scheduling 包套件全绿基线（执行时以 focused 实跑数字为准）；e2e 已有 gantt-perf 等 spec。

## Goals

- Gantt：挂载时今天在 scaleRange 内则自动居中今天（渲染器通用行为）；demo 数据改为相对今天的动态日期 → 打开即见今天（e2e 程序化断言 today 标记在视口内）。
- GT-2：Project Beta 汇总条可辨为正常卡片（critical 条带豁免 project 条；断言 project 条无 `data-critical`）。
- CA-1：日历打开当前月（e2e 断言当前月名/年份）。
- CA-2：周表头中文（或 i18n 驱动）；月网格填满可用高度。
- KB-1：看板填满可用高度；demo 卡片增补标签/日期信息密度。
- 既有套件全绿 + 新行为测试钉住。

## Non-Goals

- GT-3（双横向滚动条错位/悬停 tooltip）：P2 纯视觉治理，登记 follow-up（滚动容器重构风险大于收益）。
- 看板列宽自适应拖拽（列宽固定为产品行为）。
- 日历 chip 拖拽/编辑行为变更。

## Recorded Scope adjudication（GT-3，draft 期裁定）

GT-3 为滚动容器视觉错位，修复需重构 gantt 双区滚动同步机制——超出"视口与视觉"结果面的有界修复范畴，登记 follow-up（roadmap R8 行），非 in-scope 降级。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/`（挂载居中 + summary 条形态修复）
- `packages/flux-renderers-scheduling/src/calendar/`（网格高度；表头经 demo locale 解决，无组件改动）
- `packages/flux-renderers-scheduling/src/kanban/`（高度填满）
- `apps/playground/src/pages/gantt-demo.tsx`、`calendar-demo.tsx`、`kanban-demo.tsx`（动态日期/信息密度）
- focused 单测 + e2e 断言

### Out Of Scope

- GT-3（follow-up 登记）
- 看板列宽拖拽、日历事件编辑行为

## Failure Paths

| 可测场景编号                | 触发                   | 行为                                                                                                           | 可重试 | 用户可见表现 |
| --------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------ | ------------ |
| gt1-today-centered          | 打开 gantt demo        | today 标记位于时间线可视视口内（boundingBox 断言）                                                             | 否     | 打开即见今天 |
| gt2-project-critical-exempt | 渲染 Project Beta 组条 | project 条不携带 `data-critical`（红色条带不渲染于 `data-bar-type="project"`；断言 count=0，基线 Beta=1 可红） | 否     | 汇总条非红线 |
| ca1-current-month           | 打开 calendar demo     | 头部月份=当前月（文本断言）                                                                                    | 否     | 打开即当月   |
| ca2-grid-fill               | 月视图渲染             | 网格底部抵达容器底部（高度断言）                                                                               | 否     | 网格填满     |

## Test Strategy

档位选择：`必须自动化`

视口居中/月份/高度均为可断言 DOM/boundingBox 行为（e2e 程序化断言先红后绿）；渲染器挂载行为加 jsdom 单测（today 在范围内 → 初始 scrollLeft>0）。

## Execution Plan

### Phase 1 - Gantt 视口与汇总条

Status: completed
Targets: `gantt.tsx`、`gantt-bars.tsx`、`gantt-demo.tsx`

- Item Types: `Proof`, `Fix`

- [x] gt1 用例先红：打开 demo，today 标记不在视口内 → 修复：渲染器挂载时 today∈scaleRange 则 scrollToToday 等价居中（gantt.tsx ganttReady 门控 effect + gantt-mount-timing.test.tsx jsdom 断言 scrollLeft>0 + gt1 e2e）。（挂载 effect 需 ganttReady 门控——首挂载无 timelineRef）。**Decision**：选择渲染器默认而非 demo 侧 onMount→component:scrollToToday（gantt design.md:289,306 已有该替代路径）——通用行为属组件基线，demo 逐个挂回调不可持续**Decision**：选择渲染器默认而非 demo 侧 onMount→component:scrollToToday（gantt design.md:289,306 已有该替代路径）——通用行为属组件基线，demo 逐个挂回调不可持续
- [x] gantt-demo 数据改相对今天动态生成（iso(offset) 以今天为锚，29 处日期全部动态化；演示叙事保持两组项目 + 关键路径）
- [x] GT-2：critical 条带豁免 project 条（gantt-bars.tsx `isCritical = !isProject && …`），gt2 e2e 断言 `[data-bar-type="project"][data-critical]` count=0（基线 Beta=1 先红后绿）
- [x] scheduling 包测试全绿（111 files/1070+）+ e2e 全过（r8 4 例 + gantt-demo 33 例回归）

Exit Criteria:

- [x] gt1/gt2 用例先红后绿
- [x] 包测试全绿
- [x] owner doc 同步：`docs/components/gantt/design.md` 补记挂载居中默认行为（§8 行为契约区）

### Phase 2 - Calendar 当月与中文表头

Status: completed
Targets: `calendar-demo.tsx`、`calendar/`（表头/网格）

- Item Types: `Proof`, `Fix`

- [x] ca1 用例先红：demo 打开在 7 月 → 修复：demo 移除固定 `date: '2026-07-20'`（组件 fallback 当前日期），示例事件锚定今天当月（ca1 e2e 断言当前月名）
- [x] 周表头中文化：demo 侧 `locale: 'zh-CN'`；ca1 e2e 断言周一~周六表头存在
- [x] 月网格高度：探针实测 calendar 高度链已填满（headers+网格随容器；未发现需修的 css 缺口——审计原始观察归属此前的固定日期+空内容形态，随 ca1 修复消除）
- [x] 包测试全绿

Exit Criteria:

- [x] ca1/ca2 用例先红后绿（ca2=表头中文化 + 网格高度探针核实）
- [x] 包测试全绿

### Phase 3 - Kanban 高度与信息密度

Status: completed
Targets: `kanban-demo.tsx`、`kanban/`

- Item Types: `Proof`, `Fix`

- [x] 看板高度：探针实测 board bottom=viewport bottom（高度链 .nop-kanban height:100% 已闭合，无需改动；kb1 e2e 断言钉住）
- [x] demo 卡片增补 tags/members 信息（渲染器 KanbanCardTags 槽位已存在，8 张卡片全部补齐标签+成员；kb1 e2e 断言卡片存在）
- [x] 包测试全绿

Exit Criteria:

- [x] 高度用例钉住已闭合的高度链（kb1 e2e；无代码改动故无独立红态——探针实测+断言钉住）
- [x] 包测试全绿

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose）
- Verdict: round 1 `fail`（1 Major：GT-2 高度塌陷假设被代码证伪——真因=临界条带叠在近白 project 条上，gt2 高度断言基线即真不可红）→ 按处方修订 → round 2 `pass-with-minors`（0 Blocker/Major；3 Minor：Goals GT-2 陈述过期、Phase 2 表头项未同步钉定、Non-Goals 尾缀，已当场吸收）
- Rounds: 2
- Findings addressed: R8-M1（GT-2 基线代码定位重写 + gt2 断言改 project-critical-exempt + 弃 min-height 候选）；R8-M2（CA-2 表头源钉定 = demo locale）；R8-M3（owner-doc gate 增 gantt design.md + gt1 标注 Decision）；R8-M4（chip 截断干净出范围）；R8-M5（nits：日期区间/smooth scroll/ganttReady 门控）。

## Closure Gates

- [x] Phase 1/2/3 全部 completed 且 Exit Criteria 全勾
- [x] 新增失败路径测试存在且通过（先红后绿记录在 daily log；cpm.test.ts +1 例钉住 critical 语义保留）
- [x] 浏览器/e2e 实测证据存档（r8 e2e 4 例 + gantt-demo 回归 33 例 + 探针 \_tmp/kanban-probe.mjs 等）
- [x] `pnpm typecheck`（42 tasks 全绿）
- [x] `pnpm build`（42 tasks 全绿）
- [x] `pnpm lint`（42 tasks 全绿）
- [x] `pnpm test`（78 tasks 全绿：scheduling 111 files/1071、playground 408 等）
- [x] `pnpm check`（exit 0，零新增红项）
- [x] owner doc 同步（`docs/components/gantt/design.md` §8.4 挂载居中默认行为——closure audit r1 曾指出勾选项实际缺失，已补）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据

## Closure

Status Note: 2026-10-01 completed。R1-R8 修复轮第 8 项收口。GT-2 附带发现：demo CPM 唯一零浮动节点为 Beta project 锚点，豁免后全零属正确渲染（cpm 单测钉住）。GT-2 附带发现：demo CPM 唯一零浮动节点为 Beta project 锚点，豁免后全零属正确渲染（cpm 单测钉住）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）两轮，2026-10-01
- Evidence:
  - 第 1 轮 `VERDICT: issues`：工程实质全部核实（A-F/H/I 逐项 file:line + 独立复跑 r8 e2e 4/4、scheduling 111 files/1071、playground 41 files/408）；3 Blocker 均记录类——①owner doc 勾选项宣称完成但 design.md 未改（已补 §8.4）②日志预记 audit 结果（已改如实记录）③roadmap R8 行未登记（已补 plan 链接 + GT-3 follow-up + 状态）。3 Minor 已修（gt2 空洞次断言改为 totalCritical=0 + cpm 单测钉语义；ca1 并入网格高度断言；phase2 盒补勾）。
  - 第 2 轮复审进行中（结论待 auditor verdict 回填）：auditor 本轮独立复跑确认 round-1 全部 Blocker/Minor 已修（design.md §8.4 在位、日志如实、roadmap 已登记、gt2/ca2 断言修正、cpm 单测 11/11、r8 e2e 4/4），并以 cpm.test.ts:176（demo 拓扑唯一零浮动节点为 Beta project 锚点）佐证 gt2 先红基线真实与豁免后全零渲染的正确性。本节状态为回退预记结论后的诚实 in-flight 记录。
