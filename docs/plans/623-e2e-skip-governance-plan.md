# 623 e2e 搁置测试治理（deep-audit 2026-10-16 findings C1-C4）

> Plan Status: completed
> Last Reviewed: 2026-10-17
> Source: docs/analysis/2026-10-16-deep-audit-report.md §3（执行核实勘正后的 C1-C4）
> Related: docs/context/project-context.md（watch-only 终态清单）、docs/audits/visual-quality-r2/watch-pool.md

## Purpose

tests/e2e 的每一处 skip 都落到"有理由注释"或"恢复运行"两态之一；watch-only 已知红获得 opt-in 的逐测试干净运行开关（默认行为不变）。消除"无注释 skip = 无法区分搁置原因"的测试台账盲区。

## Current Baseline

- C1（勘正后）：`tests/e2e/flow-designer-edge-creation.spec.ts:10` 诊断变体（synthetic connect）`test.skip` 无理由注释；同文件 :34 起真实键盘连线回归测试**活跃**，回归覆盖未失守。
- C2（勘正后）：`tests/e2e/flow-designer-ui.spec.ts` 4 测试中 2 个 skip 无理由（:33 HTML 捕获诊断、:169 palette/工具栏视觉结构断言——后者为**真断言测试**，含 toolbar 按钮数=7 等可能随演化漂移的选择器）；:192 与 :228 两个活跃测试覆盖工具栏/快捷操作与 JSON 对话框。
- C3：`tests/e2e/exploratory/interaction-tests.spec.ts` 6 处 `describe.skip`、`exploratory/subagent-a-independent-review.spec.ts` 7 处、`component-lab/crud-table-body-diag.spec.ts:4` 1 处——共 **14 处 = 13 exploratory + 1 crud-diag** 无理由（探索性标本，覆盖 dialog 生命周期/renderer 切换/debugger 断言等）。
- C4：`playwright.config.ts` 无 testIgnore/grepInvert；DV 终态清单的 watch-only 红是**逐测试**的（gantt-perf 3 测中 ×2、kanban-perf 3 测中 ×1、scada ×2 的测试名在 spec 源内 grep 零命中——"edge line geometric"/"edge polygon leafer-render-timing" 为描述性记录非测试标题），且 4 个带字面 "watch-only" 注释的文件在 DV 基线全绿——**精确失败测试集未知，须 live run 盘点**。
- 范围外同源（review R1 Major 1 发现，已补充纳入本 plan scope）：`tests/e2e/code-editor.spec.ts:486` 截图捕获 `test.skip` 无理由；`tests/e2e/debugger-meta-diagnostic.spec.ts:4` 诊断 `test.skip` 无理由。
- [R2 Minor A 预置] scada ×2 残留真实落点未钉死：leafer/edge 相关测试材料另存在于 7 个 spec 文件（scada-editor-interaction-correctness / scada-editor-drag-ux / scada-demo / scada-ux-visual / scada-pointer-events-regression / leafer-examples / playground-entry-pages）——盘点若发现 scada 红落在这三 spec 之外，按 inventory-drift 处置并扩盘点面。
- 已合规先例：`scope-read-benchmark.test.ts:8-9`（env 门控 + 理由）、`readme-flux-basic-screenshot.spec.ts:11-12`（理由注释）、`exploratory/debug-canvas.spec.ts:6`（文件头理由）、`large-dataset-windowing.spec.ts:12/:29`（BLOCKED 头）。
- e2e 基线：2026-08-09 DV（1086 passed/43 skipped/3 watch-only failed）；近期 RM 收口均未重跑 e2e（daily log 有披露）。
- 运行前置：playwright.config webServer 自动拉起 playground（:4175 strictPort，`reuseExistingServer: !CI`）；`--list` 不触发 webServer。

## Goals

- 两份 flow-designer spec 的 3 处 `test.skip` 全部携带理由注释（挂裁决依据）；:169 视觉结构断言测试恢复或裁决搁置（依据 live UI 状态）。
- C3 的 14 处（13 exploratory + 1 crud-diag）+ 补充纳入的 2 处（code-editor:486、debugger-meta-diagnostic:4）全部携带理由注释。
- watch-only 逐测试排除开关：先 live run 盘点 3 个 perf spec 的实际失败测试集，标题级 `@watch-only` 标记 + `E2E_EXCLUDE_WATCH_ONLY=1` 时 `grepInvert` 生效（默认不变）。
- 治理后 e2e skip 面可审计：`grep` tests/e2e 的 skip 标记所得每条均有理由注释、BLOCKED 头、运行时条件理由或 env 门控。

