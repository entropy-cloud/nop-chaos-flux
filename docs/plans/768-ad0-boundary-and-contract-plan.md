# 768 AD-0 边界与契约裁定（AI Debugger Copilot）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/ai-debugger-copilot-roadmap.md` AD-0 work item；mission `missions/ai-debugger-copilot.json`；用户指令（2026-10-27 会话）：执行 ai-debugger-copilot-roadmap 直至彻底完成、每工作项按 plan guide 拟计划、每计划完成后自动提交——该指令构成路线图 Rule 9 结构性门控（AD-1 建包 / AD-3 seam / AD-4 应用路径）的事前人工确认
> Related: `docs/plans/767-d1-tooling-gates-plan.md`（另一队列 deep-audit D 组，无依赖关系）

## Purpose

收口路线图 AD-0 的全部裁定并建立 AI 扩展面 owner doc，五项裁定与 roadmap AD-0 行交付清单 1:1 对应：①新包边界与命名及零 AI 依赖断言方式；②connector 注入契约；③工具面安全边界（白名单、evaluateNodeExpression 默认不暴露、inspect 数据逐工具脱敏/裁剪、错误归一、数据不当指令）；④AI tab 扩展 seam；⑤schema patch 协议草案。只产出裁定与文档，不写产品代码。

## Current Baseline（2026-10-27 live 核对）

- `packages/nop-debugger/package.json` dependencies = flux-core / flux-formula / flux-i18n / ui / use-sync-external-store，devDependencies = flux-react / flux-renderers-basic / flux-renderers-data / flux-renderers-form / lucide-react / react——**无任何 AI 包依赖**。
- `NopDebuggerTab`（`packages/nop-debugger/src/types.ts:45`）= `'overview' | 'timeline' | 'network' | 'node'` 四值；`panel.tsx:451` 硬编码四 tab 数组；无扩展 seam。
- `NopDebuggerAutomationApi`（`types.ts:349`）v1 全量方法面含 `evaluateNodeExpression`、`inspectByCid/inspectByElement`、四类 `explainNode*`；`inspectByCid` 返回的 `NopComponentInspectResult` 含 `formState.values/errors`、`scopeData`、`scopeChain` 等敏感面。
- `redaction.ts` 提供 `normalizeRedactionOptions` + `redactData`（默认脱敏键 token/authorization/cookie/password/secret/accessKey/refreshToken，`maxDepth` 默认 5）。live 勘误（2026-10-27 复核 `controller.ts:276-297`）：automation 出口的 `inspectByCid` / `inspectByElement` / `evaluateNodeExpression` **已有** key 级 `redactData` 包裹（controller 注释：window 暴露面消毒，刻意差异）；真正的 gap 是该包裹仅按键名模式匹配——`formState.values` / `scopeData` / `scopeChain` 下非匹配键的值原样通过，且无逐工具裁剪、无深度/字节上限。roadmap §2 脱敏边界行("inspect 的 form/scope 数据不在此边界脱敏")与本条冲突，本计划 In Scope 含该行就地勘误。
- `flux-renderers-ai` 引擎契约（`engine/types.ts`、`create-engine.ts`）：`createMessageEngine({ connector, tools, toolExecutor, maxToolRounds, systemPrompt, plugins, adapter })`；`AiToolSchema` / `ToolExecutor` / `ToolExecutionResult`（`{ ok, result?, error? }`）已导出。
- window 契约：`window.__NOP_DEBUGGER_HUB__` / `window.__NOP_DEBUGGER_API__`（`automation.ts` `registerAutomationApi`）；playground `App.tsx:73` `createNopDebugger({ exposeAutomationApi: true })`。
- `docs/architecture/nop-debugger-ai.md` 不存在；`docs/index.md:116` 已有路线图路由行（"AI 扩展面 owner doc 由 AD-0 建立"）；`docs/architecture/debugger-runtime.md` 为 debugger 语义权威。
- 探针 `scripts/__tests__/ai-debugger-local-qwen.optional.test.ts` 带 4 名临时白名单（explain_node_failure / get_node_diagnostics / query_events / propose_schema_patch），定位为契约种子，非生产契约。
- `docs/logs/2026/10-27.md` 存在，可追加本次裁定记录。

## Goals

