# {2} flux-renderers-ai Renderer Contract, Resource Lifecycle & Decision-A Remediation

> Plan Status: active
> Last Reviewed: 2026-07-24
> Source: `docs/audits/2026-07-23-2141-open-audit-ai.md` (F1.4, F1.5, F2.1), `docs/audits/2026-07-23-2141-multi-audit-ai.md` (AI-02, AI-04, AI-09, AI-10, AI-11, AI-12, AI-19)
> Related: Plan {1}（engine tier — 本计划依赖其 engine 并发 + error state 落地），Plan {3}（conformance/docs/quality tier）
> Execution Order: 2 — 依赖 Plan {1}：AI-19（onError 真实 cause）需要 engine 写 `lastError` 到 state；AI-12（subscribe 稳定性）在 engine 回合串行化后行为更可预期。

## Purpose

把 `flux-renderers-ai` 的 **renderer 层** 收口到「Decision-A 投影不泄露 engine 内部引用、外部资源（麦克风/blob URL/focus）成对释放、订阅不每 render 重订、错误 cause 真实透传、声明的 schema 契约被实现」的状态。

## Current Baseline

- renderer 层 14 个注册渲染器；本计划聚焦 6 个文件：`ai-chat.tsx`、`ai-voice-input.tsx`、`ai-attachments.tsx`、`ai-tool-call.tsx`、`ai-message-list.tsx`、`schemas.ts`/`ai-renderer-definitions.ts`。
- `ai-chat.tsx:163-171` 把 `engine.messages`（live 内部数组）直接塞进 `useHostScope`（违反 Decision-A `design.md §3`）；`:182-185` `onResponseComplete({message: last})` 同样传 live 引用（AI-09）。
- `ai-voice-input.tsx:86-147`：`recognition` 仅活在闭包，停止分支只 `setStatus('idle')` 不调 `stop()`，无卸载 cleanup（F2.1/AI-04，隐私 + 麦克风泄漏）。
- `ai-attachments.tsx:80` `URL.createObjectURL` 全包零 `revokeObjectURL`（AI-10）。
- `ai-tool-call.tsx:53-69` focus-trap 记录 `prevFocusRef` 但 `!pending` 分支与卸载不 restore（AI-11）。
- `ai-chat.tsx:176-195` subscribe effect deps 含 `props.events`（每 render 新对象）→ 频繁重订、可能丢 transition（AI-12）；`:187` `onError` 回传占位 `new Error('AI request failed')`，真实 cause 丢失（AI-19/F1.5）。
- `schemas.ts:98-101` + `ai-renderer-definitions.ts:82-85` 声明 `groupStrategy`/`dividerRole`/`maxGroupSize`，但 `AiMessageListView` 从不读 `props.groupStrategy`（F1.4，死契约）。

## Goals

- Decision-A 落地：`hostScopeData.messages` 与 `onResponseComplete` 的 message 在交给 host 前快照（深拷贝/structuredClone）（AI-02、AI-09）。
- 外部资源成对释放：SpeechRecognition 入 ref + 停止/卸载调 `stop()`/`abort()`（AI-04）；object URL 在 remove/卸载 `revokeObjectURL`（AI-10）；focus-trap 在 resolve/卸载 restore（AI-11）。
- 订阅稳定：subscribe 仅依赖 `[engine]`，latest events 经 ref 读取（AI-12，`useEffectEvent` ROI 场景）。
- 错误 cause 真实透传：`onError` 收到 engine 真实 error（依赖 Plan {1} 的 `lastError` state）（AI-19/F1.5）。
- schema 契约诚实：`groupStrategy` 系列要么实现、要么从 schema/definition 摘除（F1.4）。

## Non-Goals

- 不动 engine/adapters 内部（归 Plan {1}）；本计划只消费 Plan {1} 落地的 `lastError`/串行化保证。
- 不修样式/UI/doc-tree/test-quality（归 Plan {3}）。
- 不收敛全仓 raw `<button>`（F3.4，observation）。
- 不实现新的 renderer 能力（仅修复既有契约/资源缺陷）。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`ai-voice-input.tsx`、`ai-attachments.tsx`、`ai-tool-call.tsx`、`ai-message-list.tsx`。
- `packages/flux-renderers-ai/src/schemas.ts`、`ai-renderer-definitions.ts`（仅 F1.4 三字段）。
- 对应 `renderers/__tests__/` 新增/回归用例。
- owner-doc：`docs/components/flux-renderers-ai/design.md §3 (Decision-A)`、`§14.1`、`§18.2 INV-11`（仅当本计划改了 projection/event 契约）。

