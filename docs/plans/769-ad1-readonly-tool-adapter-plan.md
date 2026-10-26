# 769 AD-1 只读工具适配层（AI Debugger Copilot）

> Plan Status: completed
> Last Reviewed: 2026-10-27
> Source: `docs/backlog/ai-debugger-copilot-roadmap.md` AD-1 work item；owner doc `docs/architecture/nop-debugger-ai.md`（plan 768 五项裁定）；用户指令 2026-10-27（执行路线图至完成——AD-1 建包结构性门控的事前人工确认，见 roadmap Rule 9 / mission ②）
> Related: `docs/plans/768-ad0-boundary-and-contract-plan.md`（completed，裁定来源）

## Purpose

落地 AD-1：新建 `@nop-chaos/nop-debugger-ai` 包，把 `NopDebuggerAutomationApi` 适配为 flux-renderers-ai 引擎可消费的模型工具面（`AiToolSchema[]` + `ToolExecutor`）。首版只读：显式白名单、逐工具裁剪/脱敏、错误归一全部为可执行断言；nop-debugger 零 AI 依赖边界落机械断言。不建 UI、不做会话面（AD-2）、不做 patch（AD-3）。

## Current Baseline（2026-10-27 live 核对）

- plan 768 已收口：owner doc `docs/architecture/nop-debugger-ai.md` 五项裁定在案（包边界/connector 注入/工具面安全/AI tab seam/patch 协议草案）。
- `packages/nop-debugger/src/index.tsx` 现导出：types、`NopDebuggerPanel`、`createNopDebugger`、`createNopDiagnosticReport`、`getNopDebuggerAutomationApi`、`installNopDebuggerWindowFlag`；`redaction.ts` 的 `redactData`/`normalizeRedactionOptions` **未导出**。
- automation 出口（`controller.ts:276-297`）已对 inspect/evaluate 三方法做 key 级 `redactData` 包裹（刻意差异）；缺逐工具裁剪与上限——AD-1 在其上做增量，不另起第二套脱敏。
- `NopDebuggerAutomationApi` v1 方法面（`types.ts:349`）：只读诊断方法（queryEvents/getOverview/getNodeDiagnostics/getInteractionTrace/getRecentFailures/inspectByCid/explainNodeValue/Meta/Failure/Async 等）与变更/控制方法（evaluateNodeExpression、clear/pause/resume/show/hide/toggle/minimize/unminimize/setActiveTab/setPanelPosition、startFormStoreDiagnosticsSession 等）同面存在。
- flux-renderers-ai 引擎契约：`createMessageEngine({ tools, toolExecutor, ... })`；`AiToolSchema { type:'function', function:{ name, description?, parameters? } }`；`ToolExecutor = ({ toolCall, signal }) => MaybePromise<string | ToolExecutionResult>`；`ToolExecutionResult { ok, result?, error? }`。
- 探针 `scripts/__tests__/ai-debugger-local-qwen.optional.test.ts` 白名单种子含 `explain_node_failure` / `get_node_diagnostics` / `query_events` / `propose_schema_patch`（AD-3 项）。
- 包脚手架先例：`packages/nop-debugger/{package.json,tsconfig.json,tsconfig.build.json}`；`vite.workspace-alias.ts` 集中别名表；根 `tsconfig.json:47` project references 形如 `{ "path": "./packages/nop-debugger" }`。
- 工作区存在未提交的他队列改动（plan 767 D1 门禁治理：package.json check 链、scripts 修复、styles.css 等）——本计划提交只暂存本队列文件。

## Goals

- 新包 `@nop-chaos/nop-debugger-ai`（`packages/nop-debugger-ai/`）落地：`createDebuggerAiTools({ automation, ... })` 返回 `{ tools, toolExecutor }`，可直接喂给 `createMessageEngine`。
- v1 只读白名单 10 工具：`query_events` / `get_overview` / `get_node_diagnostics` / `explain_node_value` / `explain_node_meta` / `explain_node_failure` / `explain_node_async` / `get_interaction_trace` / `get_recent_failures` / `inspect_node`（身份+meta 摘要投影，**不含** formState.values/errors、scopeData、scopeChain）。
- 安全断言全部可执行：非白名单不可达（无透传）、`evaluateNodeExpression` 不在工具面、逐工具字段裁剪 + `redactData` 脱敏 + 结果字节上限、错误归一 `ToolExecutionResult`（不泄漏 stack）。
- nop-debugger 边界机械断言落地（文本级扫描测试，synthetic fixture 红证明）；`redactData`/`normalizeRedactionOptions` 从 nop-debugger 导出供复用（沿用同一脱敏实现）。

## Non-Goals

- 不做 AI tab / 会话面 / prompt 构建（AD-2）。
- 不做 `propose_schema_patch` 与任何 patch 契约（AD-3）。
- 不改 automation API 语义、不加第二套诊断真相：工具只是 automation 方法的白名单包装。
- 不暴露面板控制/会话控制方法（clear/pause/show/…、startFormStoreDiagnosticsSession 等）——它们不是只读诊断。
- 不接 playground（AD-6）。

