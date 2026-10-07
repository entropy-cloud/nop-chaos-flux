# 536 Cron 轨道 C2 nop Java 语法扩展（L/W/#/年段）

> Plan Status: completed
> Last Reviewed: 2026-10-07
> Source: `docs/backlog/cron-scheduling-roadmap.md`（工作项 C2）、`docs/components/cron-editor/design.md` §2.1（语法契约）、`docs/components/cron-editor/golden-vectors.json`（C1 契约向量）
> Related: plan 535（C1 已完成）；本仓仓库：`/Users/abc/app/nop-entropy-wt/nop-entropy-master`（master）

## Purpose

把 nop `io.nop.job.core.utils.CronExpression` 从严格 6 段扩展为 Quartz 兼容方言：日位 `L` / `L-n` / `nW` / `LW`、周位 `d#N` / `dL` / 单独 `L`、可选第 7 段年（1970-2099）。动态日判定以谓词接入，主循环与两道既有守卫（366 日扫描、4 年 runaway 预算）保持不动。判别性测试吃 C1 黄金向量（Proof 先行）。

## Current Baseline

- nop-entropy 在 master 分支，工作区脏度实测（2026-10-07）：31 M + 93 D + 87 未跟踪——含 `nop-job-service/NopJobScheduleBizModel.java`、`nop-job/model/nop-job.orm.xml`、nop-job-meta xmeta、nop-job-web \_gen view.xml、nop-entropy-e2e spec、native-image 配置与 vfs 索引等，均与本计划无关；**提交时只入库本计划 4 个 in-scope 文件，提交前 `git status` 逐一复核**。
- `CronExpression`：严格 6 段（`areValidCronFields` 要求 `length == 6`，行 456-457）；全文无 `L`/`W`/`#`；javadoc 行 33「list of six fields」、行 296 错误文案「must consist of 6 fields」。
- **既有缺陷（本计划 Fix，向量 DG-017 等暴露）**：`isValidExpression` 只捕获 `NopException`（行 451）；非数字 token（如秒位 `L`）触发 `Integer.parseInt` 的 `NumberFormatException` 直接逃逸——已用 jshell 实测 `isValidExpression("L 0 0 * * *")` 抛异常而非返回 false。
- 引擎外无其他段数预检（已 grep nop-job/nop-codegen 全部 java/xjs/xbiz：仅 `areValidCronFields` 一处；`isValidExpression` 零外部调用者）；前端 `cronExpr` 纯文本输入在 nop-app 仓，不属本仓。
- 黄金向量在 flux 仓 `docs/components/cron-editor/golden-vectors.json`（91 条）；本计划把它复制到 `nop-job/nop-job-core/src/test/resources/cron/golden-vectors.json` 作为 Java 侧消费副本，C7 哈希对账。
- 测试基建：JUnit 5（`TestCronExpression` 既有 3 用例），`./mvnw -pl nop-job/nop-job-core test` 可跑且当前 48 用例全绿（Java 26 + Maven wrapper 已验证，评审员实测复跑）。
- 本仓存在 `ai-dev/logs/`（结构与 flux docs/logs 同构，最新至 2026-10-06）：C2 的验证证据双仓落——flux `docs/logs/`（主记录）+ 本仓 `ai-dev/logs/`（当日证据段）。

## Goals

- 全部 C1 向量的 Java 断言通过：nextRun 40 条（基线/动态日/年段）、diagnostics 31 条 `javaValid`、repeat/range 节跳过（Java 侧无对应字段，语义由 C3 承接）。
- 动态日判定以谓词接入 `findNextDay`；`findNext`/`doNext`/两道守卫的既有结构不动。
- 段数预检与文档表述同步 6/7 口径（javadoc、错误文案、`areValidCronFields`）。
- `isValidExpression` 对任意非法输入返回 false 而不抛（RuntimeException 收口）。

## Non-Goals

- 不做 `TriggerSpec` 锚点/范围字段（C3）；不接 repeat/range 向量。
- 不修改 `CronCalendar` / `TriggerBuilder` 源码；二者经构造器自动获得新语法属预期行为扩展（`CronCalendar` 行 72/176 对 L/W/# 表达式从构造失败变为构造成功），无独立改动与独立测试要求。
- `-1` 哨兵约定（`getNextInvalidTimeAfter`/`isSatisfiedBy` 的终止判据）不在 C2 改动：C2 维持「永不匹配 = 抛 runaway NopException」的既有异常语义；异常 → -1 的适配归 C3 触发层，防复述性漂移。
- 不支持 5 段 Unix、`@` 别名、秒位/分位/时位 `L`/`W`/`#`（`unsupportedToken` 归编辑器前置拦截，Java 侧一律解析失败）。
- 不动 nop-app 系前端仓。

