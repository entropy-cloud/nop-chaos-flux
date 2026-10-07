# 542 Cron 轨道 C7 跨仓对账与收口（向量一致性审计 + 宿主映射示例 + UI 覆盖审计 + 视觉复核 + 两端全绿）

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/cron-scheduling-roadmap.md`（工作项 C7 + Cross-Cutting 测试矩阵 L5/L6）、`docs/components/cron-editor/design.md`（§9 宿主映射契约 / §12 未决项）
> Related: plan 535（C1 向量）、536（C2 Java 语法）、537（C3 Java 锚点）、539（C4 引擎）、540（C5 v1）、541（C6 v2）

## Purpose

cron 轨道收口工作项：Java 与 TS 两端向量一致性审计、宿主映射示例（CronScheduleValue → nop `TriggerSpec` 拆列）、完整 UI 测试覆盖审计（对照 roadmap Cross-Cutting 矩阵 L1–L6）、L5 视觉复核、两端测试全绿复验，并回写 roadmap / design.md 未决项 / 日志。本 plan 关闭即 cron 轨道全部工作项收口。

## Current Baseline

- 两端黄金向量副本今日（2026-10-07）实测 sha256 一致（`633e2a09…`）：flux 权威副本 `docs/components/cron-editor/golden-vectors.json` 与 nop-entropy 副本 `nop-job/nop-job-core/src/test/resources/cron/golden-vectors.json`。
- nop-entropy 侧 C2/C3 已提交（`418414a355` 语法扩展 + `a00269433a` 锚点字段），`TestCronGoldenVectors`（74 用例）与 `TestAnchorRepeatTrigger`（17 用例）在库；C2/C3 收口时 core 122/122、139/139 全绿——C7 做独立 fresh 复验（非引用旧记录）。
- flux 侧 C4–C5 已收口；C6 交付面已 landing（plan 541 三 Phase completed、计数如右：引擎向量套件 106/106、form 包 L2 1090/1090、cron-editor e2e 5/5），closure audit 未做、roadmap C6=`planned`——**本 plan 收口前置：plan 541 closure audit 通过且 roadmap C6 翻 `done`**（见 Closure Gates 首条）。
- **L5 视觉复核未做**：`tests/e2e/` 无 cron-editor visual spec；roadmap 矩阵 L5 行落位 C7。
- **宿主映射示例未做**：design.md §9 有映射契约表（cron→cronExpr、repeat→repeatAnchor 三元组、range→min/maxScheduleTime/maxExecutionCount），但无 worked example；§12 残余「锚点字段暂无 NopJobSchedule 实体/ORM 列，宿主拆列归 C7 宿主映射示例工作面」。
- **UI 覆盖审计未做**：roadmap Cross-Cutting 矩阵六层（L1–L6）无逐层落位核对记录。
- flux-guide 全文无 cron-editor 条目（grep 零命中）；组件用法目前只散见 design.md 与 quick-reference。

## Goals

- **跨仓对账审计**：向量哈希对账（复验 + 落审计记录）、诊断码两端口径对账（10 码 + impossible↔runaway 不对称注记复核）、Java `mvnw test` 独立复验全绿、TS 向量套件复验全绿；审计结论可观测（命令 + 输出计数落 dev log / plan 证据）。
- **宿主映射示例**：design.md §9 增「宿主装配示例」worked example（一个具体 CronScheduleValue JSON → TriggerSpec 各列值的逐步拆解，含 epoch ms 换算与 anchor 回退 range.start 装配语义），§12 残余项同步闭环表述。
- **UI 覆盖审计**：对照 roadmap 矩阵 L1–L6 逐层核对落位证据（文件/测试名/计数），缺口如实记录或当场补齐；结论落 dev log。
- **L5 视觉复核**：新建 `tests/e2e/cron-editor-visual.spec.ts`（沿 ai-bubble-visual 先例：程序化断言为 pass/fail 依据——档位条/分段/预览/区块的可见性与几何无溢出，截图仅佐证、写 `tests/e2e/artifacts/`（gitignore，不入库）），覆盖档位面板、分段编辑、预览与区块布局四块。
- **两端测试全绿**：`pnpm test` / `pnpm test:e2e`（flux）+ `mvnw test`（nop-job-core）fresh 复验；回写 roadmap C7 `done`、design.md §12、dev log。

## Non-Goals

- 不改任何引擎/渲染器行为语义（发现不一致时：语法以 Java 为准修 TS、向量勘误走 C1 惯例双仓同步——若触发，属本 plan 内 Fix）。
- 不做 timezone 字段、minDate/maxDate 吸附（design §12 后续候选，未排期）。
- 不做设计器属性面板适配（§12 后续候选，未列入 C7 scope）。
- 不新建 flux-guide 章节（组件用法以 design.md + quick-reference 为准；guide 登记留后续候选）。

## Scope

### In Scope

- `docs/components/cron-editor/design.md`（§9 宿主装配示例 + §12 未决项回写）
- `docs/backlog/cron-scheduling-roadmap.md`（C7 状态翻转 + 覆盖审计结论指针）
- `tests/e2e/cron-editor-visual.spec.ts`（新建）
- `docs/logs/2026/10-0*.md`（审计证据与收口段）
- 本 plan 文件
- 复验命令（只读执行）：`shasum -a 256`、`./mvnw -pl nop-job/nop-job-core test`（nop-entropy 仓）、`pnpm test` / `pnpm test:e2e` / `pnpm check`（flux 仓）

### Out Of Scope

- nop-entropy 仓库任何代码/文档变更（C2/C3 已收口；若审计发现 Java 侧缺陷，回本 roadmap 立新工作项，不在本 plan 内修 Java。**唯一例外**：vector-hash-mismatch contingency 时按 C1 惯例同步 `nop-job/nop-job-core/src/test/resources/cron/golden-vectors.json` 测试副本）。
- 新 renderer 功能、引擎语义变更、timezone。

## Failure Paths

| 场景                     | 触发                     | 行为                                                                                                               | 可重试 | 用户可见            |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------ | ------------------- |
| vector-hash-mismatch     | 两端 sha256 不一致       | 审计定性：以 flux 权威副本为准同步 nop 副本（C1 惯例），Java 向量套件复跑，结论落 dev log；hash 恢复一致后才可收口 | 是     | dev log 记录        |
| vector-semantic-mismatch | 同向量两端结果序列不一致 | 语法以 Java 为准修 TS（roadmap 对账规则），判别测试先红后绿；修不动则升级为 roadmap 新工作项                       | 是     | dev log + plan 记录 |
| java-test-red            | `mvnw test` 复验有挂     | 先定性是否环境性（JDK/依赖）；非环境性 → Java 侧缺陷，回 roadmap 立项，本 plan 记录不得关闭该缺口                  | —      | dev log 记录        |
| visual-assert-red        | L5 程序化断言失败        | 属 flux 渲染层布局缺陷 → 本 plan 内 Fix（renderer 样式修正 + 判别断言转绿）                                        | 是     | e2e 红              |
| coverage-audit-gap       | 矩阵六层某层无落位证据   | 轻缺口当场补（如补一条 L2 用例）；重缺口（整层缺失）如实记录并入 roadmap 后继，不得虚报覆盖                        | —      | dev log 记录        |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap C7 明示；L5 新 spec 程序化断言为 pass/fail 依据，两端复验全绿为收口硬门禁）。

## Execution Plan

### Phase 1 - 跨仓向量与引擎对账

Status: completed
Targets: 双仓只读复验 + dev log 证据

- Item Types: `Proof`（对账复验）+ `Fix`（对账不一致时按 Failure Paths 修 TS，contingency）

- [x] 向量哈希对账：`shasum -a 256` 双副本一致（复验并记录 hash 值）
- [x] 诊断码口径对账：golden-vectors `diagnosticCoverage` 10 码 ↔ flux `DIAGNOSTIC_TEXT_KEYS`/i18n 10 键 ↔ design §4 码表，逐一核对；`impossible`（TS 静态）↔ Java 运行期 runaway 的不对称注记复核
- [x] Java 独立复验：nop-entropy `./mvnw -pl nop-job/nop-job-core test` 全绿（记录用例计数）
- [x] TS 向量复验：flux cron 引擎套件全绿（记录计数）

Exit Criteria:

- [x] 四项对账全部通过且证据（hash 值 / mvnw 计数 / vitest 计数）落 dev log；任一失败走 Failure Paths 且收敛后才可进 Phase 2。执行结果：① 双副本 sha256 一致 `633e2a0944f85c71caf5b357187c27d66de8cbce34dbfac2320825f6bae1c4cd`；② 10 码三面对账全等（fieldCount/badToken/outOfRange/invertedRange/stepInvalid/questionMark/unsupportedToken/impossible/repeatAnchorMissing/rangeConflict），asymmetry 注记在 vectors meta（tsCode=impossible 且 javaValid=true：Java 构造期通过、运行期 runaway，编辑器前置拦截）；③ Java 首跑 `mvnw -pl nop-job/nop-job-core test`（无 `-am`）BUILD FAILURE 16 errors——`NoSuchMethod ITriggerSpec.getRepeatAnchorEvery()`：~/.m2 存量 nop-job-api 构建产物早于 C3，属复验调用法（缺 `-am`）非代码缺陷；带 `-am` 重跑 **139/139 BUILD SUCCESS**（74 向量 + 17 锚点 + 48 既有）；④ TS 引擎套件 **106/106**（4 文件）。

### Phase 2 - 宿主映射示例与 UI 覆盖审计

Status: completed
Targets: `docs/components/cron-editor/design.md` §9/§12、dev log

- Item Types: `Decision`（示例落点与口径）+ `Proof`（覆盖审计）

- [x] design.md §9「宿主装配示例」：具体值对象（含 repeat+range 组合与 anchor 缺省回退案例）→ TriggerSpec 各列值 worked example（epoch ms 换算、count 语义、不拆列的存量单列宿主只读 `value.cron` 说明）。**Decision 点：YYYY-MM-DD → epoch ms 换算基准时区**（UTC 零点 / JVM 默认——示例须写明所选约定及与 Java 引擎口径的一致性理由，并在 §9 就地注记，防与 §12 时区风险条目漂移）。**裁决：JVM 默认时区**（与 cron 引擎触发日历同口径）；含端点边界（`LimitTimeTrigger` `time>max` 才终止，等于仍触发）→ end 换算当日 23:59:59.999；epoch 数值经 python 事实核验
- [x] design.md §12 残余项闭环表述（锚点无实体列 → 宿主拆列示例已落 §9；「视觉复核基线/宿主集成示例」两候选项随 C7 出清）
- [x] UI 覆盖审计：roadmap 矩阵 L1–L6 逐层落位核对（L1 引擎套件 / L2 组件 C5+C6 / L3 守卫 / L4 e2e / L5 本 plan Phase 3 / L6 Java），每层落文件名+计数；缺口按 Failure Paths 处置

Exit Criteria:

- [x] §9 示例可独立照做（读者不读源码即可完成拆列）；§12 无「归 C7」悬空指称
- [x] 覆盖审计表六层全落位或缺口语径诚实；审计结论落 dev log。执行结果（六层全落位，零缺口）：L1 `src/cron/__tests__/` 4 文件 106/106；L2 cron-editor 家族 32/32（双模式编辑与切换往返、档位派生与回编译、区块交互与互斥、预设、预览递增、required/disabled/readOnly、句柄、marker/data-slot、a11y、example.json 零诊断；诊断文案双语由 `check:i18n-keys` 键位对等守卫 + 断言 locale 无关约定覆盖）；L3 route-matrix 42/42 + definition contracts（v2 契约断言）+ schema-prop-coverage（check 链）；L4 `tests/e2e/cron-editor.spec.ts` 5/5 + coverage manifest 登记 + 键盘可达；L5 `tests/e2e/cron-editor-visual.spec.ts` 4/4（本 plan 新建）；L6 `mvnw -pl nop-job/nop-job-core -am test` 139/139（74 向量 + 17 锚点 + 48 既有）

### Phase 3 - L5 视觉复核与两端全绿收口

Status: completed
Targets: `tests/e2e/cron-editor-visual.spec.ts`、roadmap、plan 收口

- Item Types: `Proof`（visual spec）+ `Fix`（视觉复核发现的红项）

- [x] `cron-editor-visual.spec.ts`：四场景程序化断言（①档位条五档可见且单行不溢出、radiogroup 几何；②分段编辑 7 输入可见对齐；③预览列表渲染与严格递增复核；④向导+区块组合布局 fieldset/legend 可见、无水平溢出）；截图写 `tests/e2e/artifacts/`（gitignore）仅佐证
- [x] 视觉复核发现的布局红项当场修复并转绿（如有）——首跑 4/4 全绿 + 截图人审（区块/预览/echo 布局完整），零红项
- [x] flux 全量门禁 fresh 复验：`pnpm typecheck` / `pnpm build` / `pnpm lint` / `pnpm test` / `pnpm test:e2e`（失败集合不扩大）/ `pnpm check`（零新增红）。**注记：本项是 roadmap C7「两端测试全绿」交付物的 Proof 载体，与 Closure Gates 六门禁为同一次运行同勾，非 Minimum Rule 18 boilerplate 重复**。执行结果：typecheck/build/lint 42/42、test 78/78、check exit 0；全量 e2e 两轮——run1 1714 passed + 6 failed（基线 4 + map-demo/gantt 两个新面孔，均带改动单跑 21/21 与 6/6 全过 → 负载 flake）+ 7 did not run（覆盖有洞）；**run2 复验 1722 passed + 4 failed（恰为 C5 基线四项）+ 1 flaky（performance-table 重试自愈）+ 46 skipped，零未执行**（4+1+46+1722=1773 全量对账）；map-demo/gantt 在 run2 自然通过，独立佐证 flake 定性
- [x] 回写：design.md §12、dev log 收口段、plan 激活与状态面已落盘；roadmap C7 激活翻面（`todo→planned` + Plan 列 542）已随 draft review 落盘；**C7 `planned→done`（双表）受 closure audit 门控，随收口 commit 落盘**（closure audit 已于 2026-10-07 通过，见 Closure Audit Evidence）

Exit Criteria:

- [x] visual spec 全绿且断言全程序化（截图不入库）
- [x] 两端 fresh 复验全绿（flux 六门禁 + Java mvnw——Java 复验沿用 Phase 1 结果，nop-entropy 本 plan 内零变更）；全量 e2e 失败集合与 plan 541 收口基线一致（run2 恰为基线四项）
- [x] roadmap / design.md / dev log / plan 四处回写一致（同 commit 落盘）

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，2 轮）
- Verdict: `pass-with-minors`（Round 1 fail 1 Major + 7 Minor → 修订后 Round 2 pass-with-minors，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R1 M-1 Baseline「C4–C6 已收口」与实况不符且缺 541 收口顺序门 → Baseline 改「C4–C5 已收口、C6 landing 未收口」+ Closure Gates 增前置顺序门；m-2 Out Of Scope 与 hash-mismatch 处置矛盾 → 补唯一例外括注；m-3 全量门禁三处重复 → Phase 3 项加「C7 交付物 Proof 载体、与 Closure Gates 同一次运行同勾」注记；m-4 Phase 3 Exit 引用 Java mvnw 无对应执行项 → 括注沿用 Phase 1 结果；m-5 epoch ms 时区基准未预裁决 → Phase 2 显式 Decision 点；m-6 roadmap 激活翻面未列 → 随本 record 落盘（C7 `todo→planned` + Plan 列 542）；m-7 Phase 1 Item Types 补 contingency `Fix`；R2 残留 n-1（激活翻面为硬约束）已随本 record 执行。

## Closure Gates

- [x] **前置顺序门：plan 541 closure audit 已通过且 roadmap C6 已翻 `done`**（plan 541 已于 2026-10-07 收口提交，roadmap C6 双表 done）
- [x] 所有 in-scope 对账/示例/审计/视觉复核工作已收敛（Failure Paths 无未处置项；两条执行期发现——mvnw 调用法、run1 负载 flake——均当场解决并记录）
- [x] 行为/契约结果已达成（六层矩阵落位 + 两端全绿 + 宿主示例可照做）
- [x] 必要 focused verification 已完成（visual spec 4/4 + Java 139/139 + TS 106/106 + e2e run2 基线一致）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract gap
- [x] 受影响的 owner docs 已同步（design.md §9/§12、roadmap、dev log）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`（42/42）
- [x] `pnpm build`（42/42）
- [x] `pnpm lint`（42/42）
- [x] `pnpm test`（78/78 任务）
- [x] `pnpm test:e2e`（run2：1722 passed + 4 failed 恰为 C5 基线四项 + 1 flaky + 46 skipped 零未执行）
- [x] `pnpm check`（exit 0，零新增红）