## Non-Goals

- 不恢复 C5 薄覆盖面（editor-core/pivot/map/graph 的测试比例与三个未直测大文件）——`optimization candidate`，登记 follow-up。
- 不修复 gantt-perf/kanban-perf/scada watch-only 本体（既有终态清单，60Hz 环境确认归 DV 协议）。
- 不跑全量 `pnpm test:e2e` 作为门禁（耗时且受并发会话 CPU 干扰；验证用 focused spec 运行 + `--list`）。
- 不触碰 xlang 域与并发会话领地。

## Scope

### In Scope

- `tests/e2e/flow-designer-edge-creation.spec.ts`、`tests/e2e/flow-designer-ui.spec.ts`
- `tests/e2e/exploratory/interaction-tests.spec.ts`、`tests/e2e/exploratory/subagent-a-independent-review.spec.ts`
- `tests/e2e/component-lab/crud-table-body-diag.spec.ts`
- `tests/e2e/code-editor.spec.ts`（仅 :486 理由注释）、`tests/e2e/debugger-meta-diagnostic.spec.ts`（仅 :4 理由注释）
- `tests/e2e/gantt-perf.spec.ts`、`tests/e2e/kanban-perf.spec.ts`、`tests/e2e/scada-editor-perf.spec.ts`（仅失败测试的标题级标记）
- `playwright.config.ts`（opt-in grepInvert 开关）
- `docs/context/project-context.md`（watch-only 段落互指更新）

### Out Of Scope

- 其余 e2e spec 的内容演进；CI 协议变更；watch-pool.md 视觉发现台账（另一体系）

## Failure Paths

| 场景            | 触发                                                  | 行为                                                            | 可重试 | 用户可见表现         |
| --------------- | ----------------------------------------------------- | --------------------------------------------------------------- | ------ | -------------------- |
| revive-fail     | :169 恢复后选择器漂移断言失败                         | 按 live UI 更新选择器断言；若语义已消失则改判搁置+理由          | 是     | 测试台账             |
| focused-red     | focused 运行暴露真实产品回归                          | 停止恢复、登记 defect、不落入本 plan closure                    | 是     | daily log + 审计报告 |
| inventory-drift | 盘点 run 的失败集 ≠ DV 终态清单（如 scada ×2 不复现） | 以实测为准登记实际失败集；与 DV 清单的差异在 daily log 勘误披露 | 是     | plan/daily log       |

## Test Strategy

本档选择：`必须自动化`（对象本身是测试资产）——focused Playwright 运行（`npx playwright test <spec> --reporter=list`）作为恢复/裁决的判别证据；`--list` before/after diff 作为 config 开关的判别证据。

## Execution Plan

### Phase 1 - flow-designer 两 spec 治理（C1、C2）

Status: completed
Targets: `tests/e2e/flow-designer-edge-creation.spec.ts`、`tests/e2e/flow-designer-ui.spec.ts`

- Item Types: `Fix`、`Decision`

- [x] C1：:10 诊断变体补理由注释（裁决为"合成事件诊断标本，真实连线回归由 :34 活跃测试承载"）
- [x] C2：:33 HTML 捕获测试补理由注释（资产生成性质，照 readme-flux-basic-screenshot 先例）
- [x] C2 [Decision]：:169 视觉结构断言测试——**已恢复且 live 直过**（palette 文案/toolbar 按钮 7/minimap/controls 断言零漂移，无需改选择器；focused run 20.2s passed）
- [x] focused 运行两 spec 文件全绿（4 passed / 2 skipped——两个 skip 均带理由注释）

Exit Criteria:

- [x] 两 spec 内每个 `test.skip` 均有理由注释（引用裁决/先例）
- [x] `npx playwright test tests/e2e/flow-designer-edge-creation.spec.ts tests/e2e/flow-designer-ui.spec.ts --reporter=list` 全绿（4 passed/2 skipped，skip 均带理由）
- [x] 若恢复过程发现真实产品回归：已登记 defect 并在 plan 中改判（未发现——恢复测试直过）

### Phase 2 - 理由登记全覆盖（C3 + 范围外同源 2 处）