## Scope

### In Scope

- `nop-job/nop-job-core/src/main/java/io/nop/job/core/utils/CronExpression.java`（语法扩展 + 预检/文案 + isValidExpression 收口）
- `nop-job/nop-job-core/src/test/java/io/nop/job/core/utils/TestCronGoldenVectors.java`（新建，向量消费测试）
- `nop-job/nop-job-core/src/test/resources/cron/golden-vectors.json`（flux 权威副本）
- `nop-job/nop-job-core/src/test/java/io/nop/job/core/utils/TestCronExpression.java`（既有 3 用例保持通过；如断言依赖 6 段构造行为则不动）

### Out Of Scope

- `TriggerSpec` / 触发装饰器（C3）
- flux 仓任何文件（C4 起）
- `CronCalendar` 语义变更（构造期仅经 `CronExpression` 获得新语法，无独立改动）

## Failure Paths

| 场景                | 触发                                                                       | 行为                                                                                                                                 | 可重试 | 用户可见                       |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------ |
| cron-invalid-token  | 非 6/7 段、越界、倒置、`?` 错位、`L`/`W`/`#` 错位、非法月/年名             | 构造器抛 `NopException(ERR_JOB_TRIGGER_PARSE_CRON_EXPR_FAIL)`；`isValidExpression` 返回 false（不抛）                                | 是     | 注册任务时报错文案含原表达式   |
| cron-impossible     | `0 0 0 30 2 ?` 等结构性永不匹配                                            | 构造成功（BitSet 静态化），`getTimeAfter` 4 年预算后抛 runaway（既有行为，与向量 `javaNextRun: runaway-error` 一致）；编辑器前置拦截 | 是     | 调度注册成功但触发器报 runaway |
| cron-year-exhausted | 年段全部年份已过（种子之后无匹配年，如 `0 0 0 1 1 ? 2020` 种子 2026）      | `getTimeAfter` 抛 runaway 同款 NopException（reason: year exhausted）                                                                | 是     | 同上                           |
| cron-year-far-jump  | 年段跳距超 4 年（如 `0 0 0 1 12 ? 2040` 种子 2026-06-01，正解 2040-12-01） | 跳年递归以目标年重基 runaway 预算（dot=目标年），正解可达不误报；跳后仍超预算才抛 runaway                                            | 是     | 正常调度                       |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：**必须自动化**（roadmap C2 明示 Proof 先行）。Proof = `TestCronGoldenVectors`：消费 C1 向量 JSON，实现先行为下动态日/年段/部分诊断用例必挂（failing-first），实现后全绿；既有 `TestCronExpression` 3 用例全程保持通过（回归网）。

## Execution Plan

### Phase 1 - Proof：向量消费测试落盘（先于实现）

Status: completed
Targets: `nop-job/nop-job-core/src/test/`

- Item Types: `Proof` + `Fix`（isValidExpression 缺陷钉子）

- [x] 复制 flux 权威向量到 `src/test/resources/cron/golden-vectors.json`（字节级一致，C7 对账基准；文件头 meta.authoritative 已声明权威位置）
- [x] 新建 `TestCronGoldenVectors`：UTC 固定；`nextRun` 节逐条断言（`Instant.parse` → `getTimeAfter` 迭代 `expectNext.length` 次 → ISO 比对）；`diagnostics` 节断言 `isValidExpression == javaValid`，且 `javaNextRun=runaway-error` 条目断言 `getTimeAfter` 抛 NopException；repeat/range 节跳过（注释指明 C3 承接）
- [x] 跑测试记录基线（Proof 先行证据，预期失败清单精确到 ID；**执行期勘误：实跑 37 挂/37 过，与下述预期一致——原稿漏列 DG-028（`L-31` 同为 NFE 逃逸）与 DG-008（日位 0 静默空集、构造成功，需新 Fix 项）**）：
  - nextRun 40 条：基线 17 过；动态日 18 挂（解析失败）；年段 5 挂（6 段预检拒绝）
  - diagnostics 31 条：20 过 / 11 挂——10 条 NFE 逃逸（DG-015/016/017/018/026/027/028/029/030/031）+ DG-008 断言落空（现引擎 javaValid=true，契约要求 false）；**DG-024/025 基线必过**（构造成功 + runaway 现行行为已匹配）
