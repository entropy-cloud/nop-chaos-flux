# 01 ai-chat External-Engine Injection (useConversation Unification)

> Plan Status: completed
> Last Reviewed: 2026-07-24
> Source: deferred item from `docs/plans/2026-07-24-1800-1-a4-flux-renderers-ai-p3-persistence-citations-hitl.md` (`Deferred But Adjudicated` → "ai-chat ↔ useConversation 引擎统一"); `docs/components/flux-renderers-ai/design.md` §11.2/§11.5; `docs/components/roadmap-ai.md`
> Related: A4 plan (persistence), A5 plan (host integration), roadmap A6 (Tiptap — NOT in scope, human-gated)

## Purpose

收口 `ai-chat` 渲染器与 `useConversation` host helper 之间的"双 engine 分裂"：让 `ai-chat` 能绑定 host 注入的外部 `MessageEngine`（即 `useConversation.activeEngine`），从而在会话管理 / 持久化场景下也能享受 `ai-chat` 的全部能力（regions、Layer B action namespace、Layer C ComponentHandle、host scope projection）。当前持久化示例页被迫绕过 `ai-chat`、手工拼装 `AiMessageListView` + `AiSenderView` 来回避该分裂。

## Current Baseline

> 基于 live repo 核对（`packages/flux-renderers-ai/src/`、`apps/playground/src/pages/`），非沿用旧计划结论。

- `ai-chat.tsx:58` **无条件**调 `useMessage({ connector, systemPrompt, initialMessages, tools, toolExecutor, maxToolRounds })` → 经 `use-message.ts:54` 的 `useState` 惰性初始化**自建**一个 `MessageEngine`。
- `useConversation`（`use-conversation.ts:60`）返回 `activeEngine: MessageEngine | null`（每会话一个，切换时懒创建/释放）+ `controller: AiConversationControllerBridge`（CRUD：create/switch/delete/rename，`use-conversation.ts:298-306`）。
- 两个 engine **互不感知**：host 同时用 `ai-chat` + `useConversation` 时，`ai-chat` 的消息活在自建 engine 里，与 `useConversation.activeEngine`（被 storage 同步的那个）完全断开。`conversationController` 只桥接 CRUD 动作，**不**桥接 engine 实例或消息。
- 持久化示例页 `ai-persistence-demo.tsx:37-40` 明确记录此限制并绕过：
  > "the `ai-chat` renderer currently owns its own engine (independent of `useConversation`), so unifying `ai-chat` with the conversation manager's engines is tracked as a host-level follow-up. This demo composes `ai-message-list` + `ai-sender` directly to demonstrate real persistence."
- 该示例页内置了私有 `useEngineView(engine)` helper（`ai-persistence-demo.tsx:135-155`）——把一个已存在的 `MessageEngine` 经 `useSyncExternalStore` 绑定到 React，产出 `AiChatContextValue` 所需的 `{ engine, messages, requestState, processingState, isProcessing, sendMessage, abortRequest }`。这正是外部 engine 绑定模式，但被锁在示例页里、未进包导出。
- design.md §11.5（`design.md:467`）："单会话 `engine` 实例 | **域内部** | `useConversation` 内部 Map | 不可进 scope（含函数/handler）"。但 `connector` / `toolExecutor` / `conversationController` **已经是**经 `SchemaValue` 解析的 host 对象（函数/方法），通过 page-data 或 `xui:imports` 注入（`ai-conversations-demo.tsx:50-59` 构建 `pageData.controller`，schema 经 `${controller}` 相对 scope 读）。因此经同样路径注入 engine 实例与现有模式一致——"不可进 scope"约束的是反应式 scope 快照，不是 resolved prop 值。
- 这是一个**已确认的 deferred 项**（A4 plan `Deferred But Adjudicated`），分类为 host-level non-blocking integration，标 "A5 host 集成时评估"；但 A5 的 scope 是 P4 高级集成（form 序列化 / data-source / 语音 / 分支 / token / 建议），未触及此重构。

## Goals