## Scope

### In Scope

- `packages/nop-debugger-ai/`（新）：package.json、tsconfig.json、tsconfig.build.json、src/index.ts、tool 定义/注册表/裁剪/错误归一模块、判别性单测
- `packages/nop-debugger/src/index.tsx`：导出 `redactData`/`normalizeRedactionOptions`（复用面，最小导出）
- `packages/nop-debugger/src/*boundary*test*`：零 AI 依赖文本扫描断言 + scanner 纯函数 synthetic 红证明
- `vite.workspace-alias.ts`、根 `tsconfig.json`：别名与 project reference
- `docs/architecture/nop-debugger-ai.md`：Current Code Anchors 补新包锚点（live 基线变化）
- `docs/logs/2026/10-27.md`、roadmap §4 AD-1 行状态推进

### Out Of Scope

- flux-renderers-ai 引擎改动；nop-debugger automation 语义改动；playground；e2e（AD-6 收口）

## Failure Paths

| 场景             | 触发                       | 行为                                                                               | 可重试           | 用户可见           |
| ---------------- | -------------------------- | ---------------------------------------------------------------------------------- | ---------------- | ------------------ |
| 未知工具名       | 模型调用白名单外名字       | `ToolExecutionResult{ ok:false, error:'unknown tool: <name>' }`，不触达 automation | 是（模型可改调） | 会话内工具卡失败态 |
| 参数非法/JSON 坏 | arguments 不可解析或缺必填 | `ok:false`，error 指明预期参数形状（来自工具 schema）                              | 是               | 同上               |
| automation 抛错  | 底层方法 throw             | `ok:false`，error 为归一化消息，无 stack/内部对象                                  | 是               | 同上               |
| 结果超限         | 工具输出超过字节上限       | 截断 + `[TRUNCATED]` 标记，`ok:true`                                               | 是               | 工具卡结果截断展示 |
| inspect 敏感面   | 调 `inspect_node`          | 只返回身份/meta 投影；formState.values/errors、scopeData、scopeChain 字段整体缺席  | -                | 无                 |

## Test Strategy

本档选择：`必须自动化`（roadmap §7：AD-1 工具契约/白名单/脱敏/越权拒绝需判别性测试）。Proof 项（判别性契约测试）先于实现项落地（先红后绿）。判别机制点名：白名单测试在"透传式注册表"旧实现下必挂（透传会把任意名字转给 automation）；裁剪测试在"仅 key 级 redactData"旧实现下必挂（password 键会被 mask 但 `username` 等非匹配键值仍会整体出现，而断言要求字段缺席）。

## Execution Plan

### Phase 1 - 包骨架与边界断言

Status: completed
Targets: `packages/nop-debugger-ai/`（脚手架）、`packages/nop-debugger/src/index.tsx`、`packages/nop-debugger/src/ai-boundary.test.ts`（新）、`vite.workspace-alias.ts`、根 `tsconfig.json`

- Item Types: `Decision`（导出面）+ `Fix`（边界断言）

- [x] 脚手架：package.json（dependencies 仅 `@nop-chaos/nop-debugger` + `@nop-chaos/flux-renderers-ai` workspace:\*，无 AI 反向）、tsconfig.json/tsconfig.build.json 依 nop-debugger 先例、alias、根 project reference、`pnpm install` 链接
- [x] nop-debugger 导出 `redactData`/`normalizeRedactionOptions`
- [x] 边界测试：scanner 纯函数（输入合成文件内容/依赖字段 → 检出 `flux-renderers-ai`/`nop-debugger-ai` 引用）+ synthetic 违规红证明 + 对 nop-debugger 真实 package.json/src 的全绿断言
- [x] `pnpm --filter @nop-chaos/nop-debugger-ai typecheck` 绿（空实现也能编译）

Exit Criteria:

- [x] 新包被 workspace 识别（typecheck/build 可跑）；边界测试绿且含红证明路径；nop-debugger 既有测试不因新导出而红

### Phase 2 - 工具契约（Proof 先行，先红后绿）

Status: completed
Targets: `packages/nop-debugger-ai/src/{index.ts,tool-registry.ts,tools.ts,trim.ts,errors.ts,create-debugger-ai-tools.ts}` + `src/__tests__/`

- Item Types: `Proof`（契约测试先行）+ `Fix`（实现）

- [x] 先红：判别性契约测试落 `src/__tests__/`——白名单（未知工具拒绝、工具名恰为 10 个、`evaluateNodeExpression` 与面板/会话控制名不在面内）、逐工具裁剪（`inspect_node` 投影缺席敏感字段；非匹配键值不得整体穿透）、redactData 脱敏（嵌套 authorization/password 值 mask）、字节上限截断、错误归一（坏 JSON/缺参/automation throw → ok:false 归一形态）、engine 兼容 smoke（`createMessageEngine({ tools, toolExecutor })` 可创建且工具可执行）
- [x] 实现：registry（显式白名单注册表，每工具绑定 automation 方法 + 投影/脱敏策略）、tool 定义（name/description/parameters JSON schema）、trim（字段投影 + 深度/字节上限）、errors（args 解析与归一化）、factory
- [x] 后绿：上述测试全绿；`pnpm --filter @nop-chaos/nop-debugger-ai test` exit 0

