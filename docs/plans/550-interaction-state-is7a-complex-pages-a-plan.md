# 550 interaction-state IS-7a complex-pages 序列审查批一——19 页审查 + P0/P1 修复

> Plan Status: completed（2026-10-08 closure audit R2 APPROVED；full-green verification）
> Last Reviewed: 2026-10-08
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-7a）；`docs/skills/interaction-state-audit-prompt.md`；`docs/audits/interaction-state/ledger.md`（IS-7a 页面清单以 IS-0 枚举器输出为准，不手抄）
> Related: `docs/plans/548-interaction-state-is5-data-viz-tables-plan.md` / `docs/plans/549-interaction-state-is6-form-ai-mobile-plan.md`（双审查组模式、判别修正与 stash 红对照纪律沿袭）

## Purpose

对 IS-7a 批 19 页（complex-pages CRUD/主从/表单/审批/sundial 复刻族）执行 prompt §4 全序列交互审查，findings 全量入台账；P0/P1 随批先红后绿修复，P2/P3 逐条三态裁决，零静默。

## Current Baseline

批次页面清单（`pnpm interaction:inventory` 枚举器输出，ledger IS-7a 全部 pending，profile 均 dynamic，路由前缀 `#/complex-pages/`）：

1. **CRUD 族（7 页，审查组 A）**：`standard-crud`、`tree-crud`、`inline-edit-table`、`advanced-query`、`crud-views-export`、`dynamic-tabs`、`combo-editor`。
2. **主从/业务单据族（3 页，审查组 A）**：`master-detail`、`detail-subtables`、`business-document`。
3. **表单/审批/仪表盘族（4 页，审查组 B）**：`form-wizard`、`complex-form`、`approval-tasks`、`dashboard`。
4. **sundial 工作台复刻族（5 页，审查组 B）**：`sundial-workbench`、`sundial-analytics`、`sundial-detail`、`sundial-settings`、`sundial-todo-dialog`。

预注册种子：无（ledger 无 IS-7a 域 pending 种子）。跨批已知候选反模式（按对应 V 读数协议主动探测，不预设结论）：①raw 事件通道 `${event.*}` 模板求值依赖 renderer bindings 形态（IS-5 两处 P1 同根；AI 族已证全面落地 CX-10 惯例）；②公式引擎不支持对象展开（行变换须宿主 namespaced actions）；③受控 props 无 change 通道假供纳（538/548 姊妹面；549 探测未立案）；④按钮 ajax onSuccess 契约漂移（549 登记 watch）；⑤SchemaRenderer schema-prop 不透传（remount key 先例）；⑥ui Calendar components 身份churn 已修（若复刻面有独立日历注意回归）。

## Goals

- 19 页 §4 五步审查全覆盖（双审查组独立 fresh session），findings 全量入 ledger，零静默。
- P0/P1（若有）随批先红后绿修复（红 e2e 先行 + stash 对照）；P2/P3 逐条三态裁决。
- 批次页面行 flip audited；roadmap IS-7a 双表回写；is7a 证据卡落盘。

## Non-Goals

- P2/P3 行为修复（除实现成本极小者随批顺手，逐条留痕）。
- 复刻页（sundial 族）的信息架构/视觉还原度审查——只审交互状态。
- IS-7b 批的页面。

## Scope

### In Scope

- 19 页 live 序列审查取证（双审查组）；`docs/audits/interaction-state/is7a-complex-pages/` 证据卡 + ledger 登记。
- P0/P1 修复（候选落点 `packages/flux-renderers-*` 或 playground complex-pages demo bridge——归属裁定按 §4 步骤 5）。
- 红→绿 e2e：`tests/e2e/complex-pages-interaction-state.spec.ts`（新，P0/P1 各一用例；读数断言）。
- roadmap IS-7a 回写 + dev log。

### Out Of Scope

