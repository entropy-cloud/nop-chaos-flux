# AI Input Behavior & Docs Contract Remediation

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: `docs/audits/2026-07-24-1757-open-audit-ai.md` (O-3), `docs/audits/2026-07-24-1757-multi-audit-ai.md` (P1#4–P1#9)
> Related: Plan 1 `2026-07-24-1757-1-ai-message-snapshot-contract-remediation.md`

## Purpose

收口 `flux-renderers-ai` 两类"对外契约面诚实度"缺陷：(1) 发送路径缺 IME 组合态守卫导致中文/日文输入法选词被误判为提交；(2) `engine.md`/`design.md`/`renderers.md` 的 schema/类型/方法表与 live code 不一致，schema 作者照抄得到静默 no-op。

## Current Baseline

- **IME（O-3）**：两条发送路径都不查 `isComposing`：
  - Textarea 路径 `renderers/ai-sender.tsx:32-38`：`shouldSubmit` 仅查 `event.key`/`shiftKey`/`ctrlKey`，`:81-86` `handleKeyDown` 直接提交。`submitType:'enter'` 是默认值（`:45`），即开箱即中招。
  - Tiptap 路径 `rich-text/tiptap-sender.tsx`：`:135-147` Enter keymap（`mode==='enter'` → `onSubmit()`）与 `:184-205` `handleKeyDown`（popup 打开时 `Enter` → `ctrl.confirm()`）都不查 `isComposing`。
  - 全仓 `rg "isComposing|keyCode === 229|composing" packages/flux-renderers-ai/src/`（排除 node_modules/dist）零命中——既无 guard 也无 IME 测试（"composition" 一词仅在 `index.ts` 注释中出现 2 次，与 IME 无关）。项目以中文语境主导、依赖 `@nop-chaos/flux-i18n`，输入法回车是高频路径。
- **Doc-code 漂移（P1#4–P1#9）**：
  - P1#4：`engine.md:289` 文档 `delta.tool_calls?: ChatToolCall[]`；实际 `engine/types.ts:165` 是 `AiConnectorDeltaToolCall[]`（`id`/`type`/`function` 可选，partial-streaming 协议）。
  - P1#5：`design.md:614-625` ComponentHandle 表 5 行缺 `regenerate`；`:434` 写"分发 5 个逻辑方法名"。实际 `ai-component-handle.ts:10-17` `AI_COMPONENT_METHODS` 含 `regenerate`（6 个）。
  - P1#6：`engine.md:251-261` `UseConversationReturn` 8 字段缺 `controller`。实际 `use-conversation.ts:47-59` 9 字段（含 `controller: AiConversationControllerBridge`）。
  - P1#7：`renderers.md:346-363` `AiAttachmentsSchema` 文档 `items?`/`mode?:'image'|'card'`/phantom `fileMatchers`+`onRemove`；实际 `schemas.ts:277-297` 是 `value?: SchemaValue`/`mode?:'image'|'card'|'auto'`/`enableDrop?`/`onChange?`，无 `fileMatchers`/`onRemove`。
  - P1#8：`renderers.md:69-79` `AiMessageListSchema` 文档 `groupStrategy`/`dividerRole`/`maxGroupSize`；实际 `schemas.ts:95-100` 仅 `autoScroll`/`itemRegion`/`emptyRegion`。三字段全仓代码零命中（已从代码侧移除，文档残留）。
  - P1#9：`renderers.md:368-381` `AiToolCallSchema` 文档 `showResult`/`onToggle`；实际 `schemas.ts:246-261` 仅 `toolCall`/`state`/`defaultOpen`/`onApproval`。`onToggle` 仅是 `AiToolCallView` 的 view-only prop，schema 不可达。

## Goals

- 中文/日文/韩文输入法按 Enter 确认候选词时，Textarea 与 Tiptap 两条发送路径都**不触发** `onSubmit`/popup-confirm。
- `engine.md`/`design.md`/`renderers.md` 的 schema 字段表、类型表、方法表与 live code 一致——schema 作者照抄得到的字段/方法/类型在代码中真实存在。

## Non-Goals

- 不改引擎消息快照不变性契约（Plan 1 范围）。
- 不实现 `renderers.md` 残留的 phantom 字段（如 `groupStrategy`）——本计划是**删除文档幻觉**，非补实现。
- 不处理 P2 级别项（已移入 `roadmap-ai.md` Follow-up Backlog）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-sender.tsx`（`shouldSubmit` IME 守卫）
- `packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx`（Enter keymap + `handleKeyDown` IME 守卫）
- `docs/components/flux-renderers-ai/engine.md`（§8.6 `UseConversationReturn` controller 字段；§9.2 `tool_calls` 类型）
- `docs/components/flux-renderers-ai/design.md`（§14.3 ComponentHandle `regenerate` 行；§11.1 计数 5→6）
- `docs/components/flux-renderers-ai/renderers.md`（§9.2 `AiAttachmentsSchema`；§2.1 `AiMessageListSchema` phantom 字段；§10.1 `AiToolCallSchema` phantom 字段；§13 Events phantom `onRemove`）

### Out Of Scope

- `engine.md`/`design.md`/`renderers.md` 的 P2 级 line-rot（见 multi-audit P2 batch；已入 Backlog）
- `terminology.md` AI 词条（P2）、`AGENTS.md` 包列表补 AI 项（P2）

## Failure Paths

| 场景编号              | 触发                                                                 | 预期行为                        | 可重试 | 用户可见表现             |
| --------------------- | -------------------------------------------------------------------- | ------------------------------- | ------ | ------------------------ |
| `ime-composing-enter` | IME 组合态（`isComposing===true` 或 `keyCode===229`）下按 Enter 选词 | 不触发 `onSubmit`/popup-confirm | 否     | 输入选词正常，不误发消息 |

## Test Strategy

档位选择：**建议有测**。Phase A（IME）是用户可感知的 i18n 回归，需 focused 测试（`dispatchEvent` 模拟 `isComposing:true` 的 Enter）；Phase B 是纯文档，不涉及行为变更，测试不适用。

## Execution Plan

### Phase A - IME composition guard for send paths

Status: completed
Targets: `packages/flux-renderers-ai/src/renderers/ai-sender.tsx:32-38,81-86`, `packages/flux-renderers-ai/src/rich-text/tiptap-sender.tsx:135-147,184-205`

- Item Types: `Proof | Fix`

- [x] [Proof] 新增 `ai-sender` 测试：`dispatchEvent` 一个 `KeyboardEvent('keydown', { key:'Enter', isComposing:true })`（及 `keyCode===229` 变体），断言 `onSubmit` **未被调用**；同样事件但 `isComposing:false` 时 `onSubmit` **被调用**（`submitType:'enter'` 默认）。
- [x] [Fix] `ai-sender.tsx:32-38` `shouldSubmit`：首行加 `if (event.nativeEvent.isComposing || event.keyCode === 229) return false;`。
- [x] [Fix] `tiptap-sender.tsx:135-147` Enter keymap 分支：`addKeyboardShortcuts` 回调签名是 `Enter: ({ editor }) =>`，**只有 `editor` 在作用域内，原生 `event` 不可达**——故此处只能查 `editor.view.composing`（ProseMirror 的组合态标记）：组合态中 `return false`（不提交，让 IME 处理）。
- [x] [Fix] `tiptap-sender.tsx:184-205` `handleKeyDown`：popup 打开时的 `Enter` 分支前加 `if (event.isComposing || event.keyCode === 229) return false;`（组合态中不 confirm popup，交还 IME）。

Exit Criteria:

- [x] `rg "isComposing|keyCode === 229|composing" packages/flux-renderers-ai/src/` 命中 `ai-sender.tsx` + `tiptap-sender.tsx` 的守卫（非零命中）。
- [x] Phase A 的 Proof 测试通过（组合态 Enter 不触发提交）。
- [x] 非 IME 路径行为未回归（`isComposing:false` 的 Enter 仍正常提交）。

### Phase B - Doc-code contract sync (schema/type/method tables)

Status: completed
Targets: `docs/components/flux-renderers-ai/{engine,design,renderers}.md`

- Item Types: `Fix`

- [x] [Fix] P1#4 `engine.md:289`：`tool_calls?: ChatToolCall[]` → `tool_calls?: AiConnectorDeltaToolCall[]`，加一行注区分 partial-streaming 变体与 finalized `ChatToolCall`。
- [x] [Fix] P1#5 `design.md:614-625`：ComponentHandle 表加 `regenerate` 行（`{ }` → `重新生成最后一条 assistant 消息（记 branchId）`）；`design.md:434` "分发 5 个逻辑方法名" → "6 个"。
- [x] [Fix] P1#6 `engine.md:251-261`：`UseConversationReturn` 加 `controller: AiConversationControllerBridge` 字段 + 一行注指向 design.md §11.1 Layer B。
- [x] [Fix] P1#7 `renderers.md:346-363`：用实际 `AiAttachmentsSchema`（`value?: SchemaValue`/`mode?:'image'|'card'|'auto'`/`enableDrop?`/`onChange?`）替换；删 phantom `fileMatchers`/`onRemove`。同步 §13 Events 表删 phantom `onRemove`。
- [x] [Fix] P1#8 `renderers.md:69-79`：删 `groupStrategy`/`dividerRole`/`maxGroupSize` 三 phantom 字段；`:84` "groupStrategy 用 render-time 派生" 注一并删除。
- [x] [Fix] P1#9 `renderers.md:368-381`：删 `showResult`/`onToggle`；注 `onToggle` 仅是 view-only prop，schema 不可达。

Exit Criteria:

- [x] 逐条核对：每处文档字段/类型/方法名在 `packages/flux-renderers-ai/src/` 真实存在（`rg` 核对）。
- [x] `rg "groupStrategy|dividerRole|maxGroupSize" docs/components/flux-renderers-ai/` 零命中（或仅出现在"已移除"注记中）。
- [x] `renderers.md` §9.2/§2.1/§10.1 字段表与 `schemas.ts` + `ai-renderer-definitions.ts` 一致。
- [x] `design.md` §14.3 表 6 行含 `regenerate`；§11.1 计数为 6。

## Draft Review Record

> 由独立子 agent（fresh session）填写。

- Reviewer / Agent: fresh sub-agent `ses_06c0617dfffeuP392xFVsqaage`（Round 1）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - **[Minor → 已修复]** Current Baseline 的 `rg` pattern 用 "composition" 有 2 处 benign 注释命中——已改为 "composing" 并注明 "composition" 仅在 `index.ts` 注释出现。
  - **[Minor → 已修复]** Tiptap Enter keymap 的 `addKeyboardShortcuts({editor})` 回调中原生 `event` 不可达——已明确此处只能用 `editor.view.composing`，移除"或 `event.isComposing`"的歧义措辞。
  - **[Minor → 已修复]** In-Scope 列了 P2 项 `onScrollTop`（实为 deferred）——已从 In-Scope 移除。
- 引用准确性：23 处代码/文档引用逐条核对，全部 CONFIRMED（含 `rg "isComposing|keyCode === 229|composing"` 零命中、`groupStrategy` 等仅存在于 `contract-honesty.test.ts` 回归断言中）。

## Closure Gates

> 本 plan 含 Phase A（代码）+ Phase B（纯文档）。Closure Gates 按 guide 规则：代码变更需全量验证；纯文档计划可省 `pnpm test/lint/typecheck/build`，但因 Phase A 有代码变更，全量验证保留。

- [x] O-3：两条发送路径都有 IME 组合态守卫；组合态 Enter 不触发提交；有回归测试
- [x] P1#4–P1#9：`engine.md`/`design.md`/`renderers.md` 的 schema/类型/方法表与 live code 一致
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope contract drift
- [x] 受影响 owner docs 已同步（Phase B 本身即 owner-doc 修复）
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

（暂无。）

## Non-Blocking Follow-ups

- （P2 项见 `docs/components/roadmap-ai.md` `## Follow-up Backlog`，不在本 plan 收口）

## Closure

Status Note: Phase A（IME 组合态守卫）+ Phase B（owner-doc schema/类型/方法表与 live code 对齐）全部落地。两条发送路径（Textarea `shouldSubmit`、Tiptap Enter keymap `editor.view.composing`、Tiptap popup `handleKeyDown` `isComposing`/`keyCode===229`）在组合态下都不再触发提交/确认，且有双向回归测试（组合态不提交 + 非组合态仍提交）。文档侧 `tool_calls` 类型、`UseConversationReturn.controller`、ComponentHandle `regenerate`（5→6）、以及三处 phantom schema 字段（`AiAttachmentsSchema`/`AiMessageListSchema`/`AiToolCallSchema`）+ §13 phantom events 已与 `schemas.ts`/`engine/types.ts`/`ai-component-handle.ts`/`use-conversation.ts` 对齐。全量 `typecheck/build/lint/test` 绿（flux-renderers-ai 351/351）。独立 fresh-session closure audit 已 pass。

Closure Audit Evidence:

- Auditor / Agent: independent closure-audit sub-agent (fresh session)
- Evidence: 独立 re-verify（不信任执行 session 自报），全部 CONFIRMED：
  - **Phase A 守卫落位**（`rg "isComposing|keyCode === 229|composing"` 命中三处，并逐处读上下文确认位于提交/confirm 动作之前 return false）：`ai-sender.tsx:36` `shouldSubmit` 首行 `if (event.nativeEvent.isComposing || event.keyCode === 229) return false;`；`tiptap-sender.tsx:142` Enter keymap `if (editor.view.composing) return false;`（先于 `callbacksRef.current.onSubmit()`）；`tiptap-sender.tsx:197` `handleKeyDown` 在 `state.kind === 'none'` guard 之后、`ctrl.confirm()` 之前 `if (event.isComposing || event.keyCode === 229) return false;`。
  - **Phase A 测试真实非 tautology**：`ai-sender-ime.test.tsx` 4 例——组合态(isComposing=true / keyCode 229)断言 `onSubmit` NOT called + 非组合态(isComposing:false / 默认)断言 `onSubmit` called('hello')，双向断言；`tiptap-sender-ime.test.tsx` 2 例——Enter keymap 组合态不提交 + 恢复后提交；popup-confirm 组合态 Enter 不 confirm 且 'alice' 未插入。
  - **Phase B live-code 存在性逐条核对**：`engine/types.ts:165,174` `AiConnectorDeltaToolCall`；`use-conversation.ts:58` `controller: AiConversationControllerBridge`（bridge 类型 :355，`UseConversationReturn` 9/9 字段与 engine.md:251-266 完全一致）；`ai-component-handle.ts:10-17` `AI_COMPONENT_METHODS` 6 个含 `regenerate`；`schemas.ts:95-100` AiMessageListSchema 仅 autoScroll/itemRegion/emptyRegion；`:246-261` AiToolCallSchema 仅 toolCall/state/defaultOpen/onApproval；`:277-297` AiAttachmentsSchema value/mode('image'|'card'|'auto')/enableDrop/onChange/onError/onUpload（无 items/fileMatchers/onRemove）。
  - **Phase B doc↔code 一致**：engine.md:301 `tool_calls?: AiConnectorDeltaToolCall[]`+partial 注；:265 controller 字段；design.md §11.1:434「分发 6 个逻辑方法名」+ 列全 6 个 +「(6 个)」；§14.3 表 :618-625 含 regenerate 行；renderers.md §2.1:70-78 / §9.2:347-363 / §10.1:370-380 字段表与 live schema 一致且含「不存在」注记；§13 Events:568-569 ai-attachments 仅 onChange/onError/onUpload（无 onRemove）、ai-tool-call 仅 onApproval（无 onToggle）。
  - **Phantom 清理**：`rg "groupStrategy|dividerRole|maxGroupSize" docs/components/flux-renderers-ai/` 仅命中 renderers.md:78 的「不存在」注记（合规）；live schema 零命中；`contract-honesty.test.ts` 命中为回归断言守卫（验证三字段确实已从代码移除），非残留。
  - **复跑验证**（本 session 自跑，非采信自报）：`pnpm --filter @nop-chaos/flux-renderers-ai test --run` → 43 files / 351 tests passed；`typecheck` clean；`lint` clean。
  - **Deferred 诚实性**：P2 line-rot 与 O-4 在 plan `Out Of Scope` + `roadmap-ai.md` Backlog 明确标注，非静默降级；`Deferred But Adjudicated` 为空，无 in-scope 契约漂移被藏入 follow-up。
  - 结论：Phase A + Phase B 全部 exit criteria 真实满足，可标 completed。

Follow-up:

- no remaining plan-owned work. P2 line-rot 与 O-4 按本 plan `Out Of Scope` 裁定保留在 `docs/components/roadmap-ai.md` `## Follow-up Backlog`（非 in-scope live defect，非静默降级）。