Status: completed
Targets: `tests/e2e/exploratory/interaction-tests.spec.ts`、`tests/e2e/exploratory/subagent-a-independent-review.spec.ts`、`tests/e2e/component-lab/crud-table-body-diag.spec.ts`、`tests/e2e/code-editor.spec.ts`、`tests/e2e/debugger-meta-diagnostic.spec.ts`

- Item Types: `Decision`

- [x] 前三文件各加文件级理由注释：裁决为"探索性诊断标本，保留手工复现价值，不入 CI 门禁"（interaction-tests 16 tests / subagent-a 17 tests / crud-diag 1 test 均被文件头注释覆盖）
- [x] code-editor.spec.ts:486、debugger-meta-diagnostic.spec.ts:4 各补理由注释（两行，捕获/诊断性质，照既有先例）
- [x] 抽查 helper 漂移：`ComponentLabHelper.openRenderer`/`scenarioSlug` 签名与 helpers.ts 现值一致（interaction-tests 32 处使用、crud-diag 2 处、subagent-a 0 处不消费该 helper）——无漂移

Exit Criteria:

- [x] `grep -rn "describe.skip\|test.skip" tests/e2e/` 所得 24 处全部落入四类豁免（本 plan 理由注释 18 处 + 既有先例 6 处（5 处既有 skip + 1 处 BLOCKED 头内的注释行）：readme 理由、debug-canvas 文件头、large-dataset BLOCKED 头 ×2、mobile-components 运行时条件理由）
- [x] 五文件 `npx playwright test <file> --list` 通过（16/17/1/22/1 tests listed，编译/引用完整）

### Phase 3 - watch-only 逐测试 opt-in 开关（C4）

Status: completed
Targets: `tests/e2e/gantt-perf.spec.ts`、`tests/e2e/kanban-perf.spec.ts`、`tests/e2e/scada-editor-perf.spec.ts`、`playwright.config.ts`、`docs/context/project-context.md`

- Item Types: `Fix`、`Proof`

- [x] **盘点 [Proof 先行]**：live run 三 spec（2026-10-17，`--reporter=list`，6 passed/3 failed 1.1m）——**inventory-drift 落地披露**：gantt-perf 3 测全过、kanban-perf 3 测全过（DV 台账的 50Hz 阈值项在本机当日通过——阈值边缘态，仍属已裁决 watch-only 集）；scada-editor-perf 3 测全挂（:170 编辑延迟/:188 拖拽 fps/:201 内存）——**DV 台账的 scada ×2 residual 名称（edge line geometric/edge polygon leafer-render-timing）在全部测试源 grep 零命中（描述性记录失效、无法对账）**，今日 scada ×3 失败同属 perf-阈值族但未经 watch-only 裁决，不洗白、不标记——登记待独立裁决（环境阈值 or 回归），已在 project-context.md 就地勘误
- [x] 对已裁决可对账集做标题级 `@watch-only` 标记（3 处：gantt scroll/drag + kanban drag；断言零改动）
- [x] config 增 `E2E_EXCLUDE_WATCH_ONLY=1` 时的 `grepInvert: /@watch-only/`（默认不设置 = 行为不变）
- [x] `E2E_EXCLUDE_WATCH_ONLY=1 npx playwright test --list`：1868 tests，@watch-only 命中 0，恰缺 3 个标记项
- [x] 默认 `npx playwright test --list`：1871 tests（266 files），@watch-only 命中 3，唯一 diff = 3 个标记项（可枚举；工件 `_tmp/plan623-list-{default,exclude}.txt`）
- [x] project-context.md watch-only 段落补开关用法互指 + scada 台账勘误

Exit Criteria:

- [x] 盘点清单（file+title）已记录于本 plan，与 DV 终态清单的差异已勘误披露（scada ×2 失效、scada ×3 未裁决待裁定、gantt/kanban 当日通过为阈值边缘态）
- [x] 默认 `--list` 测试集合与改动前一致（1871 = 1868 + 3 标记项；唯一 diff 为标题后缀）
- [x] 开关开启时 `--list` 恰缺 3 个标记测试，其余不变
- [x] project-context.md 与 config 开关互指一致

## Draft Review Record

