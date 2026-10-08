# 552 interaction-state IS-8a renderer lab 序列审查批一——82 页审查 + P0/P1 修复

> Plan Status: completed（2026-10-08 closure audit 三轮 R1/R2 REJECTED → R3 APPROVED；full-green verification）
> Last Reviewed: 2026-10-08
> Source: `docs/backlog/interaction-state-quality-roadmap.md`（IS-8a）；`docs/skills/interaction-state-audit-prompt.md`；`docs/audits/interaction-state/ledger.md`（IS-8a 页面清单以 IS-0 枚举器输出为准，不手抄）
> Related: `docs/plans/551-interaction-state-is7b-complex-pages-b-plan.md`（四审查组模式、closure-audit 两轮纪律、台账力学检查单沿袭）

## Purpose

对 IS-8a 批 82 页（renderer lab 全家族：基础/结构/输入/日期/选择/复合/数据展示）执行 prompt §4 全序列交互审查，findings 全量入台账；P0/P1 随批先红后绿修复，P2/P3 逐条三态裁决，零静默。

## Current Baseline

批次页面清单（`pnpm interaction:inventory` 枚举器输出，ledger IS-8a 全部 pending，profile 均 dynamic，路由前缀 `#/lab/`）。四审查组按主题划分：

1. **组 A 结构/布局/反馈（20 页）**：lab-page、lab-container、lab-fragment、lab-flex、lab-dialog、lab-drawer、lab-command-palette、lab-tabs、lab-loop、lab-recurse、lab-dynamic-renderer、lab-reaction、lab-keyboard、lab-scope-debug、lab-fieldset、lab-hidden + lab-text、lab-icon、lab-badge、lab-button。
2. **组 B 输入与日期（22 页）**：lab-form、lab-input-text、lab-input-email、lab-input-password、lab-input-number、lab-slider、lab-rating、lab-input-color、lab-textarea、lab-markdown-editor、lab-input-signature、lab-verification-code、lab-input-city、lab-picker、lab-icon-picker + lab-input-date、lab-input-datetime、lab-input-time、lab-date-range、lab-input-month、lab-input-quarter、lab-input-year。
3. **组 C 选择与数组（18 页）**：lab-select、lab-checkbox、lab-switch、lab-radio-group、lab-checkbox-group、lab-button-group-select、lab-input-tree、lab-tree-select、lab-user-select、lab-department-select + lab-tag-list、lab-key-value、lab-array-editor、lab-combo、lab-input-table、lab-transfer + lab-detail-field、lab-detail-view。
4. **组 D 条件/编辑/数据展示（22 页）**：lab-condition-builder、lab-input-file、lab-input-image、lab-editor、lab-object-field、lab-array-field、lab-variant-field、lab-cron-editor + lab-table、lab-tree、lab-list、lab-pagination、lab-crud、lab-batch-bar、lab-query-filter、lab-data-source、lab-chart、lab-echarts、lab-statistics、lab-stat-tile、lab-sparkline、lab-dashboard-filter。

预注册种子：无（ledger 无 IS-8a 域 pending 种子）。跨批已知候选反模式（IS-5/6/7a/7b 收口清单；按对应 V 读数协议主动探测，不预设结论）：①raw 事件通道 `${event.*}` bindings 形态；②对象展开表达式不可编译静默回退；③受控 props 无 change 通道假供纳；④按钮 ajax onSuccess 契约漂移；⑤SchemaRenderer schema-prop 不透传；⑥crud 查询搜索钮驱动契约；⑦ui Calendar components 身份churn（**lab-input-date/datetime/date-range 族直接回归面——IS-6 修复后本批必须复验日选提交**）；⑧数组行假校验（combo/input-table 族——IS-7a 修复后回归面）；⑨Playwright 自动滚动伪影（551 两次现形：linear-issues 弹层打开滚动归零、airtable-grid 展开钮路径——滚动复位类定罪必须用已可见元素/键盘事件取证）。

## Goals

- 82 页 §4 五步审查全覆盖（四审查组独立 fresh session），findings 全量入 ledger，零静默。
- P0/P1（若有）随批先红后绿修复（红 e2e 先行 + stash 对照）；P2/P3 逐条三态裁决。
- 批次页面行 flip audited；roadmap IS-8a 双表回写；is8a 证据卡落盘。

## Non-Goals

- P2/P3 行为修复（除实现成本极小者随批顺手，逐条留痕）。
- lab 页面的 scenario 覆盖度审查（只审已渲染交互面的交互状态）。

## Scope

### In Scope

