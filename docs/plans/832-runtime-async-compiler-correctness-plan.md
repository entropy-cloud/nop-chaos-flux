# 832 核心运行时异步与编译正确性（deep-audit 2026-11-01 R1-R6）

> Plan Status: completed
> Last Reviewed: 2026-11-01
> Source: `docs/audits/deep-audit-2026-11-01.md` §4（R1-R6）
> Related: `docs/architecture/flux-runtime-module-boundaries.md`、M-06 契约注释（`runtime-action-helpers.ts:203-209`）

## Purpose

让取消语义、异步治理记账、编译器 region 提取回退分支与文档/注释声明的契约一致：已中止的调用方不收到成功结果、已清理的 owner 不被复活、编译回退分支不静默丢 region、退避中止即时生效；并让 parallel 批次在子动作抛出时也满足已文档化的 allSettled 聚合契约。

## Current Baseline

- **R1**：`packages/flux-runtime/src/runtime-action-helpers.ts:229-241`——cacheTTL>0 安全方法走 `sharing.inFlight.acquire(identityKey, runOnce)`，`runOnce` 绑定 registry 信号；`acquire` 返回后无条件 `{ok:true}`。`:203-209` M-06 注释声明"已中止调用方不得收到成功结果"，但仅在 cache-hit 分支（:208-211）实现。测试 `request-runtime-schema-fetch-dedup-cache.test.ts:145` 只覆盖 cache-hit。
- **R2**：`packages/flux-compiler/src/schema-compiler/node-compiler-helpers.ts:259-280`——dotted `compiledKey` 且 `copyAlongPath` 返回 undefined 时，回退 `item[fieldKey] = regionKey`（:265），随后 `!nestedSource && resolved.compiledKey` 走 `delete item[fieldKey]`（:278-280），把刚写的引用删掉。现有测试（`schema-compiler-schema-definition-unified-extraction.test.ts:126,182`）全走 nestedSource 分支。
- **R3**：`packages/flux-runtime/src/async-data/async-governance.ts:140-141` `settleRun` 首行 `getOrCreateOwner(handle)`；`reaction-runtime.ts:527` dispose 时 `clearOwner`；飞行中 dispatch 的 settle 复活 owner 且无人再清。`source-registry.ts:348-353` 已规避同一问题（dispose 不 clearOwner）。
- **R4**：`packages/flux-runtime/src/async-data/reaction-runtime.ts:343-349,387-411`——`scheduleReaction` 排队创建的 `pendingRun` 在 dispose 时不清算，治理面永久 running、activeHandles 不回落。
- **R5**：`packages/flux-action-core/src/operation-control.ts:170-188`——`waitWithAbort` 未在入口检查 `signal.aborted`：abort 若在**进入等待之前**（attempt 执行期间）到达，对已中止信号注册的 abort 监听永不触发，取消被延迟整段 delay（等待期间到达的 abort 由已注册监听即时处理，不受影响）。
- **R6**：契约**已文档化**——`docs/architecture/action-algebra-formal-spec.md` §`parallel`（:308-320）规则 2「`results` 每子动作一条、稳定输入序」、规则 4「任一子 failure-class → 聚合 failure-class」、规则 5「**不自动取消兄弟**」；`docs/architecture/action-scope-and-imports.md:582`「`Promise.allSettled`-style aggregate semantics」。代码仅在子动作**返回**失败类结果时满足该契约；子动作**抛出**（async rethrow，`action-execution.ts:468`）时 `runParallelActions`（:231-240）的 `Promise.all` reject，绕过聚合——整批变成单个错误、兄弟结果丢失、`results` 缺失、FM-012 聚合身份不达成。既有测试（`contract-control-flow-parallel.test.ts`、`contract-abort-identity-and-parallel-aggregate.test.ts`）覆盖 adapter 同步抛出与取消身份，未覆盖子动作异步 rethrow。
- 相关 owner docs：`docs/architecture/flux-runtime-module-boundaries.md`（runtime 边界）；R6 契约 owner：`action-algebra-formal-spec.md` §`parallel` + `action-scope-and-imports.md:582`（本计划按其对齐代码，不改契约）。