- IS-7b 批页面；IS-8a–c renderer lab 批；`dingtalk-flow-demo`（IS-1 遗留 pending，归属随 ledger/IS-9 裁定）。
- 渲染器视觉/主题面。

## Failure Paths

不适用：渲染器交互与宿主接线审查/修复（沿 545–549 批口径）。

## Test Strategy

**Must automate**：P0/P1 修复先固化红 e2e（stash 对照取证）后转绿；Proof 先于 Fix。P2/P3 登记须含 live 读数证据。

## Execution Plan

### Phase 1 - 双审查组 19 页红取证（先红）

Status: completed
Targets: 19 页 live 面 + `docs/audits/interaction-state/is7a-complex-pages/findings.md`（新建）

- Item Types: `Proof`

- [x] Proof：审查组 A（10 页）——10 findings（P1×5/P2×3/P3×2）+ n/a 5 面（tree-crud 节点 CRUD、dynamic-tabs closable、detail-subtables 只读子表、business-doc approve、standard-crud V1）。
- [x] Proof：审查组 B（9 页）——10 findings（P1×3/P2×6/P3×1，2 条跨组合并）+ n/a 4（dashboard 零交互面、complex-form/sundial-analytics/settings/todo-dialog 全绿）+ 5 处探针伪影受控撤案（含一次重要改判：approve 全链实证绿）。
- [x] Proof：合并 20 条组原始 findings 为 18 台账行（P1×8/P2×8/P3×2）+ watch 5 → 证据卡 is7a-complex-pages/findings.md + survey-readings-a/b.json；ledger 全量登记（reconcile OK：audited 104 / findings 99 = found 66 + verified 33）。

执行实况注记：修复会话深化两案——①standard-crud「keyword ✓」经 live 复探证伪为 syncLocation hash-write 通道（行集并不实时重滤），查询通道真相 = 搜索 钮（Enter 不提交，affordance gap 登记 watch）；②master-detail 删除钮渲染后再暴露 ${record?.id} 求值 undefined（行作用域实为 $slot.record）——两层根因如实记录。

Exit Criteria:

- [x] 19 页全覆盖零遗漏；每条 P1 附可复现序列 + 程序化读数。
- [x] 证据卡落盘；ledger findings 行全量登记（P2/P3 全部三态 disposition），零静默。

### Phase 2 - P0/P1 修复（逐项转绿）

Status: completed
Targets: 以 Phase 1 取证定位为准

- Item Types: `Fix | Proof`

- [x] Fix：八项 P1 全部落地（详见证据卡修复收口表）：advanced-query（demo 去映射 + renderer applyQueryToRows 匹配器补齐 dict/区间语义 + createTimeRange 约定 + 3 单测）；combo-editor + business-document-002（validation-collection 子字段前缀默认 + 新 form-runtime-validation-array-template.ts 数组模板校验展开 + owner 聚合去重 + 3 新单测）；master-detail（操作列 schema 纠正 + $slot.record 行作用域）；business-document-001（页壳 pb-20 预留带——PageFrame 尝试失败如实记录）；form-wizard-002+001（field-handlers engagement gate + form-runtime 发布延微任务）；approval-001（confirm-bridge 按需挂载 AlertDialog）；approval-002（去死哨兵 dependsOn）。
- [x] Proof：ledger 八行 P1 + form-wizard-001（P2 同修）→ verified fixed-in-batch；其余 P2/P3 显式 watch-only，零静默。

Exit Criteria:

- [x] `complex-pages-interaction-state.spec.ts` 全绿（8/8 passed；各修独立红态取证——probe/stash 记录于证据卡）。
- [x] 受影响包单测零回归：flux-compiler 553、flux-runtime 1494 passed|1 skip、flux-renderers-data 1211、flux-renderers-form 1093、flux-renderers-form-advanced 1150、flux-react 550、ui 243、flux-playground 407；全 workspace pnpm test exit 0。3 个既有测试按修正语义更新（带 plan-550 引注）。
- [x] 无 P0/P1 被静默降级。

