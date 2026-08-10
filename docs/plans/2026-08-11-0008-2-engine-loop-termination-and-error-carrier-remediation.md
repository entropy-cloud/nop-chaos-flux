# 2 Engine 循环终止面收口：tool-loop-max 终止可见性（marker 归位 + renderer 消费）+ A-5 错误载体回归（ai-invariant-loop）

> Plan Status: active
> Mission: ai-invariant-loop
> Last Reviewed: 2026-08-11
> Source: `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`（R1-F1 [P1]，含事实修正：审计循环顺序误读，live 复核后重述为 marker 错位 + 零消费）、`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`（FIND-03 [P1]）；live repo 核对 2026-08-11（HEAD `ab2a1622`；行号 = 审计时点，执行时 live 复核）
> Source Audits: `docs/audits/2026-08-10-2245-open-audit-ai-invariant-loop.md`、`docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`
> Related: `docs/plans/2026-08-11-0008-1-renderer-contract-wiring-onapproval-and-projection-remediation.md`（renderer 契约接线面 P0/P1）、`docs/plans/2026-08-11-0008-3-conversation-adapter-host-contract-remediation.md`（adapter/宿主契约面 P1）；三者共享 2026-08-10-2245 双审计路由面，closure surface 各自独立

## Purpose

修复本轮双审计的 **engine 循环终止/错误可见性面 2 条 P1**：① **R1-F1（重述后）** —— `maxToolRounds` 循环终止的 `toolLoopMaxReached` marker 写在**错误的载体**上（`create-engine.ts:272-281` 写 `draft.messages[len-1]`，而循环顶 break 时 `len-1` 恒为 executeToolCalls 追加的最后一个 `role:'tool'` 消息，不是触发终止的 assistant），且 **marker 零 renderer 消费** → 循环达上限终止对用户完全不可见，无终止提示；② **FIND-03** —— K-⑩ 空产物 drop 使 A-5 错误气泡 + 重试按钮在「零 chunk 失败轮」结构性不可达（auth 401/429、网络首字节前失败、`onBeforeRequest` 拒绝），用户看到静默失败。

**R1-F1 事实修正（相对审计原文，经独立 review + live 复核双重确认）**：审计声称的"dangling tool_calls + 无限 running 卡"在正常 loop-max 路径上**不可复现**——loop-top break（`:267-283`）在**上一轮 executeToolCalls 完成之后**触发（`rounds` 在 break 检查后才 `+= 1`，第 8 轮 runOnce + executeToolCalls 先于第 9 次 loop-top 检查），`tool-execution.ts:108-119` 为每个 tool_call 追加配对 `role:'tool'` 消息 → `isDanglingToolCallsMessage`（`utils.ts:173-180`）对末条 assistant 返回 false，无 dangling 形状、无协议风险；`executeToolCalls` 逐 call 提交 `state.toolCall[key].status`（`tool-execution.ts:95-106`），工具卡渲染终态（success/failed）而非无限 running。**真正存在的缺陷是**：(1) marker 落在 tool 消息而非 assistant（语义错位，两个既有测试以误导性注释钉住该错位）；(2) marker 零消费者 → 无终止提示。本 plan 按修正后事实收口（不做不存在的 dangling 清理；也不 strip 已配对的 tool_calls——那会破坏用户可见的工具结果）。

收口状态：两条 P1 全部修复（test-first 先红后绿）、AI 包测试全绿、engine.md 失败路径表/⑩ 面枚举同步、bug notes 同步。

## Current Baseline

（live repo 核对，2026-08-11；HEAD `ab2a1622`；行号 = 审计时点）

