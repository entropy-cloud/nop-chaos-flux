# 551 interaction-state IS-7b complex-pages 序列审查批二——18 页审查 + P0/P1 修复

> Plan Status: completed（2026-10-08 closure audit R2 APPROVED；full-green verification）
> Last Reviewed: 2026-10-08
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-7b）；`docs/skills/interaction-state-audit-prompt.md`；`docs/audits/interaction-state/ledger.md`（IS-7b 页面清单以 IS-0 枚举器输出为准，不手抄）
> Related: `docs/plans/550-interaction-state-is7a-complex-pages-a-plan.md`（双审查组模式、判别修正、stash 红对照与 closure-audit 两轮纪律沿袭）

## Purpose

对 IS-7b 批 18 页（complex-pages 外部应用复刻族：antdpro×9 / linear×6 / notion / airtable / stripe）执行 prompt §4 全序列交互审查，findings 全量入台账；P0/P1 随批先红后绿修复，P2/P3 逐条三态裁决，零静默。

## Current Baseline

批次页面清单（`pnpm interaction:inventory` 枚举器输出，ledger IS-7b 全部 pending，profile 均 dynamic，路由前缀 `#/complex-pages/`）：

1. **antdpro 复刻族（9 页，审查组 A）**：`antdpro-list`、`antdpro-form-basic`、`antdpro-form-grouped`、`antdpro-form-dialog`、`antdpro-form-step`、`antdpro-detail-basic`、`antdpro-detail-advanced`、`antdpro-dashboard`、`antdpro-result`。
2. **linear 复刻族（6 页，审查组 B）**：`linear-issues`、`linear-board`、`linear-inbox`、`linear-detail`、`linear-projects`、`linear-settings`。
3. **其余复刻（3 页，审查组 B）**：`notion-database`、`airtable-grid`、`stripe-payments`。

预注册种子：无（ledger 无 IS-7b 域 pending 种子）。跨批已知候选反模式（按对应 V 读数协议主动探测，不预设结论； IS-7a 收口后清单）：①raw 事件通道 `${event.*}` 模板 bindings 形态；②对象展开表达式不可编译静默回退；③受控 props 无 change 通道假供纳；④按钮 ajax onSuccess 契约漂移；⑤SchemaRenderer schema-prop 不透传（remount key 先例）；⑥crud 查询为搜索钮驱动（Enter/变更不自动重查——550 两次观察：standard-crud Enter 不提交、approval-tasks select 提交不重查）；⑦ConfirmHost 确认框 z 已修按需挂载（复刻面若自带 dialog 堆叠注意回归）；⑧数组行假校验已修（combo/input-table 族回归面）。

## Goals

- 18 页 §4 五步审查全覆盖（双审查组独立 fresh session），findings 全量入 ledger，零静默。
- P0/P1（若有）随批先红后绿修复（红 e2e 先行 + stash 对照）；P2/P3 逐条三态裁决。
- 批次页面行 flip audited；roadmap IS-7b 双表回写；is7b 证据卡落盘。

## Non-Goals

- P2/P3 行为修复（除实现成本极小者随批顺手，逐条留痕）。
- 复刻页的信息架构/视觉还原度审查——只审交互状态。

## Scope

### In Scope

- 18 页 live 序列审查取证（双审查组）；`docs/audits/interaction-state/is7b-complex-pages/` 证据卡 + ledger 登记。
- P0/P1 修复（候选落点 `packages/flux-renderers-*` 或 playground complex-pages demo bridge——归属裁定按 §4 步骤 5）。
- 红→绿 e2e：`tests/e2e/complex-pages-replica-interaction-state.spec.ts`（新，P0/P1 各一用例；读数断言；550 的 complex-pages-interaction-state.spec.ts 不复用不扩展）。
- roadmap IS-7b 回写 + dev log。

### Out Of Scope

- IS-8a–c renderer lab 批；`dingtalk-flow-demo`（IS-1 遗留 pending，归属随 ledger/IS-9 裁定）。
- 渲染器视觉/主题面。

## Failure Paths

不适用：渲染器交互与宿主接线审查/修复（沿 545–550 批口径）。

## Test Strategy

**Must automate**：P0/P1 修复先固化红 e2e（stash 对照取证）后转绿；Proof 先于 Fix。P2/P3 登记须含 live 读数证据。

## Execution Plan

### Phase 1 - 双审查组 18 页红取证（先红）

Status: completed
Targets: 18 页 live 面 + `docs/audits/interaction-state/is7b-complex-pages/findings.md`（新建）

- Item Types: `Proof`

- [x] Proof：审查组 A（antdpro 9 页）——7 findings（P1×4/P2×2/P3×1）+ n-a 2 面。
- [x] Proof：审查组 B（linear 6 页 + 其余 3 页）——7 findings（P1×2/P3×5）+ n-a 1 面 + 5 处探针伪影受控撤案（bulk-apply/pagination/滚动复位/drawer-testid/notion option-click）。
- [x] Proof：合并 14 台账行（P1×6/P2×2/P3×6；组原始 7+7=14 无跨组合并）+ watch 4 + n-a 3 → 证据卡 is7b-complex-pages/findings.md + survey-readings-a/b.json；ledger 全量登记（reconcile exit 0：audited 122 / findings 113 = found 74 + verified 39）。计数注记：组原始 14 = 台账 14（本批无合并）。

Exit Criteria:

- [x] 18 页全覆盖零遗漏；每条 P1 附可复现序列 + 程序化读数。
- [x] 证据卡标明组原始 findings 数（14）与去重后台账行数（14）。
- [x] 证据卡落盘；ledger findings 行全量登记（P2/P3 三态 disposition），零静默。

