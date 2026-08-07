# 2 dingtalk-flow-demo 遗留原型 demo 页统一/废弃决策（含 legacy 常量清理）

> Plan Status: completed
> Last Reviewed: 2026-08-07
> Source: `docs/plans/2026-08-06-0814-dingtalk-visual-alignment-plan.md` Deferred But Adjudicated「dingtalk-flow-demo 条件插入布局缺陷」（`out-of-scope improvement`，Successor Required: yes，Successor Path: demo 页统一/废弃决策（含 legacy 常量清理）另立 plan）
> Related: `docs/plans/2026-08-06-0814-dingtalk-visual-alignment-plan.md`（completed）、`docs/plans/453-dingflow-single-tree-layout-unification-plan.md`（completed，统一 tree-mode 布局算法）、`docs/architecture/flow-designer/tree-mode.md`
> Mission: component-audit
> Work Item: dingtalk-flow-demo 遗留原型 demo 页统一/废弃决策

## Purpose

把 0814 plan 明确登记的 `Successor Required: yes` 项收口：对 playground 遗留原型页 `/dingtalk-flow-demo`（`apps/playground/src/pages/ding-talk-flow-demo.tsx` + `apps/playground/src/pages/dingtalk-flow/` 6 文件）做出「统一 vs 废弃」裁决并落地，含 legacy 常量（`BRANCH_SHORT_LEG`/`MERGE_SHORT_LEG` 等）清理；消除「同一钉钉审批流视觉两套实现（flow-designer 统一算法 vs legacy 原型）」的维护歧义与已知 `insertBranch` 嵌套分支错位缺陷面。

## Current Baseline

- **0814 plan 已完成的统一形态**：`/flow-designer`「钉钉审批流」示例（`apps/playground/src/pages/flow-designer-page.tsx` + schema）已实现钉钉视觉（彩色卡片、分支标签、线上 + 按钮、minimap 右下 / controls 左上），底层用 plan 453 统一 tree-mode 布局算法 + schema 可配置方案，有程序化 e2e（`tests/e2e/flow-designer-dingtalk-visual.spec.ts` 6 例）锁定契约。
- **遗留原型仍在**：`/dingtalk-flow-demo` 路由注册于 `apps/playground/src/route-model.ts:271`（id `dingtalk-flow-demo`）、`apps/playground/src/App.tsx:199`（case 分支）；页面文件 `ding-talk-flow-demo.tsx`（246 行）+ `apps/playground/src/pages/dingtalk-flow/` 6 文件（`edges.tsx` 34 / `flow-operations.ts` 363 / `index.ts` 5 / `menu.tsx` 64 / `nodes.tsx` 149 / `types.ts` 64）。
- **legacy 常量**：`dingtalk-flow/types.ts:14-15` 定义 `BRANCH_SHORT_LEG = 32`、`MERGE_SHORT_LEG = 84`，被 `edges.tsx:3,17`、`flow-operations.ts:9-15,175-176`、`ding-talk-flow-demo.tsx:21-23` 消费——这些是 0814 plan 明确标注的「旧常量」（统一算法侧已改用 `__fdTree` runtime geometry + center-based placement，见 `docs/logs/2026/08-06.md` 453 Phase 4 记录）。
- **已知缺陷面**：`dingtalk-flow/flow-operations.ts` 的 `insertBranch` 平移量固定导致嵌套分支错位（0814 plan Deferred 记录，demo 为 legacy 参考原型）。
- **测试/宿主引用**：`apps/playground/src/pages/ding-talk-flow-demo.test.tsx`（单测）；playground 侧引用：`apps/playground/src/pages/index.ts:4`（`export { DingTalkFlowDemo } from './ding-talk-flow-demo'`）、`apps/playground/src/pages/types.ts:7`（`PageId` union 成员 `'dingtalk-flow-demo'`）、`apps/playground/src/pages/home-page.tsx:13,111`（home 卡片入口，删除后为死链）、`apps/playground/src/app.test.tsx:131-132` + `apps/playground/src/app-diagnostics-route.test.tsx:78-79`（`vi.mock('./pages/ding-talk-flow-demo', ...)`，删除后测试运行时 mock 失败——playground 有 `"test": "vitest run"` 测试套件，非「无单测包」）。e2e 引用点共 4 处：`tests/e2e/playground-entry-pages.spec.ts:21`（`dingtalk-flow-demo` 路由断言）、`tests/e2e/exploratory/domain-page-interactions.spec.ts:25,166-168`（canvas 渲染 + 按钮可点击）、`tests/e2e/exploratory/domain-page-zero-error.spec.ts:14`（路由零错误断言）、`tests/e2e/exploratory/subagent-a-independent-review.spec.ts:159`（`dingtalk-flow-demo` 路由条目）。
- 0814 plan 明示「不修改 `/dingtalk-flow-demo` legacy 原型页（保留为历史参考；其 insertBranch 缺陷另立 successor）」——本 plan 即该 successor，裁决终点为「统一（复用 flow-designer 形态替换/别名）或废弃（下线 + 清理）」二选一。

