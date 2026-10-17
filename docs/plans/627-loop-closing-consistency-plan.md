# 627 审计循环收尾一致性杂项（completeness 对账漏网项）

> Plan Status: completed
> Last Reviewed: 2026-10-17
> Source: docs/analysis/2026-10-16-deep-audit-report.md §9 收尾对账 + plan 625 Phase 4 归属表遗留 + plan 626 closure audit R2 观察
> Related: docs/plans/625（F2 名单外 stale 候选）、docs/plans/621（并发会话领地声明）

## Purpose

五 plan 循环（622-626）收尾后的 completeness 对账发现 **3 个 F2 类一致性残留**（已完成仍 active：559/579/580——R1 审查纠正了"579/580 真活跃"的误判：两者各有收口提交 727935126/2f2d9be53、closure audit approved 记录在档（agent_723a47e3/agent_51d458c3）、workaround ledger 行 verified、WA-16 ed054a4d7 已把整条 workaround 路线图归档为 done；其头部 `active` 与 Phase 2 `in_progress` 行均为 Lesson-7 型内部不一致）、1 个无主的包清单版本漂移、2 个记账缺漏（F1 教训未落 log、ratchet 可再收紧）。本 plan 把"需要修正的"全部收口，使循环终止判定无遗留歧义。

## Current Baseline

- **三个 F2 类残留（R1 Blocker 勘正——625 遗留的"579/580 真活跃"标签失实）**：
  - `2026-10-04-559-editor-designer-p45-flow-misc-cleanup-plan.md`：x=17/empty=0，Status Note 记"三项杂项全部落地…独立 closure audit approved"；审计证据 = daily log 2026-10-04 P4.5 节 + 收口提交 b8ef4a555（**10-04 时代审计无命名 agent id——命名惯例后来才出现**）。
  - `579-cx1-compile-formula-dedup-plan.md`：x=17/empty=0，Status Note "done（2026-10-12 收口提交）"、Closure Gates 全勾（audit agent_723a47e3 approved）、收口提交 727935126 在档、ledger WA-core-002/WA-formula-001 verified；仅 Phase 2 Status 行仍写 `in_progress`（自身 Exit Criteria 全勾后的 Lesson-7 不一致）。
  - `580-cx2-repeated-templates-removal-plan.md`：x=17/empty=0，Status Note "done"、audit agent_51d458c3 approved、收口提交 2f2d9be53 在档、ledger WA-core-001 verified；同型 Phase 2 Status 行残留。
- **flux-xlang-debug 清单漂移**：`"vitest": "^3.0.0"`（全工作区唯一声明 vitest 的包；root 为 ^5.0.1，其余 42 包均靠 workspace root bin 解析）+ `"@types/react": "^19.0.0"`（他包 ^19.3.0）。并发会话的 plan 621 未收口、无主。**约束**：该包属并发会话领地——前置检查其静默（工作树无 xlang 写）；移除 vitest 声明后该包测试将首次以 root vitest 5 运行，须实测其套件兼容。
- **F1 教训未落 log**：审计报告 F1 处置声称"daily log 记录该教训"（混合关注点提交/一 plan 一 commit 边界），实际未落（grep 零命中）——声称-实况漂移，需补录。
- **audit-suspects 可再收紧**：completeness 对账实测（2026-10-17 实跑 discover-audit-suspects）= **723** < 基线 727（4 条余量；RM 轨道收口后进一步收缩）。
- **B6 处置显式化**：`column-width-measure.ts:70` 的 digest stringify useMemo 经复核为**文档化的有意模式**（代码注释明确"useScopeSelector pathsKey 同款模式——内容不变则无需重测"），非缺陷非不一致——归入用户豁免类，仅需在报告 §9 显式记录处置结论。
- 并发会话静默前提：工作树当前仅有本 plan 相关变更（2026-10-17 实测）。

## Goals

- 559/579/580 三份头翻 `completed`：
  - 559：approved 记录在档即翻（daily log 2026-10-04 P4.5 节 + b8ef4a555 message；10-04 时代无命名 agent id 属正常——**不以"无 agent id"触发 Failure Path**，仅证据完全缺失才触发）；翻转记录注明审计者描述形态。
  - 579/580：Closure Audit Evidence 均有命名 agent（agent_723a47e3/agent_51d458c3 approved）→ 直接翻；**顺带把两文件 Phase 2 的 `Status: in_progress` 行同步为 `completed`**（Lesson-7 一致性）。
