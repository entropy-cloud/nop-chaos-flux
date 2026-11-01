# 838 M4-F1 统一 UX 验收（business-page-replication roadmap M4-F1）

> Plan Status: completed
> Last Reviewed: 2026-11-02
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M4-F1（依赖 M3 done——P2 收口后满足）；D1 §3 验收断言模板、§4 axe 三分支策略
> Related: P1 深审（`docs/audits/business-replication/p1-dev-deep-audit.md`）；P2 开放审计（plan 837）；PH-17/PH-18 设施（`a11y-axe-baseline.spec.ts`、`check:focus-ledger`）

## Purpose

对二十一个复刻页执行一次统一 UX 验收收口：全部页面浏览器快照评审（评审辅助）+ axe 基线全绿 + focus 管理抽查 + 移动端页 viewport 适配验证；pass/fail 一律程序化断言。交付 `docs/audits/business-replication/f1-unified-ux-acceptance.md`。收口为 roadmap §2 F1 `todo → planned → done`。

## Current Baseline

- 二十一页各自 focused e2e 已在 M3 收口时点 `--retries=0` 全绿；P1 全族 + axe 复跑由 plan 819 Phase 2 归档（执行本 plan 时须已收口落档）；本 plan Proof 项 1 为本 plan 自己的独立复跑确认，不依赖该归档。
- axe 基线 28 项扫描（桌面 ROUTES 25 + 分支 B mobile 3；基线 JSON 28 页面键）（分支 B 为 W1/M3/S1 mobile 画布 375×667 扫描，分支 C 为 V3 实测 ≈650ms 纳入棘轮）。
- 各页 focus 断言已在页 spec 内（Tab 首站/dialog 焦点往返/Esc 返回），P1 审计已加强已知弱断言（O1 wizard alert、V2 真实 Tab 遍历）。
- 统一验收的增量：跨页快照评审（视觉一致性/布局破损，截图仅评审辅助不作为测试证据）、viewport 适配的程序化抽查（mobile 三页画布 375×667 触达性）、axe 一次性全绿确认。

## Goals

- 快照评审：二十一页全量截图归档 `_tmp/f1-snapshots/`，逐页目检记录（布局破损/重叠/空态异常），发现项分级处置（页面级 bug → 修复 + spec 复跑；评审观感 → 登记 residual）。
- axe 基线全绿：`a11y-axe-baseline.spec.ts` 28 路由 `--retries=0` 实跑零新增违规。
- focus 抽查：抽 5 页（≥1 mobile）复跑其 focus 断言确认绿；`check:focus-ledger` 门禁绿。
- 移动端 viewport 验证：W1/M3/S1 以 mobile context（375×667, hasTouch）程序化断言画布内核心交互可达/可触达（复用分支 B 扫描 + 页 spec 既有断言，不新写重复设施；若发现覆盖缺口补最小断言）。
- 交付统一验收报告（结论 + 逐页结果表 + 证据命令）。

## Non-Goals

- 不新增页面功能；不重跑 P1/P2 审计项；不修 axe 登记的组件 owner 债；不处理台账外红（plan 836）。

## Scope

### In Scope

- 快照评审 + axe 全绿确认 + focus 抽查 + mobile viewport 程序化验证；验收报告；roadmap §2 F1 回写；发现的页面级缺陷修复与 spec 复跑。

### Out Of Scope

- 组件 owner 债；台账红收敛；F2 缺口沉淀（独立项）。

## Failure Paths

| 编号           | 触发                     | 行为                                                             | 可重试 | 用户可见表现       |
| -------------- | ------------------------ | ---------------------------------------------------------------- | ------ | ------------------ |
| snapshot-defect | 快照评审发现页面级缺陷   | 本 plan 内修复 + 对应 spec `--retries=0` 复跑绿；观感类登记 residual | 是     | 报告 findings 表   |
| axe-new-red    | axe 全绿实跑出现新增违规 | 逐条归因：页面 schema 问题修复；组件 owner 债按既有口径登记       | 是     | 报告归因记录       |
| viewport-gap   | mobile 画布触达断言缺失  | 补最小程序化断言后复跑                                           | 是     | spec 新增断言在案  |

## Test Strategy

必须自动化：pass/fail 全部程序化（locator/evaluate/getComputedStyle + axe 基线）；截图仅评审辅助。验收类工作，测试即交付本体。

## Execution Plan

> 执行顺序前置：plan 819（P1 深审）与 plan 837（P2 开放审计）均已收口后方可开始执行；819 产出在收口提交前为未提交 WIP，执行起点以其收口提交后的版本为准。837 开放审计若产出页面修复，其复跑结果优先于本 plan Proof 项 1 采信。

### Phase 1 - 统一验收执行与报告

Status: completed
Targets: `docs/audits/business-replication/f1-unified-ux-acceptance.md`（新）；`_tmp/f1-snapshots/`（评审归档，不入库）

