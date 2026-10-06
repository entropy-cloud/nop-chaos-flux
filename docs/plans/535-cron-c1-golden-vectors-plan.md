# 535 Cron 轨道 C1 黄金向量与治理记账

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/cron-scheduling-roadmap.md`（工作项 C1）、`docs/components/cron-editor/design.md`（§2.1 语法基线 / §4 诊断码）、`docs/analysis/2026-08-04-control-gap-survey.md`（候选行）
> Related: 后继 plan（C2 Java 语法扩展 / C4 flux cron 引擎）将消费本计划产出的向量集

## Purpose

交付 cron 调度轨道的第一个工作项 C1：一份**跨仓共享的判别性黄金向量集**（表达式 → 期望 next-run 序列 / 期望诊断 / repeat/range 语义），作为 Java 端（C2/C3）与 TS 端（C4）Proof-first 测试的唯一契约来源；同时完成治理记账（需求门翻转、survey 双向链接、既有登记改动入库）。本计划不写任何引擎代码。

## Current Baseline

- **已立约未入库**：`docs/components/cron-editor/design.md` + `example.json` 已写好（untracked）；`docs/components/index.md`、`amis-baseline-matrix.md`、`examples.manifest.json`、`docs/components/roadmap.md` 四文件已加 `cron-editor`/`targetContract` 登记（工作区 M，未提交）。以上登记与交付面共 7 个文件随本计划一并入库。
- **flux 侧零实现**：`packages/` / `apps/` 全文无 cron 解析或渲染代码（已 grep 核实）。
- **nop-entropy 侧**（`/Users/abc/app/nop-entropy-wt/nop-entropy-master`，master 分支）：`CronExpression` 严格 6 段（`areValidCronFields` 要求 `length == 6`），不支持 `L`/`W`/`#`/年段；既有测试仅 equals/hashCode 3 用例（`TestCronExpression`）。
- **治理面缺口**：`docs/backlog/missing-components-and-designer-roadmap.md` L7.8 行（行 181）仍记 cron-editor「维持 survey-owned，host demand 出现才升级」，而 2026-10-06 用户需求已确认（roadmap Source 行记载），未回写；`docs/analysis/2026-08-04-control-gap-survey.md` 的 cron-editor 候选行（§E 表行 113、Tier 2 列表行 176、「附：候选统计」下「高价值跨组复现」条目行 203）均无指向 roadmap/design 的链接。
- **登记改动未入库**：登记与交付面共 7 个文件待入库——4 个 M（index.md / examples.manifest.json / amis-baseline-matrix.md / components/roadmap.md）+ 3 个 untracked（`docs/components/cron-editor/` 下 design.md 与 example.json、`docs/backlog/cron-scheduling-roadmap.md` 本体）。另有本 plan 文件自身为第 8 个 untracked，随收口一并入库。
- **无向量集**：仓库内不存在任何 cron 黄金向量文件。

## Goals

- 产出 `docs/components/cron-editor/golden-vectors.json`：判别性向量集，覆盖 roadmap C1 列明的全部类别——基础 6 段、`L`/`W`/`#` 动态月与闰年、可选年段、`repeat` 锚点过滤、`range` 截断、病态永不匹配与非法输入负例。
- 完成治理记账：L7.8 需求门翻转、survey 候选行双向链接、登记文件与向量集入库。
- 向量期望值的核验口径：**基线节（基础 6 段）经本地参考实现交叉验证全绿；动态日/年段/repeat/range/诊断节经 `date` CLI 日历事实核验**（C2/C4 执行时以 failing-test 形式首批消费，实现与向量冲突时按 Failure Paths 规则裁决）。

## Non-Goals

- 不实现任何 TS 或 Java 引擎代码、不建 renderer、不改 `CronExpression` / `TriggerSpec`（消费测试在 C2/C3/C4 落地）。
- 不在 C1 阶段向 nop-entropy 仓库提交任何文件（Java 侧向量副本随 C2 落地，C7 做哈希对账）。
- 不处理 `timezone` 字段（design §12 记录的后续项）。

## Scope

### In Scope

- `docs/components/cron-editor/golden-vectors.json`（新建，唯一权威副本）
- `docs/backlog/missing-components-and-designer-roadmap.md`（L7.8 行就地翻转 + 注记）
- `docs/analysis/2026-08-04-control-gap-survey.md`（cron-editor 相关行双向链接补注）
- `docs/backlog/cron-scheduling-roadmap.md`（Phase Status C1 行随 plan 生命周期翻转）
- `docs/logs/2026/10-07.md`（执行记录）
- 工作区既有 4 个 M 登记文件 + untracked 的 design.md / example.json（一并入库，不改动登记语义）