### Phase 3 - P2/P3 裁决登记与台账收口

Status: completed
Targets: ledger + is7a 证据卡 + roadmap

- Item Types: `Decision | Proof`

- [x] Decision：P2×7（form-wizard-003/sundial-workbench-001/002/sundial-detail-001/standard-crud-001/inline-edit×2）+ P3×2（英文取消 toast/master-detail 金额）逐条 watch-only 入 ledger，零静默；n-a 9 面按组登记 + 5 处撤案留痕。
- [x] Proof：19 页行 flip audited（reconcile OK：audited 104 / findings 99 = found 66 + verified 33）；roadmap IS-7a 双表回写（done 于 closure audit 后）。 计数勘误（closure audit R1）：20 条组原始 findings 去重合并为 18 条台账行。

Exit Criteria:

- [x] ledger 全量登记 + 页行翻转完成；reconcile OK。
- [x] roadmap IS-7a 双表回写完成。

## Draft Review Record

- Reviewer / Agent: agent_c068e51b（fresh session 独立子 agent，2026-10-08）
- Verdict: `pass`（零 Blocker / 零 Major；1 Minor + 2 Trivial 随 activation 落盘：反模式③锚点勘误——549 探测该面未立案、Last Reviewed 占位说明、Phase 2 空集情形由 Goals"若有"限定词覆盖）
- Rounds: 1
- Findings addressed: 3/3

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P1×8 全部 verified fixed-in-batch；P2 form-wizard-001 同批修正一并 verified）
- [x] 所有 in-scope confirmed contract drifts 已收敛（裁决全落 ledger；quickSaveItem 非动作键/ConfirmHost 常驻 z 预留两条 F 类形态随批修正）
- [x] 行为/契约结果已达成（19 页审查面覆盖零遗漏；20 组原始 findings 去重 18 台账行 + watch/n-a/撤案全登记）
- [x] 必要 focused verification 已完成（红→绿 e2e 8/8 + 八包回归绿 + 全 workspace test exit 0）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（P2×7/P3×2 全部显式 watch-only）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap IS-7a 回写 done；ledger + 证据卡 + dev log 同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（R1 agent_580fef14 REJECTED → 修复 → R2 agent_7a22a843 APPROVED；执行 session 未自审）
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

（无——执行中推翻/改判当场落本节。）

## Non-Blocking Follow-ups

（无——随批如实登记。）

## Closure

Status Note: 已收口（2026-10-08，full-green verification）。IS-7a 19 页序列审查批完成：20 条组原始 findings 去重合并 18 台账行（P1×8/P2×8/P3×2）+ watch/n-a/撤案全量登记零静默；P1 八项（+P2 渲染期 setState）先红后绿；台账 audited 104 / findings 99 reconcile OK。

Closure Audit Evidence:

- Auditor / Agent: R1 agent_580fef14；R2 agent_7a22a843（均 fresh session 独立子 agent，2026-10-08）
- Evidence: R1 **REJECTED**（机械性发现：1 Blocker——台账 finding 行页单元格「（framework-shared）」非清单 id 致 reconcile exit 1；2 Major——计数 19→18 五面勘误、19 翻转行结构损坏（profile 丢失 + 字面 $4 前缀）；3 Minor——approval-002 缺 committed e2e、engagement-gate 残余未注记、roadmap 预填 APPROVED；1 Trivial——\_tmp is7a 文件。行为面 R1 复核绿）。全部修复后 R2 **APPROVED**（delta 复核：reconcile exit 0 audited 104 / findings 99、19 页行 6 列 + profile dynamic + $4 清零、IS-approval-tasks-003 更名入账、e2e 8/8 含第 8 用例、残余注记落卡）。R1-2 残余随收口落盘：plan:68 原始计数 19→20、spec 第 8 用例状态断言收紧、ledger approval-002 被证伪子主张加注。

Follow-up:

- 见 Non-Blocking Follow-ups。
