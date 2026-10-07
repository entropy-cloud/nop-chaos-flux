# 537 Cron 轨道 C3 nop Java 锚点周期与重复范围字段

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/cron-scheduling-roadmap.md`（工作项 C3）、`docs/components/cron-editor/design.md` §9（宿主映射契约：锚点字段定名由 C3 落定后回写）、`docs/components/cron-editor/golden-vectors.json`（repeat 7 条 + range 7 条契约向量）
> Related: plan 535（C1 向量）、plan 536（C2 语法扩展，已完成）；本仓：`/Users/abc/app/nop-entropy-wt/nop-entropy-master`（master）

## Purpose

给 nop 调度引擎补齐 cron 字符串表达不了的「锚点周期」（每 N 天/周自锚点日起取模触发）与「重复范围」（start/end/count）的触发链路承接：`TriggerSpec` 增加锚点字段，新增锚点过滤触发装饰器接入 `TriggerBuilder`，并以 C1 黄金向量的 repeat/range 节为契约做全链路 next-fire 测试；同时核对范围三字段（`minScheduleTime`/`maxScheduleTime`/`maxExecutionCount`）实体→spec→触发链的端到端暴露。

## Current Baseline

- nop-entropy master（工作区脏度持续漂移，提交前逐一 staging 复核）；C2 已交付（418414a355）。
- `TriggerSpec`（nop-job-api）：已有 `cronExpr`/`repeatInterval`/`maxExecutionCount`/`minScheduleTime`/`maxScheduleTime` 等；**无锚点字段**。
- 触发链（`TriggerBuilder.buildTrigger`）：cron → `CronTrigger` → `LimitCountTrigger` → `LimitTimeTrigger` → `CheckActiveTrigger` → PauseCalendar → misfire；装饰器均实现 `ITrigger.nextScheduleTime(after, ctx)`，**-1 = 调度终止**（`LimitTimeTrigger` 先例）。
- **范围三字段已接线**（核对结论，非缺口）：`TriggerSpecHelper.toTriggerSpec`（nop-job-dao）把实体 `minScheduleTime`/`maxScheduleTime`/`maxExecutionCount` 映射进 spec；`toEvalContext` 暴露给触发链；ORM `_app.orm.xml` 三列在位；`LocalJobScheduler` 在受理触发后 `fireCount++`（行 349）——`LimitCountTrigger` 的 count 语义链路完整。C3 以端到端测试证明之。
- 契约向量：repeat 7 条（day/week 双单位、锚点前过滤、跨月取模、anchor 回退 range.start、every=1 无过滤）+ range 7 条（start/end/count、count 绝对语义、1970 纪元、组合、`[]` 终止）在 `src/test/resources/cron/golden-vectors.json`（C2 已落）。
- repeat/range 语义权威：向量 `meta.conventions`（引擎时区日历日；day=整日差 mod every；week=floor(整日差/7) mod every；fire ≥ anchor；count 纪元 = range.start ?? 1970-01-01）。
- design.md §9 锚点行写明「字段定名由 nop 侧工作项 C3 落定」、§12 例外注记「Java 侧字段定名待 C3 落定后回写本节」——本计划落定并回写。

## Goals

- `TriggerSpec` 新增锚点字段：`repeatAnchorEvery`（int ≥ 1）、`repeatAnchorUnit`（`"day"`|`"week"`）、`repeatAnchorDate`（`YYYY-MM-DD`，字符串保日期语义）；**裁定：接口扩展**——同名 getter 同步声明到 `ITriggerSpec`（`TriggerBuilder` 按接口读字段；`TriggerSpec` 为全仓唯一实现者，已核实）。
- 新增 `AnchorRepeatTrigger` 装饰器（nop-job-core）：对内层触发时刻按锚点取模过滤，不匹配则向后扫描；扫描上限 36600 次（≈100 年日频）后返回 -1（触发层终止约定，与 `LimitTimeTrigger` 一致）。
- `TriggerBuilder` 接线：cron 触发器之上、LimitCount/LimitTime 之内插入锚点过滤（向量 RG-06 的 repeat→count 序）；锚点字段与非 cron 触发器组合 → 构建期 NopException（拒绝而非静默忽略）；every/unit/date 非法 → NopException。
- 全链路测试消费 repeat/range 向量（经 `TriggerBuilder.buildTrigger` + eval context 桩，fireCount 按调度器语义递增）+ 范围三字段实体接线端到端测试。
- design.md §9/§12 锚点字段定名回写（flux 侧 owner doc）。

## Non-Goals

- 不给 `NopJobSchedule` 实体/ORM 增加锚点列（roadmap C3 第 2 条仅点名范围三字段的实体暴露核对；锚点字段的宿主持久化是宿主/ORM 后续工作，design §9 映射契约已声明映射责任在宿主层）。
- 不改 `LocalJobScheduler`/`nop-job-coordinator` 调度循环（fireCount 递增与 misfire 语义不动）。
- 不动 `CronExpression`（C2 已交付）；不做 TS 侧（C4）。
- `timezone` 字段不引入（design §12 记录的后续项；锚点日期一律引擎默认时区日历日）。

## Scope

### In Scope

- `nop-job/nop-job-api/src/main/java/io/nop/job/api/spec/TriggerSpec.java`（3 个锚点字段）
- `nop-job/nop-job-api/src/main/java/io/nop/job/api/spec/ITriggerSpec.java`（3 个 getter 声明，接口扩展裁定）
- `nop-job/nop-job-core/src/main/java/io/nop/job/core/trigger/AnchorRepeatTrigger.java`（新建）
- `nop-job/nop-job-core/src/main/java/io/nop/job/core/trigger/TriggerBuilder.java`（接线 + 参数校验）
- `nop-job/nop-job-core/src/test/java/io/nop/job/core/trigger/TestAnchorRepeatTrigger.java`（新建，向量消费 + 手写判别用例）
- `nop-job/nop-job-dao/src/test/java/io/nop/job/dao/helper/TestTriggerSpecRangeWiring.java`（新建，范围三字段实体接线端到端）
- flux 仓：`docs/components/cron-editor/design.md`（§9 字段定名回写 + §12 例外注记闭环）、`docs/backlog/cron-scheduling-roadmap.md`（C3 状态）、`docs/logs/`、`docs/plans/537-...`

### Out Of Scope

- ORM `_app.orm.xml`/`_NopJobSchedule` 变更（Non-Goals 首条）
- nop-job-service/web/local/coordinator 行为变更
- flux 仓代码（renderer/引擎属 C4-C6）

## Failure Paths

| 场景                 | 触发                                                                               | 行为                                                                                               | 可重试 | 用户可见           |
| -------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------ | ------------------ |
| anchor-invalid       | `repeatAnchorEvery ≤ 0`、unit 非 day/week、日期非 YYYY-MM-DD、anchor 与 every 缺一 | `TriggerBuilder.buildTrigger` 抛 NopException（参数校验）                                          | 是     | 任务注册/构建报错  |
| anchor-non-cron      | 锚点字段与 repeatInterval/once 触发器组合                                          | 构建期 NopException（拒绝静默忽略）                                                                | 是     | 同上               |
| anchor-never-matches | 锚点过滤后无触发时刻（如 cron 周位与锚点 weekday 恒错位 100 年）                   | 扫描上限内无命中 → `nextScheduleTime` 返回 -1（调度终止，触发层约定；引擎层 runaway 异常语义不变） | 是     | 任务无下次触发时间 |
| range-trio-wiring    | 实体列 → spec → 触发链                                                             | 端到端测试证明（既有接线，无行为变更）                                                             | —      | —                  |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap C3 明示「全链路 next-fire 测试」）。Proof 先行形态：Phase 1 先落 TriggerSpec/ITriggerSpec 数据面 + 全部契约测试（此时装饰器未建、TriggerBuilder 对接口新 getter 无消费 → repeat 节必挂），Phase 2 实现 → 全绿。**fireCount 桩播种规则（count 绝对语义的关键）**：桩模拟任务自 countEpoch（`range.start ?? 1970-01-01`）存活——fireCount 初值 = 装饰链在 `[countEpoch, after)` 内**受理**的 fire 次数（暖机循环只计数不比对），受理后逐次 +1（对齐 `LocalJobScheduler:349`）；`isScheduleCompleted()` 恒 false（防 CheckActiveTrigger 静默截断）。据此 RG-04 种子=1、RG-06 种子=0（anchor 过滤后 1970 以来受理 0 次）、RG-07 种子≈20454。

## Execution Plan

### Phase 1 - Proof：契约测试落盘（先于装饰器实现）

Status: completed
Targets: `nop-job/nop-job-core/src/test/`、`nop-job/nop-job-dao/src/test/`、`TriggerSpec.java`、`ITriggerSpec.java`

- Item Types: `Proof` + `Fix`（无 live defect，纯契约缺口）

- [x] `TriggerSpec` 增 3 个锚点字段（纯数据 + getter/setter，`@DataBean` 风格随既有字段）+ `ITriggerSpec` 增 3 个 getter 声明（接口扩展裁定，TriggerBuilder 按接口读）
- [x] 新建 `TestAnchorRepeatTrigger`：JVM 默认时区钉 UTC（@BeforeAll 设 @AfterAll 还原）；eval context 桩（fireCount 可变，每次受理后 +1，对齐 `LocalJobScheduler` 行 349 语义）；经 `TriggerBuilder.buildTrigger` 全链路消费：
  - repeat 节 7 条：RP-06 的 anchor 缺省回退发生在**测试装配层**（向量 → TriggerSpec 映射时以 `range.start` 填 `repeatAnchorDate`，与 design §9「映射责任在宿主」一致；TriggerBuilder 保持严格不回退）；期望序逐条比对 + `expectExhaustedAfter` 断言（如向量含该字段）
  - range 节 7 条：范围三元组经 **eval context 桩**（`range.start` → `minScheduleTime` 当地 0 点、`range.end` → `maxScheduleTime` 当日末毫秒、`range.count` → `maxExecutionCount`——LimitCount/LimitTime 从 context 读值，对齐 `TriggerSpecHelper.toEvalContext` 生产模型，spec 不承载）；`expectNext: []` → 断言 -1；`expectExhaustedAfter` → 再取断言 -1
  - 手写判别用例 2 条：① 非法组合（anchor + repeatInterval 触发器 / unit 非法 / every=0）断言 NopException；② 锚点恒错位（cron `? * MON` + **day/7 + 周日锚点**——周一差值恒 ≡1 (mod 7) 永不命中；week 锚点在周奇偶语义下会命中，不可用）断言 -1（钉扫描上限语义）
- [x] 范围三字段实体接线端到端用例（**落 `nop-job-dao/src/test/`**——`NopJobSchedule` 实体与 `TriggerSpecHelper` 在 dao，core 不依赖 dao）：构造 `NopJobSchedule` 实体（三列赋值）→ `TriggerSpecHelper.toTriggerSpec` → `buildTrigger` → 断言 next-fire 序列尊重范围（该用例验证既有接线，基线预期即绿）
- [x] 跑测试记录基线（逐向量预期）：repeat 节 7 条全挂（无锚点过滤；含 RP-06）；range 节 RG-01/02/03/04/05/07 预期**过**（经既有 LimitCount/LimitTime + 播种桩即可表达），RG-06 预期**挂**（含 repeat 过滤）；手写判别用例①非法组合**挂**（TriggerBuilder 尚无校验不抛）、②恒错位**挂**；实体接线用例过。逐条记录实跑与预期差异，无「意外挂」

Exit Criteria:

- [x] 测试可编译运行；实跑失败清单与逐向量预期一致（repeat 7 + RG-06 + 手写判别全部挂；RG-01~05/07 过），无意外挂。实跑证据：TestAnchorRepeatTrigger 17 用例 11 挂/6 过（手写「非法组合」实现为两个 @Test 方法，基线挂数 11 与逐向量预期语义一致），dao 侧 TestTriggerSpecRangeWiring 过

### Phase 2 - 实现：AnchorRepeatTrigger 与接线

Status: completed
Targets: `AnchorRepeatTrigger.java`、`TriggerBuilder.java`

- Item Types: `Fix`（契约缺口）

- [x] `AnchorRepeatTrigger`：内层 ITrigger 包装；`nextScheduleTime` 循环过滤（不匹配 → 以当前命中为新种子再取内层）；`matchesAnchor` 按向量 conventions（fire 当地日 ≥ anchor 且 day: diff%every==0 / week: floorDiv(diff,7)%every==0）；扫描上限 36600 → -1；**anchor 日期在构造器按引擎默认时区解析一次**（LocalDate 持有），校验失败由 TriggerBuilder 前置抛出
- [x] `TriggerBuilder` 接线：cron 触发器且锚点字段齐备时 `trigger = new AnchorRepeatTrigger(trigger)`（插在 LimitCount 之前）；参数校验（every ≥ 1、unit ∈ {day,week}、日期可解析、anchor+every 成对）→ NopException；锚点字段与非 cron 触发器组合 → NopException；字段全缺省 → 行为与现状完全一致（不包装）
- [x] `TestAnchorRepeatTrigger` 全绿（repeat 7 + range 7 + 手写 2 + 实体接线 1）

Exit Criteria:

- [x] `mvnw -pl nop-job/nop-job-core test` 整模块全绿（含 C2 的 122 用例回归）；`mvnw -pl nop-job/nop-job-api compile` 通过；`mvnw -pl nop-job/nop-job-dao test` 全绿（实体接线用例所在模块）
- [x] 提交前 `git status` 逐一 staging 复核：仅本计划 in-scope 文件入库

### Phase 3 - owner doc 回写与收尾

Status: completed
Targets: flux 仓 design.md/roadmap/logs、nop-entropy ai-dev/logs

- Item Types: `Fix`（owner-doc 悬空项闭环）

- [x] design.md §9 宿主映射表锚点行回写定名（`repeatAnchorEvery`/`repeatAnchorUnit`/`repeatAnchorDate`，并注明 RP-06 式 anchor 回退 `range.start` 属宿主装配语义）；§12 例外注记「Java 侧字段定名待 C3 落定后回写本节」闭环标注 + **残余说明**：锚点字段无实体/ORM 列，dao 实体路径暂无法持久化锚点配置（程序化 TriggerSpec 可达；宿主拆列归 C7 宿主映射示例工作面）
- [x] nop-entropy `ai-dev/logs/2026-10/2026-10-07.md` 增 C3 段；flux `docs/logs/2026/10-07.md` 增 C3 段
- [x] roadmap C3 行随 plan 生命周期翻转（draft review → planned；closure audit → done）

Exit Criteria:

- [x] design.md 回写落盘且与 live 实现字段名一致；双仓日志就位；roadmap C3 双表状态正确

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，2 轮）
- Verdict: `pass-with-minors`（Round 1 fail 3 Major → 修订后 Round 2 pass-with-minors，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R1 M-1 TriggerBuilder 按接口读字段而 ITriggerSpec 未入计划 → 接口扩展裁定 + 三文件入 In Scope/Phase 1；M-2 实体接线用例放错模块（core 不依赖 dao）→ 移 nop-job-dao/src/test + dao test 门禁；M-3 fireCount 桩缺播种规则（count 绝对语义不收敛）→ countEpoch 暖机计数规格 + 逐向量基线预期（RG-01~05/07 过、RG-06/repeat 7/手写 2 挂）；R1 Minor 1-5（基线清单漏手写①、RP-06 回退位置=测试装配层、§12 残余说明、anchor 构造器解析一次、isScheduleCompleted 恒 false）全修；R2 残留 N-1（In Scope/Targets 枚举文本同步）执行启动时已修

## Closure Gates

- [x] 所有 in-scope confirmed contract gaps 已收敛（锚点字段 + 过滤链路 + range 三字段端到端验证）
- [x] 行为/契约结果已达成（repeat/range 向量全链路全绿）
- [x] 必要 focused verification 已完成（Proof 先行 failing→green 证据链）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract gap
- [x] 受影响的 owner docs 已同步（design.md §9/§12 回写；双仓日志）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `mvnw -pl nop-job/nop-job-core test` 全绿 + `mvnw -pl nop-job/nop-job-dao test` 全绿 + `mvnw -pl nop-job/nop-job-api compile` 通过（Java 侧全量门禁）

## Deferred But Adjudicated

（无——执行中未推翻任何计划内条目；eval context 桩承载范围三元组是生产模型的机制细节，已按 N-1 就地勘误 Phase 1 装配文本）

## Non-Blocking Follow-ups

-（无）

## Closure

Status Note: 锚点字段三元组 + `AnchorRepeatTrigger`（周奇偶锚定，RP-04 判别）+ TriggerBuilder 校验接线交付；repeat/range 向量经全链路 17/17、core 139/139、dao 89/89（含审计 N-3 补的 end 截断实体路径用例）全绿；范围三字段实体接线端到端实证；design.md §9/§12 定名回写闭环。closure audit R1 issues（M-1 Phase 3 勾选漂移 + 5 Minor）——M-1 与 N-1/N-2 文本勘误、N-3 补测、N-5 扫描上限 off-by-one 修正均已落并复跑全绿，按审计裁定随收口 commit 闭环；roadmap C3 随本收口翻 `done`。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，1 轮 issues → 收口 commit 闭环）
- Evidence: 审计独立重跑三门禁（core -am 139/139、dao 88/88、api compile exit 0——N-3 后 dao 增至 89/89 复跑确认）；语义抽查（RP-04 周奇偶判别手工推演、扫描上限、校验五路径、缺省不包装、接线序 RG-06、播种桩种子推演）全部成立；design.md §9/§12 与 live 字段名逐字一致；实体无锚点列经 grep 证实（§12 残余说明属实）。M-1（Phase 3 勾选/状态漂移）已按修复要求在本收口 commit 内完成勾选+翻状态+证据回填；N-1/N-2 plan 文本就地勘误；N-3 补 `rangeEnd_truncatesViaEntityPath`；N-5 `scan++ >= MAX_SCAN` 修正；N-4 staging 逐一复核（排除并行漂移文件）。

Follow-up:

- no remaining plan-owned work（锚点实体/ORM 列与宿主拆列示例归 C7 宿主映射示例工作面，design.md §12 已记残余）