- `ai-chat` 接受可选的外部 `MessageEngine`（经 schema `engine` prop 解析）；提供时绑定它而非自建，从而在 `useConversation` 会话管理 / 持久化场景下复用 `ai-chat` 全部能力。
- 不提供外部 engine 时，`ai-chat` 行为与现状**完全一致**（自建 engine）——零回归。
- 外部 engine 绑定模式从示例页私有 helper 提升为包内公共导出 hook，消除重复。
- 持久化示例页改用 `ai-chat`（移除手工拼装 `AiMessageListView`+`AiSenderView` 的 workaround），证明端到端可用。

## Non-Goals

- A6 Tiptap 富文本（roadmap 标 "可选；启动前需人确认"——不在本计划，需人确认后才可启动）。
- server-side storage 实现（INV-13，host 关注点，包内仅接口契约）。
- 改动 `useConversation` 的 engine 生命周期（懒创建 / 切换释放 / 后台流式保持现状）。
- 多 engine 扇出、非活跃会话的后台流式聚合。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/adapters/`：提取公共"绑定已存在 engine"hook；`useMessage` 内部复用该绑定逻辑（DRY）。
- `packages/flux-renderers-ai/src/schemas.ts`：`AiChatSchema` 增可选 `engine?: SchemaValue`。
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`：当 `resolved.engine` 解析为 `MessageEngine` 时绑定外部 engine，否则走自建路径。
- `packages/flux-renderers-ai/src/index.ts`：导出新 hook + 类型。
- `apps/playground/src/pages/ai-persistence-demo.tsx`：改用 `ai-chat`（经 schema `engine` 绑定 `conversations.activeEngine`），移除私有 `useEngineView` + 手工拼装。
- 受影响 focused 单测 + e2e（持久化刷新恢复走 `ai-chat`）。
- owner-doc 同步（design.md §5.1/§11.2/§11.5、renderers.md、roadmap-ai.md 记 deferred 项收口）。

### Out Of Scope

- Tiptap / 富文本 sender 扩展。
- 新增 connector / storage 实现。
- 改变 engine 的核心流式累积算法或插件链。
- 非 `ai-chat` 渲染器的 engine 注入（`ai-bubble` standalone 等不受影响）。

## Failure Paths

| 场景编号                   | 触发                                                            | 行为                                                                                | 可重试                         | 用户可见表现                                                                   |
| -------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| `engine-prop-not-engine`   | `engine` prop 解析到非 `MessageEngine` 值（host 误注）          | 视为未提供，回退自建 engine（与 `connector-missing` 同级降级，不崩溃）              | 否                             | chat 正常可用，但用的是自建 engine（与外部 conversation 不同步）——console warn |
| `engine-null-switch`       | 切换会话瞬间 `activeEngine` 为 `null`（旧会话释放、新会话未建） | `ai-chat` 渲染 emptyState / "选择会话" 提示，不渲染消息列表                         | 是（新 engine 到位后自动恢复） | 空状态提示                                                                     |
| `external-engine-disposed` | 绑定的外部 engine 已被 `useConversation` 释放（切换走时）       | `useSyncExternalStore` getSnapshot 返回 last good snapshot，下一次渲染拿到新 engine | 是                             | 短暂空状态后恢复                                                               |

## Test Strategy

本档选择：**建议有测**

理由：新增 renderer 公共契约（`engine` prop）+ 改动示例页集成路径。非鉴权 / 非对外 API 契约 / 非核心路由，不强制"必须自动化"；但需 focused 单测验证 (a) 外部 engine 绑定路径、(b) 自建回退路径不变、(c) engine 切换不崩，以及 e2e 覆盖持久化刷新恢复走 `ai-chat`。

## Execution Plan

### Phase 1 - 提取公共 engine-view hook + 重构 useMessage

Status: completed
Targets: `packages/flux-renderers-ai/src/adapters/use-message.ts`、新建 `packages/flux-renderers-ai/src/adapters/use-engine-view.ts`、`packages/flux-renderers-ai/src/index.ts`

- Item Types: `Decision`、`Fix`、`Proof`