### Out Of Scope

- `packages/`、`apps/` 下任何代码变更
- nop-entropy 仓库的任何变更（C2/C3 的 scope）
- survey 其余候选组件、L7.8 行中其他组件的记账

## Failure Paths

不适用（纯文档与数据交付；无运行时行为）。向量与实现语义的冲突在 C2/C4 消费时按「向量是唯一契约」规则处理：实现错则修实现，向量错（日历事实核验失误）则修向量并在对应 plan 记录勘误。

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**不适用——纯文档与测试数据交付，roadmap C1 明示「消费测试在 C2/C4 落地」**。执行期仍做两项程序化自证（非入库测试）：① 全部基线节向量用 `_tmp` 一次性参考实现交叉验证通过；② 涉及星期/闰年/月末的期望日期全部经 `date` CLI 事实核验。

## Execution Plan

### Phase 1 - 黄金向量集 golden-vectors.json

Status: completed
Targets: `docs/components/cron-editor/golden-vectors.json`

- Item Types: `Proof`（向量本体即后续 C2/C4 的 Proof 输入）

- [x] 设计向量 schema：`meta`（版本/权威副本声明/消费方/UTC 口径与 `expectNext` 迭代约定/`[]` 表示序列终止/**count 纪元规则：计数窗口自 `range.start` 起算，start 缺省回退引擎纪元 1970-01-01T00:00Z**）、`nextRun`（expr/tz/after/expectNext）、`diagnostics`（expr/tsCode/javaValid，impossible 条目附 `javaNextRun: "runaway-error"` 不对称注记）、`valueDiagnostics`（cron/repeat?/range?/tsCode——承载 `repeatAnchorMissing`/`rangeConflict` 等值对象级诊断，javaValid 仅对 cron 串求值）、`repeat`（cron/repeat/after/expectNext）、`range`（cron/range/after/expectNext）六节
- [x] 附「诊断码 → 向量 id」覆盖映射表（plan 内或 dev log），使 design §4 全部 10 码的正命中逐条可观测（含 5 段输入归入 `unsupportedToken` 的归类确认）
- [x] 基础 6 段向量（≥14 条）：严格递增序列、种子命中后 +1s 语义、日/周 AND 语义（周五 13 号）、0/7 周日等价、月名/周名大小写不敏感、连续空格合法、`?` 等价 `*`、跨年/跨月边界、闰年 `2 29`
- [x] 动态日向量（≥15 条，C2/C4 Proof）：`L`、`L-n`、`nW`（含 8 月 1 日周六 → 8 月 3 日不跨月回退）、`LW`（含 2026-02 → 02-27、2028-02 闰年 → 02-29、2029-03 → 03-30 三组月末邻接）、`d#N`（含 `MON#5` 2 月缺第 5 个周一 → 跨到 3 月 30 日）、`dL`、周位单独 `L`（= 周六）
- [x] 可选年段向量（≥5 条）：单年、区间 `a-b`、步进 `a/n`、年段 + 闰日组合、越界年（2100/1899）入诊断节
- [x] `repeat` 锚点向量（≥5 条）：day/week 双单位、every=1、锚点晚于种子的前段过滤、跨月取模边界（01-30 锚 → 02-01）
- [x] `range` 截断向量（≥6 条）：start/end/count、**count 绝对语义判别**（count 按绝对触发序计数，不随 seed 重置——seed 从第 2 次触发前取序列时仅剩 1 条）、`[]` 终止约定、repeat+range 组合
- [x] 诊断负例向量（≥22 条）：design §4 全部 10 个诊断码各有正命中（表达式级 8 码落 `diagnostics` 节，值对象级 `repeatAnchorMissing`/`rangeConflict` 落 `valueDiagnostics` 节）；含 `0 0 0 30 2 ?` 永不匹配（tsCode=`impossible`、javaValid=true、javaNextRun=runaway 的两端不对称注记）、8 段输入、`@daily` 别名、`#` 用错字段、非法月名/年 token
- [x] 程序化自证：`_tmp/cron-golden-check/` 一次性参考实现跑基线节全绿 + `node -e "JSON.parse"` 语法校验（脚本不入库，验证后删除）

Exit Criteria:

- [x] `docs/components/cron-editor/golden-vectors.json` 存在且 JSON 语法有效，六节齐备，向量总量 ≥60 且每条带 `id` 与 `category`
- [x] 全部 nextRun 期望时刻经 `date` CLI 核验星期/月末/闰年事实（执行记录留存于当日 dev log）；基线节（基础 6 段）在 `_tmp` 参考实现下全部通过；「诊断码 → 向量 id」映射表覆盖 design §4 全部 10 码
- [x] 文件体积 <40KB（docs 体积红线）

### Phase 2 - 治理记账与登记入库

Status: completed
Targets: `docs/backlog/missing-components-and-designer-roadmap.md`、`docs/analysis/2026-08-04-control-gap-survey.md`、`docs/backlog/cron-scheduling-roadmap.md`、`docs/logs/2026/10-07.md`

- Item Types: `Fix`（需求门/链接债）+ `Follow-up`（无）

- [x] L7.8 行就地翻转：cron-editor 由「维持 survey-owned」改为「demand 已确认（2026-10-06），升级执行中」，附 roadmap 链接；行内其余组件（org-tree/mind-map/excel-importer 等）记账不动
- [x] survey 双向链接：§E 候选表 cron-editor 行（行 113）、Tier 2 列表上下文（行 176）、「附：候选统计」下「高价值跨组复现」条目（行 203）三处补 roadmap/design 指针（就地注记，不改写历史结论）
- [x] 复核 untracked 的 design.md/example.json 与 4 个 M 登记文件语义一致后随本计划入库（不改动登记内容）
- [x] `docs/logs/2026/10-07.md` 记录 C1 交付与向量自证结果

Exit Criteria:

- [x] L7.8 行、survey 三处链接、dev log 均已落盘；`git status` 中本计划 scope 内文件全部就位（新增或修改）
- [x] roadmap Phase Status C1 行在 closure audit 通过后随收口翻为 `done`（draft review 通过时先翻 `planned`）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，2 轮）
- Verdict: `pass-with-minors`（Round 1 fail 1 Major → 修订后 Round 2 pass-with-minors，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R1 Major-1 值对象级诊断码装不进表达式级 schema → 增第六节 `valueDiagnostics` + 10 码覆盖映射表执行项（Exit/Closure 同步）；R1 Minor-1~4（survey §7 引用错、baseline 文件计数、Goals 核验口径、count 纪元缺省）全部修订；R2 残留 2 Minor（行 14「五处」措辞、行 18「共 7 个」计数口径）随执行期修订

## Closure Gates

> 纯文档与数据交付（无任何代码变更），按 guide 规则删除 `pnpm typecheck/build/lint/test` 条目；程序化自证已列入 Phase 1 执行项与 Exit Criteria。

- [x] 向量集六节齐备、全部类别覆盖、基线节参考实现交叉验证通过、日历事实核验完成、10 码映射齐
- [x] L7.8 翻转与 survey 双向链接落盘，登记文件（design/example/4 M 文件/roadmap/vector）全部入库
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope 项
- [x] owner docs 已同步（survey/backlog/design 状态行与 live 一致；本 roadmap C1 行翻 `done`）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无——执行中未推翻任何计划内条目；RP-04/RP-07 语义修正属向量撰写期决策，已记 dev log）

## Non-Blocking Follow-ups

-（无）

## Closure

Status Note: 向量集 91 条（六节 + 10 码映射）经参考实现 31/31 交叉验证、结构自检与 date CLI 事实核验；治理记账（L7.8 翻转 + survey 三处双向链接 + 登记入库）落盘。closure audit 三轮（R1 issues：1B+2Mj+4Mn → R2 issues：1Mj+1Mn → R3 approved）全部发现修复并经独立子 agent live 实测确认，故本计划可关闭；roadmap C1 随本收口翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，3 轮）
- Evidence: R1 issues（B-1 NR-D11/12 月段笔误、Mj-1 NR-D18 LW 违背 wRule、Mj-2 survey §E 表格破坏 + 4 Minor）→ R2 issues（fieldCountRule 落点漂移 + dev log 引用路径）→ R3 approved（全修复 live 实测：91 条/六节/10 码纯映射/31 FAIL=0 复跑/修复无回退）；收口义务（roadmap 双表翻转、\_tmp 删除、本节回填）与审计通过并入同一收口 commit。审计员存档备注：`_tmp` 校验脚本 count 类 exhausted 断言为恒真空转，RG-04/06/07 终止期望由审计员独立手推确认；C2/C4 消费测试需真正覆盖 count 耗尽。

Follow-up:

- no remaining plan-owned work（C2/C4 消费测试按上存档备注自行覆盖 count 耗尽）