- **R1-F1（marker 错位 + 零消费，P1）**：`src/engine/create-engine.ts:267-283` loop-top `rounds >= maxToolRounds` break：`:272-281` mutate recipe 对 `draft.messages[len - 1]` 写 `toolLoopMaxReached: true`。**该位置恒为 executeToolCalls 追加的最后一条 `role:'tool'` 消息**（`tool-execution.ts:108-119` 在 assistant 之后 push tool 消息；`engine-snapshot-write-path.test.ts:46-49` 注释明确记载 "The tool message appended by executeToolCalls is the tail when the loop-max path runs"）。触发终止的 assistant（携带 `finishReason:'tool_calls'` + 配对 tool_calls）位于其前一位，**不带 marker**。两个既有测试钉住错位：`engine-snapshot-write-path.test.ts:80-81`（`at(-1)` = tool 消息断言 marker）与 `engine-tool-loop.test.ts:210-212`（`final.messages[length-1]` 注释自称 "Last assistant" 实为 tool 消息）。`toolLoopMaxReached` 消费面 grep 全包仅 engine 写 + 2 个测试，**renderer 零消费者**（无终止提示、无 UI 信号）。snapshot 恒等纪律本身正确（recipe 内 replace，`engine-snapshot-write-path.test.ts:71-83` 断言的正是这一点，保留）。
- **FIND-03（A-5 错误载体回归，P1）**：`src/engine/create-engine.ts:583-585` runOnce catch 调 `commitOrDropResidue()`——git 验证（`84271072~1`）catch 路径曾 `commitAssistant()` 提交空占位（携带错误气泡 + 重试按钮），K-⑩ 修复后 splice 移除（`src/engine/utils.ts:156-162` `isVacuousAssistantResidue`）。零 chunk 失败轮（auth 401/429、网络首字节前失败、`onBeforeRequest` 拒绝）后只留 user 消息；`src/renderers/ai-message-list.tsx:110,126` `isError` 绑定 `idx === messages.length - 1 && message.role === 'assistant'` → 恒 false → A-5 错误气泡与重试入口永不渲染（`src/renderers/ai-bubble/renderers/error.tsx:7-13` 文档化契约）。`ai-chat` 根 `data-state="error"`（`ai-chat.tsx:464`）只是选择器属性无可见 UI；`error-retry.test.tsx` 只用合成 `metadata.isError` 消息（:60,70,83,94），无真实 engine 失败轮测试；`engine-invariants-i4.test.ts:139-157` 钉住 engine 侧 drop（协议洁净目标正确），render 面零覆盖。
- **门禁现状**：`check:ai-engine-invariants` exit 0 零命中；AI 包基线 **76 files / 659 tests 全绿**（2026-08-10 1606-3 收口后）。
- **Bug note 编号**：live 最高 **146**，新增编号 **147+**（三 plan 共享编号区，按提交顺序分配）。
- **授权**：属 `implement` 默认授权；marker 载体修正（写面从 tool 消息移到末条 assistant）与 renderer 消费不改变公共 API 签名 → 不触发结构性重构人工确认门。

## Goals

- R1-F1：`toolLoopMaxReached` marker 写面修正为**末条 assistant**（loop 内最后一条 `finishReason:'tool_calls'` 的 assistant，而非 tool 消息 tail）；renderer **消息级消费**（末条 assistant 带 marker → 渲染「已达工具循环上限」终止 note）；**不 strip 配对 tool_calls**（保留工具结果可见）；两个钉住错位的既有测试随修复更新（`engine-snapshot-write-path.test.ts:80-83`、`engine-tool-loop.test.ts:210-212`），snapshot 恒等纪律保持。
- FIND-03：保留 engine/history/persistence 面的 drop（协议洁净），给 A-5 错误面一个载体——`requestState==='error'` 且末条非 assistant 时渲染 list 级错误横幅（含重试入口）；真实 engine 零 chunk 失败轮 → 错误 UI 集成测试。
- 类别清扫：⑩ 清理面枚举核对（修正后：三个失败面 drop/strip + vacuous 面独立）+ 失败轮 render 载体枚举（A-5 契约核对）。
- 收口：AI 包测试全绿零回归；`check:ai-engine-invariants` 零命中；engine.md 同步（失败路径表 + marker 载体契约 + A-5 错误载体）；bug notes 147+。

## Non-Goals