- [x] **Decision**：裁定外部 engine 注入的契约形态。候选：(a) 给 `AiChatSchema` 增 `engine?: SchemaValue`（与 `connector`/`conversationController` 同路径，host 经 page-data 或 xui:imports 注入）；(b) 扩 `AiConversationControllerBridge` 携带 `activeEngine`。**裁定预期为 (a)**——单一职责（controller 只管 CRUD，engine 是独立注入面），且与现有 `connector` 注入模式完全对称；`useConversation.activeEngine` 切换时 page-data `useMemo` 重算 → schema 重渲染 → `ai-chat` 拿到新 engine。若 live 核对发现 page-data 重算不足以驱动 `ai-chat` 重绑定（engine 引用稳定但内部 state 变），则在 Decision 中补正为 (b) 或 (a)+controller bridge 组合，并写清理由。
- [x] **Fix**：新建 `use-engine-view.ts`，导出 `useEngineView(engine: MessageEngine): { messages, requestState, processingState, isProcessing, sendMessage, send, abortRequest, engine }`——经 `useSyncExternalStore(engine.subscribe, engine.getState, engine.getState)` 绑定（提取自示例页私有 helper `ai-persistence-demo.tsx:135-155`，补齐 `send` 字段）。
- [x] **Fix**：重构 `use-message.ts`：内部 `createMessageEngine` 后用 `useEngineView(engine)` 完成 React 绑定（消除 `use-message.ts:78` 与示例页 helper 的重复订阅逻辑）；`UseMessageReturn` 形状不变。
- [x] **Fix**：`index.ts` 导出 `useEngineView` + `UseEngineViewReturn` 类型（Group 3 host utilities）。

Exit Criteria:

- [x] `useEngineView` 为公共导出，签名稳定，`send` 字段齐全（与 `UseMessageReturn` 对齐）。
- [x] `useMessage` 内部复用 `useEngineView`，现有 `use-message.test.tsx` 全过（自建路径零回归）。
- [x] 新增 `use-engine-view.test.ts`：绑定外部 engine → 发送消息 → `useSyncExternalStore` 收到更新（Proof）。

### Phase 2 - ai-chat 支持 external engine prop

