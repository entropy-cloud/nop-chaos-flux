# 2 flux-renderers-ai P2 Doc Consistency & Test Hardening (2151 audit batch)

> Plan Status: active
> Last Reviewed: 2026-07-25
> Source: `docs/audits/2026-07-24-2151-multi-audit-ai.md`（P2：文档/契约措辞 rot 4 条 + 测试断言强度 6 条 + 跨节的 editing 归属冲突 1 条 + onResponseComplete 契约盲区 1 条，共 12 条文档/测试项）
> Related: `docs/components/roadmap-ai.md`（`### Follow-up Backlog (P2 from audits)` → 2151 批次）、`docs/plans/2026-07-25-0117-1-ai-p2-code-and-behavior-remediation-2151.md`（代码类 P2，先执行）、`docs/plans/2026-07-24-2300-2-ai-p2-doc-consistency-remediation.md`（1757 批文档收口，本计划沿用其模式）

## Purpose

收口 `docs/audits/2026-07-24-2151-*` 两份审计中**纯文档/契约措辞**（6 条）与**测试断言加固**（6 条）的全部 P2 发现，使 `@nop-chaos/flux-renderers-ai` 的 owner 文档与 live code 一致，并堵住上一轮自评盲区点名的「绿测藏雷」家族（弱断言给「绿」的假象）。本计划与 `2026-07-25-0117-1`（代码类）互补：Plan 1 改 live 行为，本计划对齐文档 + 加固 proof。**建议在 Plan 1 落地后执行**，使文档/测试对齐最终代码状态。

## Current Baseline

> 以下 file:line 均经 live repo 核对（2026-07-25）。

### 文档 / 契约措辞 rot（6 条）

- **design.md §74 仍列「分组」能力**：`docs/components/flux-renderers-ai/design.md:74` P0 表 `ai-message-list` 描述含「分组」，但 F1.4 已移除 `groupStrategy`/`dividerRole`/`maxGroupSize`（代码侧 FIXED + `contract-honesty.test.ts` 回归守卫；`renderers.md:95` 已正确）。
- **design.md §13.1 marker 表漏 4 个 marker**：`docs/components/flux-renderers-ai/design.md:578-589` marker 表缺 `nop-ai-citations`/`nop-ai-voice-input`/`nop-ai-token-usage`/`nop-ai-suggestions`——与 §5.1（均已 ✅）矛盾。
- **design.md §11.5 editing 归属冲突**：`docs/components/flux-renderers-ai/design.md:543` 列「消息编辑态（`message.state.editing`）| engine 持有」，但 live code 用组件 `useState`（`user-edit.tsx:36` `const [editing, setEditing] = useState(false)`、`ai-bubble/index.tsx:86` 区域）——引擎无 editing-state setter。后果仅限 >200 消息虚拟回收时编辑态丢失。
- **terminology.md fetcher→stream**：`docs/references/terminology.md:511` 称 `createStreamBasedAiConnector` 桥接 `RendererEnv.fetcher`；代码（及 `design.md §11.4`、`engine.md`）用 `env.stream`——主动误导 host 作者。
- **useMessage 仅热换 connector 无注记**：`adapters/use-message.ts:62-92` 只热换 `connector`；`systemPrompt`/`tools`/`toolExecutor`/`maxToolRounds` mount-time-only 无告警——engine 无此类 setter（设计只承诺 connector 热换），gap 是缺文档注记。
- **onResponseComplete 契约盲区**：`renderers/ai-chat.tsx:233-259` subscribe effect deps `[engine]`——切换引擎后旧引擎 subscription 被 cleanup（`:258` 返回 unsubscribe），故**后台引擎 turn 完成不触发** `onResponseComplete`。行为是 documented keep-alive tradeoff；盲区是该事件契约边界未文档化。

### 测试断言强度（6 条 — 非 fake-green，断言存在但偏弱）