- flux-xlang-debug 清单对齐（vitest 声明移除靠 root bin + @types/react ^19.3.0），套件在 vitest 5 下实测绿。
- F1 教训补录 daily log；audit-suspects 727→723 ratchet 收紧；B6 豁免处置落报告 §9。
- 终态：`grep "Plan Status: active" docs/plans/` 集合 = 纯真实 WIP（621 + 本 plan），无可执行新 findings 的循环终止判定成立。

## Non-Goals

- 不动 plan 621 本体及其收口流程（并发会话所有权）。
- 不做 C5 薄覆盖、async/react19 逐条裁决、three-perf script、479 stash 恢复等已登记 follow-up（各有 successor/理由）。
- 除 559/579/580 三份头部/状态行翻转与 xlang 清单外，不改任何 plan 实质内容。

## Scope

### In Scope

- `docs/plans/2026-10-04-559-editor-designer-p45-flow-misc-cleanup-plan.md`（头部翻转）
- `docs/plans/579-cx1-compile-formula-dedup-plan.md`（头部翻转 + Phase 2 Status 行同步）
- `docs/plans/580-cx2-repeated-templates-removal-plan.md`（头部翻转 + Phase 2 Status 行同步）
- `packages/flux-xlang-debug/package.json`（2 行清单对齐）+ pnpm-lock.yaml
- `scripts/baselines/scanner-baselines.json`（727→723）
- `docs/analysis/2026-10-16-deep-audit-report.md` §9（B6 处置 + F1 交叉引用）
- `docs/logs/2026/10-17.md`（F1 教训补录 + 本 plan 记录）

### Out Of Scope

- plan 621 本体；其余已登记 follow-up；两个外来未跟踪文档（另一会话产出）

## Failure Paths

| 场景              | 触发                                                                                                                                    | 行为                                                         | 可重试 | 用户可见表现    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ | --------------- |
| vitest5-break     | flux-xlang-debug 套件在 vitest 5 下红                                                                                                   | 回退 vitest 声明移除、保留 @types 对齐、红项登记归属并发会话 | 是     | focused test 红 |
| 559-evidence-miss | 559 的 Closure Audit Evidence 完全缺失（无 approved 记录：daily log 2026-10-04 P4.5 + b8ef4a555；10-04 时代无命名 agent id 不构成触发） | 不翻转；登记真实剩余项                                       | 是     | daily log       |

## Test Strategy

建议有测：清单变更的验证 = `pnpm install` + `pnpm --filter @nop-chaos/flux-xlang-debug test`（vitest 5 首跑）+ 门禁三件套。

## Execution Plan

### Phase 1 - 559 翻转 + xlang-debug 清单对齐

Status: completed
Targets: `docs/plans/2026-10-04-559-*.md`、`docs/plans/579-cx1-*.md`、`docs/plans/580-cx2-*.md`、`packages/flux-xlang-debug/package.json`

- Item Types: `Fix`、`Proof`

- [x] 559/579/580 三份翻转（559 翻转注记引用 daily log 2026-10-04 P4.5 + b8ef4a555；579/580 的 Phase 2 `in_progress` 陈旧行同步为 completed + Lesson-7 注记）
- [x] flux-xlang-debug：vitest ^3.0.0 声明移除（root bin 同法）；@types/react ^19.0.0→^19.3.0
- [x] `pnpm install`（clean）+ `pnpm --filter @nop-chaos/flux-xlang-debug test` **vitest 5 首跑 5 files / 34 tests 全绿** + 包级 typecheck 绿

Exit Criteria:

- [x] 559/579/580 头部 `completed` 且证据在档（三份全部命中 approved 记录路径，无 Failure Path 触发）
- [x] flux-xlang-debug 清单两处对齐且套件在 vitest 5 下绿（34/34）
- [x] lockfile 一致（frozen-lockfile 172ms 过）

### Phase 2 - 记账收尾（F1 补录 + ratchet 收紧 + B6 豁免落账）