### Phase 2 - P0/P1 修复（逐项转绿）

Status: completed
Targets: 以 Phase 1 取证定位为准

- Item Types: `Fix | Proof`

- [x] Fix：五项 P1 修复（antdpro-list 双死钮移除、grouped 三卡合一 form、form-dialog mock 落库、linear-inbox topbar 自适配带）+ 渲染期 console 噪声守卫（render-host onActionError 跳过表单校验拒绝结果——合并表单使空提交走真校验后该通道逐次打 console.error）。
- [x] Proof：IS-airtable-grid-001 如实降级 watch-only（审查组定罪经三次受控复探未能复现——展开钮路径识别为 Playwright 自动滚动伪影、可见单元格点击保持 400、无选中 Enter 不开弹层；复现配方待重建）；P2/P3 其余显式 disposition，零静默。P3 grouped-002（scoped reset）随三卡合一顺手修正 verified。

Exit Criteria:

- [x] `complex-pages-replica-interaction-state.spec.ts` 全绿（4/4 passed 15.0s；stash 对照 pre-fix 树 4/4 failed——P0/P1 修复面全部有 committed 用例）。
- [x] 受影响包单测零回归：flux-playground 407/407。
- [x] 无 P0/P1 被静默降级（airtable-001 显式 watch-only + 复现配方注记）。

### Phase 3 - P2/P3 裁决登记与台账收口

Status: completed
Targets: ledger + is7b 证据卡 + roadmap

- Item Types: `Decision | Proof`

- [x] Decision：P2×2/P3×6 逐条三态裁决入 ledger（watch-only 为主；grouped-002 随批修正 verified），n-a 3 面写明理由，5 处撤案留痕。
- [x] Proof：18 页行 flip audited（reconcile exit 0：audited 122 / findings 113 = found 74 + verified 39）；roadmap IS-7b 双表回写（done 于 closure audit 后）。

Exit Criteria:

- [x] ledger 全量登记 + 页行翻转完成；reconcile OK（exit 0）。
- [x] roadmap IS-7b 双表回写完成。

## Draft Review Record

- Reviewer / Agent: agent_8c4d0e82（fresh session 独立子 agent，2026-10-08）
- Verdict: `pass`（R1 FAIL 1 Major——反模式⑥出处误标 549/550 实为 550 两次观察；修正后达 zero Blocker/Major。2 Minor + 1 Trivial 随 activation 落盘：Phase 1 exit 补原始数→台账数注记要求、e2e spec 显式命名 complex-pages-replica-interaction-state.spec.ts、假供纳措辞沿前批一致性保留）
- Rounds: 2
- Findings addressed: 4/4

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P1×5 verified fixed-in-batch + P2 grouped-002 随批 verified；airtable-001 显式 watch-only 降级附复现配方注记）
- [x] 所有 in-scope confirmed contract drifts 已收敛（裁决全落 ledger；submitForm 共享端点落库语义注记入卡）
- [x] 行为/契约结果已达成（18 页审查面覆盖零遗漏；14 findings + watch/n-a/撤案全登记）
- [x] 必要 focused verification 已完成（红→绿 e2e 4/4 + playground 407 回归绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（P2×2/P3×6 显式 watch-only；airtable-001 复现配方注记）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap IS-7b 回写 done；ledger + 证据卡 + dev log 同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（R1 agent_df39dfbf REJECTED——2B+1M 首版合并丢字段/重置悬空/throwaway 滞留 → 重建修复 → R2 agent_9554d886 APPROVED delta 复核；执行 session 未自审）
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

Status Note: 已收口（2026-10-08，full-green verification）。IS-7b 18 页复刻族序列审查批完成：14 findings（P1×6/P2×2/P3×6，无跨组合并）+ watch/n-a/撤案全量登记零静默；P1 五项先红后绿（airtable-001 显式降级 watch-only 附三次受控复探记录）；台账 audited 122 / findings 113 reconcile exit 0。

Closure Audit Evidence:

- Auditor / Agent: R1 agent_df39dfbf；R2 agent_9554d886（均 fresh session 独立子 agent，2026-10-08）
- Evidence: R1 **REJECTED**——2 Blocker（首版三卡合一静默丢 4 字段致「视觉三卡保留」三面不实 + 重置 componentId 悬空致台账 grouped-002 假 verified：live 探针 Component handle not found）；1 Major（9 个 \_tmp-is7b-_ 一次性 spec 滞留 tests/e2e 其一 failed）；+ minors。行为面复核绿（onActionError 守卫形状安全、saveAntdProOrder 形状覆盖、inbox topbar 生效、airtable 降级诚实、台账力学全对账）。R1 修复：从 HEAD 重建合并（10 字段全就位、重置改指 antdpro-grouped-form）+ e2e 增四字段在位与 fill→reset→cleared 断言 + throwaway 清零 + 语义注记。R2 **APPROVED**（delta 复核：reconcile exit 0 audited 122 / findings 113 = found 74 + verified 39 全等、grouped 重建 10 字段在位 + 重置改指 + 卡 testid 存活、complex-pages-replica-interaction-state 4/4 含 fill→reset→cleared、ledger 页行 6 列 profile dynamic $4 清零、\_tmp-is7b-_ 清零）。R2 随收口落盘项：tests/e2e/\_tmp-inv4.spec.ts 残留探针删除、submitForm 共享端点落库语义注记入卡、linear-detail-001 类别记号 —/E 对齐。

Follow-up:

- 见 Non-Blocking Follow-ups。