- Item Types: `Proof | Fix | Decision`

- [x] Proof：axe 28 项扫描 + replication 全族 `--retries=0` 实跑（M3 终态确认）——236 passed / 1 failed（K2 focus③，contention 三证判定后按 flake 台账登记，非页面缺陷）
- [x] Proof：二十一页快照采集与逐页目检（multimodal 评审），发现项分级处置——无页面级缺陷；4 项观测级 residual 登记（I1 双按钮对/I2 趋势量纲/W3 透视列序/V3 围栏可视性）
- [x] Proof：focus 抽查 5 页（W2/C3/O1/V3/W1）15/15 绿 + `check:focus-ledger` exit 0
- [x] Proof/Fix：mobile 三页 viewport 适配程序化验证——分支 B 扫描 + 页 spec mobile context 断言覆盖齐备，无新增缺口、未新写重复设施
- [x] 验收报告落档（结论 + 四支柱表 + 证据命令）；roadmap §2 F1 回写

执行期证据（2026-11-02）：报告 `docs/audits/business-replication/f1-unified-ux-acceptance.md`（verdict Pass）；快照 21 张 `_tmp/f1-snapshots/`；family 复跑 `_tmp/f1-family.log`（236+1，唯一红 K2 focus③ 隔离 3×36/36 绿 `_tmp/f1-k2-flake`，flake 台账 ATTRIBUTED(contention) 登记）。

Exit Criteria:

- [x] axe + replication 全族复跑绿（或每红均有修复/登记——K2 focus③ 按 contention 登记）
- [x] 快照评审 21/21 落记录，无未处置页面级缺陷
- [x] mobile viewport 验证程序化断言在案且绿
- [x] 验收报告与 roadmap F1 行一致

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_cb1975e6-c4f5-4ef8-9713-9df10737b311）
- Verdict: pass（round-1 fail：1 Major〔baseline 把未落档复跑证据写成既成事实〕→ 修订 → round-2 pass；残余 Minor-3 Goals 内「28 路由」措辞已就地统一为「28 项扫描」）
- Rounds: 2
- Findings addressed: Major-1 采改法②（Execution 顶部执行顺序前置块 + baseline 前置条件式改写）；Minor-1 28 项扫描措辞；Minor-2 WIP 引用口径并入前置块；Minor-3 就地修正。

## Closure Gates

- [x] in-scope 工作全部落地（验收四支柱 + 报告 + roadmap 回写）
- [x] 全部页面级缺陷已修复或显式登记 residual（零页面级缺陷；4 项观测级 residual 登记报告）
- [x] 必要 focused verification 已完成（family+axe `--retries=0`、focus 抽查、flake 台账门禁）
- [x] 不存在被静默降级的 in-scope 缺口（K2 focus③ 红 contention 三证登记；快照 4 项 residual 登记）
- [x] 受影响 owner docs 已同步（daily log；flake 台账）
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据
- [x] `pnpm typecheck`（本 plan 零代码变更，引 819 收口基线 `2e4faac41` `_tmp/p1-gates.log`；UX 验收结论直接锚定本 plan 期含 WIP 树的 237 测试实跑）
- [x] `pnpm build`（同上）
- [x] `pnpm lint`（同上）
- [x] `pnpm test`（同上 turbo 86/86）
- [x] `pnpm check`（同上全链 exit 0；`check:focus-ledger`/`check:e2e-flake-ledger` 本 plan 期复跑绿）

## Deferred But Adjudicated

（执行期如有裁决当场落节）

## Non-Blocking Follow-ups

- F2 复刻总结与缺口沉淀（roadmap M4-F2）

## Closure

Status Note: 2026-11-02 收口。四支柱全 Pass：快照 21/21（4 项观测级 residual 登记）、axe 28 项零新增、focus 抽查 15/15、mobile viewport 分支 B + 页 spec 断言覆盖齐备。复跑唯一红（K2 focus③）经三证判定 contention 并登记 flake 台账，非页面缺陷。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent（agent_b724d3ce-d6e8-4d3a-9f94-e11d8766b2e5），2026-11-02
- Evidence: verdict **approved**（零 Blocker/Major，1 Minor 已采纳：报告补 36/36=12×3 计数口径）。逐条实证：报告四支柱与 plan 一致；证据文件实地在案（21 png / family.log / k2-flake last-run / focus last-run / flake 台账 :39）；K2 红非棘轮真断言、非静默；MOBILE_ROUTES 三路由与页 spec 375 断言支撑 viewport 结论；838 触达面纯 docs，门禁基线引用有效且 UX 结论锚定含 WIP 树实测。

Follow-up:

- 快照 4 项观测级 residual（I1/I2/W3/V3）——demand-gated 改进候选，no remaining plan-owned work
