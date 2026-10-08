# 548 interaction-state IS-5 数据可视化与表格域序列审查批——15 页审查 + P1 修复

> Plan Status: completed（2026-10-08 closure audit APPROVED；full-green verification）
> Last Reviewed: 2026-10-08
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-5）；`docs/skills/interaction-state-audit-prompt.md`（§4 五步法 / §6 六类缺陷 / §9 诚实条款）；`docs/audits/interaction-state/ledger.md`（IS-5 页面清单以 IS-0 枚举器输出为准，不手抄）
> Related: `docs/plans/545-interaction-state-is2-gantt-plan.md`（滚动容器序列模板 `tests/e2e/helpers/scroll-container-sequence.ts` 本批复用）；`docs/plans/547-interaction-state-is4-designers-plan.md`（双审查组取证模式沿袭）

## Purpose

对 IS-5 批 15 页（数据可视化与表格域）执行 prompt §4 全序列交互审查（V1–V6 不变量读数取证），findings 全量入台账；P0/P1 随批先红后绿修复，P2/P3 逐条裁决登记（三态），零静默。

## Current Baseline

批次页面清单（`pnpm interaction:inventory` 枚举器输出，ledger IS-5 全部 pending，profile 见台账）：

1. **表格族**（5 页）：`performance-table`（大数据量表格滚动/选择/虚拟化）、`table-popover`（表格内弹出交互）、`table-column-width`（列宽拖拽——V4 中间态几何重点面）、`pivot-table-demo`（透视表展开/钻取）、`data-verify`（数据校验反馈——V3 反馈真实重点面）。
2. **可视化族**（6 页）：`dashboard-demo`（含 dashboard-editor 内嵌编辑器面 + WorkbenchShell——shell-host profile，collapsed 契约 538 已接线）、`graph-demo`（图谱缩放/拖拽——V2 视口稳定重点面）、`map-demo`（地图缩放/标记交互）、`leafer-examples`（canvas 图形示例集）、`three-canvas-demo` / `three-industrial-demo`（3D 画布，交互面可能以观察/豁免为主——以 live 读数为准）。
3. **scada 族**（4 页）：`scada-demo`、`scada-pressure-demo`、`scada-edge-cases`、`scada-perf-scale`（工业画布拖拽/连线/缩放；`scada-editor-demo` 已在 IS-4 审毕——本批四页为非编辑器 scada 面）。

预注册种子：无（ledger 无 IS-5 域 pending 种子）。IS-2 种子 006（gantt 拖拽提交滚动归零）已修，其根因模式（挂载居中 effect 依赖 compiler 增强 deps）对本批 graph/map/three 缩放面为已知反模式候选，序列审查时按 V2 读数协议主动探测。

每页已验证无缺陷序列清单随审查产出归档 `docs/audits/interaction-state/is5-data-viz-tables/findings.md`（沿 IS-4 卡格式：findings 表 + watch + 每页 ✓ 清单 + survey-readings.json；IS-3 先例为 sequence-readings.json）。

## Goals

- 15 页 §4 五步审查全覆盖（双审查组独立 fresh session 真实驱动浏览器取证），findings 全量入 ledger，零静默。
- P0/P1（若有）随批先红后绿修复（红 e2e 先行取证）；P2/P3 逐条三态裁决（watch-only / successor-required / moved-to-successor）。
- 批次页面行 flip audited；roadmap IS-5 双表回写；is5 证据卡落盘。
- 滚动容器模板复用核验：`tests/e2e/helpers/scroll-container-sequence.ts` 在表格滚动面的适用性记录（不适用处如实登记，不强套）。

## Non-Goals

- P2/P3 行为修复（除实现成本极小者随批顺手，逐条留痕）。
- scada-perf-scale / performance-table 的性能基准面改造（测量污染豁免沿 IS-3 perf-scale 裁决先例，若适用则登记）。
- three/leafer 若为纯展示无 renderer 交互面，登记 n/a 并保留读数证据（沿 cal-confirm/cal-success 先例），不强造交互序列。

## Scope

### In Scope

- 15 页 live 序列审查取证（双审查组）；`docs/audits/interaction-state/is5-data-viz-tables/` 证据卡 + ledger 登记（findings 行 + 页行 audited）。
- P0/P1 修复涉及面（以 live 取证定位为准，候选：dashboard-demo 页、graph/map 缩放视口面、表格选择/列宽面、scada 拖拽面；修复落点可能在 `packages/flux-renderers-*`（pivot/graph/map/3d/industrial/dashboard/data 等渲染包）或 playground demo bridge——归属裁定按 prompt §4 步骤 5）。
- 红→绿 e2e：`tests/e2e/` 新增 `data-viz-interaction-state.spec.ts`（P0/P1 各一用例；读数断言，截图仅佐证）。
- roadmap IS-5 回写 + dev log。