Exit Criteria:

- [x] 判别性测试先红证据在案（实现前 run 记录），实现后全绿；无任何工具触达白名单外 automation 方法（fake automation 断言调用面）

### Phase 3 - owner doc 锚点与全量验证

Status: completed
Targets: `docs/architecture/nop-debugger-ai.md`、`docs/logs/2026/10-27.md`

- Item Types: `Follow-up`（owner doc 锚点）+ `Proof`（全量验证）

- [x] owner doc Current Code Anchors 补 `packages/nop-debugger-ai/src/*` 锚点（仅锚点，不改裁定文本）
- [x] daily log 记录

- [x] owner doc 锚点经 `pnpm check:active-doc-code-anchors` 通过（370 active docs）；全量验证归 Closure Gates

执行期门禁发现与处置（同 Phase 收口）：

- [x] `check:workspace-manifest-deps` 红：边界测试 synthetic fixture 内的字面 import 被 checker 正则当真实 import——fixture 改为动态拼接（marker 子串保留、不再是可解析 import），红转绿
- [x] `check:scanner-baselines` 红：新 executor 三处 catch 返回结构化 `{ ok:false }`（failure path 即返回值本身，启发式不识别对象返回形态），Found 口径 348→349——按 plan 757/528 有意形态先例注册 `scripts/baselines/scanner-baselines.json` 并附日期化理由
- [x] `check:knip-baseline` 红：4 个未消费导出类型（ai-boundary 2、trim 1、fake-automation 1）改模块内私有后清零

## Draft Review Record

- Reviewer / Agent: agent_9731ad66（独立 fresh session）
- Verdict: `pass-with-minors`（0 Blocker / 0 Major / 2 substantive Minor + 1 trivial；一轮通过）
- Rounds: 1
- Findings addressed: Minor 1——factory options 面在实现时具名（`redaction?: NopDebuggerRedactionOptions`，默认走 `normalizeRedactionOptions(undefined)`，字节/深度上限具名默认值）；Minor 2——`inspect_node` 允许字段在 Phase 2 测试中显式枚举（不只断言三组敏感字段缺席）；Minor 3——trivial，不处理。

## Closure Gates

- [x] 新包落地且只读白名单/逐工具裁剪/脱敏/错误归一断言全部为可执行测试（判别机制在案）
- [x] `nop-debugger` 零 AI 依赖边界机械断言落地（synthetic 红证明在案）
- [x] 无被静默降级的 in-scope live defect 或 contract drift
- [x] owner doc 锚点同步（live 基线变化已反映）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck` exit 0
- [x] `pnpm build` exit 0
- [x] `pnpm lint` exit 0
- [x] `pnpm test` exit 0（全部包绿，含新包 19/19）
- [x] `pnpm check` exit 0

## Deferred But Adjudicated

（无——执行中改判须当场落节。）

## Non-Blocking Follow-ups

- `waitForEvent` / form-store 会话控制（startFormStoreDiagnosticsSession 等）作为潜在只读工具的扩展候选：属增量白名单扩展，不阻塞 v1 closure，由 AD-5 联调后按需评估（需人工确认后进 plan）。
- 工具 description 的模型调优措辞：真实模型联调（AD-5）前的措辞迭代属优化候选。

## Closure

Status Note: AD-1 交付完整：新包 `@nop-chaos/nop-debugger-ai`（10 工具只读白名单 + 逐工具投影 + redactData + 字节上限 + 错误归一，19 tests 判别性全绿，先红后绿证据在案）、nop-debugger 零 AI 依赖边界断言（synthetic 红证明 + live 全绿）、redaction 复用导出、脚手架四处接线；执行期三项门禁发现（manifest-deps fixture 拼接、scanner-baselines 349 注册、knip 4 类型私有化）全部当场处置并记录。typecheck/build/lint/test/check 全部 exit 0。

Closure Audit Evidence:

- Auditor / Agent: agent_8f1e0abd（独立 fresh session）
- Evidence: closure audit `approved`（0 Blocker / 0 Major / 3 Minor）——独立复跑新包 19/19、nop-debugger 139/139（含 ai-boundary 4/4）、anchor/scanner 门禁 exit 0，五项全仓门禁复核 exit 0；Minor m1 称 INSPECT_ALLOWLIST 的 tagName/className 为死条目，实况勘误：两字段确为 `NopComponentInspectResult` 字段（`types.ts:312-313`），非死条目；m2 turbo cache replay 已由审计的 live 包级复跑补偿；m3 为审计简报措辞勘误。

Follow-up:

- no remaining plan-owned work（`propose_schema_patch` 归 AD-3，会话面/取点上下文归 AD-2，离线夹具归 AD-5）。