- Reviewer / Agent: 独立子代理 agent_d0b398dd（fresh session，R1 + R2 两轮）
- Verdict: R1 fail（1 Blocker / 2 Major / 4 Minor，全量修订）→ R2 **pass-with-minors**（0B/0M/3 Minor）
- Rounds: 2
- Findings addressed: R1——B1 Phase 3 机制改逐测试（testIgnore 文件粒度不可行→live 盘点 + 标题级 @watch-only 标记 + grepInvert，Proof 先行 + inventory-drift 失败路径）；M1 范围纳入 code-editor.spec.ts:486 与 debugger-meta-diagnostic.spec.ts:4（Goal 4 全局可达）；M2 计数勘正（3 处 test.skip；14 = 13+1）；m1 行号勘正（:34/:192/:228）；m2 Phase 1 补 webServer 前置与端口冲突杠杆；m3 Closure Gates 措辞重写（repo-baseline sweep 定位 + --list diff 为 config 安全门 + build 豁免声明 + stash 条款移除）；m4 Phase 2 Targets 收窄到点名文件。R2——Minor A scada 盘点面预置（7 个 leafer/edge 相关 spec 扩盘线索入 baseline）；Minor B "范围外同源"标签改"补充纳入"；Minor C 默认清单 diff 落为可枚举工件（执行时以文件/daily log 留档）

## Closure Gates

> 说明：`tests/` 非 workspace 包（pnpm-workspace = apps/_ + packages/_，无 tests/package.json；playground tsconfig 仅含 src），故 `pnpm typecheck`/`lint`/`test` 对本 plan 改动文件零覆盖——保留为收口时的 repo 基线全面扫（确认无意外外溢），真正的 config 安全门是 Phase 3 的 `--list` before/after diff。`pnpm build` 豁免（本 plan 无构建产物变更）。

- [x] 所有 in-scope skip 治理项落地（Phase Exit Criteria 全勾）
- [x] focused 运行与 `--list` diff 证据记录于 daily log（`_tmp/plan623-list-{default,exclude}.txt` + focused 4 passed/2 skipped）
- [x] 无静默降级：恢复失败、真实回归、盘点漂移均已按 Failure Paths 处置（scada ×3 未裁决失败已披露登记，未洗白）
- [x] `pnpm typecheck`（repo 基线扫，非覆盖性门禁——见节首说明）：**80/82 绿，唯一红 = `@nop-chaos/flux-playground` vite.config Excessive stack depth——既有红**（docs/logs/2026/10-16.md 已 stash 验证 master 同红；本 plan diff 12 文件不含该文件）
- [x] `pnpm lint`（repo 基线扫）：44/44 绿
- [x] `pnpm test`（repo 基线扫；与 registered 单测基线对照披露差异）：80/82 任务绿；唯一红 = playground——**520 passed/2 failed + 2 文件级失败，归因并发会话 plan 621 Phase 2 提交 db67dba02（非本 plan diff）**：(a) `route-matrix.test.ts` ×2——新增 xlang-debug 域路由未配 DOMAIN_HOME_FAMILY 映射；(b) `app.test.tsx`/`app-diagnostics-route.test.tsx` 文件级——新增 xlang-debug-page 拉入 CE `formFieldChromeRules` 但 `@nop-chaos/flux-renderers-form` mock 未导出（其 plan 621 checklist "app.test.tsx pages mock 跟进"项未收全）。其余 41 包与 registered 基线一致（xlang 域 scope-excluded 惯例）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据
- [x] 当日 daily log 已记录

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

Status Note: 2026-10-17 收口。三 Phase 全落地：3 处 flow-designer skip 理由化 + :169 真断言测试恢复直过；5 文件理由登记使全 tests/e2e 24 处 skip 全部落入四类豁免；watch-only 逐测试 opt-in 开关（3 个已裁决测试标记 + E2E_EXCLUDE_WATCH_ONLY grepInvert，默认行为不变，--list 双向 1871↔1868 恰差标记项）；盘点漂移（scada ×2 台账失效 + scada ×3 未裁决失败）如实披露不洗白。closure audit 一轮通过（agent_6878e130，approved 0B/0M/2 cosmetic minors 已随收口修正）。

Closure Audit Evidence:

- Auditor / Agent: 独立子代理 agent_6878e130（fresh session）
- Evidence: 五项审计全过——landing 逐项核实（注释/恢复/标记/config/互指，断言零改动）；门禁复跑（--list 1871/3 vs 1868/0 精确复现）；inventory-drift 诚实性（台账名称零命中、scada ×3 未标记不洗白）；归因四项全证实（db67dba02 路由/mock 缺失，本 plan diff 无 apps/packages 路径）；文本一致性（R1 fail→R2 pass-with-minors 记录、daily log 与实况吻合）。2 cosmetic minors（19/5 分解口径、"一行"措辞）随收口修正。