## Goals

- M-06 契约在共享在飞路径同样成立并有判别性测试。
- 编译器 region 提取在任何分支下都不静默丢失内容。
- 治理面记账与对象生命周期一致：dispose 后 settle 不复活 owner、排队 run 在 dispose 时被清算。
- `withRetry` 退避中止即时生效。
- parallel 批次在子动作抛出时同样满足已文档化的 allSettled 聚合契约（不取消兄弟、`results` 完整有序、聚合 failure-class）。

## Non-Goals

- 不改 action 结果对象公共形状（`ActionResult` 字段不动）；不引入 Promise.allSettled 之外的新并发原语；不动 cacheTTL/identityKey 逻辑。

## Scope

### In Scope

- R1-R6 修复 + 判别性测试（R6 按既有正式契约对齐实现）；受影响 owner doc 同步。

### Out Of Scope

- action-core 的重试策略参数化；governance snapshot 的展示格式。

## Failure Paths

| 编号            | 触发                          | 行为                                                                                           | 可重试 | 用户可见表现                 |
| --------------- | ----------------------------- | ---------------------------------------------------------------------------------------------- | ------ | ---------------------------- |
| r1-aborted      | 共享在飞等待期间调用方中止    | 该调用方得 cancelled 结果、then 链终止；共享请求不中断                                         | —      | 无感知（链路停止）           |
| r2-missing-path | dotted regionKey 中间段缺失   | 沿 compiledKey 路径创建中间记录并写入引用（`writeAlongPath`），编译零诊断                      | —      | region 内容照常渲染          |
| r6-parallel     | parallel 子动作抛出非取消错误 | 该子项归一为 failure-class 结果计入 `results`，兄弟继续并入聚合；聚合 failure-class 走 onError | —      | onError/默认失败通道照常触发 |

## Test Strategy

必须自动化：取消/治理/编译均为核心回归路径，先写失败测试再修。

## Execution Plan

### Phase 1 - 取消语义（R1、R5）

Status: completed
Targets: `runtime-action-helpers.ts`、`operation-control.ts`、`flux-runtime`/`flux-action-core` 测试

- Item Types: `Proof | Fix`

- [x] Proof（R1）：`request-runtime-schema-fetch-dedup-cache.test.ts` 新增「caller aborts while awaiting a shared in-flight fetch」——A 成功、B cancelled 且 error 为中止原因、请求仅一次；修复前实跑失败（`b.ok` 为 true）
- [x] Fix（R1）：`acquire` 返回并写缓存后检查 `signal?.aborted` → `createCancelledResult`（共享结果仍入缓存，仅该调用方得取消）
- [x] Proof（R5）：`operation-control-timeout-retry.test.ts` 新增——attempt 内 abort、delay 5000 时 1s 内以 AbortError 拒绝；修复前实跑等满 5s 后失败
- [x] Fix（R5）：`waitWithAbort` 入口 `options.signal?.aborted` 即 reject

Exit Criteria:

- [x] 两条判别性测试通过；修复前均实跑失败
- [x] `flux-runtime`、`flux-action-core` 包测试通过

### Phase 2 - 治理记账（R3、R4）

Status: completed
Targets: `async-governance.ts`、`reaction-runtime.ts`、`async-governance.test.ts`

- Item Types: `Proof | Fix`

- [x] Proof（R3）：`async-governance.test.ts` 新增「does not resurrect an owner cleared while one of its runs was still in flight」——settle 返回 `stale-dropped`、owner 与 snapshot 均无该记录；修复前实跑失败。validation owner 路径与 StrictMode 相关既有测试随 flux-runtime 全量 1562 全绿
- [x] Fix（R3）：`settleRun` 遇不存在的 owner 返回 `stale-dropped` 条目、不重建记录（`beginRun` 总先建 owner，缺失只可能来自 `clearOwner`）
- [x] Proof（R4）：`reaction-runtime.test.ts` 新增「settles the queued run handle as cancelled…」——修复前实跑失败（`expected 'running' not to be 'running'`）
- [x] Fix（R4）：`dispose()` 内在 `onDispose` 之前将 `pendingRun` 以 cancelled settle 并清空