### Out Of Scope

- IS-8c 的 scheduling lab 路由（4 条）；`scada-editor-demo`（IS-4 已审）。
- 渲染器视觉风格/主题面（非交互状态缺陷）。
- IS-9 的守护固化（共享 helper 沉淀与门禁扩展）。

## Failure Paths

不适用：渲染器交互与宿主接线审查/修复，无错误处理/API 契约/鉴权/外部集成路径（沿 545–547 批口径）。

## Test Strategy

**Must automate**：P0/P1 修复必须先固化红 e2e（读数断言定位缺陷），修复后转绿；Proof items 先于 Fix items。P2/P3 裁决不强制自动化，但登记必须含 live 读数证据。

## Execution Plan

### Phase 1 - 双审查组 15 页红取证（先红）

Status: completed
Targets: 15 页 live 面 + `docs/audits/interaction-state/is5-data-viz-tables/findings.md`（新建）

- Item Types: `Proof`

- [x] Proof：审查组 A（8 页）独立 fresh session §4 序列审查——12 findings（P1×4/P2×4/P3×4）+ 56 条清洁序列 + n/a 3 面登记 + watch 5；探针 28 支存档可重放。
- [x] Proof：审查组 B（7 页）独立 fresh session §4 序列审查——7 findings（P1×1/P2×3/P3×2+观察×1）+ watch 3 + 豁免 2；读数链探针 33 支（含 map 定罪链 6 探针）。
- [x] Proof：合并登记 19 findings（P1×5/P2×7/P3×6+观察×1，去重后；scada-family-001 跨 scada-demo+scada-pressure-demo 两页以单行登记）→ 证据卡 is5-data-viz-tables/findings.md + survey-readings-a/b.json 落盘；ledger 全量登记（reconcile OK：audited 33 / findings 55）。计数口径：组间 watch 5+3 合并为 8 条原始记录，证据卡 watch 节按主题归并为 10 项（增 pivot-sort/graph-wheel/框架 bindings 契约三项派生面，删已解决的 dashboard-save 二分项）。

执行实况注记：审查组各含 fresh 探针伪影自纠记录（A：平移失效读数系探针落点在节点上的伪影，干净落点复测判无罪；B：probe12/12b 自污染识别废弃，probe14/15/16 定罪链替代）。

Exit Criteria:

- [x] 15 页全覆盖零遗漏（inventory 清单对照）；每条 P1 finding 附可复现序列 + 程序化读数（map 定罪链 6 探针、dashboard save setItem 间谍、column-width 锚点对照）。
- [x] 证据卡落盘；ledger findings 行全量登记，零静默（P2/P3 全部三态 disposition）。

### Phase 2 - P0/P1 修复（逐项转绿）

Status: completed
Targets: 以 Phase 1 取证定位为准（候选见 In Scope）

- Item Types: `Fix | Proof`

- [x] Fix：IS-map-demo-001——map-renderer singleclick 派发 bindings 补 event 键（`{...payload, event: payload}`，CX-10 求值契约：模板对 bindings 根求值）+ map-demo env notify 接 notifyWithToast（schema 承诺 showToast 而原 env 仅 console——IS-4 taskflow-3 同面）。
- [x] Fix：IS-dashboard-demo-001——dashboard-editor-renderer dispatchEventRef 传 evaluationBindings（原裸 {scope} 使 onSave 链 `${event.serialized}` 全灭）。
- [x] Fix：IS-dashboard-demo-003——width 常量改受控 useState + onLeftWidthChange/onRightWidthChange 接线（538 collapsed 口径）。
- [x] Fix：IS-table-column-width-001——use-column-resize startResize/stepResize 增 measuredWidth 参（handle 端 closest('th') 实测），锚点优先级 tracked > 实测 > 兜底；键盘步进同修。
- [x] Fix：IS-perf-001——demo 三个数据动作改 perfDemo namespaced host actions（对象展开表达式公式引擎不可编译（compile 报 Invalid object key），宿主承接变换沿 calendarDemo/dashboardDemo 先例）；框架静默回退面（compile-node 失败回退 static-node 原始串）登记为框架语义 watch 候选。
- [x] Proof：ledger 五行 P1 → verified（fixed-in-batch）；无 P0/P1 静默降级。

执行实况注记（判别修正一处）：列宽用例首版锚定首列 ID（渲染 117px ≈ 120 兜底，非判别——红态误通过）；经 fixture 结构探针（th/colgroup 宽读数）改锚 Name 列（200px）+ colgroup col 内联宽读数，stash 对照红态 committed=200 定罪成立。