- [x] 手写判别用例 3 条（向量外，钉裁定）：
  - `0 0 0 1 12 ? 2040` 种子 2026-06-01 → 2040-12-01（**年段跳距 >4 年 + 跳后月滚动**，钉 dot 重基裁定；错误实现下必挂）
  - `0 0 0 1 1 ? 2020` 种子 2026 → `getTimeAfter` 抛 NopException（年耗尽路径）
  - `isValidExpression("L 0 0 * * *")` 返回 false 不抛（NFE 缺陷钉子）
- [x] 上述手写用例实现前必挂（前两条解析拒绝、第三条异常）

Exit Criteria:

- [x] `mvnw -pl nop-job/nop-job-core test`：新增测试可运行，实跑失败清单与上述预期逐 ID 一致（无「意外挂」）；基线 17 条 + DG-024/025 + 既有 3 用例通过

### Phase 2 - 实现：谓词接入与年段

Status: completed
Targets: `CronExpression.java`

- Item Types: `Fix`（语法缺口）+ `Decision`（谓词接入方式）

- [x] `areValidCronFields` → 6 或 7 段；第 7 段解析为 `years` BitSet（偏移 1970，上界 2099；`*`/`,`/`-`/`/`），越界/非法 token 抛 NopException
- [x] 日位动态日解析：`L` / `L-n` / `nW` / `LW` 单 token（含逗号即解析失败）；周位 `d#N`（N 1-5）/ `dL` / 单独 `L`（=周六）单 token；月名/周名先序替换再判定
- [x] 日位数值路径 min=1 校验（Fix，执行期发现：Phase 1 基线暴露现引擎把日位 `0` 经 `clear(0)` 静默成空 BitSet、构造成功但运行期 runaway——DG-008 契约要求 outOfRange 拒绝；`*` 展开不变）
- [x] 周位单独 `L` 语义 Decision：沿 Quartz「一周最后一日=周六」，**不**按本方言 `7=周日` 字面映射（C1 向量 NR-D15 钉定）
- [x] `L-n` 偏移静态拒绝边界（Decision，以向量 DG-027/028 判定为准）：`n ≥ 31` 一律拒绝；允许月集全为 2 月时 `n ≥ 29` 拒绝（2 月最长 29 天，L-29 → 第 0 日永不成立）；其余 `L-n` 交由谓词运行期判定（如 `L-28` 于平年 2 月无匹配、滑向 3 月）
- [x] 谓词接入：`findNextDay` 的日/周匹配改经 `matchesDayOfMonth(cal)` 与 `matchesDayOfWeek(cal)` 谓词（BitSet 路径与动态路径内聚在谓词内），主循环/366 守卫/runaway 守卫不动
- [x] 年段接入（Decision）：doNext 顶部年份过滤，不匹配则跳到下一命中年 1 月 1 日 0 点重置后递归；**跳年递归将 dot 重基为跳年目标年**（runaway 预算 = 自新起点 4 年，语义等价且不误杀远跳年段）；年耗尽抛 runaway 同款（reason: year exhausted）
- [x] equals/hashCode 增补动态日/周规格与 years（缺席为空 BitSet，双向对称）
- [x] `isValidExpression` 捕获 `RuntimeException` 返回 false；javadoc 与 6 段错误文案改 6/7 口径（错误文案补 7 段示例）

Exit Criteria:

- [x] `TestCronGoldenVectors` 全绿（nextRun 40 + diagnostics 31 的 Java 断言全部通过）+ 手写判别用例 3 条全绿；`TestCronExpression` 既有 3 用例保持通过
- [x] `mvnw -pl nop-job/nop-job-core test` 整模块退出码 0（含 nop-job-core 全部既有测试）
- [x] 提交前 `git status` 复核：仅本计划 in-scope 文件入库（工作区 31 M + 93 D + 87 未跟踪的既有脏度不纳入）

### Phase 3 - 一致性收尾与文档

Status: completed
Targets: `CronExpression.java` javadoc、nop-entropy 仓 docs（如有 cron 语法表述）

- Item Types: `Follow-up`（无）+ `Proof`