Exit Criteria:

- [x] 两条判别性测试通过；修复前均实跑失败
- [x] `flux-runtime` 1562 passed / 1 skipped 全绿

### Phase 3 - 编译器 region 回退分支（R2）

Status: completed
Targets: `node-compiler-helpers.ts`、`schema-compiler-schema-definition-unified-extraction.test.ts`

- Item Types: `Proof | Fix`

- [x] Proof：`schema-compiler-schema-definition-unified-extraction.test.ts` 新增两例——直接书写的 `popOver` schema 编译为 `{ contentRegionKey }` 引用、compiledKey 与字段同名时保留引用；修复前两例均失败（引用被删）。执行中厘清：直接书写形态下 `copyAlongPath` 写入的是 `item.popOver` 副本，随后整字段被删，比原审计描述的"中间段缺失"更常见
- [x] Fix：非 nestedSource 时**先删原字段、再沿 compiledKey 路径写入引用**（新 `writeAlongPath`，中间段缺失时创建），替代 `copyAlongPath` + 事后删除；nestedSource 分支仅在字段为记录时剥离 sourceKey。平铺同名、dotted、缺段三种情形均保留引用

Exit Criteria:

- [x] 判别性测试通过（修复前失败）；`flux-compiler` 577 全绿（既有 nestedSource popOver 用例不变）

### Phase 4 - parallel 子动作抛出对齐聚合契约（R6）