- 不处理 renderer 契约接线面 P0/P1（FIND-01 / FIND-06，已入 `docs/plans/2026-08-11-0008-1`）。
- 不处理 adapter/宿主契约面 P1（FIND-02 / FIND-04 / FIND-05，已入 `docs/plans/2026-08-11-0008-3`）。
- 不处理 P2（已入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog）。
- **不做不存在的 dangling 清理**：正常 loop-max 路径无未配对 tool_calls（live 证据 `tool-execution.ts:108-119`），不 strip 配对 tool_calls、不 drop 载体；不改变「空产物 drop」的 engine/历史/持久化语义（invariant ⑩ 目标）；不改公共 API 签名。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/engine/create-engine.ts`（R1-F1 loop-max break marker 写面载体修正 + FIND-03 catch 面载体语义决策）。
- `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`（R1-F1 `toolLoopMaxReached` 消息级消费面 + FIND-03 list 级错误横幅面）、`src/renderers/ai-bubble/renderers/error.tsx`（FIND-03 错误载体复用）。
- 回归测试：`src/engine/__tests__/engine-tool-loop.test.ts`（R1-F1 末条 assistant 断言）、`src/engine/__tests__/engine-snapshot-write-path.test.ts`（marker 载体更新）、`src/engine/__tests__/engine-invariants-i4.test.ts`（FIND-03 保持）+ render 面集成测试（真实 engine 失败轮）。
- 文档：`docs/components/flux-renderers-ai/engine.md`（失败路径表 + marker 载体契约 + A-5 契约 + ⑩ 面枚举注记）、bug notes、daily log。

### Out Of Scope

- 其余 P0/P1、全部 P2、公共 API 重构、样式体系改动。

## Failure Paths

| 场景               | 触发                                          | 行为                                                                               | 可重试 | 用户可见表现                                       |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------- | ------ | -------------------------------------------------- |
| tool-loop-max-tail | 连续 8+ 轮工具调用后循环终止（maxToolRounds） | 回归测试 RED；修复后末条 assistant 带 marker，终止 note 渲染，工具卡保持已提交终态 | 是     | 可见「已达工具循环上限」终止提示，工具结果仍可审查 |
| zero-chunk-failure | 零 chunk 失败轮（401/429/网络首字节前失败）   | 回归测试 RED；修复后错误气泡 + 重试入口渲染                                        | 是     | 列表内可见错误与重试按钮                           |

## Test Strategy

本档选择：必须自动化

两条均为已确认 live defect / 用户可见回归，Proof（RED 回归）先于 Fix；render 面测试用真实 engine（mock connector 构造零 chunk 失败与多轮 tool 循环），断言可观测 DOM 结果（终止 note / 错误横幅 / 重试入口）。复杂交互 bug 按 guide 补 bug note（147+）。

## Execution Plan

### Phase 1 — tool-loop-max marker 载体修正 + renderer 终止消费（R1-F1 [P1]，按修正后事实）

Status: planned
Targets: `packages/flux-renderers-ai/src/engine/create-engine.ts`、`src/renderers/ai-message-list.tsx`、`src/engine/__tests__/engine-tool-loop.test.ts`、`src/engine/__tests__/engine-snapshot-write-path.test.ts`、`packages/flux-i18n/src/locales/en-US.ts` + `zh-CN.ts`（i18n key 注册）

- Item Types: `Fix | Proof | Decision`

- [ ] Proof: RED 回归测试（engine 面 marker 载体）——`maxToolRounds` 达上限后：断言**末条 assistant**（`finishReason:'tool_calls'` 的最后一条 assistant，非 tool 消息）`metadata.toolLoopMaxReached === true`；修复前 RED（marker 在 tool 消息上，assistant 无 marker）
- [ ] Proof: RED 回归测试（render 面）——末条 assistant 带 `toolLoopMaxReached` 的消息渲染：断言 termination note 可见且无运行态假象（既有工具卡保持已提交终态）；修复前 RED（无任何终止 UI）
- [ ] Proof: 无害性守卫测试（保持绿）——loop-max 终态：末条 assistant 的 tool_calls 全部有配对 `role:'tool'` 响应（`isDanglingToolCallsMessage` false），历史无 dangling 形状（正常路径本已成立，作为防回归守卫钉住修正后的契约语义）
- [ ] Decision: 裁定 marker 载体策略（MJ-1/MJ-3 审议结论）——**方案 B（marker 归位，不清理）**：loop-top break 的 mutate recipe（`:272-281`）写面从 `draft.messages[len-1]`（tool 消息 tail）改为**末条 assistant**（从 tail 向前跳过 `role:'tool'` 消息定位，recipe 内 read-old → build-new → replace，snapshot 恒等纪律保持）；**不 strip tool_calls、不 drop 载体**（配对形状无协议风险，strip 会破坏用户可见工具结果）；**两个既有测试钉住旧错位，随修复更新**：`engine-snapshot-write-path.test.ts:80-83`（`at(-1)` → 末条 assistant）与 `engine-tool-loop.test.ts:210-212`（同，注释修正），更新属本 phase Fix 一部分（非测试弱化：断言目标从"错误的载体"改为"正确的载体"，语义更严）；`engine-tool-loop.test.ts:207-209` 的 tool 消息计数断言不动。与审计原文的偏差（dangling 清理面第四面不存在）记录入档
- [ ] Fix: `create-engine.ts` loop-top break recipe 写面改为末条 assistant（recipe 内定位 + replace，marker 契约注释同步「marker 归属 = 触发终止的 assistant」）
- [ ] Fix: renderer 消息级消费——`ai-message-list`（或气泡消息级面）末条 assistant 带 `toolLoopMaxReached` 时渲染终止 note（文案走 i18n `t()`，**新 key 注册进 `flux-i18n` en-US/zh-CN**，`check:i18n-keys` 门禁保持绿；无操作栏、非错误态）；既有工具卡渲染路径零改动
- [ ] Fix: 两个既有测试更新（载体断言归位 + 注释修正）+ 无害性守卫测试落位
- [ ] Proof: 类别清扫——⑩ 清理面枚举核对（修正后口径）：tool-no-executor（`:315`）/ abort-mid-executor（`:334`）/ runOnce abort（`:561-576`）三面 dangling 清理 + `commitOrDropResidue`（`:585`）vacuous drop（`isVacuousAssistantResidue`，`utils.ts:156-162`）——**两套谓词区分核对**（dangling 谓词 `utils.ts:173-215` vs vacuous 谓词），结论入档；`toolLoopMaxReached` 写入面（1）与消费面（≥1）grep 清零核对

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则：只写本 Phase 真正交付的可观测结果 + 保证后续 Phase 能继续所必需的局部检查。

- [ ] R1-F1 RED 测试转 GREEN（末条 assistant marker 断言 + render 终止 note 断言）
- [ ] 无害性守卫测试保持绿（无 dangling 形状）+ `engine-tool-loop.test.ts:207-209` tool 消息计数断言零回归
- [ ] 类别清扫记录入档（⑩ 清理面修正后枚举 + marker 消费面 grep 核对）

### Phase 2 — A-5 错误载体回归修复（FIND-03 [P1]）

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`、`src/renderers/ai-bubble/renderers/error.tsx`、`src/engine/__tests__/engine-invariants-i4.test.ts`（保持）、新增 render 集成测试

