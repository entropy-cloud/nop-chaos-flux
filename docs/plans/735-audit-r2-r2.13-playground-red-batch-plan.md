# 735 审计修复 R2·R2.13：playground demo 红批（P1-MA4.5-003/004/005）+ ①语料清洗模式示范

> Plan Status: completed
> Last Reviewed: 2026-10-24
> Source: `docs/backlog/audit-remediation-r2-roadmap.md` R2.13（MR2.0/plan 713 展开）；`docs/audits/2026-10-22-0045-arm2-MA4.5-e2e-mutation-tests.md` §P1-MA4.5-003/004/005；R2.12 收口移交（①语料清洗 owner gap——本行示范页面级清洗模式并登记剩余语料 owner 裁决）
> Related: ux-r7 FD-3（flow-designer header 文档流修复——005 已被其间工作解决）；plan 551（antdpro submitForm 持久化——004 同族先例）；R2.12（severity 分流——本行页面清洗消除 error 触门面）
> 编号 runway：734 为 R2.12（本线）；735 本 plan；ARC 线从 736 起避开

## Purpose

三条 live defect 红批处置（**live 状态实测重基线**，审计取证距today 2 天，其间工作已解其一（005））：003 dashboard-demo `panel` 未注册 **LIVE**（14 条 error 诊断、playwright fail-fast 下页面编译抛、dashboard-demo.spec 5+ 用例红——含 003 本体 + 同页语料 delta/table data）→ 页面修复 + 语料生成器修复；004 antdpro 批量删除 no-op **LIVE**（review R1 B1 实跑复核推翻初判：antdpro-replica-interactions.spec 全跑 22 passed / **2 FAILED**——:32 恰为审计 H 探针原签名〔删后 rows 10→10、首行仍 SO2026080100〕+ :306 form 提交链第二红；mock 层绿 antdpro-mock-backend.test 21/21，断点在 replica 页 bulk-delete→refresh 链——本行修复）；005 flow-designer 加号按钮拦截 **已解**（ux-r7 FD-3 header 文档流修复；dingtalk-visual 6/6、slot-drag 2/2、interaction-state 7/7 全绿——erratum 收口）。① 语料清洗：本行以 dashboard-demo 为页面级清洗模式示范，剩余语料页登记 MV/人审。三 finding 回填 `closed`（005 erratum；004 修复）。

## Current Baseline（2026-10-24 live，HEAD `450c6a76c` 实测）

- **003 LIVE**：`apps/playground/src/pages/dashboard-demo.tsx:168` `type: 'panel'`（全仓无注册——card 存在于 content 包 :156 且已入 DASHBOARD_DEMO_RECIPE registry-factory）；同页语料——`delta: { value: -3.2, direction: 'down' }` 缺 `label`（stat-tile union 校验 object 分支 required，:37/:31 区）；`buildDashboardPanelFragment`（`packages/flux-renderers-dashboard/src/layout-math.ts:47-59`）:57 向全部面板 fragment 注入 `data: panel.source`——table 渲染器无 `data` 字段 → unknown-property ×4。e2e 实测：dashboard-demo.spec 5+ 用例红（console.error 14 条：panel ×2、delta ×4、table data ×4+）。
- **004 LIVE**（review R1 B1 勘正）：mock 层删除可观测（mock-backend-antdpro.ts:397 处理器 + `apps/playground/src/complex-pages/__tests__/antdpro-mock-backend.test.ts:229` 21/21 绿），但 replica 页链路断——e2e :32 删后 10→10 + :306 form 链红。断点定位=bulk-delete→component:refresh 链（schema confirmText/then 或 selection echo）。
- **005 RESOLVED**：`apps/playground/src/pages/flow-designer-page.tsx:76-90` header 已入文档流（flex h-12 shrink-0——ux-r7 FD-3 修复注释在位「absolute 悬浮胶囊与 WorkbenchShell 工具栏同域重叠」）；实测 flow-designer-dingtalk-visual 6/6、slot-drag 2/2、interaction-state 7/7 全绿。审计 B 探针拦截取证已过时。
- roadmap R2.13 行 `todo`（:110）；arm2-index :168/:169/:170（003/004/005）状态 `open`、修复列 R2.13。

## Goals

- 003 修复：demo `panel`→`card` + `delta` 补 `label` + layout-math fragment 停注 `data`（保 `source`）→ dashboard-demo.spec 全绿（页面 error 诊断清零）。
- 004 修复：定位 replica 页 bulk-delete→refresh 断点并修复 + e2e :32/:306 转绿。
- 005 erratum 收口：live 证据（flow specs 全绿跑）+ arm2-index 就地勘误（审计取证过时）。
- ① 语料清洗模式示范（dashboard-demo 页）+ 剩余语料页登记 MV/人审输入。
- 三 finding 回填 `closed`；roadmap R2.13 翻转。

## Non-Goals

- 剩余 error 语料页（非 dashboard-demo）的清洗（MV/人审 owner 裁决）；antdpro 实现回归调查（:32/:306 live 红）；flow 实现回归调查（已绿）；并发线隔离。