## Goals

- 对 `/dingtalk-flow-demo` 遗留原型做出明确裁决：**统一**（收敛到 flow-designer 单一实现，demo 路由复用统一形态或删除）或**废弃**（下线路由 + 删除 legacy 文件 + 清理常量）——二选一落地，不留「两套实现并存」。
- 若废弃：删除 `ding-talk-flow-demo.tsx` + `dingtalk-flow/` 6 文件 + `ding-talk-flow-demo.test.tsx` + `route-model.ts:271` 条目 + `App.tsx:199` case；同步 playground 侧引用（`pages/index.ts` 导出、`pages/types.ts` PageId 成员、`home-page.tsx` 卡片、2 个 `vi.mock` 测试）；清理 `BRANCH_SHORT_LEG`/`MERGE_SHORT_LEG` 常量；同步/移除单测与 4 处 e2e 引用点。
- 若统一：demo 路由指向 flow-designer 钉钉示例（或删除路由、由 `/flow-designer` 承接），同样清理 legacy 文件与常量。
- 无论哪个方向，`tests/e2e/playground-entry-pages.spec.ts` 等宿主断言保持一致（无悬空路由引用），受影响 e2e 全绿。

## Non-Goals

- 不改 flow-designer 统一实现的视觉/布局（0814 + 453 已锁定契约，本 plan 不动）。
- 不新增第三个钉钉 demo 形态（不做「保留 legacy 且另建新 demo」的中间态）。
- 不清理其他 demo 页（crud-demo、report-designer-demo 等不在 scope）。

## Scope

### In Scope

- 裁决（统一 vs 废弃）及落地：路由、页面文件、legacy 常量、单测、e2e 引用点。
- 裁决理由记录（daily log + 本 plan），供未来检索。
- 若废弃涉及 `flow-designer` 宿主无替代覆盖的演示能力（如 taskflow 对照），在裁决中显式评估并记录。

### Out Of Scope

- flow-designer 自身功能改动。
- 其他 demo 页治理。

## Failure Paths

不适用——纯 playground demo 页裁决与清理，无外部 API 契约/鉴权/外部集成；失败形态为「e2e 路由断言悬空 / 页面引用残留」，由 Phase 2 的 `rg` 零残留核对与 e2e 复跑兜底。

## Test Strategy

本档选择：`建议有测`

理由：demo 页下线/统一涉及路由与 e2e 断言（playground-entry-pages、domain-page-interactions、subagent-a-independent-review 均有 `dingtalk-flow-demo` 引用），属于既有 e2e 覆盖路径——裁决落地后必须同步断言并复跑相关 spec（程序化断言，非截图）。非对外契约变更，不需 "Must automate" 的 test-first；以「更新既有断言 + 复跑 + rg 零残留」为验证主体。

