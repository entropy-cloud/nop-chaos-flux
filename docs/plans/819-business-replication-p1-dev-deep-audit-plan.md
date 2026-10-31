# 819 M3-P1 开发阶段深度审计（business-page-replication roadmap M3-P1）

> Plan Status: active
> Last Reviewed: 2026-10-31
> Source: `docs/backlog/business-page-replication-roadmap.md` §2 M3-P1（依赖 W1-V3 all done——2026-11-01 plan 818 收口后满足；roadmap 现值 `todo`）
> Related: M3 二十一页交付 plans 798-818；D1-D4 设计与各页「实现勘误」节；R5/D5 深审先例（`docs/audits/business-replication/{r5-research,d5-design}-deep-audit.md`）；plans 814-818 Deferred 指派 P1 的三项（C2 calendar 时区窗口红、全量 e2e、replication 族负载抖动面）

## Purpose

对 M3 开发阶段二十一个复刻页执行深度审计：逐页对照 live repo 与上游 roadmap 核对**复刻保真度**（上游交互要素是否落地 / 收窄是否有显式裁决）与**断言真实性**（e2e 是否载荷级断言、有无负等待/条件分支式弱断言）、缺口登记项与 roadmap §Authority（retention 权威 amis-baseline-matrix、新 type→missing-components、能力扩展→improvement-analysis）无冲突；并收口 plans 814-818 指派 P1 的三项（C2 calendar 时区窗口红修复、全量 e2e 复跑归因、负载抖动面裁决）。交付 `docs/audits/business-replication/p1-dev-deep-audit.md`。收口为 roadmap §2 P1 `todo → planned → done`。

## Current Baseline

- M3 二十一页全部 `done`（roadmap §2 W1-V3），各页 focused e2e 在其收口时点 `--retries=0` 全绿、axe 分支 A/B/C 登记齐（`tests/e2e/a11y-axe-baseline.spec.ts` 28 路由）；replication 全族（`tests/e2e/replication-*.spec.ts`，21 spec）plan 818 时点 203/204。
- **C2 calendar 时区窗口红（已根因）**：`packages/flux-renderers-scheduling/src/calendar/utils/calendar-date-utils.ts` L6-7 以 `getUTCMonth()` 计算月视图区间、初始日期 `new Date()`（`calendar.tsx` L67-69）——日历为 **UTC 日模型**；C2 mock `apps/playground/src/complex-pages/shared/mock-backend-repl-crm-c2.ts` L279-301 `currentMonthDate` 以**本地** `getMonth()/getDate()` 夹取事件日期 → UTC+8 每月 1 日 00:00-08:00（UTC 仍为上月）日历显示上月、事件全落空（`replication-crm-customer-360.spec.ts` L171 交互② 失败；plans 814-818 Deferred 在案）。
- **负载抖动面**：plan 817 全族回归 M1 交互① 一例、plan 818 审计 S1 一例，均单跑复绿（`--repeat-each=3` 3/3）；`check:e2e-flake-ledger`（`scripts/check-e2e-flake-ledger.mjs`）为既有台账门禁。
- 弱断言已知线索（各 closure audit Minor 在案）：O1 交互④「阻断停留」用 500ms 负等待（plan 814 Minor-②）；V2 focus ① 以 `focus()+Enter` 驱动未走真实 Tab 遍历（plan 817 Minor-①）。

## Goals