- [x] 全模块 `mvnw -pl nop-job/nop-job-core test` + `mvnw -pl nop-job/nop-job-core -am compile` 通过
- [x] javadoc 类注释补扩展语法说明（L/W/#/年段 + AND 语义 + 严格 6/7 段）；错误文案复核
- [x] 向量副本与 flux 权威文件哈希一致记录（sha256 留痕到 plan/dev log，C7 复用）
- [x] 验证证据双仓落：flux 仓 `docs/logs/2026/10-07.md` 增 C2 段（主记录）+ nop-entropy 仓 `ai-dev/logs/` 当日验证证据段
- [x] roadmap C2 原文「使其与严格 6 段口径一致」与交付（6/7 方言）矛盾的**前提就地勘误**（flux 仓 roadmap 文件行内附注，历史表述不改写）

Exit Criteria:

- [x] 模块测试全绿 + sha256 对账留痕；flux 仓 `docs/logs/2026/10-07.md` 增 C2 段 + nop-entropy `ai-dev/logs/` 证据段；roadmap C2 前提勘误落盘

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，general-purpose，2 轮）
- Verdict: `pass-with-minors`（Round 1 fail 4 Major → 修订后 Round 2 pass-with-minors，零 Blocker/Major）
- Rounds: 2
- Findings addressed: R1 Major-1 工作区脏度声称失真（实测 31M+93D+87 未跟踪）→ 改写 + 提交 hygiene 门禁；Major-2 年段跳年与 runaway 守卫交互缺口 → dot 重基 Decision + 远跳判别用例；Major-3 年耗尽路径零验证 → 手写用例；Major-4 Phase 1 预期清单不可证伪 → 逐 ID 化（诊断 21 过/9 挂：DG-015/016/017/018/026/027/029/030/031）；R1 Minor 1-5（双仓日志、roadmap 前提勘误、CronCalendar 措辞、-1 哨兵归属、L-n 拒绝边界）全修；R2 残留 Minor-R1（Closure Gates 残留旧表述）升 active 前已修

## Closure Gates

- [x] 所有 in-scope confirmed live defects 已修复（isValidExpression 异常逃逸）
- [x] 所有 in-scope confirmed contract drifts 已收敛（6 段口径 → 6/7 方言，向量全对账）
- [x] 行为/契约结果已达成（动态日/年段/诊断三面全绿）
- [x] 必要 focused verification 已完成（Proof-first failing→green 证据链）
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [x] 受影响的 owner docs 已同步到 live baseline（javadoc/错误文案；验证证据双仓落——flux docs/logs 主记录 + 本仓 ai-dev/logs 证据段）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `mvnw -pl nop-job/nop-job-core test` 全绿（Java 侧全量门禁；flux 仓无代码变更，不适用 pnpm 门禁）

## Deferred But Adjudicated

（无——执行中未推翻任何计划内条目；Proof 基线预期清单的执行期勘误（DG-028/DG-008）是补全而非推翻，已转入 Fix 项）

## Non-Blocking Follow-ups

-（无）

## Closure

Status Note: `CronExpression` 6/7 段方言交付且 122/122 全绿（Proof-first：实现前 37 挂/37 过逐 ID 对账）；主循环与两道守卫经审计 git diff 逐行核对未被改写；向量双仓 sha256 一致（`633e2a0944f85c71caf5b357187c27d66de8cbce34dbfac2320825f6bae1c4cd`）；roadmap C2 双表随收口翻 `done`；closure audit R1 issues（Mj-1 javadoc FRL 示例复述已勘误形态 + 4 Minor）——Mj-1 已修（FRIL）并复跑 122/122 确认，按审计裁定随本收口 commit 落地，无需第二轮完整 audit。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session，general-purpose，1 轮 issues → 收口 commit 闭环）
- Evidence: 实跑 `./mvnw -pl nop-job/nop-job-core test` 122/122；sha256 双仓一致（全量：`633e2a0944f85c71caf5b357187c27d66de8cbce34dbfac2320825f6bae1c4cd`）；语义抽查（NR-D06/D07/D16/D08-D10/D13/D15 + far-jump dot 重基 + 年耗尽 + 诊断负例逐条实现路径推演）全部成立；`git diff` 逐行核实「主循环与两道守卫不动」声称；roadmap C2 三 bullet 逐条无遗漏。Mj-1（新写 javadoc 示例 `FRL` 应为 `FRIL`）+ Minor-2（全量哈希补录本节）+ Minor-1/3/4（收口 commit 逐一 staging 复核；Draft Review Record 历史数字按不改写原则仅备注）处理完毕。

Follow-up:

- no remaining plan-owned work（repeat/range 向量的 Java 消费归 C3 触发层；-1 哨兵适配归 C3）