## Execution Plan

### Phase 1 - 裁决

Status: completed
Targets: `apps/playground/src/pages/ding-talk-flow-demo.tsx`、`apps/playground/src/pages/dingtalk-flow/`、`apps/playground/src/route-model.ts`、`apps/playground/src/App.tsx`

- Item Types: `Decision`

- [x] (Decision) 裁决「统一 vs 废弃」：对照 0814 plan 意图（用户要求的目标形态已在 flow-designer 实现；demo 为 legacy 参考原型）与 live 证据（统一形态 e2e 6 例契约已锁定、legacy 有 insertBranch 已知缺陷、常量已被统一算法取代）。倾向：**废弃**（统一形态已完整承载钉钉视觉，legacy 无独立演示价值；保留会造成双实现歧义）。若出现「flow-designer 形态未覆盖某 legacy 演示能力」的 live 证据，则改判统一（路由复用）并在裁决记录中说明。
- [x] (Decision) 记录裁决理由到 daily log：包含「两套实现并存 vs 单一实现」的维护成本对比、legacy 已知缺陷、e2e 契约覆盖现状。

Exit Criteria:

> 只写本 Phase 交付的可观测结果 + 保证后续 Phase 能继续的局部检查。

- [x] 裁决结论落定（daily log 记录：`废弃` 或 `统一`），且裁决依据（live 核对结论）可复现
- [x] 裁决结论明确决定 Phase 2 的落地路径（删除 vs 路由复用），无中间态

### Phase 2 - 落地（按裁决执行）

Status: completed
Targets: `apps/playground/src/route-model.ts`、`apps/playground/src/App.tsx`、`apps/playground/src/pages/ding-talk-flow-demo.tsx`、`apps/playground/src/pages/dingtalk-flow/`、`apps/playground/src/pages/ding-talk-flow-demo.test.tsx`、`apps/playground/src/pages/index.ts`、`apps/playground/src/pages/types.ts`、`apps/playground/src/pages/home-page.tsx`、`apps/playground/src/app.test.tsx`、`apps/playground/src/app-diagnostics-route.test.tsx`

- Item Types: `Fix`

- [x] (Fix) 按裁决执行：
  - 若**废弃**：删除 `ding-talk-flow-demo.tsx` + `dingtalk-flow/` 6 文件 + `ding-talk-flow-demo.test.tsx`；`route-model.ts` 删除 `dingtalk-flow-demo` 条目；`App.tsx` 删除 import 与 case 分支；`pages/index.ts` 删除导出；`pages/types.ts` 删除 `PageId` 成员；`home-page.tsx` 删除卡片；2 个 `vi.mock` 测试文件同步移除对应 mock 与用例。
  - 若**统一**：`dingtalk-flow-demo` 路由改为复用 flow-designer 钉钉示例入口（或删除路由由 `/flow-designer` 承接），同样删除 legacy 文件与测试。
- [x] (Fix) 清理 legacy 常量：删除 `BRANCH_SHORT_LEG`/`MERGE_SHORT_LEG` 定义与消费（随文件删除自然清零；若裁决保留任何文件则显式清理常量引用）。
- [x] (Proof) `rg -n "dingtalk-flow-demo|ding-talk-flow-demo|BRANCH_SHORT_LEG|MERGE_SHORT_LEG" apps/ tests/` 零残留（白名单外），证明无悬空引用。

Exit Criteria:

- [x] 路由/页面/文件/常量按裁决清理完毕；`rg` 零残留（白名单外）
- [x] playground 局部 typecheck 通过（`pnpm --filter playground typecheck` 或等价局部验证），无断链 import

### Phase 3 - 测试与宿主同步