Status: completed
Targets: `docs/logs/2026/10-17.md`、`scripts/baselines/scanner-baselines.json`、`docs/analysis/2026-10-16-deep-audit-report.md`

- Item Types: `Fix`

- [x] F1 教训补录 daily log（两例混合关注点提交 + 前瞻约束"一 plan 一 commit 边界，验证声称与 commit 自身 diff 对应"——并注记本循环 6 个提交已按此纪律）
- [x] audit-suspects 727→723（手编 + note）
- [x] B6 豁免处置落报告 §9（对账新增编号 + 文档化有意模式结论 + 终态 active 集合补记）
- [x] `check-scanner-baselines` 绿（within baseline，723 生效）

Exit Criteria:

- [x] daily log F1 教训在档（"混合关注点提交"关键词可查）
- [x] scanner 门禁绿且 723 生效
- [x] 报告 §9 B6 行处置结论在档

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_75123360（fresh session，R1 + R2 + R3 三轮）
- Verdict: R1 fail（1 Blocker——579/580 亦为已完成仍 active，终态集合声称失实；1 Major——559 证据门槛误设；3 Minor）→ R2 fail（实质修复证实正确，5 处机械传播遗漏：1 Major 残留 + 2 Minor）→ R3 **pass**（0B/0M）
- Rounds: 3
- Findings addressed: B1 F2 类残留扩为三（559/579/580；579/580 收口提交 727935126/2f2d9be53 + audit agent_723a47e3/51d458c3 + WA-16 ed054a4d7 归档为证），终态集合改 {621, 627}；M2 559 证据门槛改"approved 记录在档"（10-04 时代无命名 agent id 属正常）；m3 723 出处改为对账实测；m4 B6 标注为对账新增编号；m5 不引 625:14 陈旧行；R2 残留 5 处（Goals 终态/Non-Goals/In Scope/Phase 1 Targets/Failure Path 触发条件）全部同步

## Closure Gates

- [x] 所有 in-scope 项落地（Phase Exit Criteria 全勾）
- [x] `grep "Plan Status: active" docs/plans/` 终态：头部级集合 = {621, 627}（grep -l 另命中的 2026-08-04-0043-2 / 2026-08-08-2034-2 / 625 均为正文引用——三者头部实为 completed，已逐一核实）
- [x] `check:scanner-baselines` 绿；`check:workspace-manifest-deps` 绿
- [x] `pnpm typecheck`（42/44）/`build`（43/44）/`lint`（44/44）/`test`——唯红 = 既有披露红（playground vite.config + db67dba02，与 624/626 收口基线一致）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 当日 daily log 已记录

## Deferred But Adjudicated

（无。B6 属豁免类——文档化有意模式，处置 = 显式记录结论而非修正。）

## Non-Blocking Follow-ups

- （继承既有登记：C5 薄覆盖 / async-react19 逐条裁决 / three-perf script / 479 stash 恢复评估 / D1 CQ-S17——均已在对应 plan 留痕）

## Closure

Status Note: 2026-10-17 收口。completeness 对账的 4 项漏网全部落地：559/579/580 三份"已完成仍 active"翻转（含纠正 625 遗留误判与 579/580 的 Lesson-7 陈旧行同步）；flux-xlang-debug 清单对齐（vitest ^3 声明移除——套件 vitest 5 首跑 34/34 绿、@types/react 对齐 ^19.3.0）；F1 教训补录 daily log；audit-suspects ratchet 727→723；B6 豁免处置落报告 §9。终态头部级 active 集合 = {621（并发会话）, 627（本 plan 收口即退出）}。closure audit 一轮通过且零 findings。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_84ba6dcc（fresh session）
- Evidence: **approved（0 Blocker / 0 Major / 0 Minor）**——五项审计全过：landing 逐项核实（三翻转 diff 精确、清单对齐 + lockfile 级联核对、ratchet 723 + 门禁独立复跑 exit 0、报告 §9 补记与 daily log F1 教训实据核对——e219762d2/07aeeafd7/8994521ea 三例 git show --stat 逐一坐实）；终态集合独立 grep 分类（头部级恰 {621, 627}，三个正文命中逐一验头部 completed）；归属链核实（ed054a4d7 归档 + 579/580 收口提交）；文本一致性；scope 八文件无越界。