- 五项裁定成文且可执行：能据以直接写出 AD-1 的边界断言与白名单测试、AD-2 的 seam 与 connector 接线、AD-3 的 patch 契约。
- owner doc `docs/architecture/nop-debugger-ai.md` 建立（契约态， Minimum Rule 14：只写裁定后的设计状态，不写演进叙事）。
- `debugger-runtime.md` 加 AI 扩展面注记（指向 owner doc，不重述规则）；`docs/index.md` 登记 owner doc 行；roadmap §2 脱敏边界行就地勘误。

## Non-Goals

- 不写任何产品代码：不建包、不改 panel.tsx、不加类型。
- 不落地工具实现/白名单代码（AD-1）。
- 不定 schema patch 的校验/审计/apply 实现契约（AD-3 只接收本计划的协议草案并收口最终契约）。
- 不动 `nop-debugger` 现有 automation API 形态。

## Scope

### In Scope

- 新建 `docs/architecture/nop-debugger-ai.md`（五节裁定：包边界与断言 / connector 注入 / 工具面安全 / AI tab seam / schema patch 协议草案）。
- `docs/architecture/debugger-runtime.md` Automation API 节追加 AI 扩展面注记（就地、勘误式，不改既有语义）。
- `docs/index.md` 新增 owner doc 导航行。
- `docs/backlog/ai-debugger-copilot-roadmap.md` §2 脱敏边界行就地勘误（补注 automation 出口已有 key 级 redactData 包裹，gap 在逐工具裁剪与上限）。
- `docs/logs/2026/10-27.md` 记录裁定。
- roadmap §4 AD-0 行 `todo`→`planned`（本 plan 升级 active 时）→`done`（closure audit 通过后同 commit 回写）。

### Out Of Scope

- `packages/` 下任何代码变更；`tests/e2e/` 变更；roadmap §8 Deferred 项的任何解禁。

## Failure Paths

| 场景                 | 触发                                        | 行为                                                 | 可重试 | 用户可见 |
| -------------------- | ------------------------------------------- | ---------------------------------------------------- | ------ | -------- |
| 裁定与 live 代码冲突 | 评审/审计发现裁定基于的 baseline 事实已漂移 | 以 live 为准修订裁定并在 plan 内记录勘误             | 是     | 无       |
| anchor 门禁红        | docs/index.md 登记行指向不存在/错路径文件   | `check:active-doc-code-anchors` 失败，修正路径后重跑 | 是     | 无       |

## Test Strategy

本档选择：`不适用：纯文档/裁定计划，无任何代码或行为变更`（路线图 §7 测试策略档将 AD-0 定为 `Decision`）。

## Execution Plan

### Phase 1 - 裁定成文与文档落地

Status: completed
Targets: `docs/architecture/nop-debugger-ai.md`（新）、`docs/architecture/debugger-runtime.md`、`docs/index.md`、`docs/backlog/ai-debugger-copilot-roadmap.md`（§2 勘误）、`docs/logs/2026/10-27.md`

- Item Types: `Decision`

- [x] 写 owner doc 五节裁定，内容必须覆盖以下逐条裁定（措辞以 doc 为准，此处为验收底线）：
  - ①包边界：新包名 `@nop-chaos/nop-debugger-ai`；依赖方向 nop-debugger-ai → nop-debugger + flux-renderers-ai，反向禁止；`nop-debugger` 的 dependencies/runtime import 面永不含 AI 包；机械断言方式 = 文本级边界测试（扫描 nop-debugger 的 package.json 依赖与 src import 语句中不得出现 `flux-renderers-ai` / `nop-debugger-ai`），由 AD-1 落地为回归测试
  - ②connector 注入契约：模型连接器由宿主构建并以 `AiConnector` 注入（`CreateMessageEngineOptions.connector` / `createStreamBasedAiConnector` 宿主先例 `apps/playground/src/ai/openai-connector.ts`）；密钥只在宿主；nop-debugger-ai 包内零密钥、零网络 IO、不感知 provider
  - ③工具面安全：显式白名单注册表（非白名单 automation 方法不可达模型）；`evaluateNodeExpression` 默认不暴露；inspect 的 form/scope 敏感面在既有 key 级 redactData 包裹之上按工具裁剪 + 脱敏 + 深度/字节上限；工具错误归一为 `ToolExecutionResult` 结构化形态（不泄漏原始 stack）；schema/业务数据只作数据返回不作指令
  - ④AI tab seam：nop-debugger 提供 AI 无关的通用面板 tab 注册 seam（宿主注册、描述符泛化）；tab 内容组件由宿主动态 import；AI 能力默认关闭、未启用零加载；extension tab id 与内建四 tab 无冲突的命名约定
  - ⑤schema patch 协议草案：patch 仅限 schema/表达式级（属性/表达式 set），结构级操作与页面控制显式排除；patch 携带显式 scope（controller + 节点目标）；propose/validate/apply/revert 全程审计留痕；apply/revert 原子（应用与回滚不留半态）；apply/revert seam 由 AD-3 建立并在此 doc 收口最终契约