Status: completed
Targets: `tests/e2e/playground-entry-pages.spec.ts`、`tests/e2e/exploratory/domain-page-interactions.spec.ts`、`tests/e2e/exploratory/domain-page-zero-error.spec.ts`、`tests/e2e/exploratory/subagent-a-independent-review.spec.ts`、`docs/logs/2026/08-07.md`

- Item Types: `Fix | Proof`

- [x] (Fix) 同步 4 处 e2e 引用：`playground-entry-pages.spec.ts:21`（`dingtalk-flow-demo` 路由断言）、`domain-page-interactions.spec.ts:25,166-168`、`domain-page-zero-error.spec.ts:14`、`subagent-a-independent-review.spec.ts:159`——按裁决改为指向 `/flow-designer` 钉钉示例（若废弃则删除该路由条目；若统一则更新断言目标）。
- [x] (Proof) 复跑受影响 e2e：`npx playwright test playground-entry-pages.spec.ts` + `domain-page-interactions.spec.ts` + `domain-page-zero-error.spec.ts` + `subagent-a-independent-review.spec.ts`（或按 AGENTS.md 测试执行策略跑相关 spec），全绿；`flow-designer-dingtalk-visual.spec.ts` 保持 6/6。
- [x] (Proof) `pnpm --filter playground test` 全绿（含更新后的 `app.test.tsx`/`app-diagnostics-route.test.tsx`/`ding-talk-flow-demo.test.tsx`（删除或改向））。
- [x] (Follow-up) daily log 记录裁决 + 落地 + 验证；0814 plan Deferred 条目可标记已收口（按 Rule 21 不回写历史 plan 文本，仅在 daily log 记录）。

Exit Criteria:

- [x] 4 处 e2e 引用已同步且相关 spec 全绿（含 flow-designer-dingtalk-visual 回归）
- [x] `rg "dingtalk-flow-demo" tests/ apps/` 零残留（白名单外）
- [x] `pnpm --filter playground test` 全绿
- [x] daily log 有裁决与收口记录

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session）两轮审查——round 1: task `ses_02555654affeW7FofBN5TCy7TA`；round 2: task `ses_02551c8a0ffeOh1z71zBvAtMNS`
- Verdict: round 1 `revised`（2 Major + 3 Minor）→ round 2 `pass-with-minors`（零 Blocker / 零 Major）
- Rounds: 2
- Findings addressed: Major1（遗漏第 4 处 e2e 引用 `domain-page-zero-error.spec.ts:14`）——基线/Goals/Phase 3/Closure Gates 全部改 4 处并补入 Targets；Major2（playground app 侧 5 处引用遗漏 + 「无单测包」前提错误）——`pages/index.ts:4` 导出、`pages/types.ts:7` PageId 成员、`home-page.tsx:13,111` 卡片、`app.test.tsx`/`app-diagnostics-route.test.tsx` `vi.mock` 全部补入 Phase 2 Targets/Fix，Phase 3 补 `pnpm --filter playground test` 全绿；Minor×3 全部处理（rg 路径 typo `apps/ playground/src` → `apps/ tests/`、docs 引用登记 Non-Blocking Follow-ups、统一/废弃分支对称性说明）；round 2 新 Minor（Phase 3 Proof 复跑清单补 `subagent-a-independent-review.spec.ts`）已处理。

## Closure Gates

> 关闭条件：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] `/dingtalk-flow-demo` 遗留原型已按裁决落地（废弃下线 或 统一复用），无两套实现并存
- [x] legacy 常量（BRANCH_SHORT_LEG/MERGE_SHORT_LEG 等）已清理，`rg` 零残留
- [x] 4 处 e2e 引用已同步，受影响 e2e 全绿；flow-designer-dingtalk-visual 契约无回归
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项（裁决已明确，无中间态）
- [x] 受影响的 owner docs 已同步（daily log；0814 plan 历史文本按 Rule 21 不回写）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### taskflow-designer-page 与 flow-designer 的关系评估

