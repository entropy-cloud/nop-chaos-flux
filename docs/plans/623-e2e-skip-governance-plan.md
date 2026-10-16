# 623 e2e 搁置测试治理（deep-audit 2026-10-16 findings C1-C4）

> Plan Status: draft
> Last Reviewed: 2026-10-17
> Source: docs/analysis/2026-10-16-deep-audit-report.md §3（执行核实勘正后的 C1-C4）
> Related: docs/context/project-context.md（watch-only 终态清单）、docs/audits/visual-quality-r2/watch-pool.md

## Purpose

tests/e2e 的每一处 skip 都落到"有理由注释"或"恢复运行"两态之一；watch-only 已知红获得 opt-in 的干净运行开关（默认行为不变）。消除"无注释 skip = 无法区分搁置原因"的测试台账盲区。

## Current Baseline

- C1（勘正后）：`tests/e2e/flow-designer-edge-creation.spec.ts:10` 诊断变体（synthetic connect）`test.skip` 无理由注释；同文件 :37 起真实键盘连线回归测试**活跃**，回归覆盖未失守。
- C2（勘正后）：`tests/e2e/flow-designer-ui.spec.ts` 4 测试中 2 个 skip 无理由（:33 HTML 捕获诊断、:169 palette/工具栏视觉结构断言——后者为**真断言测试**，含 toolbar 按钮数=7 等可能随演化漂移的选择器）；:190 起 2 个活跃测试覆盖工具栏/快捷操作与 JSON 对话框。
- C3：`tests/e2e/exploratory/interaction-tests.spec.ts` 6 处 `describe.skip`、`exploratory/subagent-a-independent-review.spec.ts` 7 处、`component-lab/crud-table-body-diag.spec.ts:4` 1 处——共 14 处无理由（探索性标本，覆盖 dialog 生命周期/renderer 切换/debugger 断言等）。
- C4：`playwright.config.ts` 无 testIgnore/grep；gantt-perf ×2 + kanban-perf ×1 + scada ×2 已知 watch-only 红每次全量运行都出现；登记在 project-context.md:15-16 与 watch-pool.md，纯文档性。
- 既有合规先例：`scope-read-benchmark.test.ts`（env 门控 + 理由）、`readme-flux-basic-screenshot.spec.ts:11-12`（理由注释）。
- e2e 基线：2026-08-09 DV（1086 passed/43 skipped/3 watch-only failed）；近期 RM 收口均未重跑 e2e（daily log 有披露）。

## Goals

- 三份 flow-designer/诊断 spec 的 4 处 skip 全部携带理由注释（挂裁决依据）；:169 视觉结构断言测试恢复或裁决搁置（依据 live UI 状态）。
- C3 的 15 处 describe.skip（14 exploratory + 1 crud-diag）全部携带文件级理由注释（裁决为"探索性标本保留"或恢复）。
- playwright.config 提供 `E2E_EXCLUDE_WATCH_ONLY=1` opt-in 干净运行开关（默认不变——DV 协议依赖全量运行的透明红）；watch-only 清单落到 config 常量并与 project-context 文字互指。
- 治理后 e2e skip 面可审计：`grep` skip 标记所得每条均有理由注释或 env 门控。

## Non-Goals

- 不恢复 C5 薄覆盖面（editor-core/pivot/map/graph 的测试比例与三个未直测大文件）——`optimization candidate`，登记 follow-up。
- 不修复 gantt-perf/kanban-perf/scada watch-only 本体（既有终态清单，60Hz 环境确认归 DV 协议）。
- 不跑全量 `pnpm test:e2e` 作为门禁（耗时且受并发会话 CPU 干扰；验证用 focused spec 运行）。
- 不触碰 xlang 域与并发会话领地。

## Scope

### In Scope

- `tests/e2e/flow-designer-edge-creation.spec.ts`、`tests/e2e/flow-designer-ui.spec.ts`
- `tests/e2e/exploratory/interaction-tests.spec.ts`、`tests/e2e/exploratory/subagent-a-independent-review.spec.ts`
- `tests/e2e/component-lab/crud-table-body-diag.spec.ts`
- `playwright.config.ts`（opt-in 开关 + watch-only 常量）
- `docs/context/project-context.md`（watch-only 段落互指更新）

### Out Of Scope

- 其余 e2e spec 的内容演进；CI 协议变更；watch-pool.md 视觉发现台账（另一体系）

## Failure Paths

| 场景        | 触发                          | 行为                                                   | 可重试 | 用户可见表现         |
| ----------- | ----------------------------- | ------------------------------------------------------ | ------ | -------------------- |
| revive-fail | :169 恢复后选择器漂移断言失败 | 按 live UI 更新选择器断言；若语义已消失则改判搁置+理由 | 是     | 测试台账             |
| focused-red | focused 运行暴露真实产品回归  | 停止恢复、登记 defect、不落入本 plan closure           | 是     | daily log + 审计报告 |

## Test Strategy