- 82 页 live 序列审查取证（四审查组）；`docs/audits/interaction-state/is8a-renderer-lab/` 证据卡 + ledger 登记。
- P0/P1 修复（候选落点 `packages/flux-renderers-*`、`packages/ui` 或 playground lab 页——归属裁定按 §4 步骤 5）。
- 红→绿 e2e：`tests/e2e/renderer-lab-interaction-state.spec.ts`（新，P0/P1 各一用例；读数断言）。
- roadmap IS-8a 回写 + dev log。

### Out Of Scope

- IS-8b/8c 批页面；`dingtalk-flow-demo`（IS-1 遗留 pending，归属随 ledger/IS-9 裁定）。
- 渲染器视觉/主题面。

## Failure Paths

不适用：渲染器交互与宿主接线审查/修复（沿 545–551 批口径）。

## Test Strategy

**Must automate**：P0/P1 修复先固化红 e2e（stash 对照取证）后转绿；Proof 先于 Fix。P2/P3 登记须含 live 读数证据。

## Execution Plan

### Phase 1 - 四审查组 82 页红取证（先红）

Status: completed
Targets: 82 页 live 面 + `docs/audits/interaction-state/is8a-renderer-lab/findings.md`（新建）

- Item Types: `Proof`

- [x] Proof：审查组 A（20 页）——12 raw（P1×2/P2×4/P3×4 + recurse-001 后撤案）+ n-a 纯展示面。
- [x] Proof：审查组 B（22 页）——12 raw（P1×4/P2×2/P3×6）+ 5 处探针伪影撤案 + **强制日选回归面全绿**（⑦：IS-6 ui Calendar 修复后 date/datetime/date-range/month/quarter/year 日格提交全数通过）。
- [x] Proof：审查组 C（18 页）——3 raw（P2×2/P3×1）+ 3 撤案 + **强制数组行校验回归全绿**（⑧：combo/input-table/array-editor pristine 提交零假 required）。
- [x] Proof：审查组 D（22 页）——10 raw（P1×1/P2×6/P3×2）+ 3 撤案 + n-a 4 + **crud 搜索钮契约健康对照**（⑥）。
- [x] Proof：合并 37 条组原始观察 → 组内并账 34 组行（A 12→10、D 10→9）→ 跨组 notify 三处合一 → 32 台账行（lab-shell notify no-op 三处表现合一；recurse-001 执行会话撤案单列）+ watch 7 + n-a 逐组 → 证据卡 is8a-renderer-lab/findings.md + survey-readings-A/B/C/D.json；ledger 全量登记（reconcile exit 0：audited 204 / findings 145 = found 97 + verified 48）。

Exit Criteria:

- [x] 82 页全覆盖零遗漏；每条 P1 附可复现序列 + 程序化读数（recurse-001 经复核撤案——撤案证据 artifact-proof e2e 落库）。
- [x] 证据卡落盘（组原始 34 → 台账 32 计数注记）；ledger findings 行全量登记，零静默。

### Phase 2 - P0/P1 修复（逐项转绿）

Status: completed
Targets: 以 Phase 1 取证定位为准

- Item Types: `Fix | Proof`

- [x] Fix：七项 P1 修复（hidden 双案共享根因 scope 通知层无重放 + form 桥 values 身份扇出——scope.ts eager lastChange + fieldState 感知；password demo 死键 + 桥修复；rating max 默认 5 钳制；date-range resetOnSelect + pendingAnchor 两击契约；city 非叶点击钻取语义；crud dialog 模式 dirty 自 controller 解析；lab 壳 notifyWithToast 接线——IS-4 先例）+ P2 dialog-001 随批修正（ui dialog full 去钳制 + dialog-host 透传）。
- [x] Proof：**IS-lab-recurse-001 撤案**（执行会话文本节点精确核算证明守卫已生效——审查组定罪读数来自 scope-debug dump 嵌入数据标签；守卫/未守卫双契约 artifact-proof e2e 落库防回归）。ledger verified 9 = 六项 P1（hidden-001/password/rating/date-range/city/crud-002）+ 三项 P2（hidden-002/shell-notify/dialog-001）；recurse-001（P1）found+withdrawn 单列；其余显式 watch-only 零静默。（R2 delta 复核：本条为 R1 Major #2 的指名落点——首轮修正因脚本锚点失败未落盘，R3 前已补。）

Exit Criteria:

- [x] `renderer-lab-interaction-state.spec.ts` 全绿（10/10 passed——含 recurse 撤案防回归双契约用例；各修独立红态取证）。
- [x] 受影响包单测零回归：flux-runtime 1494|1 skip、flux-renderers-form 1095、flux-renderers-data 1211、ui 244、flux-react 550、flux-playground 407；typecheck/build/lint 零错误。4 个既有测试按修正语义更新（plan-552 引注：dialog-host、date-range×3）。
- [x] 无 P0/P1 被静默降级（recurse 撤案以 artifact-proof e2e 显式留痕）。