### Out Of Scope

- engine 文件、adapters（`use-message.ts`/`use-conversation.ts`/`ai-component-handle.ts`/`ai-connector-factory.ts`）—— Plan {1}。
- `index.ts`、`styles.css`、`rich-text/`、非 F1.4 的 schema 字段 —— Plan {3}。

## Failure Paths

| 场景                               | 触发                                       | 行为                                       | 可重试 | 用户可见表现                            |
| ---------------------------------- | ------------------------------------------ | ------------------------------------------ | ------ | --------------------------------------- |
| `projection-no-mutation-leak`      | descendant 读 `${messages}` 后 mutate      | 不污染 engine 内部数组（Decision-A）       | 否     | streaming 不追加以半突变树              |
| `voice-mic-released-on-stop`       | 点击停止 / 卸载                            | `recognition.stop()`/`abort()`，麦克风释放 | 是     | 无幽灵麦克风指示；卸载无 stale setState |
| `object-url-revoked`               | 移除附件 / 卸载                            | `revokeObjectURL` 释放 blob                | 否     | 长会话无 blob 累积泄漏                  |
| `focus-restored-after-approval`    | approval resolve / 卸载                    | focus 回到 `prevFocusRef`                  | 否     | 键盘/SR 用户不丢焦点位置                |
| `on-error-real-cause`              | connector 抛 401/500/网络                  | host 收到真实 error（非占位）              | 否     | host 可按 cause 路由提示                |
| `subscribe-transition-not-dropped` | re-render 落在 `processing→completed` 之间 | transition 不丢                            | 否     | `onResponseComplete` 稳定触发           |

## Test Strategy

档位选择：**必须自动化**。

理由：AI-04（麦克风/隐私资源泄漏）、AI-02（Decision-A 跨包契约）为 P1 跨边界缺陷，且当前在全绿下隐藏。资源生命周期与 projection 契约属核心回归路径，对应 Proof 须先于/同时于 Fix。

## Execution Plan