Exit Criteria:

- [x] 新 spec 5/5 全绿（tests/e2e/data-viz-interaction-state.spec.ts，30.3s；红→绿：pre-fix stash 树 5/5 红——含判别修正后复验）。
- [x] 受影响包单测零回归：flux-renderers-data 1208/1208、flux-renderers-dashboard 92/92、flux-renderers-map 64/64。

### Phase 3 - P2/P3 裁决登记与台账收口

Status: completed
Targets: ledger + is5 证据卡 + roadmap

- Item Types: `Decision | Proof`

- [x] Decision：P2×7/P3×6+观察×1 逐条三态裁决入 ledger（全部 watch-only——均为登记裁决面，无静默降级）；n/a 豁免四条（pivot 无交互面/leafer 参考页/three-industrial 无 canvas/scada-perf-scale 无需豁免裁决）+ watch 8 条入证据卡，理由写明。
- [x] Proof：15 页行 flip audited（reconcile OK：audited 33 / findings 55 = found 38 + verified 17）；roadmap IS-5 双表回写（done 于 closure audit 后）。

Exit Criteria:

- [x] ledger 全量登记 + 页行翻转完成；reconcile OK。
- [x] roadmap IS-5 双表回写完成。

## Draft Review Record

- Reviewer / Agent: agent_2db279dc（fresh session 独立子 agent，2026-10-08）
- Verdict: `pass`（零 Blocker / 零 Major；1 Minor + 3 Trivial 随 activation 全部落盘：packages/data-\* 幽灵引用换实包集、Draft Review Record 补 Findings addressed 字段、卡格式归属勘误、Phase 3 补 roadmap todo→planned 注记）
- Rounds: 1
- Findings addressed: 4/4（1M 落盘；3 Trivial 落盘）

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P0 无；P1×5 全部 verified fixed-in-batch——红→绿 e2e + stash 对照）
- [x] 所有 in-scope confirmed contract drifts 已收敛（F 类 two 处 P1 即本批接线面；裁决全落 ledger，零静默）
- [x] 行为/契约结果已达成（15 页审查面覆盖零遗漏；19 findings + 4 n/a + watch 全登记）
- [x] 必要 focused verification 已完成（红→绿 e2e 5/5 + data 1208/dashboard 92/map 64 回归绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（P2×7/P3×6+观察全部显式 watch-only disposition）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap IS-5 回写 done；ledger + 证据卡 + dev log 同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（agent_b5aa2b22，2026-10-08，R1 VERDICT: APPROVED——3 Minor + 2 Trivial 全部随收口提交落盘；执行 session 未自审）
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 任务）
- [x] `pnpm check`（exit 0——console-baseline 因 map-demo notify 去掉 console 通道经 --update-baselines 收缩 25 条， sanctioned 流程）

## Deferred But Adjudicated

（无——执行中推翻/改判当场落本节。）

## Non-Blocking Follow-ups

- 滚动容器模板在表格面的扩展（若本批发现模板缺口，登记 IS-9 沉淀候选，不随批实现）。

## Closure

Status Note: 已收口（2026-10-08，full-green verification）。IS-5 十五页序列审查批完成：19 findings（P1×5/P2×7/P3×6+观察×1）全量登记零静默；P1 五项先红后绿（stash 对照 5/5 红 → 修复树 5/5 绿）；P2/P3 全部显式 watch-only；n/a 豁免四条；台账 audited 33 / findings 55 reconcile OK。

Closure Audit Evidence:

- Auditor / Agent: agent_b5aa2b22（fresh session 独立子 agent，2026-10-08）
- Evidence: R1 VERDICT: APPROVED。审计独立复跑：reconcile（audited 33 / findings 55 全等）、playwright 5 用例 5 passed（30.1s）、data/dashboard/map 包回归（1208/92/64）、console-baseline 无新红、flux-renderers-data typecheck 清洁；框架契约主张代码级证实（action-core withEvaluationBindings 根合并 + ctx.event 不参与求值 + scada-editor-demo 既有注释佐证）；红→绿判别性逐用例核算（ID 列 117px ≈ 兜底非判别的修正故事成立）。Issues 全部随收口落盘：R1-1 [Minor] ledger IS-5 翻转行 7 列幻影 → 6 列收敛；R1-2 [Minor] 红态读数 archived 数值与静态推演不一致 → 原始 error 行入卡 + spec 注记改死区语义；R1-3 [Minor] 组 A P3 计数/watch 计数口径 → 全文对齐；R1-4 [Trivial] roadmap IS-3 表行 planned→done 漂移清理；R1-5 [Trivial] 收口提交事项（本提交）。

Follow-up:

- 见 Non-Blocking Follow-ups。