- **ai-token-usage clamp 仅 `.not.toBeNull()`**：`renderers/__tests__/ai-token-usage.test.tsx:95-101`（`:63/:100` 均断言 ring 元素 `.not.toBeNull()`）——不会抓住被移除的 clamp（负 `stroke-dasharray`）。实现 clamp 本身正确。
- **safeMarkdownSlice wiring 未 e2e 断言**：`ai-bubble/renderers/markdown.tsx:28` `const source = safeMarkdownSlice(raw)` 接入 `MarkdownContentRenderer` 无端到端断言——移除该调用（`:28`）全部 47 文件仍绿（跨层 proof gap）。`safeMarkdownSlice` 自身已在 `markdown-buffer.test.ts` 单测。
- **use-message 未测 toolExecutor 转发**：`adapters/__tests__/use-message.test.tsx` 无「`toolExecutor` 转发到 engine」用例（adapter 层 gap；engine 层由 `engine-tool-loop.test.ts` 覆盖）。
- **Timestamp 仅断言 `tagName === 'TIME'`**：`renderers/__tests__/p1-renderers.test.tsx:273-284` 从不断言格式化（时区敏感）label。
- **hitl-no-handler 仅 `.not.toThrow()`**：`renderers/__tests__/ai-tool-call-hitl.test.tsx:66-75` 不复断言 `approval` 保持 `pending`（边界合法的负测，但偏弱）。
- **Markdown sanitize→rehype-raw 无 XSS 回归**：`ai-bubble/renderers/markdown.tsx:34-47` 高风险 `rehypeRaw` 路径无 XSS 回归测试，而低风险 `ai-citations` 路径有。sanitize 跑在 markdown 源串（pre-parse），故 markdown 语法构造的危险 href 依赖 `react-markdown` 的 `urlTransform` 而非包自身闸门（确认 F3.5 仍 live）。

## Goals

- design.md 的能力描述、marker 表、state-ownership 清单与 live code 一致（无 phantom 能力、无遗漏 marker、无未实现归属）。
- terminology.md 与 useMessage 的 IO/热换描述与代码实际行为（`env.stream`、仅 connector 热换）一致。
- onResponseComplete 的事件契约边界（仅 active engine）在 owner doc 显式记录。
- 6 处弱断言加固为能抓住回归的真实断言（值/格式/转发/状态保持）；Markdown `rehypeRaw` 路径有 XSS 回归 proof。

## Non-Goals

- 不改任何渲染器/引擎的 live 行为（行为类修复属 `2026-07-25-0117-1`）。本计划仅改文档与测试断言。
- 不重构 markdown sanitize 管线——XSS 回归测试是**验证加固**；若实证发现真实 XSS 洞，该洞升级为新 P1 finding（out of this plan scope，按新发现处理），不在本计划内修源码。
- 不把编辑态迁引擎（design.md §11.5 冲突以**文档裁定**方式对齐——记录组件 useState 为当前实现 + 虚拟回收限制；迁移留待未来增强计划）。
- 不处理公共面/契约/lifecycle 等 code 类 P2（Plan 1）。

## Scope

### In Scope