### Phase 3 - P2/P3 裁决登记与台账收口

Status: completed
Targets: ledger + is8a 证据卡 + roadmap

- Item Types: `Decision | Proof`

- [x] Decision：P2×12/P3×13 逐条三态裁决入 ledger（watch-only 为主；shell-notify/dialog-001/hidden-002 随批修正 verified），n-a 面逐组登记，11 处探针伪影撤案留痕。
- [x] Proof：82 页行 flip audited（reconcile exit 0：audited 204 / findings 145 = found 97 + verified 48；**发现并修正 IS-condition-builder-002 id 撞号**——本批 lab 行更名 IS-lab-condition-builder-001，IS-7a aria-pressed 行恢复）；roadmap IS-8a 双表回写（done 于 closure audit 后）。

Exit Criteria:

- [x] ledger 全量登记 + 页行翻转完成；reconcile OK（exit 0）。
- [x] roadmap IS-8a 双表回写完成。

## Draft Review Record

- Reviewer / Agent: agent_a8f98a85（fresh session 独立子 agent，2026-10-08）
- Verdict: `pass`（R1 FAIL——1 Blocker 组 B 漏 lab-form 81≠82 + 1 Major 反模式⑨出处误标 550/551 实为 551 两次现形（linear-issues/airtable-grid）+ 1 Minor focused 套件未具名；修正后达 zero Blocker/Major）
- Rounds: 2
- Findings addressed: 3/3

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（P1×7 raw → 六项 P1 verified + recurse-001 撤案 artifact-proof 留痕；P2×3 随批 verified；airtable 类显式 watch-only 模式沿用）
- [x] 所有 in-scope confirmed contract drifts 已收敛（裁决全落 ledger；lab 壳 notify F 类随批修正）
- [x] 行为/契约结果已达成（82 页审查面覆盖零遗漏；37 观察 → 34 组行 → 32 台账行全登记 + recurse 撤案）
- [x] 必要 focused verification 已完成（红→绿 e2e 10/10 + 六包回归绿）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift（P2×12/P3×13 显式 watch-only）
- [x] 受影响的 owner docs 已同步到 live baseline（roadmap IS-8a 回写 done；ledger + 证据卡 + dev log 同步）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据（三轮：R1 agent_47592b5c REJECTED 计数勘误 → R2 agent_c49da75f REJECTED 指名落点未落盘 → R3 agent_dbbcd3fc APPROVED delta 复核；执行 session 未自审）
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

Status Note: 已收口（2026-10-08，full-green verification）。IS-8a 82 页 renderer-lab 序列审查批完成：37 条组原始观察 → 组内并账 34 组行 → 32 台账行（P1×7/P2×12/P3×13 + recurse 撤案）+ watch/n-a/撤案全量登记零静默；P1 六项（+P2 三项）先红后绿；台账 audited 204 / findings 145 reconcile exit 0。

Closure Audit Evidence:

- Auditor / Agent: R3 delta re-audit APPROVED（agent_dbbcd3fc；前置两轮：R1 REJECTED agent_47592b5c、R2 REJECTED agent_c49da75f——均 fresh session 独立子 agent，2026-10-08）
- Evidence: R1（agent_47592b5c）行为面与台账力学全绿独立复核（reconcile exit 0 audited 204 / findings 145、e2e 10/10、flux-runtime 1494|1 skip、id 无撞号、82 翻转行结构完好、hygiene 全清）；退回仅限计数勘误——2 Major（严重度拆分 P2×13/P3×12 → 台账实际 P2×12/P3×13 三面勘误；plan Phase 2 Proof verified 计数内部矛盾——实为 9 = 6 P1 + 3 P2，recurse P1 withdrawn）+ 2 Minor（raw 计数链 37→34→32 缺组内并账步注记；roadmap 预填 APPROVED）。R1 修正落盘后 R2（agent_c49da75f）delta 复核 REJECTED——R1 Major #2 指名落点（plan Phase 2 Proof）未落盘（首轮修正脚本锚点失败）。补落盘后 R3（agent_dbbcd3fc）delta 复核 **APPROVED**——R1 四项 + R2 一项六面勘误全在位：reconcile exit 0（audited 204 / findings 145 = found 97 + verified 48）、台账 145 id 无撞号、tests/e2e 无 \_tmp 残留、git status 无预期外文件。R3 残余（预填 agent id 勘误）随本收口提交落盘。

Follow-up:

- 见 Non-Blocking Follow-ups。