Status: completed
Targets: `packages/flux-renderers-ai/src/schemas.ts`、`packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、`packages/flux-renderers-ai/src/__tests__/contract-honesty.test.ts`

- Item Types: `Fix`、`Proof`

- [x] **Fix**：`AiChatSchema` 增 `engine?: SchemaValue`（JSDoc 说明：表达式解析为 `MessageEngine`，典型 `${engine}` 相对 scope 读或 `${$ai.engine}`；与 `connector`/`conversationController` 同为 host 注入对象，非反应式 scope 快照）。
- [x] **Fix**：`ai-chat.tsx` 解析 `const externalEngine = resolved.engine as MessageEngine | undefined`。**hooks 不可条件调用**——采用"统一绑定 hook"：`useMessage` 扩 `engine?: MessageEngine` 选项（提供时绑定外部、跳过 `createMessageEngine`；不提供时自建）。或等价地在 `ai-chat` 内用一个始终调用的 hook（`useState` 惰性决定 engine 来源 + `useEngineView`）。实现以 Phase 1 Decision 为准。
- [x] **Fix**：`engine-prop-not-engine` Failure Path：`resolved.engine` 非 `MessageEngine`（无 `subscribe`/`getState`）→ 视为未提供 + `console.warn`，回退自建。
- [x] **Fix**：ActionScope namespace `ai` + ComponentHandle 注册仍用最终绑定到的 engine（外部或自建）——`ai-chat.tsx:69-97` 的 `engine` 引用指向正确实例。
- [x] **Proof**：新增 `ai-chat-external-engine.test.tsx`：(a) 注入外部 engine → `ai-chat` 渲染其消息、send 经外部 engine；(b) 不注入 → 自建路径（回归）；(c) `engine-prop-not-engine` → 回退自建 + warn。

Exit Criteria:

- [x] `AiChatSchema.engine` 字段存在且有 JSDoc。
- [x] `ai-chat` 在外部 engine 下正确渲染消息列表 + sender，ActionScope/ComponentHandle 绑定到外部 engine。
- [x] 自建路径（无 `engine` prop）行为与改动前一致（现有 renderer 单测全过）。
- [x] INV-1 contract-honesty 守卫不报新违例（外部 engine 仍是 host 注入对象，不经 env）。

### Phase 3 - 持久化示例页改用 ai-chat + e2e

Status: completed
Targets: `apps/playground/src/pages/ai-persistence-demo.tsx`、`tests/e2e/`（持久化 spec）

- Item Types: `Fix`、`Proof`

- [x] **Fix**：`ai-persistence-demo.tsx` 改为经 schema（或 `SchemaRenderer` + `data`）把 `conversations.activeEngine` 注入 `ai-chat` 的 `engine` prop；移除私有 `useEngineView` + 手工 `AiChatProvider`+`AiMessageListView`+`AiSenderView` 拼装。`engine-null-switch`（`activeEngine` 为 null）渲染"选择会话"提示。
- [x] **Proof**：更新/新增 e2e（`tests/e2e/` 下持久化 spec）：发送消息 → 刷新页面 → 历史会话恢复 → 切换会话消息重水合，全经 `ai-chat`（断言 `nop-ai-chat` marker 存在，而非手工拼装的裸 message-list）。
- [x] **Proof**：route-coverage gate 仍绿（persistence 路由已注册 `App.tsx:291`）。

Exit Criteria:

- [x] 持久化示例页用 `ai-chat` 渲染对话区（`nop-ai-chat` marker 可见），不再手工拼装子组件。
- [x] e2e：刷新恢复 + 会话切换重水合通过，断言落在 `ai-chat` 面板上。
- [x] 示例页不再持有私有 `useEngineView`（改用包导出 hook 或 schema 注入）。

### Phase 4 - owner-doc 同步

Status: completed
Targets: `docs/components/flux-renderers-ai/design.md`、`docs/components/flux-renderers-ai/renderers.md`、`docs/components/roadmap-ai.md`、`docs/components/index.md`、`docs/logs/2026/07-24.md`

- Item Types: `Follow-up`

- [x] design.md §11.2 数据流表补 `engine`（外部注入）行：读方式 = resolved prop / host page-data；写方式 = host 经 `useConversation.activeEngine`。
- [x] design.md §11.5 state ownership 表：`engine` 实例仍"域内部"，但补充"可经 schema `engine` prop 注入到 `ai-chat`（resolved value，非 scope 快照）"的注记，与 §11.5 line 467 不矛盾。
- [x] renderers.md：持久化端到端示例改用 `ai-chat` + `engine` prop（替换原 message-list+sender 直绑写法）。
- [x] roadmap-ai.md：Cross-Cutting / Current Baseline 记 deferred 项收口（A4 的"ai-chat ↔ useConversation 引擎统一"已落地）。
- [x] daily log `docs/logs/2026/07-24.md` 记录本计划。

Exit Criteria:

- [x] design.md §11.2/§11.5 与 live 行为一致（engine 注入路径有文档）。
- [x] renderers.md 持久化示例与示例页代码一致。
- [x] daily log 有条目。

## Draft Review Record

> 起草后、执行前的独立审查证据。详见 `docs/plans/00-plan-authoring-and-execution-guide.md` `Plan Review Rule`。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session, ses_06e9a3260ffer8yXZkIMhTxg70）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。逐条核对 16+ 引用（file:line / 函数名）全部命中 live repo。可想象性确认：hooks 不可条件调用 → `useMessage` 扩 `engine?` 选项的方案（hook 始终无条件调用，条件落在 value 而非 call）满足 rules-of-hooks；design.md §11.5 "engine 不可进 scope" 约束的是反应式 scope 快照而非 resolved prop 值，与 `connector`/`conversationController` 已有注入模式对称，成立。Minor（不阻塞、不触发返工）：(m1) Phase 2 的两种实现形态应在 Phase 1 Decision 后定一；(m2) `engine-null-switch` 降级须在 hooks 运行之后（仿 `ai-chat.tsx:157` 现有 `connector-missing` 早返回模式）；(m3) `resolved.engine` 为 null 时自建 vs 返回 null-state 由 Phase 1 Decision 裁定；(m4) 外部 engine 绑定时应 guard `use-message.ts:72-76` 的 connector 热替换；(m5) 测试档位 "建议有测" 可辩护（虽含新公共 hook 导出，但每 Phase 已含 focused 单测 + e2e，实际覆盖充分）。以上 Minor 均落入 Phase 1 Decision 的裁定范围，无需返工。

## Closure Gates

> 关闭条件：本 section 所有条目 + 每个 Phase Exit Criteria 全 `[x]` 后，方可将 `Plan Status` 改为 `completed`（须先经独立子 agent closure-audit）。

- [x] `ai-chat` 外部 engine 注入路径已实现且 focused 单测覆盖（外部绑定 / 自建回退 / 非 engine 值降级）。
- [x] 自建路径（无 `engine` prop）零回归（现有 renderer / adapter 单测全过）。
- [x] 持久化示例页改用 `ai-chat`，e2e 刷新恢复 + 切换重水合通过。
- [x] 不存在被静默降级到 deferred 的 in-scope 项。
- [x] 受影响 owner docs（design.md §11.2/§11.5、renderers.md、roadmap、index.md）已同步到 live baseline。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

> 本计划是 A4 deferred 项的 successor。执行中若发现新的可裁定移出项，记于此（须带 Why Not Blocking Closure）。

## Non-Blocking Follow-ups

- `useConversation` 切换瞬间 `activeEngine` 短暂为 null 的 UX（loading skeleton / 过渡动画）属体验优化，host 可自定义 emptyState region。
- 多轮 per-turn 分支管理与 engine 的交互（branch load 经 `engine.setMessages`）已在 A5 落地 host 范式，本计划不改动。

## Closure

Status Note: All 4 Phases executed and ticked; all Closure Gates `[x]`. `ai-chat` now accepts an optional external `MessageEngine` via the `engine` schema prop (symmetric with `connector`/`conversationController`), binding `useConversation.activeEngine` so persistence/multi-conversation scenarios reuse all `ai-chat` capabilities. Public `useEngineView` hook extracted; self-built path zero-regression; persistence demo migrated to `ai-chat`. Pre-existing `normalizeActionEvent` bug (drops custom event payloads → `${event.id}` undefined) discovered, documented out-of-scope in the daily log (demo sidesteps by keeping the sidebar in React).

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent fresh session（ses_06e660ab6fferxYLmira4rP6sp，general subagent，未参与实现）
- Verdict: `pass`（零 Blocker / 零 material Minor）
- Evidence:
  - 独立重跑：`pnpm --filter @nop-chaos/flux-renderers-ai typecheck` PASS；`pnpm --filter @nop-chaos/flux-renderers-ai test` PASS（27 files, 249/249）。
  - 实现核对（file:line）：`use-engine-view.ts:42-58`（签名 + `send`）、`use-message.ts:28/63-75/88`（`engine?` 选项 + useState 无条件调用 + connector 热替换 guard）、`ai-chat.tsx` isMessageEngine guard + engine-null-switch 在 connector-missing 之前 + engine-prop-not-engine warn、`schemas.ts:8-21`（`engine?: SchemaValue` + JSDoc）、`index.ts:101`（导出）、i18n `flux.ai.selectConversation` 双语。
  - 零回归：`use-message.test.tsx` 3 测全走自建路径。
  - Failure Paths 双测：`ai-chat-external-engine.test.tsx`（engine-prop-not-engine warn+fallback、engine-null-switch emptyState）。
  - 示例页用 ai-chat：`ai-persistence-demo.tsx` 经 SchemaRenderer 绑 `engine: "${engine}"`，无私有 `useEngineView`/手工拼装；e2e 断言 `.nop-ai-chat`。
  - 无静默降级 in-scope 项；`normalizeActionEvent` bug 已记 daily log 为 out-of-scope。
  - 闸门纪律：closure-audit gate 由独立 session 审核后勾选，执行 session 未自审。

Follow-up:

- `normalizeActionEvent`（`packages/flux-react/src/renderer-helpers.ts`）丢弃无 `type` 的自定义事件 payload，导致 `${event.id}` 对所有自定义 payload 事件（`onItemClick`/`onItemDelete`/`onSelect`…）失效——需独立 bug-fix plan + 回归测试（本计划 out-of-scope，已记 daily log）。
- `external-engine-disposed` Failure Path 无专属单测（依赖 `useSyncExternalStore` snapshot-caching 固有行为，相邻 engine-swap 重订阅已被 `use-engine-view.test.ts` 覆盖；"建议有测"档位充分）。