Status: completed
Targets: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`、`flux-action-core` 测试

- Item Types: `Proof | Fix`

- [x] Proof：`contract-control-flow-parallel.test.ts` 新增「normalizes a throwing child into a failure-class entry and keeps sibling results」——**在修复前即通过**：`runSingleAction` 的 catch-all 把适配器/插件/when 求值的一切非取消异常转为失败结果，子分支不可能以 rejection 到达 `Promise.all`；`runSingleActionWithRetry` 的 `throw error` 仅在 `withRetry` 的 fn 抛出时可达，而 fn 从不抛出
- [x] Decision（改判两次，最终 Fix）：首次执行判"非取消异常不可达"——成立（`runSingleAction` catch-all）；closure audit round-1 指出**中止路径仍可达**：带 `timeout` 控制的请求型子动作（`ajax`/`submit`）在批次中途父信号中止时，`withTimeout` 以 AbortError reject，而 `runSingleActionWithRetry` 请求分支无 try/catch，`Promise.all` 被 reject、聚合丢失
- [x] Proof（中止路径）：`contract-control-flow-parallel.test.ts` 新增「keeps one result per child when a timed request-backed child rejects on parent abort (FM-012)」——修复前实跑失败（`results` 为 undefined）
- [x] Fix：`runParallelActions` 对每个子分支 `.catch` 归一（AbortError → `createCancelledResult`，其余 → `{ ok: false, error }`），任何 rejection 来源都不再丢失聚合；FM-012 取消身份随之保留
- [x] 不改 formal spec 规则文本；若实现中发现规则与既有测试冲突，按 When Executing 7 当场落 Deferred 并修订本节，不得静默改契约

Exit Criteria:

- [x] 两条 parallel 测试（抛错子动作回归钉 + 中止路径判别性测试）通过；`contract-abort-identity-and-parallel-aggregate.test.ts` 全绿
- [x] `flux-action-core` 242 全绿

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_24067365-bb87-4d6f-824b-a626f62f5854；round-2 agent_69e405e2-9802-49c0-b434-07ad96de5aaa）
- Verdict: pass（round-1 fail：1 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，1 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 R6「无契约文档」声称不实——formal spec §parallel 规则 2/4/5 与 action-scope-and-imports.md:582 已定义 allSettled/不取消兄弟契约；R6 由"新裁决"改为"按既有契约对齐子动作抛出路径"（原倾向的"取消兄弟"会推翻规则 5）。

## Closure Gates

- [x] R1-R5 修复且判别性测试修复前实跑失败；R6 证伪并以契约回归测试锁定（与 formal spec 一致）
- [x] 受影响 owner docs：R1 实现回到已文档化的 M-06 语义（注释已在代码中），R3/R4 为治理面内部记账修正，R2 为编译器内部修正——均未改变已文档化契约，无需 architecture 文档更新
- [x] 不存在被静默降级的 in-scope 缺陷
- [x] 独立子 agent（fresh session）closure audit 通过并记录证据（round-1 agent_8c11b0d3 issues → round-2 agent_9107966a approved）
- [x] `pnpm typecheck`（46/46；R6 中止路径修复后复跑，833 WIP 暂移出工作树以隔离）
- [x] `pnpm build`（46/46，同上复跑）
- [x] `pnpm lint`（46/46，同上复跑）
- [x] `pnpm test`（复跑 `turbo run test --continue`：85/86 任务绿，**16,794 passed**；唯一失败 = `flux-renderers-map` 主题 MutationObserver 测试 1 例负载型时序 flaky〔首轮则为 mobile wheel-time-picker〕，与本计划触达面零交集，单文件重跑 3/3 绿）
- [x] `pnpm check`（复跑：scanner-baselines 等全部前序项绿；链在 `check:test-barrels` 处红——系 plan 830 门禁自身脚本测试 fixture 自命中，已由前向提交 d48795ae7 修复后补跑 `check:test-barrels` + `test:scripts` 均绿。首轮的 non-retained 扫描 +2 已随并行会话 V3 提交消解）

## Deferred But Adjudicated

### R6 parallel 子动作 rejection——执行期两次改判（最终修复）

- 第一次（Phase 4 执行中）：子动作适配器抛错的测试在修复前即通过——`runSingleAction` 的 catch-all 使**非取消异常**不可达，据此一度判 R6 证伪。
- 第二次（closure audit round-1，agent_8c11b0d3）：审计员指出**中止路径仍可达**——带 `timeout` 控制的请求型子动作在父信号中止时经 `withTimeout` 以 AbortError reject，请求分支无 try/catch，`Promise.all` 被 reject、聚合与兄弟结果丢失（formal spec §parallel 规则 2 与 FM-012 被违反）。判别性测试实证后在 `runParallelActions` 层统一归一子分支 rejection 并修复。
- 审计报告 §4 R6 行勘误同步改写。
- Classification: 不适用（已修复，非延期）
- Successor Required: `no`

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: R1-R5 修复且判别性测试修复前均实跑失败；R6 经两次改判后修复（非取消异常不可达，但计时请求型子动作的中止 rejection 可达，已在 `runParallelActions` 层归一）；全量门禁复跑绿（test 仅一例与触达面无关的负载型 flaky）。

Closure Audit Evidence:

- Auditor / Agent: 独立 fresh sub-agent——round-1 agent_8c11b0d3-b52f-4868-9404-2fac50794f1b（issues：1 Major + 2 Minor），round-2 agent_9107966a-8e2c-4945-bf19-9ce5b82fa6c9（approved）
- Evidence: round-1 Major——R6"不可达"结论过宽，审计员指出 `withTimeout` 中止路径；执行者以判别性测试实证（修复前 `results` 为 undefined）后修复，并改写 Phase 4/Deferred/审计报告勘误。round-2 逐一核对所有 rejection 来源（请求分支 withTimeout、debounce 调度、非请求 retry rethrow）均被 `.catch` 覆盖，R1-R5 聚焦套件无回归，门禁日志与补跑一致。

Follow-up:

- no remaining plan-owned work