- [x] `debugger-runtime.md` Automation API 节就地追加 AI 扩展面注记（2-4 句：AI 集成的工具面/安全边界/会话面契约由 `docs/architecture/nop-debugger-ai.md` 承载）
- [x] `docs/index.md` 登记 owner doc 行（放 debugger 相邻路由区）
- [x] roadmap §2 脱敏边界行就地勘误（历史表述不改写，附 2026-10-27 注：automation 出口三方法已有 key 级 redactData 包裹，gap 在逐工具裁剪/上限）
- [x] `docs/logs/2026/10-27.md` 追加裁定记录

Exit Criteria:

- [x] 五个文件落地；owner doc 每条裁定都是可执行表述（AD-1 能据以写断言、AD-2 能据以写 seam 与 connector 接线、AD-3 能据以写校验），无 "Proposed vs Current" 式演进叙事
- [x] `pnpm check:active-doc-code-anchors` exit 0（新登记行门禁通过；全量 `pnpm check` 归 Closure Gates）

## Draft Review Record

- Reviewer / Agent: agent_f1869dab（独立 fresh session）
- Verdict: `pass`（Round 1 `revised`：2 Major + 4 Minor，全部就地修复；Round 2 复核确认 0 Blocker / 0 Major，共识达成）
- Rounds: 2
- Findings addressed: M1——baseline redaction 声称与 live 相反（`controller.ts:276-297` 三方法已有 key 级 redactData 包裹，gap 在逐工具裁剪/上限），已改写 baseline 并把 roadmap §2 行就地勘误纳入 Scope/Phase 1；M2——roadmap AD-0 行的 connector 注入契约未覆盖，已增补为裁定②（宿主构建 AiConnector 注入、零密钥零网络 IO）；Minor——五项计数对齐、roadmap §4 状态机 todo→planned→done、原子应用/回滚补入⑤、Phase Exit 收窄至 anchor 门禁。

## Closure Gates

- [x] 五项裁定全部成文且通过独立评审（零 Blocker/Major）
- [x] owner doc / debugger-runtime.md 注记 / docs/index.md 登记 / roadmap §2 勘误 / daily log 五处落地且彼此一致
- [x] `pnpm check` exit 0（纯文档计划：typecheck/build/lint/test 按指南纯文档条款豁免，以 `pnpm check` 为门禁）
- [x] roadmap §4 AD-0 行已按状态机推进（active 时 `planned`，closure 时 `done`）且回写与 closure 同 commit
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项

## Deferred But Adjudicated

（无——本计划为纯裁定，无执行中改判预期；若评审推翻某裁定，就地修订后重审。）

## Non-Blocking Follow-ups

- AD-1 落地机械边界测试时的断言强度细节（如是否同时扫描 devDependencies）由 AD-1 plan 定夺。

## Closure

Status Note: AD-0 五项裁定（包边界+零AI依赖断言 / connector 注入 / 工具面安全 / AI tab seam / schema patch 协议草案）全部落地：owner doc `docs/architecture/nop-debugger-ai.md` 新建，`debugger-runtime.md` 注记、`docs/index.md` 路由行、roadmap §2 就地勘误、daily log 五处同步；`pnpm check` exit 0。纯文档计划按指南豁免 typecheck/build/lint/test。draft review（agent_f1869dab，2 轮，pass）与 closure audit（agent_84f904a3，approved）均为独立 fresh session。

Closure Audit Evidence:

- Auditor / Agent: agent_84f904a3（独立 fresh session）
- Evidence: closure audit `approved`（0 Blocker / 0 Major / 2 informational Minor）——独立复核五文件落地与 owner doc 逐条裁定、live 代码一致（controller.ts:276-297 redactData 包裹、redaction.ts 默认键、create-engine.ts connector、types.ts:45 四 tab）、独立重跑全量 `pnpm check` exit 0；Minor m1（Verification Baseline 加 required-at-delivery 标注）与 m2（"拟建立"措辞过时，owner doc 已存在）已随本 commit 修正。

Follow-up:

- no remaining plan-owned work（AD-1 起的执行队列见 roadmap §4）。