- **Fix**：C2 mock 日期改为与日历 UTC 日模型一致（UTC 月夹取），并补**判别性**时区回归测试（`page.clock` 固定于 `2026-11-01T01:30+08:00` + `timezoneId: 'Asia/Shanghai'`——修复前事件零渲染必挂、修复后通过）；日历「today 取 UTC」产品面观察登记（不改 scheduling 组件语义，只登记）。
- **Proof**：replication 全族 + axe spec `--retries=0` 全绿复跑；全仓 `pnpm test:e2e` 一次实跑并逐红归因（复刻族内 / PH-9 台账在册 / 并行会话 WIP / 新红）。
- **Proof/Decision**：二十一页逐页保真度 + 断言真实性审计（四个独立 fresh 子 agent 分组并行，主审汇编复核），Findings 分级（Blocker/Major/Minor）；已知两处弱断言就地加强；其余 Major 以内 Finding 本 plan 内修复或显式裁决 successor。
- **Proof**：缺口登记一致性核对（本阶段新增登记：improvement-analysis §4 #9 inputClassName、§3 地图族 pin+geojson、axe 基线 owner 债〔checkbox-group aria-required、tree role 等〕、scanner 名称碰撞）与 §Authority 无冲突、无重复立项。
- 交付 `docs/audits/business-replication/p1-dev-deep-audit.md`（结论 Pass/Fail + Findings 表 + 证据命令）。

## Non-Goals

- 不改 scheduling 日历的 UTC 日模型（产品语义变更属组件 owner，登记即止）；不修 axe 登记的组件 owner 债；不做 P2 开放审计（独立 fresh 子 agent 承担，另立 plan）；不处理并行会话 WIP 与 PH-9 台账在册红。

## Scope

### In Scope

- C2 mock UTC 修复 + 判别性回归测试 + 日历观察登记；全族/axe/全仓 e2e 复跑与归因；二十一页审计（子 agent 分组）+ 已知弱断言加强 + 审计内 Findings 处置；登记一致性核对；审计报告；roadmap §2 P1 回写；必要的 D 文档就地勘误。

### Out Of Scope

- P2 开放审计；M4 统一验收；组件 owner 债修复；PH-9 台账红；并行会话 WIP。

## Failure Paths

| 编号           | 触发                                   | 行为                                                                 | 可重试 | 用户可见表现              |
| -------------- | -------------------------------------- | -------------------------------------------------------------------- | ------ | ------------------------- |
| tz-regression  | 时区回归测试在修复前未挂（无判别力）   | 调整固定时刻/时区直至修复前必挂，否则不得声称修复                     | 是     | 回归测试修复前红/修复后绿 |
| new-red        | 全族/全仓复跑出现台账外新红            | 逐红定位：复刻族内 → 本 plan 修复；族外 → 归因 owner 并登记，不静默   | 是     | 审计报告逐红归因表        |
| audit-major    | 子 agent 报 Major（保真度/断言缺口）   | 本 plan 内修复并复跑；确属超范围者显式 successor（不降级为 Minor）     | 是     | Findings 表处置列         |
| flaky          | 负载抖动复现                           | `--repeat-each` 判定；确认 flake 则按 `check:e2e-flake-ledger` 口径登记或修复等待条件 | 是     | 台账/修复记录             |

## Test Strategy

必须自动化：C2 修复以判别性回归测试先证（修复前必挂），再改 mock；复跑以 `--retries=0`、独立 `PLAYWRIGHT_PORT` + `--output=_tmp/...`（共享工作树）。

## Execution Plan

### Phase 1 - C2 时区窗口红修复（Proof → Fix）

Status: planned
Targets: `tests/e2e/replication-crm-customer-360.spec.ts`（回归测试）、`apps/playground/src/complex-pages/shared/mock-backend-repl-crm-c2.ts`（UTC 夹取）、`docs/components/existing-components-improvement-analysis.md`（日历观察登记）

- Item Types: `Proof | Fix`

- [ ] Proof：C2 spec 新增时区回归测试（`test.use({ timezoneId: 'Asia/Shanghai' })` + `page.clock.install({ time: '2026-11-01T01:30:00+08:00' })` → 切日历 tab → 事件块 ≥5 + 四标题可见）；修复前实跑必挂（记录失败输出）
- [ ] Fix：`currentMonthDate`/`crossDayRange`/活动日期生成改 UTC 组件（`getUTCFullYear/getUTCMonth/getUTCDate`），与日历 UTC 日模型一致；回归测试 + C2 全 spec `--retries=0` 绿
- [ ] 日历「初始 today 取 UTC 日」产品面观察登记 improvement-analysis（scheduling 族，UTC±N 用户月初/月末窗口看到相邻月；只登记）