- Item Types: `Fix | Proof | Decision`

- [ ] Proof: RED 回归测试（集成）——真实 engine（mock connector 抛 401/零 chunk 拒绝）触发失败轮：断言列表内渲染错误气泡 + 重试入口；修复前 RED（无错误 UI）
- [ ] Decision: 裁定错误载体方案——候选：(a) `ai-message-list` list 级错误横幅：`requestState==='error'` 且末条非 assistant 时渲染（`error.tsx` 复用，含重试入口）；(b) 投影面保留 `metadata.isError` 标记 assistant 载体（不污染 live 历史/持久化）。默认倾向 (a)（不改 engine/历史语义，list 级渲染，与 A-5 契约一致）；裁定理由入档
- [ ] Fix: 按裁定实现——list 级错误横幅（或等价载体），`requestState==='error'` 且末条非 assistant 时渲染，含重试入口（复用既有重试行为）；engine 侧 drop 语义不变（`engine-invariants-i4.test.ts:139-157` 保持绿）
- [ ] Proof: 类别清扫——A-5 失败轮渲染面枚举核对：零 chunk 失败 / 流中失败 / 工具轮失败 / connector-missing / abort 五类失败轮的 render 面终态核对（哪类显示错误 UI、哪类显示终止态、哪类无 UI），结论入档；`error-retry.test.tsx` 既有合成用例保持
- [ ] Fix: 测试扩展——真实 engine 零 chunk 失败 → 错误 UI 集成测试 + 重试按钮点击后新轮发起断言

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则同 Phase 1。

- [ ] FIND-03 RED 测试转 GREEN（真实 engine 失败轮错误 UI + 重试入口断言）
- [ ] `engine-invariants-i4.test.ts` 既有 engine 侧 drop 断言零回归
- [ ] 类别清扫记录入档（A-5 失败轮 render 面五类终态核对）

### Phase 3 — 登记处同步 + 收口

Status: planned
Targets: `docs/components/flux-renderers-ai/engine.md`、`docs/bugs/`、`docs/logs/2026/08-11.md`