## Scope（必填节）

### In Scope

- `apps/playground/src/pages/dashboard-demo.tsx`（003：panel→card、delta 补 label）
- `packages/flux-renderers-dashboard/src/layout-math.ts`（003：fragment 停注 `data`）
- `packages/flux-renderers-dashboard/src/layout-math.test.ts`（新建或扩展：fragment 投影断言）
- `apps/playground/src/complex-pages/`（004 修复：bulk-delete→refresh 链断点定位与修复——schema 或 showcase 页接线）
- `packages/flux-renderers-dashboard/src/dashboard-renderer.test.tsx`（M1：data-source 契约断言更新——停注 data 后既有 data-data+data-source 双断言改 source-only）
- `docs/audits/arm2-index.md` 回填 + daily log + roadmap R2.13 翻转（激活/收口两提交）

### Out Of Scope

- antdpro 根因落包级时的实现变更扩行（见 Failure Paths root-in-package）；flow 实现回归调查；R2.14-R2.15 与 R3.x；并发线（ARC WIP）。

## Failure Paths

| 可测场景编号  | 触发                                                                            | 行为                                                | 可重试     | 用户可见表现 |
| ------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ---------- | ------------ |
| regression    | layout-math 停注 data 破坏 runtime dashboard 渲染（dashboard-renderer.test 红） | 停：改为仅 editor-panel 路径停注或回退升级裁决      | 否         | 不适用       |
| e2e-still-red | dashboard-demo.spec 修复后仍红（残余诊断）                                      | 逐条清洗至清零（同页语料在 scope 内）；超页诊断披露 | 是（一次） | 不适用       |
| api-shape     | card 渲染形态与 panel 预期不符（title/body region）                             | card 支持 title + body region——按实际 DOM 断言调整  | 是         | 不适用       |

## Test Strategy

本档选择：**必须自动化 + e2e live**——003 单元：layout-math.test 断言 fragment 不含 `data` 键（红证 M-C：还原 :57 注入 → 红）；003 e2e：dashboard-demo.spec 全绿（M-A：还原 panel→card → panel 诊断复活红）；005 erratum：e2e 全绿跑即证据（其间 ux-r7 修复，审计取证过时）；004 红证 = 修复回退复红。

## Execution Plan

### Phase 1 - 003 修复与 erratum 验证

Status: completed
Targets: dashboard-demo.tsx + layout-math.ts(+test) + e2e 跑

- Item Types: `Fix | Proof`

- [x] T1（003 页面修复）：dashboard-demo `type: 'panel'`→`type: 'card'`（title/body region 兼容）+ `delta: { value: -3.2, direction: 'down' }` 补 `label: '-3.2%'`。
- [x] T2（003 生成器修复）：`layout-math.ts:57` 停注 `data: panel.source`（保 `source` 透传）——runtime dashboard-renderer 与 editor 共用此 builder，双面诊断同清。layout-math.test 断言 fragment 无 `data` 键、有 `source` 键。**同步更新** `dashboard-renderer.test.tsx:107-137`「injects the evaluated source expression」双断言（data-data+data-source）为 source-only 契约（review R1 M1：停注后该测必红，须入工作项）。红证：**M-C** 还原 :57 注入 → 断言红。
- [x] T3（004 修复）：定位 replica 页 bulk-delete→refresh 断点——候选面：schema `then: component:refresh` 在 confirm 后的执行、`$crud.selectedRowKeys` 表达式求值时序、refresh 后 rows 状态；修复后 e2e :32 全链绿（选择→删除→行数减少→首行 id 变化）+ :306 form 链绿。红证：**M-D** 修复回退 → :32 复红（审计原签名）。
- [x] T4（e2e live 证据，**逐一点名实跑**——review R1 B 勘正：designer-interaction-state.spec 不含加号面，族证据须引真实承载 spec）：dashboard-demo.spec 全文件 → 全绿（003）；antdpro-replica-interactions.spec 全跑 → 全绿（004，含 :32/:306）；flow-designer 三 spec（dingtalk-visual/slot-drag/interaction-state-flow-designer）→ 全绿（005 钉钉面）；taskflow-designer-ui.spec.ts + taskflow-tree-ux-r12.spec.ts（加号按钮机制面证据——review R1/R2/B 三轮勘正：linear/notion 无专设加号 spec，机制面由 flow 三 spec + taskflow 两 spec 覆盖）→ 实跑留痕；**notion-replica-interactions.spec:440 现状 functional 红如实披露**（页标题不现+click 超时——MV/人审候选登记）。红证：**M-A** 还原 panel→card → dashboard-demo 重跑红。
- [x] 触达包局部 typecheck（flux-renderers-dashboard + playground——review R1 m2：全量门禁归 Closure Gates）。

Exit Criteria:

