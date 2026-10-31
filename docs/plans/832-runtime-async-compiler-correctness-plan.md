# 832 核心运行时异步与编译正确性（deep-audit 2026-11-01 R1-R6）

> Plan Status: active
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
| r2-missing-path | dotted regionKey 中间段缺失   | 引用保留在原字段（回退分支语义），编译零诊断                                                   | —      | region 内容照常渲染          |
| r6-parallel     | parallel 子动作抛出非取消错误 | 该子项归一为 failure-class 结果计入 `results`，兄弟继续并入聚合；聚合 failure-class 走 onError | —      | onError/默认失败通道照常触发 |

## Test Strategy

必须自动化：取消/治理/编译均为核心回归路径，先写失败测试再修。

## Execution Plan

### Phase 1 - 取消语义（R1、R5）

Status: planned
Targets: `runtime-action-helpers.ts`、`operation-control.ts`、`flux-runtime`/`flux-action-core` 测试

- Item Types: `Proof | Fix`

- [ ] Proof（R1）：共享在飞路径测试——caller B 的信号在 `acquire` 等待期间中止 → B 得 cancelled、caller A 得成功、共享请求完成一次（旧实现 B 得 ok:true → 挂）
- [ ] Fix（R1）：`acquire` 返回后检查 `signal?.aborted` → `createCancelledResult`（镜像 cache-hit 分支）
- [ ] Proof（R5）：`withRetry` 测试——attempt 1 执行中途 abort，断言取消在 delay 显著小于整段时被观察到（旧实现等满 delay → 挂）
- [ ] Fix（R5）：`waitWithAbort` 入口 `options.signal?.aborted` 即 reject

Exit Criteria:

- [ ] 两条判别性测试通过且反向验证（还原修复各失败一次）
- [ ] `flux-runtime`、`flux-action-core` 包测试通过

### Phase 2 - 治理记账（R3、R4）

Status: planned
Targets: `async-governance.ts`、`reaction-runtime.ts`、`async-governance.test.ts`

- Item Types: `Proof | Fix`

- [ ] Proof（R3）：owner clear 后 settleRun 不重建记录（`getAsyncOwnerDebugSnapshot` 无该 owner；旧实现重建 → 挂）；并核查 validation owner 路径（`form-runtime-owner-lifecycle.ts:8,12`）及 StrictMode 双挂载场景不依赖 clear 后重建（相关既有测试全绿为证）
- [ ] Fix（R3）：`settleRun` 对不存在 owner 丢弃该次记录（与 source-registry 处置对齐；如需可观测，走既有调试面）
- [ ] Proof（R4）：reaction 排队 run 期间 dispose → 治理面无永久 running、activeHandles 回落（旧实现悬挂 → 挂）
- [ ] Fix（R4）：`dispose()` 内将 `pendingRun` 以 cancelled settle

Exit Criteria:

- [ ] 两条判别性测试通过且反向验证
- [ ] `flux-runtime` 包测试通过

### Phase 3 - 编译器 region 回退分支（R2）

Status: planned
Targets: `node-compiler-helpers.ts`、`schema-compiler-schema-definition-unified-extraction.test.ts`

- Item Types: `Proof | Fix`

- [ ] Proof：dotted regionKey + item 缺中间段的测试——断言 region 注册且 `item[fieldKey]` 保留引用、渲染面 schema 不丢（旧实现引用被删 → 挂）
- [ ] Fix：仅当 compiled 路径实际写入成功**且 `resolved.compiledKey !== fieldKey`** 才 `delete item[fieldKey]`（平铺同名别名写入后再删同样会抹除引用）；回退分支保留 `item[fieldKey] = regionKey`

Exit Criteria:

- [ ] 判别性测试通过且反向验证；`flux-compiler` 包测试通过

### Phase 4 - parallel 子动作抛出对齐聚合契约（R6）

Status: planned
Targets: `packages/flux-action-core/src/action-dispatcher/action-execution.ts`、`flux-action-core` 测试

- Item Types: `Proof | Fix`

- [ ] Proof：parallel 三子动作，其一 async 抛出（retry 耗尽 rethrow 路径）、其余成功——断言聚合 `results.length === 3` 且按输入序、抛出项为 failure-class、兄弟未被取消且结果在聚合中、聚合 failure-class 触发 onError（旧实现 `Promise.all` reject → 整批单错误、`results` 缺失 → 挂）
- [ ] Fix：每个子分支的 rejection 在分支内归一为 failure-class `ActionResult`（或改 `Promise.allSettled` 后统一归一），取消/超时类异常保留其 `cancelled`/`timedOut` 身份
- [ ] 不改 formal spec 规则文本；若实现中发现规则与既有测试冲突，按 When Executing 7 当场落 Deferred 并修订本节，不得静默改契约

Exit Criteria:

- [ ] 判别性测试通过且反向验证；`contract-control-flow-parallel.test.ts`、`contract-abort-identity-and-parallel-aggregate.test.ts` 仍全绿
- [ ] `flux-action-core` 包测试通过

## Draft Review Record

- Reviewer / Agent: 独立 fresh sub-agent（round-1 agent_24067365-bb87-4d6f-824b-a626f62f5854；round-2 agent_69e405e2-9802-49c0-b434-07ad96de5aaa）
- Verdict: pass（round-1 fail：1 Major + 3 Minor → 修订 → round-2 零 Blocker/Major，1 Minor 就地修正）
- Rounds: 2
- Findings addressed: Major-1 R6「无契约文档」声称不实——formal spec §parallel 规则 2/4/5 与 action-scope-and-imports.md:582 已定义 allSettled/不取消兄弟契约；R6 由"新裁决"改为"按既有契约对齐子动作抛出路径"（原倾向的"取消兄弟"会推翻规则 5）。

## Closure Gates

- [ ] R1-R6 修复且判别性测试反向验证（R6 与既有 formal spec 一致）
- [ ] 受影响 owner docs 已同步（R6 不改契约文本；若 governance/cancel 语义描述受影响则同步对应 architecture 文档）
- [ ] 不存在被静默降级的 in-scope 缺陷
- [ ] 独立子 agent（fresh session）closure audit 通过并记录证据
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm check`

## Deferred But Adjudicated

（执行中如有改判当场落此节）

## Non-Blocking Follow-ups

- 无

## Closure

Status Note: 待收口填写

Closure Audit Evidence:

- Auditor / Agent: 待填写
- Evidence: 待填写

Follow-up:

- 待收口填写