- `docs/components/flux-renderers-ai/design.md`（§74 能力表、§13.1 marker 表、§11.5 editing 归属）
- `docs/components/flux-renderers-ai/renderers.md`（若 marker/能力描述交叉引用需同步）
- `docs/references/terminology.md:511`（fetcher→stream）
- `docs/components/flux-renderers-ai/engine.md` 或 `design.md`（onResponseComplete 契约边界注记、useMessage 热换注记）
- `packages/flux-renderers-ai/src/adapters/use-message.ts`（仅补 JSDoc 注记，不改逻辑）
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-token-usage.test.tsx`（clamp 断言加固）
- `packages/flux-renderers-ai/src/renderers/ai-bubble/__tests__/`（safeMarkdownSlice wiring + Markdown XSS 回归）
- `packages/flux-renderers-ai/src/adapters/__tests__/use-message.test.tsx`（toolExecutor 转发）
- `packages/flux-renderers-ai/src/renderers/__tests__/p1-renderers.test.tsx`（Timestamp label）
- `packages/flux-renderers-ai/src/renderers/__tests__/ai-tool-call-hitl.test.tsx`（approval pending 复断言）

### Out Of Scope

- 任何 live 行为变更（Plan 1）。
- markdown sanitize 管线重构 / XSS 洞修复（若发现洞，升级为新 finding）。
- 编辑态迁引擎（文档裁定 only）。

## Failure Paths

> 纯文档 + 测试计划：无对外 API 契约/鉴权/外部集成变更。唯一可测边界为 XSS 实证——若回归测试构造的 payload 在 `rehypeRaw` 路径下逃逸 sanitize，则证明存在真实 XSS（升级为新 P1 finding，不在本计划修源码）。

| 场景编号         | 触发                                               | 预期行为                                                            | 可重试 | 用户可见表现                 |
| ---------------- | -------------------------------------------------- | ------------------------------------------------------------------- | ------ | ---------------------------- |
| `xss-regression` | markdown 源含 `javascript:` href / `<img onerror>` | sanitize + rehypeRaw 后无可执行脚本/危险 href（或升级为新 finding） | 否     | 无 XSS 执行（或记录为新 P1） |

## Test Strategy

本档选择：**建议有测**

理由：6 条测试断言加固是本计划的核心交付（非 boilerplate）；XSS 回归属「核心回归路径」性质的高风险验证。文档条目以「文档内容与 live code 一致」为可观测判定（读文档章节 + 对应代码核对）。

## Execution Plan

> 两条 Workstream：WS1 文档对齐（无代码逻辑变更），WS2 测试加固（仅改测试文件 + use-message JSDoc）。可并行；建议 WS2 在 Plan 1 落地后跑（hitl/token-usage 等测试对象可能被 Plan 1 触及）。

### Workstream 1 - 文档 / 契约措辞对齐

Status: planned
Targets: `docs/components/flux-renderers-ai/design.md`, `docs/components/flux-renderers-ai/renderers.md`, `docs/references/terminology.md`, `docs/components/flux-renderers-ai/engine.md`

- Item Types: `Fix`

- [ ] [Fix] `design.md:74` P0 表 `ai-message-list` 描述移除「分组」，改为「自动滚动、注册制渲染、A-8 虚拟滚动」（与 `renderers.md:95` 对齐；F1.4 已移除 groupStrategy）。
- [ ] [Fix] `design.md:578-589` §13.1 marker 表补 `nop-ai-citations`/`nop-ai-voice-input`/`nop-ai-token-usage`/`nop-ai-suggestions`（与 §5.1 一致；逐条核对 `rg "nop-ai-" packages/flux-renderers-ai/src/renderers` 根集合）。
- [ ] [Fix] `design.md:543` §11.5 editing 归属：裁定为「当前实现 = 组件 `useState`（`user-edit.tsx`/`ai-bubble/index.tsx`），引擎无 editing-state setter；后果 = >200 消息虚拟回收时编辑态丢失」——把「engine 持有」改为如实描述组件持有的现状 + 限制注记（Decision：以低风险文档对齐收口，不迁引擎）。
- [ ] [Fix] `terminology.md:511` 把 `RendererEnv.fetcher` 改为 `RendererEnv.stream`（与 `design.md §11.4`/`engine.md`/代码一致）。
- [ ] [Fix] `use-message.ts:62-92` 补 JSDoc 注记：「仅 `connector` 热换；`systemPrompt`/`tools`/`toolExecutor`/`maxToolRounds` 为 mount-time-only（engine 无此类 setter）」；并在 `engine.md` 或 `design.md` 对应章节同步该限制说明。
- [ ] [Fix] onResponseComplete 契约边界：在 `engine.md`（或 `design.md` 事件契约章节）显式记录「`onResponseComplete` 仅对 active engine 的 turn 触发；切换引擎后后台引擎 turn 完成不触发（`ai-chat.tsx:233-259` subscribe deps `[engine]` 的 cleanup 行为）」。

Exit Criteria:

> 文档类：Exit Criteria 写具体文件路径 + 章节 + 与 live code 一致性。

- [ ] `design.md:74` 不再含「分组」；§13.1 marker 表含全部 4 个补齐 marker。
- [ ] `design.md:543` editing 归属描述与组件 useState 实现一致（含虚拟回收限制）。
- [ ] `terminology.md:511` 用 `env.stream`；`use-message.ts` 有热换限制 JSDoc；onResponseComplete 契约边界已记录。
- [ ] 抽查：文档章节内容与 live code 行为逐一对应（读者可在仓库核对）。

### Workstream 2 - 测试断言加固

Status: planned
Targets: `renderers/__tests__/ai-token-usage.test.tsx`, `renderers/ai-bubble/__tests__/`, `adapters/__tests__/use-message.test.tsx`, `renderers/__tests__/p1-renderers.test.tsx`, `renderers/__tests__/ai-tool-call-hitl.test.tsx`

- Item Types: `Proof`

- [ ] [Proof] `ai-token-usage.test.tsx:95-101`：clamp 用例断言实际 clamped 值——读 `[data-slot="ai-token-usage-ring"]` 的 `stroke-dasharray`（或等价可观测属性），断言 ratio 被 clamp 到 ≤1.0（used > limit 时 `stroke-dasharray` 不为负/超界），而非 `.not.toBeNull()`。
- [ ] [Proof] safeMarkdownSlice wiring：新增/增强 `MarkdownContentRenderer` 端到端用例——构造一个会被 `safeMarkdownSlice` 截断的流式中途 markdown（如未闭合 fence），断言渲染输出被正确截断（移除 `markdown.tsx:28` 调用后该测试必红）。
- [ ] [Proof] `use-message.test.tsx`：增用例——传 `toolExecutor` → 断言 engine 收到该 `toolExecutor`（adapter 层转发，与 engine 层 `engine-tool-loop.test.ts` 互补）。
- [ ] [Proof] `p1-renderers.test.tsx:273-284` Timestamp：断言格式化 label（用固定时间 + 容忍时区格式，或断言含日期/时间成分），非仅 `tagName === 'TIME'`。
- [ ] [Proof] `ai-tool-call-hitl.test.tsx:66-75`：no-handler 用例除 `.not.toThrow()` 外，复断言 `approval` 保持 `pending`（状态未被改动）。
- [ ] [Proof] Markdown XSS 回归：新增 `rehypeRaw` 路径 XSS 用例——构造 `javascript:` href、`<img onerror>`、嵌套/属性分裂型 payload，断言 sanitize + rehypeRaw 后无可执行脚本/危险 href。**若实证发现逃逸**：记录为新 P1 finding（`docs/bugs/`），不在本计划修源码，本计划只保证「回归测试存在且能抓住」。

Exit Criteria:

- [ ] 6 处断言加固为真实断言（值/格式/转发/状态保持/XSS），revert-sensitive（被测行为被移除/削弱后测试必红）。
- [ ] XSS 回归测试存在；若发现真实洞，已按新 finding 记录（升级路径明确）。
- [ ] `pnpm --filter @nop-chaos/flux-renderers-ai test` 通过（test count 不减少）。

## Draft Review Record

> 起草后、执行前的独立审查证据（见本 guide `Plan Review Rule`）。由独立 fresh-session 子 agent 填写。

- Reviewer / Agent: independent fresh-session general sub-agent (`ses_06adb1f2cffe4i2p5bJ4kWGGVq`)，独立复核未复用起草者上下文
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: zero Blocker、zero Major → 第 1 轮即达成共识。13 项 file:line 抽查全部经 live code 核对确认（含 design.md:74「分组」、§13.1 marker 表缺 4、§11.5:543 engine 持有 vs 组件 useState、terminology.md:511 fetcher、6 处弱断言、rehypeRaw 无 XSS 回归）；覆盖核对：12 条 doc/test P2 全覆盖、与 Plan 1 切分边界干净（38 条 = 25 code + 12 doc/test + 1 watch-only，无重叠无遗漏）；Closure Gates 四项保留判定正确（本计划触及测试文件 + use-message.ts JSDoc，非纯文档，test/lint 必留，typecheck/build 兜底合理）。Minor（已处理）：Source 行 audit-of-origin 记账校正（multi-audit 贡献 6 条 doc 项跨 3 节，非「4 条」；onResponseComplete 属 multi-audit 非开 open-audit）；ai-bubble/index.tsx isEditing 行 `:85→:86` 邻近漂移。XSS 升级框架（发现真实洞→升级新 P1 finding，非静默 defer）与 §11.5 文档裁定（Rule 14：文档描述当前设计）均裁定 honest。

## Closure Gates

> 文档 + 测试类计划。全量 `pnpm typecheck/build/lint/test` 在此跑一次。注：纯文档变更无需 build/typecheck，但本计划含测试文件改动（WS2）+ JSDoc，故保留 test/lint；typecheck/build 因仅触及测试与注释可保留以兜底。

- [ ] 6 条文档/契约措辞 P2 与 live code 一致（章节路径可核）。
- [ ] 6 条测试断言加固为 revert-sensitive 真实断言。
- [ ] Markdown XSS 回归测试存在；发现的洞（若有）已升级为新 finding 而非静默吞掉。
- [ ] 不存在被静默降级到 deferred/follow-up 的 in-scope owner-doc drift。
- [ ] 受影响 owner docs（design.md / renderers.md / terminology.md / engine.md）已同步到 live baseline。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 编辑态从组件 useState 迁引擎

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 引擎无 editing-state setter，迁移需扩 MessageEngine 公共面 + 改 useConversation/bubble 数据流，属高风险架构变更，超出 P2 polish 范围。当前组件 useState 实现功能正确，后果仅限 >200 消息虚拟回收时编辑态丢失（审计裁定 P2）。本计划以文档裁定（design.md §11.5 如实记录组件持有 + 限制）收口契约冲突。
- Successor Required: `yes`
- Successor Path: 未来增强计划（待 engine state-ownership 演进时评估）

## Non-Blocking Follow-ups

- markdown `sanitize→rehypeRaw` 组合 XSS 深挖：本计划仅保证回归测试存在；若回归测试发现真实洞，升级为新 P1 finding 后由独立修复计划收口。
- F3.1 残留 memo（watch-only，见 Plan 1 Deferred）。

## Closure

Status Note: <<完成时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立审计者>>
- Evidence: <<task id / daily log link / findings 摘要>>

Follow-up:

- <<只记录 non-blocking follow-up；confirmed live defect 不得出现在这里>>