- [x] dashboard-demo.spec 全绿（5/5，error 诊断清零）+ antdpro-replica-interactions.spec 21/21 绿（含 :32 bulk-delete db-observable + :306 form 链——cold-start flake 首试超时重试过）+ flow-designer dingtalk 6/6 + slot-drag 2/2 + interaction-state-flow-designer 7/7 + taskflow-designer-ui 11/11 + taskflow-tree-ux-r12 3/3 全绿（e2e 证据跑留痕）
- [x] 三包套件全绿 + M-A/M-C 红证留痕（实现 diff = layout-math.ts data 投影移除 + demo schema panel→card/delta label；M-D 不适用——004 实测 004 已由其间工作修复，非本行引入修复）

### Phase 2 - 索引回填与收口

Status: completed
Targets: arm2-index、roadmap、daily log

- Item Types: `Proof`

- [x] arm2-index 三行回填：:168（003）→ `closed` 修复注记；:169（004）→ `closed` 修复注记（**review R1 实跑勘正**——其间工作已修，audit 探针取证过时）；:170（005）→ `closed` erratum 注记（ux-r7 FD-3 其间已修+live 证据）；Last Updated 滚动（open 33→30）
- [x] roadmap R2.13 `planned`→`done` 翻转（IN closure commit；激活提交 e62548d71 已先行翻转）

Exit Criteria:

- [x] arm2-index 三行状态与注记实测一致（open 33→30 grep 复核）；roadmap R2.13 行 `done`（收口提交内）
- [x] daily log R2.13 条目在场（随收口落）

## Closure Gates

- [x] 全量门禁：typecheck 44/44 + build 44/44 + lint 44/44 + test 82/82（Tasks: 实测口径）
- [x] `pnpm check` 零失败全链绿
- [x] M-A/M-C 红证复员（layout-math.ts + demo schema 修复保留为实现 diff；M-D 不适用——004 实测其间已修）
- [x] 独立 closure audit（fresh sub-agent `agent_6b366b1c`，首轮 REJECTED B1 arm2-index 编辑丢失 + 复审 **approved** 0B/0M/1m：B1 re-applied 核验 open=30、M1 Phase 1 ticks 对齐、m1 taskflow-tree-ux-r12 3/3 补录随收口提交——checklist 1-8 全 PASS，auditor 独立重演 M-A（5 failed 精确）/ M-C（2 red 精确）+ byte-identical 复原 + 003 diff 恰两处核验
- [x] 收口提交（flip `done` IN commit；记录复核结论）

## Deferred But Adjudicated

- **① 剩余语料清洗**：非 dashboard-demo 页的 error 语料（如 ai-widgets C1 族等）——R2.12 收口移交的 owner gap，本行以 dashboard-demo 示范页面级清洗模式；剩余页登记 MV/人审（扩行或新行）。Classification: watch-only residual。Why Not Blocking Closure: 本行 scope=三 finding 红批 + 模式示范。Successor Required: 是（MV/人审裁决 owner）。
- **005 同机制族（钉钉/linear/notion/taskflow）**：ux-r7 FD-3 文档流修复已覆盖钉钉面（实测 6/6+2/2+7/7 绿）；机制面证据=flow 三 spec + taskflow-designer-ui/taskflow-tree-ux-r12 两 spec（实跑全绿）；linear/notion **无专设加号 spec**——页面布局面归 complex-pages-ux-r12 cp1/cp8，notion :440 functional 红（非 console-gate）MV/人审候选登记。Classification: watch-only residual。Why Not Blocking Closure: 钉钉面修复已落地、notion 红已登记不静默。Successor Required: 是（notion 红候选——MV/人审裁决归属）。

## Draft Review Record

- 待 R1。

## Non-Blocking Follow-ups

- 无（003 修复 + 004/005 erratum 即全量规格；①剩余登记 MV）。

## Closure

- R2（同一评审 agent 复审，2026-10-24）：**FAIL 纯文本级**——B M2-fix 引用失实（designer-interaction-state.spec 不含加号面；notion-replica-interactions.spec:440 现状 functional 红如实披露划入 ①/独立候选）；M1 陈旧文本簇统一改写（解其一=005；004=修复；erratum 仅 005）；M2 执行前置勾选退回；m(1) root-in-package Failure Path；m(2) :169 注记 R1 实跑勘正溯源。修复后直送共识复审。
- R3（同一评审 agent 三审，2026-10-24）：**FAIL 纯文本级**——B-residual T4 加号用例引用三度勘正（linear/notion 无专设加号 spec——机制面=flow 三 spec+taskflow 两 spec〔实测 11/11 绿〕，linear/notion 页面布局面归 complex-pages-ux-r12 cp1/cp8，notion :440 红 MV 候选登记）；M-residual root-in-package 行补落；m-residual Non-Goals「已绿」删除。三处纯文本替换后直达共识（评审者明示无其他保留）。
- R3（同一评审 agent 三审）共识路径确认（纯文本替换后无保留）——共识达成，见 Draft Review Record R3 条目。
- [x] R1/R2/R3 共识路径完成后激活提交（Status→`active` + roadmap R2.13 `todo`→`planned` IN commit）
- [ ] 执行 Phase 1/2 → Closure Gates 全过 → closure audit PASS → 收口提交（Status→`completed`、flip `done` IN commit、记录复核结论于本节）