## Deferred But Adjudicated

（无——执行中如推翻条目，当场落本节；两条执行期发现均为当场解决的环境/调用事项，非 deferred）

## Non-Blocking Follow-ups

-（无）

## Closure

Status Note: 2026-10-07 收口，cron 轨道 C1–C7 全部 done、轨道收官。C7 交付面：跨仓向量对账（哈希一致 + 10 码三面对账 + Java 139/139 + TS 106/106）、宿主装配示例（design §9，epoch ms JVM 默认时区 + 含端点边界两点裁决）、UI 覆盖审计六层全落位零缺口、L5 视觉复核 spec（`tests/e2e/cron-editor-visual.spec.ts` 4/4 程序化断言）、两端全绿复验（flux 六门禁 + e2e run2 恰为基线四项失败、Java `-am` 139/139）。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose）
- Evidence: R1 `issues`——3 findings 全部为文本一致性类、实质面（代码/测试/文档交付物）零缺陷：F-1（Major）Phase 3 Status 漏翻 completed；F-2（Minor）回写项断言了 audit 时点不存在的 roadmap done 翻面（改写为已落盘/门控两腿，翻面随收口 commit 落盘）；F-3（Minor）dev log「全部 done」过早收官声称（改为随翻面成立口径）。审计员独立核算 §9 epoch ms 数值（东八区手算吻合）、对照 `LimitTimeTrigger.java` 逐字核实含端点边界、复跑 visual spec 4/4、route-matrix 42/42、cron e2e 5/5、form 1093/1093、`pnpm check` exit 0。三处文本修复后进入收口（无需重跑验证）。

Follow-up:

- 无 remaining plan-owned work。cron 轨道 C1–C7 收官；design §12 仍未排期候选（设计器属性面板适配、timezone 字段）为后续独立决策，非本 plan 债务。