- Classification: `watch-only residual`
- Why Not Blocking Closure: `taskflow-designer-page.tsx` 与 `flow-designer-page.tsx` 并存属既有设计（taskflow 独立页面），与本 plan 的 dingtalk demo 裁决无关；若未来做 designer 页统一，另立计划。
- Successor Required: `no`

## Non-Blocking Follow-ups

- 若裁决为「废弃」：`dingtalk-flow-demo` 的历史视觉参考价值由 `flow-designer-dingtalk-visual.spec.ts` e2e 契约与 `docs/architecture/flow-designer/dingflow-visual-spec.md` 承接，无需保留 legacy 文件。
- `docs/skills/exploratory-e2e-testing-prompt.md` 与 `docs/analysis/2026-07-27-ma43-designer-office-e2e-test-audit/04-e2e-domain-pages.md` 提及 `dingtalk-flow-demo` 路由（非代码引用，属历史分析/技能文档）；执行时若 rg 全仓命中，按语境更新或标注，不阻塞 plan 收口。

## Closure

Status Note: 2026-08-07 收口——裁决「废弃」落地完成：`/dingtalk-flow-demo` legacy 原型（`ding-talk-flow-demo.tsx` + `dingtalk-flow/` 6 文件 + 单测）全数删除，路由条目（live 位置 `domain-route-entries.ts`，plan 基线 271 行为 1053-1 拆分前旧行号）与 `App.tsx` case/import、`pages/index.ts` 导出、`pages/types.ts` PageId、`home-page.tsx` 卡片、2 个 vi.mock 测试全部清理；`BRANCH_SHORT_LEG`/`MERGE_SHORT_LEG` 常量随文件删除清零；4 处 e2e 引用同步（entry-pages 62/62、zero-error + interactions + subagent-a 70/17-skipped、flow-designer-dingtalk-visual 6/6 无回归）；`rg "dingtalk-flow-demo|ding-talk-flow-demo|BRANCH_SHORT_LEG|MERGE_SHORT_LEG" apps/ tests/` 零残留；`pnpm --filter @nop-chaos/flux-playground typecheck` + test（21 files/142 passed）绿；全量 `pnpm typecheck`/`pnpm build`/`pnpm lint`/`pnpm test`（32/32/32/59-task）绿、`pnpm check` exit 0（仅既有登记豁免 en-US/zh-CN）。0814 plan Deferred 项（Successor Required: yes）已收口（Rule 21 不回写历史 plan 文本，记录于 daily log 与本 Closure 节）；work item 未登记于 `docs/backlog/`（无 ❌ 行），roadmap 无变更。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session）`ses_024ce2ef7ffe3ZxmtdU15q7FMB`
- Evidence: verdict `approved`（0 Blocker / 0 Major；1 Minor——Phase 2 Targets 中 `route-model.ts` 行号 vs live `domain-route-entries.ts`，已在 daily log 说明，无歧义）。独立审计逐项回看 live repo（未采信 [x]）：7 个 legacy 文件 git 删除实证 + `ls` 缺席；route-model.ts:271 与 live 拆分后位置（domain-route-entries.ts）差异已在 daily log 诚实记录；entry-pages `expect(assertionIds).toEqual(routeIds)` 覆盖不变式经 live 双源核对成立；flow-designer 为唯一实现（dingtalk-visual 6/6 绿）；0814 plan 文本未动（Rule 21）；diff 23 files +44/−1051 与摘要一致；验证输出（typecheck/build/lint 32/32、playground 142 tests、e2e 62+70/17、pnpm check exit 0）与 daily log 相互印证。

Follow-up:

- 无 remaining plan-owned work（non-blocking follow-ups 均已按语境处理：skill 文档导航表已更新标注；`docs/analysis/.../04-e2e-domain-pages.md` 由 spec afterAll 重生成零残留；历史 logs/plans/archive 引用属白名单，不回写）。
