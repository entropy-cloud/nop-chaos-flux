# 639 跨 roadmap UR-12 GT-3 Gantt 双区滚动同步机制重构

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/cross-roadmap-remediation-roadmap.md` UR-12（Wave D；designer-ux R8 Recorded Scope adjudication：GT-3 超出有界修复范畴 → 滚动容器同步机制重构）
> Related: `docs/analysis/2026-10-01-playground-designer-ux-roadmap.md`（GT-3 登记）、`packages/flux-renderers-scheduling/src/gantt/`、plan 545 Phase 2（timeline 单写者语义）

## Purpose

消除 GT-3 双横向滚动条错位：左网格表格（自然宽 601px）在窄 pane（实测 320px）溢出产生独立横向滚动条，与 timeline 横条互不同步（现行 use-gantt-scroll 仅垂直双向同步、水平单写者 = timeline）。机制重构为**单横向滚动条原则**：左网格永不横向滚动（列宽百分比化恒适配 pane + overflow-x-hidden），横向唯一滚动面 = timeline（store.scrollLeft 单写者语义不变，windowing/splitter 兼容）；并补齐 GT-3 一并登记的 bar 悬停 tooltip 缺失（原生 title）。

## Current Baseline

- 实测探针（1440×900，/#/gantt）：`gridScrollWidth: 611 / gridClientWidth: 320 / gridHasHScrollbar: true`——demo 列宽合计 600px（minWidth 为 table-fixed 下限非加数；601 为折行差异、611 含滚动条），溢出 320px pane（R1 F1 勘误）。
- `gantt-grid.tsx:109/142`：th/td `style={{ width: getColumnWidth(col), minWidth: col.minWidth ?? 50 }}`（px 固定）——table-fixed 下 px 和超出容器即溢出。
- 容器 `gantt-grid.tsx:99`：`overflow-auto`（双向）。
- `use-gantt-scroll.ts`：垂直双向 rAF 同步；水平仅 timeline → store.scrollLeft（plan 545 Phase 2 单写者语义，windowing `sliceVisibleCells` 按 scrollLeft 切片——grid 单元格内容已随 timeline 横滚更新）。
- `gantt-bars.tsx`：三种 bar 元素（milestone/normal/summary 类）均无 title/tooltip。
- 回归网：包内 gantt 测试 13 个 .test.tsx 文件（连 .ts 共 22）+ e2e 12 个 gantt spec（bars-and-links/scroll-preservation/splitter-scroll/demo/perf/states/editor/keyboard 等）。

## Goals

- 单横向滚动条：grid scrollWidth === clientWidth（任意 pane 宽度），横向滚动面唯一 = timeline；垂直双向同步与 virtualizer 行为不变。
- bar 悬停 tooltip（原生 title：任务名 + 起止日期）。
- 判别测试：grid 横向溢出断言（旧实现必挂）+ bar title 断言。

## Non-Goals

- timeline 横滚语义/windowing/splitter 布局逻辑变更；tooltip 组件化（原生 title 起步）。

## Scope

### In Scope

- `packages/flux-renderers-scheduling/src/gantt/gantt-grid.tsx`（列宽 % 化 + overflow-x-hidden）。
- `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx`（bar title）。
- 判别 e2e（gantt GT-3 spec 新增）+ 既有 gantt 套件回归。

### Out Of Scope

- gantt 其它视觉债；timeline 渲染优化。

## Failure Paths

| 编号           | 触发                          | 行为                                                                         | 可重试 | 用户可见表现                                      |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------- | ------ | ------------------------------------------------- |
| column-squeeze | 极窄 pane 下 % 列宽可读性不足 | splitter 可拖宽 pane（既有能力）；不回退机制                                 | 是     | 日期列截断（单元格 truncate、表头换行——显式取舍） |
| e2e-regress    | 既有 gantt e2e 断言横滚行为   | 逐条核对：断言 timeline 横滚的应不受影响；断言 grid 横滚的按新语义更新并记录 | 是     | 无                                                |

## Test Strategy

档位选择：**必须自动化**（滚动容器机制重构）——判别 e2e 先红后绿（grid 横向溢出断言旧实现必挂）+ 既有 12 个 gantt e2e + 包内单测全量回归。

## Execution Plan

### Phase 1 - 机制重构 + 判别测试

Status: completed
Targets: gantt-grid.tsx、gantt-bars.tsx、新增 gantt-gt3-scroll.spec.ts

- Item Types: `Proof | Fix`

- [x] Proof：新增 `tests/e2e/gantt-gt3-scroll.spec.ts`——①grid `scrollWidth <= clientWidth`（1440×900 全宽 + 窄 pane 两口径；窄 pane 经 splitter 拖拽或视口收窄产生——gridWidth 初始恒 320；旧实现必挂）；②timeline 横滚仍可用（scrollLeft 可驱动）；③bar 元素带非空 title（双选择器：`[data-bar-type="milestone"]` + `[data-slot="gantt-bar"]`，覆盖两种元素三种类；旧实现必挂）。
- [x] Fix：gantt-grid 列宽 % 化（`width: (w/total)*100%`，去 minWidth 下限）+ 容器 `overflow-y-auto overflow-x-hidden` + td truncate/th overflow-wrap（判别实验发现的第二溢出源：单元格内容与表头单词撑出 scrollWidth，非列宽本身）。
- [x] Fix：gantt-bars 两种 bar 元素（覆盖三种类）加 `title`（text + start→end；milestone 无独立 end 语义，注记取 text + start）。
- [x] Proof 执行注记：timeline 滚动断言按 gantt-scale-today 先例走祖先链找真实滚动容器（computed overflowX 过滤）+ scrollBehavior:auto 抵消平滑滚动；窄 pane 口径改为视口收窄（确定性）替代 splitter 拖拽。

Exit Criteria:

- [x] 判别 spec 红→绿（红态实测 2 failed：溢出断言 + title 断言；绿态 2 passed）；包内单测 1084/1084 绿；gantt e2e 回归 = 其余 11 spec 187/187 绿（执行期发现：`gantt-bars-and-links.spec.ts`「resize-right changes width」为 **HEAD 既有红**——fresh server + stash 双向对照证实与本 plan diff 无关，归 follow-up 取证，见 daily log）。

### Phase 2 - 回写

Status: completed
Targets: designer-ux roadmap GT-3 条、cross-roadmap、daily log

- Item Types: `Proof`

- [x] GT-3 条注记已修复；cross-roadmap UR-12 置 done + Plan 列；daily log。

Exit Criteria:

- [x] 回写三面一致。

## Draft Review Record

- Reviewer / Agent: fresh session 独立子 agent（2026-10-17，第 1 轮）
- Verdict: `pass-with-minors`（零 Blocker / 零 Major；4 Minor + 2 Informational）
- Rounds: 1
- Findings addressed:
  - Minor F1（基线算术注脚失准）：「表格 601px（列 px 宽 + minWidth 下限之和）」不可复算——demo schema 列宽合计恰为 600px（`apps/playground/src/pages/gantt-demo.tsx:177-182`：240+100+100+60+100）；minWidth 是下限不是加数（且 table-fixed 下各列 width ≥ 50，minWidth 贡献为 0）；本 plan 自录探针为 `gridScrollWidth: 611`，601 无出处。诊断方向（px 列宽 ~600 > 320 pane → grid 独立横滚）经源码核实成立；执行时把注脚改为「demo 列 px 宽合计 600，探针 scrollWidth 611（含边框渲染差值）」。
  - Minor F2（计数漂移）：「包内 gantt\*.test.tsx 14 个文件」实数 13；含 .ts（store/utils/timezone/zoom-fit/hooks/undo/cpm）共 22。执行时更正。
  - Minor F3（Failure Path 措辞）：column-squeeze「列内容换行」不准——默认单元格为 `truncate` 截断（gantt-grid.tsx:174/178），仅表头（无 truncate）换行；且默认 320px pane 下日期列 ~53px 会截断日期。补一句显式声明该取舍（可拖 splitter 补偿已写）。
  - Minor F4（判别 spec 设计）：「三种 bar 元素」实为**两种 JSX 元素覆盖三种类**（milestone 菱形 + task/project 统一元素，gantt-bars.tsx:121-167/169-220）；Proof ③ title 断言需同时覆盖 `[data-bar-type="milestone"]` 与 `[data-slot="gantt-bar"]`（project/task）；Proof ①「窄 pane」口径需写明产生方式（splitter 拖拽或视口收窄——gridWidth 初始恒 320，gantt-layout.tsx:17）。
  - Info F5：「悬停 tooltip 缺失」原文（roadmap:70、UR-12 行、R8 plan:32）均未点名元素；plan 取 bars 解释合理（bar 有 aria-label 无可见 hover affordance），建议 Phase 2 回写时带一句解释性注记。
  - Info F6：`col.width ?? 100` 回退在 %化后仍成立（作分子）；`getColumnWidth` 返回值 number→string 仅 gantt-grid.tsx 内部消费（grep 无外部/测试消费者），无需额外处理。
  - 已核实为真的关键声称：GT-3 原文两半（错位+tooltip）均被 Purpose 覆盖（roadmap:70 / R8 行 110 / R8 plan:36-38 Recorded Scope adjudication 一致）；use-gantt-scroll 仅垂直双向同步 + gantt.tsx:214 水平单写者=timeline 属实；左网格表格全列渲染（无横向 windowing）、sliceVisibleCells 仅作用于 timeline 日格背景（gantt-cellgrid）属实；:99/:109/:142 行号精确；bars 现无任何 title/tooltip 属实；e2e 12 个 spec 计数属实且**无一断言 grid 横向滚动**（横滚断言全部打在 `[data-slot="gantt-scale"]` 父容器；grid 断言仅垂直 scrollTop；gantt-demo.spec:323 `gridOverflowY==='auto'` 断言在 overflow-y-auto 下存活；gantt-mount-timing.test.tsx 以 data-slot 定位 grid、其 `.overflow-auto` 选择器仅找 timeline 容器——均不受本次改动影响）；overflow-x-hidden 对垂直 virtualizer 与 sticky thead 无影响（同一滚动元素、垂直滚动面不变）。

## Closure Gates

- [x] 机制重构落地 + 判别 spec 红→绿
- [x] 既有 gantt 套件回归绿（其余 11 spec 187/187；`gantt-bars-and-links`「resize-right」为 HEAD 既有红——fresh server + stash 双向对照证实，非本 plan 引入，登记 follow-up）
- [x] 回写三面一致
- [x] 全量门禁无非既有红（最终轮数字见 Closure Audit Evidence）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_92906628，见 Closure Audit Evidence）
- [x] `pnpm typecheck`（0 非既有错）
- [x] `pnpm build`（43/44；唯 playground vite.config 既有红）
- [x] `pnpm lint`（绿）
- [x] `pnpm test`（除 playground 3 文件既有登记红外全绿；scheduling 1084/1084）

## Deferred But Adjudicated

（起草期无；执行中改判当场落此节。）

## Non-Blocking Follow-ups

（无。）

## Closure

Status Note: 2026-10-17 收口。GT-3 两半（双横条错位 + tooltip 缺失）全收口：单横向滚动条原则落地（列宽 % 化 + overflow-x-hidden + td truncate/th wrap——判别实验发现的第二溢出源一并处理）；bar 原生 title tooltip；判别 e2e 红态实测 2 failed → 绿 2/2；resize-right HEAD 既有红经双向对照归因登记（与 2026-09-29-7 watch-only 画像吻合）。

Closure Audit Evidence:

- Auditor / Agent: agent_92906628（独立 fresh-session sub-agent，2026-10-17）
- Evidence: Verdict `approved`（0 Blocker / 0 Major）——五项核对全 PASS：实修抽查（% 化/overflow/truncate/wrap/title 逐处 + 旧 getColumnWidth 零残留 + scheduling diff 足迹恰两文件）、判别 spec 独立复跑 2/2（红态算术可从源码复算：列宽合计 600 vs pane 320 结构性必挂）、GT-3 两半覆盖完整、resize-right 双向对照归因可信（2026-09-29-7 watch-only 档案互证）、回写三面一致。Minor（UR-12 翻转时序——本审计批准后追溯有效）与 3 Info 已记录。流程备注：audit gate 未勾时本审计未发生——Evidence 补填与 gates 勾选即本审计的落地动作。

Follow-up:

- 无 remaining plan-owned work。