- Item Types: `Fix | Proof | Follow-up`

- [ ] Fix: `engine.md` 更新——失败路径表 `tool-loop-max` 行补 marker 载体契约（归属末条 assistant）+ renderer 终止 note 语义；A-5 错误载体契约更新（list 级错误横幅）；⑩ 面枚举注记补「正常 loop-max 路径无 dangling（工具响应逐 call 配对）」修正说明
- [ ] Fix: bug notes 147+（R1-F1 marker 载体 + FIND-03，按 guide，含 R1-F1 事实修正说明）
- [ ] Proof: AI 包全量测试 + `pnpm typecheck/lint`（AI 包）零回归；`check:ai-engine-invariants` 零命中
- [ ] Follow-up: daily log `docs/logs/2026/08-11.md` 记录本 plan 收口

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。写法原则同 Phase 1。

- [ ] engine.md / bug notes 同步到位（live 核对一致）
- [ ] AI 包测试全绿零回归 + `check:ai-engine-invariants` 零命中
- [ ] daily log 收口记录落档

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session；Round 1 `ses_0138d4c78ffezDNZffCLeyI3If` fail 1 Major MJ-1；Round 2 `ses_01387825dffeDeSMVNZe5DtFdb` fail 2 Major MJ-2/MJ-3；Round 3 `ses_0137c8eaaffelGvcYD3Kkg3h7P` **pass**）
- Verdict: `pass`（达成共识：零 Blocker / 零 Major，Round 3）
- Rounds: 3
- Findings addressed: MJ-1 载体存活矛盾 + outcome 作用域（Round 2 确认 outcome 子项解决，载体子项重述）；MJ-2 marker 载体矛盾（方案 A strip-not-drop 自相矛盾——已废弃，改方案 B marker 归位不清理，含两既有测试更新披露）；MJ-3 RED 前提不成立（dangling 形状在 break 时不存在——已按 live 证据重述 R1-F1 为 marker 错位 + 零消费）；MI-1 outcome 作用域（方案 B 不调用 cleanDanglingAssistantAt，无该依赖）；MI-2 谓词区分（已并入类别清扫项）；Round 3 Minor（i18n key 注册）已就地并入 Phase 1

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [ ] R1-F1（marker 载体归位 + renderer 终止消费）已修复落地（RED→GREEN 证据在案）
- [ ] FIND-03（A-5 错误载体）已修复落地（真实 engine 失败轮集成测试在案）
- [ ] 类别清扫记录入档（⑩ 清理面修正后枚举 + A-5 失败轮 render 面）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect 或 contract drift
- [ ] 受影响的 owner docs 已同步（engine.md / bug notes / daily log）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### P2 全量（24 条，两审计）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 全部为 P2（非阻断 polish / 文档腐化 / 残余清理），已按 mission-driver 规则入 `docs/backlog/ai-invariant-loop-roadmap.md` Follow-up Backlog（带源审计路径），不阻塞本 plan 的 2 条 P1 收口
- Successor Required: `no`

### R1-F1 审计原文的「dangling 清理第四面」主张

- Classification: `watch-only residual`（事实修正）
- Why Not Blocking Closure: 正常 loop-max 路径无 dangling 形状（live 证据：loop-top break 在 executeToolCalls 完成后触发，`tool-execution.ts:108-119` 逐 call 追加配对 tool 消息；`engine-tool-loop.test.ts:207-209` 计数断言佐证）；本 plan Phase 1 无害性守卫测试将钉住该契约语义，防未来重构改变循环顺序后产生真 dangling 面。若未来重构使该面出现 dangling（如 executeToolCalls 提前返回不追加响应），守卫测试即变红 → 届时按 Loop Rule 派生修复
- Successor Required: `no`

## Non-Blocking Follow-ups

- P2 项处理见 roadmap Follow-up Backlog（2026-08-10-2245 填充节）。
- invariant ⑩ 清理面枚举沉淀为门禁成员的评估：修正后 ⑩ 面枚举 = 三失败面 dangling + vacuous 面；open-audit 总评的「第四面」主张已被事实修正，若未来 enum 门禁化按修正后口径登记（不进本 plan closure 承诺）。

## Closure

Status Note: 待完成时填写。

Closure Audit Evidence:

- Auditor / Agent: 待独立子 agent（fresh session）执行
- Evidence: 待定

Follow-up:

- 待定。