Exit Criteria:

- [ ] 回归测试修复前失败、修复后通过（两次实跑输出记入执行期适配段）
- [ ] C2 spec 全绿（`--retries=0`）

### Phase 2 - 复跑与归因（Proof）

Status: planned
Targets: 复跑输出 `_tmp/p1-*`；审计报告「复跑与归因」节

- Item Types: `Proof | Decision`

- [ ] replication 全族 + axe spec `--retries=0` 复跑（默认 workers）；逐红定位（族内 → 修复；抖动 → `--repeat-each=3` 判定）
- [ ] 全仓 `pnpm test:e2e` 一次实跑（独立端口/输出）；逐红归因表（复刻族 / PH-9 台账 / 并行会话 / 新红）
- [ ] 负载抖动面裁决（M1 交互①、S1 :189）：复现则修等待条件或按 flake 台账口径登记；不复现则记观测结论

Exit Criteria:

- [ ] replication 全族 + axe 复跑全绿（或每红均有修复/登记）
- [ ] 全仓 e2e 归因表完整（无「未归因」红）

### Phase 3 - 二十一页保真度与断言真实性审计（Proof/Decision/Fix）

Status: planned
Targets: `docs/audits/business-replication/p1-dev-deep-audit.md`（新）；按 Finding 触达的 spec/schema

- Item Types: `Proof | Decision | Fix`

- [ ] 四个独立 fresh 子 agent 分组并行审计（W1-W3+C1-C3 / I1-I2+K1-K3 / M1-M3+S1-S2 / O1-O2+V1-V3）：逐页上游 roadmap 交互要素 ↔ 落地组件/断言、收窄是否有显式裁决出处、e2e 弱断言（负等待、条件分支断言、空断言、仅存在性断言替代载荷断言）
- [ ] 主审汇编复核：抽查子 agent 每条 Major/Blocker 的 live 证据（打开 spec/schema 行）
- [ ] 已知弱断言加强：O1 交互④ 阻断停留改确定性断言（wizard 当前步标识/校验错误文本可见）；V2 focus ① 改真实 Tab 遍历落到「下一步」
- [ ] 审计 Findings 处置：Major 以内本 plan 修复并复跑对应 spec；超范围者显式 successor
- [ ] 登记一致性核对（本阶段新增登记 vs §Authority，无重复立项/越权裁决）

Exit Criteria:

- [ ] 审计报告落档（结论 + Findings 表〔页/类型/级别/证据/处置〕+ 证据命令）
- [ ] 全部 Blocker/Major 已修复（对应 spec 复跑绿）或显式 successor

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（agent_9aa5aea5-fa45-45ac-8c81-5d743ddd161d）
- Verdict: pass（零 Blocker / 零 Major / 3 Minor）
- Rounds: 1
- Findings addressed: Minor-①② C2 mock 行号校准 L279-301；Minor-③ calendar.tsx 行号校准 L67-69；判别性测试修复后分布由 Failure Path tz-regression 兜底（执行期实跑确认）。

## Closure Gates

- [ ] in-scope 工作全部落地（C2 修复 + 复跑归因 + 审计报告 + roadmap 回写）
- [ ] 判别性回归测试证据在案
- [ ] 必要 focused verification 已完成
- [ ] 不存在被静默降级的 in-scope 缺口
- [ ] 受影响 owner docs 已同步（daily log；improvement-analysis 日历观察；必要 D 文档就地勘误）
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`（零新增未登记命中）

## Deferred But Adjudicated

（执行期如有裁决当场落节）

## Non-Blocking Follow-ups

- P2 开放审计（roadmap M3-P2，独立 plan）
- 组件 owner 债（axe 基线登记项）归各组件 owner

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent 填写
- Evidence: 待填写

Follow-up:

- 待收口填写