### Phase 1 - Decision-A 投影与事件数据快照

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`

- Item Types: `Proof` → `Fix`

- [ ] **Proof**：新增「descendant/host 持有 `hostScopeData.messages` 后 mutate，engine 内部数组不受影响」用例（AI-02）；当前应失败。
- [ ] **Proof**：新增「`onResponseComplete` 收到的 message 在后续 turn/regenerate 后不被回写改动」用例（AI-09）。
- [ ] **Fix** AI-02：`ai-chat.tsx:163-171` `hostScopeData.messages` 改为快照（`structuredClone(messages)`，或按 Decision-A 收窄为 primitives `messages.length` + 要求 host 走 `component:getMessages`）。
- [ ] **Fix** AI-09：`:182-185` `onResponseComplete({message: last})` 在发出前快照（`structuredClone` 或 shallow `{...last, metadata:{...}, state:{...}}`）。

Exit Criteria:

- [ ] AI-02/AI-09 两个 proof 用例由红转绿；`ai-chat.tsx` 投影/事件 handoff 不传 live engine 引用（代码可证）。

### Phase 2 - 外部资源成对释放

Status: planned
Targets: `ai-voice-input.tsx`、`ai-attachments.tsx`、`ai-tool-call.tsx`

- Item Types: `Proof` → `Fix`

- [ ] **Proof** AI-04：新增「点击停止 → `recognition.stop()` 被调用；卸载 → `abort()` 被调用；卸载后 `onresult`/`onerror` 不再触发」用例（用 spy/mock Ctor）。
- [ ] **Proof** AI-10：新增「移除附件 → 对应 `revokeObjectURL` 被调；卸载 → 全部本地创建 URL 被 revoke」用例。
- [ ] **Proof** AI-11：新增「approval resolve → focus 回 `prevFocusRef`；卸载-while-pending → focus restore」用例。
- [ ] **Fix** AI-04：`ai-voice-input.tsx` `useRef` 持有 recognition；停止分支调 `recognitionRef.current?.stop()`；`useEffect(()=>()=>recognitionRef.current?.abort(),[])`。
- [ ] **Fix** AI-10：`ai-attachments.tsx` 标记 `createdLocally`，`handleRemove` 与卸载 cleanup 对本地创建 URL 调 `URL.revokeObjectURL(a.url)`。
- [ ] **Fix** AI-11：`ai-tool-call.tsx:53-69` `!pending && wasPending` 分支调 `prevFocusRef.current?.focus()` 并清 ref；补 unmount-while-pending cleanup。

Exit Criteria:

- [ ] 三组资源 proof 用例由红转绿；`rg revokeObjectURL` 在包内返回匹配；voice-input recognition 经 ref 持有 + cleanup（代码可证）。

### Phase 3 - 订阅稳定性与错误 cause 透传

Status: planned
Targets: `ai-chat.tsx`

- Item Types: `Proof` → `Fix`

- [ ] **Proof** AI-12：新增「re-render 落在 `processing→completed` transition 之间时 `onResponseComplete` 仍触发；subscribe 不随每次 render 重订」用例。
- [ ] **Proof** AI-19/F1.5：新增「connector 抛 401/网络时 host `onError` 收到真实 cause」用例（依赖 Plan {1} Phase 4 的 engine-half：`create-engine.ts:267-276` catch 写 `state.lastError`）；若 Plan {1} 该项未落地则阻塞。
- [ ] **Fix** AI-12：subscribe effect 改为 latest-events-ref + deps `[engine]`（`useEffectEvent` ROI 场景，renderer-runtime.md），不再随 `props.events` 重订。
- [ ] **Fix** AI-19/F1.5：`:187` `onError({error: state.lastError ?? new Error('AI request failed')})`，非 Error cause 包成 `new Error(String(e), {cause: e})`。前置：Plan {1} Phase 4 engine-half 已写 `state.lastError`。

Exit Criteria:

- [ ] AI-12 proof 用例由红转绿；subscribe deps 不含 `props.events`（代码可证）。
- [ ] AI-19 proof 用例由红转绿（前置：Plan {1} 已提供 `lastError`）。

### Phase 4 - schema 契约诚实（分组）

Status: planned
Targets: `schemas.ts`、`ai-renderer-definitions.ts`、`ai-message-list.tsx`

- Item Types: `Decision` → `Fix`

- [ ] **Decision** F1.4：裁定 `groupStrategy`/`dividerRole`/`maxGroupSize` 是「实现」还是「摘除」。默认倾向摘除（避免死契约），除非有明确近期能力需求。
- [ ] **Fix**（若裁定实现）：`AiMessageListView` 实现 `props.groupStrategy` 分组 + `dividerRole`/`maxGroupSize`，补 proof 用例。
- [ ] **Fix**（若裁定摘除）：从 `schemas.ts:98-101` 与 `ai-renderer-definitions.ts:82-85` 移除三字段，`ai-message-list.tsx` 不再透传 `groupStrategy`。

Exit Criteria:

- [ ] F1.4 三字段状态裁定落地：要么有用例证明分组行为成立，要么三字段从 schema+definition 消失（grep 可证）。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见本 guide 的 `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: independent sub-agent, fresh session（round 1 ses_06de1f97fffePGIXA9TyvifRD9、round 2 ses_06ddb4128ffeEO4m6olqs4APHI）
- Verdict: `pass`（R1 `revised`（1 Blocker）→ 修订 → R2 pass）
- Rounds: 2
- Findings addressed:
  - R1 Blocker B1：AI-19 engine-side `lastError` 写入跨两计划 orphan（Plan 1 disown AI-19、Plan 2 disown engine 内部）。修订：engine-half（`create-engine.ts:267-276` catch 写 `state.lastError` + 加 `lastError?: unknown`）划归 Plan {1} Phase 4；本计划 Phase 3 的 Proof/Fix 改为显式前置依赖 Plan {1} Phase 4 该项。R2 核对 `rg lastError` 零匹配，依赖为真实新增工作。
  - R1 Minor M1：Phase 4 item types `Decision → (Fix | Follow-up)` → `Decision → Fix`（两分支均 Fix，`Follow-up` 为残留）。

## Closure Gates

- [ ] AI-02/AI-09 已修：hostScopeData 与 onResponseComplete 不传 live engine 引用（Decision-A）。
- [ ] AI-04/AI-10/AI-11 已修：麦克风/blob URL/focus 成对释放，proof 用例绿。
- [ ] AI-12 已修：subscribe 稳定，transition 不丢。
- [ ] AI-19/F1.5 已修：onError 真实 cause 透传（依赖 Plan {1}）。
- [ ] F1.4 已裁定并落地（实现 or 摘除）。
- [ ] owner-doc（Decision-A §3/§14.1/§18.2）与 live 行为一致（仅当改了 projection/event 契约）。
- [ ] 不存在被静默降级到 deferred 的 in-scope live defect 或 contract drift。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

（本计划暂无。）

## Non-Blocking Follow-ups

- 无。

## Closure

Status Note: <<关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<pending>>
- Evidence: <<pending>>

Follow-up:

- <<关闭时填写>>