本档选择：`必须自动化`（对象本身是测试资产）——focused Playwright 运行（`npx playwright test <spec> --reporter=list`）作为恢复/裁决的判别证据；config 开关用 `--list` 输出验证过滤生效。

## Execution Plan

### Phase 1 - flow-designer 两 spec 治理（C1、C2）

Status: planned
Targets: `tests/e2e/flow-designer-edge-creation.spec.ts`、`tests/e2e/flow-designer-ui.spec.ts`

- Item Types: `Fix`、`Decision`

- [ ] C1：:10 诊断变体补理由注释（裁决为"合成事件诊断标本，真实连线回归由 :37 活跃测试承载"）
- [ ] C2：:33 HTML 捕获测试补理由注释（资产生成性质，照 readme-flux-basic-screenshot 先例）
- [ ] C2 [Decision]：:169 视觉结构断言测试——live UI 核对（palette 文案/toolbar 按钮数/minimap/controls）后恢复运行；选择器漂移则更新断言；语义消失则搁置+理由
- [ ] focused 运行两 spec 文件全绿（活跃测试 + 恢复测试）

Exit Criteria:

- [ ] 两 spec 内每个 `test.skip` 均有理由注释（引用裁决/先例）
- [ ] `npx playwright test tests/e2e/flow-designer-edge-creation.spec.ts tests/e2e/flow-designer-ui.spec.ts --reporter=list` 全绿（0 skipped 或 skip 均带理由）
- [ ] 若恢复过程发现真实产品回归：已登记 defect 并在 plan 中改判（不得静默摘除断言）

### Phase 2 - exploratory + crud-diag 理由登记（C3）

Status: planned
Targets: `tests/e2e/exploratory/*.spec.ts`、`tests/e2e/component-lab/crud-table-body-diag.spec.ts`

- Item Types: `Decision`

- [ ] 三文件各加文件级理由注释：裁决为"探索性诊断标本，保留手工复现价值，不入 CI 门禁"（逐文件核对 14+1 处 describe.skip 均被该注释覆盖）
- [ ] 抽查 2 个 describe 的测试体是否仍可编译引用现有 helper（ComponentLabHelper 签名漂移检测）——漂移则在注释中记录 specimen 年代

Exit Criteria:

- [ ] `grep -n "describe.skip" tests/e2e/exploratory tests/e2e/component-lab` 每处均落在带理由注释的文件内
- [ ] 三文件 `npx playwright test <file> --list` 通过（编译/引用完整性）

### Phase 3 - watch-only opt-in 开关（C4）

Status: planned
Targets: `playwright.config.ts`、`docs/context/project-context.md`

- Item Types: `Fix`

- [ ] config 增 watch-only spec 常量（gantt-perf/kanban-perf/scada-editor-perf/watch-only 标记文件，与 project-context 终态清单一致）+ `E2E_EXCLUDE_WATCH_ONLY=1` 时 testIgnore 生效（默认空 = 行为不变）
- [ ] `E2E_EXCLUDE_WATCH_ONLY=1 npx playwright test --list` 验证清单排除；默认 `--list` 验证无变化
- [ ] project-context.md watch-only 段落补一行开关用法互指

Exit Criteria:

- [ ] 默认 `--list` 输出与改动前一致（基线保护）
- [ ] 开关开启时 `--list` 不含 watch-only spec，其余清单不变
- [ ] project-context.md 与 config 常量互指一致

## Draft Review Record

- Reviewer / Agent: （待独立子代理 fresh session 审查）
- Verdict: （待审）
- Rounds: （待审）
- Findings addressed: （待审）

## Closure Gates

- [ ] 所有 in-scope skip 治理项落地（Phase Exit Criteria 全勾）
- [ ] focused Playwright 运行证据记录于 daily log
- [ ] 无静默降级：恢复失败或发现真实回归均已按 Failure Paths 处置
- [ ] `pnpm typecheck`（config 改动涉及 TS）
- [ ] `pnpm lint`
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [ ] 当日 daily log 已记录
- [ ] `pnpm test`（或仅既有红——stash 验证披露）

## Deferred But Adjudicated

### C5 薄覆盖面恢复

- Classification: `optimization candidate`
- Why Not Blocking Closure: 覆盖比例与大文件直测是增量优化，非 live defect；本 plan 结果面 = skip 治理与开关
- Successor Required: `no`（登记于 Non-Blocking Follow-ups）

### C6 两处既有红收口跟踪

- Classification: `watch-only residual`
- Why Not Blocking Closure: crud-loadaction/form-advanced flaky 为已归属既有红，收口依赖独立复现环境
- Successor Required: `no`

## Non-Blocking Follow-ups

- C5：editor-core/pivot/map/graph 覆盖增厚与 table-header-row/create-engine/upload-field 直测
- :169 若裁决搁置，恢复候选登记至 backlog

## Closure

Status Note: （待收口后填写）

Closure Audit Evidence:

- Auditor / Agent: （待填）
- Evidence: （待填）
