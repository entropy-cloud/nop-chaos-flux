# 773 AD-5 本地模型联调与离线夹具（AI Debugger Copilot）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/ai-debugger-copilot-roadmap.md` AD-5 work item；owner doc `docs/architecture/nop-debugger-ai.md`；用户指令 2026-10-27（执行路线图至完成）
> Related: `docs/plans/769-ad1-readonly-tool-adapter-plan.md`（completed）、`docs/plans/772-ad4-patch-candidates-plan.md`（completed）

## Purpose

落地 AD-5：把本地模型探针（`scripts/__tests__/ai-debugger-local-qwen.optional.test.ts`）接入 AD-1/AD-3 的生产工具契约——探针种子工具名与生产白名单的双向核对进入 CI（确定性、无网络）；确定性 scripted connector 夹具固化为包内可复用测试基建；环境变量契约与失败解读成文；真实模型运行保持可选人工验证，不作为 closure 前提。

## Current Baseline（2026-10-27 live 核对）

- 探针 `scripts/__tests__/ai-debugger-local-qwen.optional.test.ts`：`skipIf(!NOP_AI_LOCAL_TEST)` 门控；HTTP 直连 `${BASE_URL}/chat/completions`（环境变量 NOP_AI_LOCAL_TEST/BASE_URL/MODEL/API_KEY/TIMEOUT_MS）；**手写 4 名工具白名单**（explain_node_failure / get_node_diagnostics / query_events / propose_schema_patch）与工具调用形状断言；定位为契约种子（roadmap §3），非生产契约。
- 生产白名单（plan 769）：`createDebuggerAiTools` 10 只读工具；plan 772 复合 dispatcher 增 propose_schema_patch（stage-only）。种子 4 名全部在生产面内。
- 确定性 connector 夹具现状：`packages/nop-debugger-ai/src/__tests__/` 内 4 个内联 scripted connector 工厂（patch-chain 定义 proposeThenAnswerConnector；extension 定义 static/hanging/failingOnce 三型）——各自内联未共享、未固化。
- vitest 双配置：`vitest.scripts.config.ts`（node+forks，scripts/**tests**，无 workspace alias——scripts 侧**不能**直接 import 包源码）与 `vitest.shared`（packages 侧，alias 完整）。门禁关系：`pnpm test` 进 GitHub CI（turbo test 任务）；`pnpm test:scripts` 为本地全量门禁惯例（767 约定），无 CI step——CI 强制的正是本计划的包侧契约测试。
- `.optional.` 自守卫约定：skipIf 门控；live 测试的有效上限是**每测试级 override** `TEST_TIMEOUT_MS`（= NOP_AI_LOCAL_TIMEOUT_MS + 5s，默认 65s），fetch abort（25s 默认）恒先触发——干净 HTTP 错误性质成立；探针 ：7-8 的 "30s harness" 注释已过时，Phase 2 随注释勘误（767 曾以 30s 全局值文档化）。
- owner doc Verification Baseline 节：列交付期验证义务，无环境变量契约与失败解读。

## Goals

- 探针↔生产契约双向核对进 CI（确定性、无网络）：包侧新增 `local-model-contract.test.ts`——①生产工具集名单包含探针 4 种子名（propose 经复合 dispatcher 在面内）；②scripted connector 发起 propose 工具调用可离线走通「解析→校验→暂存」链路（不触网），含模型 arguments 非法 JSON → dispatcher 结构化 `invalid arguments` 断言；③探针声明的调用形状（tool_calls 数组 + function.name + JSON arguments）与引擎契约一致。
- 探针侧：手写白名单标注为生产白名单镜像（注释指认包侧契约测试为准），live-model 断言保持不变；HTTP 直连形状不变。
- scripted connector 夹具固化：提取 `packages/nop-debugger-ai/src/__tests__/scripted-connector.ts` 共享 helper（scripted/hanging/failingOnce 三型），两处既有测试迁移消费，去重。
- 环境变量契约与失败解读成文：owner doc Verification Baseline 增「本地模型探针」小节（5 个环境变量语义、每测试超时 override、默认跳过门控、常见失败形态：HTTP 非 200/超时/模型不回工具调用/参数不可解析的解读与处置、**镜像不对称披露**——生产→种子漂移由 CI 机械拦截，探针侧白名单改动仅注释守护不机械强制）。
- 全部离线新增测试进 `pnpm test`（CI）；live-model 测试保持 `skipIf` 可选，不作为 closure 前提。

## Non-Goals

- 不做真实模型回归基线（模型输出不得成为基线，roadmap §5 AD-5）。
- 不改 nop-debugger / flux-renderers-ai 任何代码；不动 automation API。
- 不引入 scripts 侧 workspace alias（探针维持 HTTP 直连形态，契约核对由包侧测试承载）。
- 不做多模型/多 provider 矩阵测试。

## Scope

### In Scope

- `packages/nop-debugger-ai/src/__tests__/local-model-contract.test.ts`（新，确定性 CI）
- `packages/nop-debugger-ai/src/__tests__/scripted-connector.ts`（新，共享夹具）+ `patch-chain.test.tsx` / `extension.test.tsx` 迁移消费
- `scripts/__tests__/ai-debugger-local-qwen.optional.test.ts`（镜像注释 + 种子名对齐说明；live 断言不变）
- `docs/architecture/nop-debugger-ai.md` Verification Baseline 增环境变量契约与失败解读小节
- `docs/logs/2026/10-27.md`、roadmap §4 AD-5 行状态推进

### Out Of Scope

- nop-debugger/flux-renderers-ai 源码；playground（AD-6）；vitest 配置变更；e2e

## Failure Paths

| 场景                       | 触发                          | 行为                                                                                                                    | 可重试             | 用户可见     |
| -------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------ |
| 种子名漂移                 | 生产白名单重命名/移除种子工具 | 包侧契约测试红（CI 拦截），提示同步探针                                                                                 | 是                 | 无（CI 红）  |
| live 探针 HTTP 非 200/超时 | 本地模型未起/网络问题         | skipIf 门控外仅当 NOP_AI_LOCAL_TEST=1 时运行；失败为干净 HTTP 错误（fetch timeout < harness timeout），解读见 owner doc | 是（人工重启模型） | CLI 错误输出 |
| 模型不回工具调用           | 模型文本作答                  | live 断言红（期望 tool_calls 数组）——解读为提示词/模型能力问题，不阻塞 closure                                          | 是                 | 同上         |
| 提案参数不可解析           | 模型 arguments 非法 JSON      | 离线链路断言 dispatcher 返回结构化 invalid arguments（确定性夹具覆盖）                                                  | 是                 | 无           |

## Test Strategy

本档选择：`必须自动化夹具 + 可选真实模型`（roadmap §7 AD-5 原文）。判别机制点名：契约测试在"生产白名单移除种子工具"或"dispatcher 不含 propose"的回归下必挂（名单断言 + 离线链路走通双保险）；夹具迁移后既有链路测试语义不变（迁移本身无新判别要求，由全量套件守护）。

## Execution Plan

### Phase 1 - 共享夹具固化与契约测试（Proof 先行）

Status: completed
Targets: `packages/nop-debugger-ai/src/__tests__/{scripted-connector.ts,local-model-contract.test.ts,patch-chain.test.tsx,extension.test.tsx}`

- Item Types: `Proof` + `Fix`（夹具重构）

- [x] 提取 `scripted-connector.ts`：`scriptedConnector(steps)`（顺序回放 chunks，可多轮）/`hangingConnector(gate)`/`failingOnceConnector(replies)`；patch-chain 与 extension 两测试迁移消费，删内联重复
- [x] 先红：`local-model-contract.test.ts`——契约三断言（种子名 ⊆ 生产面；离线 propose 链路走通；调用形状与引擎契约一致），红证据取法：从生产白名单/dispatcher 临时移除种子名（变异生产面）断言变红，恢复后转绿——证明断言连着活名单而非恒真
- [x] 后绿：三断言全绿；全包套件绿

Exit Criteria:

- [x] 契约测试常绿（无网络、确定性）；夹具去重后 `pnpm --filter @nop-chaos/nop-debugger-ai test` exit 0

### Phase 2 - 探针镜像标注与文档成文

Status: completed
Targets: `scripts/__tests__/ai-debugger-local-qwen.optional.test.ts`、`docs/architecture/nop-debugger-ai.md`、`docs/logs/2026/10-27.md`

- Item Types: `Follow-up`（探针注释）+ `Follow-up`（文档）

- [x] 探针：白名单处注释"生产镜像——以 `packages/nop-debugger-ai/src/__tests__/local-model-contract.test.ts` 的种子名断言为准"；环境变量块注释补契约指针；勘误 ：7-8 过时的 "30s harness" 注释为每测试 override 口径（live 断言零变化，仅注释）
- [x] owner doc Verification Baseline 增「本地模型探针」小节：5 个环境变量语义与默认值、skipIf 门控、失败解读四形态（HTTP 非 200 / 超时 / 不回工具调用 / 参数不可解析）与"真实模型运行不作为 closure 前提"声明
- [x] daily log 记录

Exit Criteria:

- [x] owner doc 小节落地经 anchor 门禁；探针 live 断言零变化（git diff 仅注释）

## Draft Review Record

- Reviewer / Agent: agent_8106c9d6（独立 fresh session）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major；一轮通过）
- Rounds: 1
- Findings addressed: m1 CI 门禁关系措辞精确化（test 进 CI、test:scripts 为本地门禁惯例）；m2 每测试超时 override 勘误纳入 Phase 2；m3 非法 JSON 断言显式并入断言②；m4 夹具现状措辞收紧；m5 镜像不对称披露写入 owner doc 小节要求。红证据取法按评审确认口径记录（变异生产面）。

## Closure Gates

- [x] 探针↔生产契约双向核对进 CI（种子名断言 + 离线 propose 链路，判别机制在案）
- [x] scripted connector 夹具固化且既有测试迁移后语义不变（全包 59 绿）
- [x] 环境变量契约与失败解读成文（owner doc）；探针 live 断言零变化（git diff 仅注释）
- [x] 真实模型运行保持可选（skipIf 门控在案），不作为 closure 前提
- [x] 无被静默降级的 in-scope live defect 或 contract drift
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm check`

## Deferred But Adjudicated

（无——执行中改判须当场落节。）

## Non-Blocking Follow-ups

- scripts 侧 workspace alias 与探针直采生产工具集：测试基建改造，属优化候选（当前镜像断言已防漂移）。
- 多模型探针矩阵（不同本地模型家族的工具调用兼容性）：属扩展候选。

## Closure

Status Note: AD-5 交付完整：scripted connector 夹具固化（三型共享 helper，两测试迁移语义不变）；探针↔生产契约 4 断言进 CI（种子名 ⊆ 生产面 + 离线 propose 链路 stage-only + 非法 JSON 结构化错误 + 引擎全环离线；红证据：生产面变异变红）；探针 live 断言零变化（diff 仅注释）；环境变量契约 + 失败解读 + 镜像不对称披露成文于 owner doc。

Closure Audit Evidence:

- Auditor / Agent: agent_7475b57e（独立 fresh session）
- Evidence: closure audit `approved`（0 Blocker / 0 Major / 3 Minor）——独立复跑七门禁 exit 0（含 test:scripts 27 files/177 tests 全绿、探针 2 skipped 门控完好）、nop-debugger-ai 10 files/59 tests 绿、夹具迁移字节级等价核对、探针 diff 仅注释核对；Minor 均为措辞/后续跟进级（closure 占位符随本 commit 收口、revert 零调用未单列断言——结构性不可能、owner doc 失败解读 4 条目合并计数）。

Follow-up:

- no remaining plan-owned work（scripts 侧 alias 与多模型矩阵见 Non-Blocking Follow-ups；AD-6 收口集成）。
