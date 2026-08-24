# 01 D4 真实按钮副作用 + Suggestion Pill Icon（G4 + G9 收口）

> Plan Status: active
> Last Reviewed: 2026-08-24
> Source: `docs/backlog/ai-widgets-product-roadmap.md` D4；`docs/components/flux-renderers-ai/product-spec.md` §3.3（pill icon 契约）+ §7（副作用断言基线）
> Mission: ai-widgets-product
> Work Item: D4
> Related: `docs/plans/2026-08-24-2237-1-d3-avatar-welcome-icon.md`（前置：本 plan 重写同一 demo 文件，D3 先落地避免冲突）；`docs/plans/2026-08-24-2237-2-d5-showcase-completeness.md` / `2026-08-24-2237-3-d6-latex-code-highlight.md`（同 demo 文件邻接，文件名序在本 plan 之前）；`docs/plans/2026-08-24-1045-2-d1-rich-markdown-fixture.md`（fixture substrate）

## Purpose

把 widgets demo 的全部装饰按钮从「唯一副作用 showToast」升级为真实对话副作用：prompts / suggestions / voice 点击后写入 sender 输入框（`component:setSenderDraft`），feedback refresh 触发重新生成（`ai:regenerate`），like/dislike 写 message metadata；同步把 suggestion pill 的 emoji 图标替换为 lucide 分发。收口 G4 + G9（同 phase 因均涉 ai-suggestions / 同一 demo 事件面）。

## Current Baseline

（2026-08-24 live 核实）

- **G4**：`apps/playground/src/pages/ai-widgets-demo.tsx:65-110` 全部 `onSelect/onAction/onResult/onError` 唯一副作用 `showToast`；ai-chat 节点未设显式 `componentId`（`AiChatSchema.componentId` 已存在，`schemas.ts:63`；解析链 `resolved.componentId || testid || props.id`，`ai-chat.tsx:254`）
- **ActionNamespace**：`AI_NAMESPACE_ACTIONS` 7 项无 `regenerate`（`ai-action-provider.ts:13-21`）；engine 的 `regenerate` 已存在且 ComponentHandle 已暴露（`AI_COMPONENT_METHODS` 6 项含 `regenerate`，`ai-component-handle.ts:10-17,133-144`——本 plan 仅增 `setSenderDraft`，7 项）
- **draft 通道缺位**：`AiChatContextValue` 无 sender draft 通道（`ai-chat-context.tsx:6-31`）；`AiSenderView` 的 `draft` 为本地 useState（`ai-sender.tsx:54`），无外部写入路径；全仓 `setSenderDraft` 0 命中
- **ai-feedback**：like/dislike 仅本地 `voted` useState 镜像 + `data-active`（`ai-feedback.tsx:43,73-75,94-99`），无 `aria-pressed`、不写 `message.metadata`、不读 ai-chat context；sources 动作仅 onAction 通知，无弹层
- **G9**：`ai-suggestions.tsx:52-54`（+ popover 路径 :155-159）将 `item.icon` 字符串字面渲染；`SUGGESTION_ITEMS` 用 emoji（`ai-widgets-demo.tsx:128-134`）；lucide-react@1.17.0 d.ts 核实 `Pencil`/`Languages`/`Lightbulb`/`Sparkles`/`Plus` 全部存在（peer dep 已声明，零新增依赖）
- **测试影响面**：`action-provider.test.tsx:57` 断言 `listMethods()` `toEqual([...AI_NAMESPACE_ACTIONS])`（常量驱动，增项自动同步——roadmap 要求的「8 项」需另加字面 drift-guard 断言）；`ai-component-handle.test.ts` 存在（方法面断言）；e2e `ai-coverage-widgets.spec.ts:222-225`（like/dislike 存在性）与 `ai-widgets-demo.spec.ts:73-87`（suggestions 渲染）为回归保护面；`component:` 动作先例 `apps/playground/src/ai/ai-component-handle-example.json` + `tests/e2e/ai-component-handle.spec.ts`
- **fixture 分发与 regenerate 语义（live 核实，round 1 修正）**：mock fixture 按 `extractLastUserText` 分发（`mock-ai-env.ts`）；engine `regenerate` 为 **truncate-then-rerun**——截断至 lastUserIdx 后重跑（`engine/regenerate.ts:52-60`），`engine/__tests__/engine-branches.test.ts:51-59` 断言消息计数不变 + 新 branchId；空会话 no-op（`regenerate.ts:45-46`）。→ refresh 后同 preset 重发、assistant **计数不变**、消息 id/branchId 更新、bubble 重新进入流式。**roadmap §D4 / product-spec §7 的「assistant 消息数 +1」措辞与 live 引擎语义不符**——本 plan 以「重新生成可观测」为判定（见 Goals / Phase 1 e2e ④），偏差记 Non-Blocking Follow-ups 供 DG 注记
- e2e 基线：ai spec 家族 17 个文件全绿（widgets 10 + fixture 6 为保护面）
- **bug 166 协调注记**：`docs/bugs/166`（ai-chat context value 不随 chunk 失效——流式 token 级渲染缺陷）与本 plan 同改 `ai-chat.tsx` context value 面。该缺陷已登记路由 successor、非本 plan scope；本 plan 新增 draft 通道**不得**以「顺手修 166」为由改动 messages 失效机制，反之 166 的 successor 执行时需与本 plan 落地后的 context value 形状兼容

## Goals

- **`component:setSenderDraft`**：`AI_COMPONENT_METHODS` 增 `setSenderDraft`（7 项）；payload `{ text: string, mode?: 'append' | 'replace' }` 默认 `append`——append 语义（roadmap D4 裁定）：当前 draft 与上次 setSenderDraft 写入值一致则跳过（防重复追加），不一致则追加（空基值直接写入 text 不加换行；非空以 `\n` + text 追加到当前 draft，用户已输入文本保留）；`replace` 整体覆盖。cid 隔离经既有 componentRegistry 路由（与 `component:sendMessage` 同机制）
- **draft 同步通道（round 1 修正：双向）**：`ai-chat.tsx` 创建 per-chat draft 外部存储 `{ get, setLocal, apply, subscribe }`——sender 键入经 `setLocal` **写透**（更新存储值、不触发订阅通知，防回环）；`apply(text, mode)` 基于 `get()` 当前值（含用户已键入文本）计算 append/dedupe/replace 后写入并通知；`AiSenderView` 订阅通知合并进本地 `draft` state（外部写入不清空用户输入，append 语义有真实基值可算）
- **`ai:regenerate`**：`AI_NAMESPACE_ACTIONS` 增 `regenerate`（8 项）；provider 委托 `engine.regenerate(branchId?)`，isProcessing busy-guard（与 send/clear 同口径，`ai-action-provider.ts:60-62`）
- **ai-feedback 真实副作用**：like/dislike toggle 时写 `message.metadata.feedback` + `aria-pressed` 镜像（`data-active` 保持）；refresh 渲染器内默认 `ctx?.engine.regenerate()`（busy 安全，见 Decision D-refresh；truncate-rerun 语义 → 最新 assistant 消息重新生成，计数不变）；sources 动作经 `Popover`（`@nop-chaos/ui`）展示 `message.metadata.sources` 列表（无 sources 时空态提示）——e2e 必测（roadmap §D4 完成判定明列「sources 弹层」）
- **demo 重写**：ai-chat 节点设 `componentId: 'ai-widgets-chat'`（Decision D-id：roadmap 示例值 `ai-chat-demo` 与另一 demo 页同名易混淆，改名并记录）；`ai-prompts.onSelect` / `ai-suggestions.onSelect` → `{ action: 'component:setSenderDraft', componentId: 'ai-widgets-chat', args: { text: '${item.label}' | '${item.text}' } }`；`ai-voice-input.onResult` → 同 action + `mode: 'append'`；feedback `onAction` 保留 toast 通知（Decision D-refresh：不再 schema 分发 `ai:regenerate`，避免与渲染器内默认双触发）；`feedbackMsg` 静态对象增 `metadata.sources` 两条（sources 弹层素材）
- **G9**：`ai-suggestions.tsx` 增字符串 → lucide 分发（`pencil→Pencil` / `languages→Languages` / `lightbulb→Lightbulb` / `sparkles→Sparkles` / `plus→Plus`，未命中回退字面字符——与 D3 welcome 同模式）；`SUGGESTION_ITEMS` icon 值换为上述字符串键
- 新 e2e `tests/e2e/ai-widgets-button-actions.spec.ts` ≥7 测试全过（含 sources 弹层，roadmap ≥6 超额满足）；`AI_NAMESPACE_ACTIONS` 字面 8 项断言；既有 ai spec 家族零破坏

## Non-Goals

- 不动 avatar / welcome icon（D3）、showcase 卡 / tools 接线（D5）、LaTeX / 高亮（D6）
- 不改 12 处其他 `createMockAiEnv` 调用点与 mock 节奏（D1 契约）
- 不修 bug 166（已路由 successor，见 Current Baseline 协调注记）
- 不回写 `design.md` / `renderers.md`（owner-doc 同步统一归 DG；`setSenderDraft` / `ai:regenerate` 的 renderers.md 段落归 DG）
- 不新增 `AiFeedbackSchema` 事件字段（refresh 语义经渲染器内默认实现，见 Decision D-refresh；如未来需 schema 显式覆盖再评估）
- roadmap「`schemas.ts` `AiComponentHandleSchema` 增加 `setSenderDraft`」措辞校准：包内不存在名为 `AiComponentHandleSchema` 的 schema 类型，ComponentHandle 的契约面是 `AI_COMPONENT_METHODS` 常量 + `createAiComponentHandle` 签名——本 plan 以常量增项落地该意图，不改 `schemas.ts` 的 handle 相关声明

## Scope

### In Scope

- `packages/flux-renderers-ai/src/adapters/ai-component-handle.ts`（`setSenderDraft` + draft 通道闭包输入）
- `packages/flux-renderers-ai/src/adapters/ai-action-provider.ts`（`regenerate`）
- `packages/flux-renderers-ai/src/adapters/ai-chat-context.tsx`（context 增 draft 通道字段）
- `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`（draft 存储创建 + handle/context 接线）
- `packages/flux-renderers-ai/src/renderers/ai-sender.tsx`（draft 订阅合并）
- `packages/flux-renderers-ai/src/renderers/ai-feedback.tsx`（metadata 写 + aria-pressed + refresh 默认 + sources Popover）
- `packages/flux-renderers-ai/src/renderers/ai-suggestions.tsx`（lucide 分发）
- `apps/playground/src/pages/ai-widgets-demo.tsx`（componentId + 事件重写 + SUGGESTION_ITEMS + feedbackMsg sources）
- 测试：`adapters/__tests__/ai-component-handle.test.ts`、`renderers/__tests__/action-provider.test.tsx`、feedback/suggestions/sender 侧测试文件、`tests/e2e/ai-widgets-button-actions.spec.ts`（新）

### Out Of Scope

- `packages/flux-renderers-ai/src/engine/`（`regenerate` 已存在，零引擎改动）
- `packages/flux-renderers-ai/src/schemas.ts`（无 schema 字段新增——`componentId` 已有；icon 分发是渲染器能力，`AiSuggestionItem.icon?: string` 类型不变）
- `ai-coverage-widgets` / 其他 demo 页（自动受益于渲染器能力，不在验证面）

## Failure Paths

| 场景            | 触发                                        | 行为                                                                    | 可重试 | 用户可见表现                           |
| --------------- | ------------------------------------------- | ----------------------------------------------------------------------- | ------ | -------------------------------------- |
| busy-regenerate | 流式进行中点击 refresh / 派发 ai:regenerate | `ok:false`「engine busy」（与 send/clear 同口径）；渲染器路径静默不触发 | 是     | 按钮无变化，流结束后可再触发           |
| no-target       | `componentId` 未注册（组件未挂载）          | component action 派发失败（既有 component 通道错误语义）                | 是     | 点击无效果（action 系统 console 诊断） |
| append-race     | voice 转写到达时用户正在输入                | append 模式追加不替换，用户已输入文本保留                               | —      | 转写文本换行接在现有草稿后             |
| sources-empty   | sources 动作但 message 无 sources           | Popover 空态提示                                                        | —      | 弹层显示无来源提示（不 toast 报错）    |
| dedupe-repeat   | 重复点击同一 prompt/suggestion              | 跳过写入（与上次写入值一致）                                            | —      | 输入框值不变（不重复追加）             |

## Test Strategy

档位选择：`必须自动化`。button actions 是 schema public contract 变化（新 ComponentHandle 方法 + 新 namespace action，roadmap §D4 完成判定明示）。按 AGENTS.md Tiers 与 plan guide「When Drafting #12」，**Proof 先于 Fix**：断言先以 red 状态锁定（现状 toast-only / 无 setSenderDraft / 7-action），实现后转绿。

## Execution Plan

### Phase 1 - 断言先行（red 锁定）

Status: planned
Targets: `tests/e2e/ai-widgets-button-actions.spec.ts`（新）、`adapters/__tests__/ai-component-handle.test.ts`、`renderers/__tests__/action-provider.test.tsx`、feedback / suggestions / sender 侧测试文件

- Item Types: `Proof | Decision`

- [ ] Decision D-handle：draft 通道形态——per-chat 小型外部存储（`{ get, setLocal, apply, subscribe }`，`useSyncExternalStore` 兼容），`ai-chat.tsx` 创建、handle 闭包 `apply` 写入、context 暴露、`AiSenderView` 订阅合并 + 键入 `setLocal` 写透（写透不通知、apply 通知——append 语义基于含用户键入的当前值计算）；append/dedupe/replace 语义按 Goals 落地
- [ ] Decision D-refresh：refresh 语义在渲染器内默认实现（`useAiChatContext()` 存在 → busy-guard 后 `ctx.engine.regenerate()`；standalone 无 ctx → 仅 onAction 通知，现状不变）；demo 不再按 action schema 分发 `ai:regenerate`（单一 onAction ActionSchema 无法按 action 种类条件派发，且与渲染器默认双触发）——偏离 roadmap 字面「onAction 按 action 分发」措辞，理由与本裁定记录于 plan
- [ ] Decision D-race：roadmap §D4「setSenderDraft 仅在用户 input 框失焦 / 显式触发时执行」措辞舍弃——imperative handle 调用无法合理延迟到失焦时机；其意图（不打断用户输入）由 append-保留语义 + dedupe 交付（外部写入不清空/替换用户文本）。偏离显式记录于本 plan
- [ ] unit 断言落盘：(a) `AI_NAMESPACE_ACTIONS` 字面 8 项断言（drift-guard）+ `ai:regenerate` 派发（idle → engine.regenerate 被调；busy → ok:false）；(b) `setSenderDraft`：append 追加 `\n` join / 重复同值跳过 / replace 覆盖 / `hasMethod` 含 `setSenderDraft`（4 case）；(b2) draft 存储语义：apply 基于含 `setLocal` 键入值的当前值计算（append 不丢用户文本，写透不触发通知）（≥2 case）；(c) ai-feedback：like toggle 写 `message.metadata.feedback` + `aria-pressed` 翻转（2 case）+ sources Popover 列表渲染与空态（≥1 case）；(d) ai-suggestions：`icon:'pencil'` → svg、未命中字符串字面回退（2 case）；(e) ai-sender：context draft 通道 apply 后本地 draft 合并、用户键入文本保留（1-2 case）
- [ ] e2e 新 spec ≥7 测试落盘：① 空 draft 点击 prompt → `[data-slot="ai-sender-input"] textarea` value = label 单值；② 紧接①重复点击同一 prompt → value 不变（dedupe）；③ 空 draft（清空或新开页面）点击 suggestion → value = suggestion 文本单值；④ 先经 sender 发送消息并等待回复，点击 refresh → assistant bubble 重新进入流式（`data-streaming` 出现）且完成后内容恢复、assistant 计数**不变**（truncate-rerun 语义，round 1 修正）；⑤ like toggle → `aria-pressed` / `data-active`；⑥ suggestion pill 内含 `<svg>` 且非 emoji 字面；⑦ sources → Popover 可见含来源条目（必备——roadmap §D4 完成判定明列）
- [ ] 对当前 repo 跑一次记录 red 证据（现状 toast-only：value 不变 / 无重新流式 / 无 aria-pressed / pill 为字面字符 / 无 sources 弹层；unit 侧 8 项断言与 setSenderDraft case 失败）

Exit Criteria:

- [ ] 新增 unit + e2e 断言全部落盘且当前为 red（red 证据记 plan 内备注或 daily log）

### Phase 2 - setSenderDraft 通道 + ai:regenerate（包内 adapters）

Status: planned
Targets: `ai-component-handle.ts`、`ai-action-provider.ts`、`ai-chat-context.tsx`、`ai-chat.tsx`、`ai-sender.tsx`

- Item Types: `Fix`

- [ ] `AI_COMPONENT_METHODS` 增 `setSenderDraft`；`createAiComponentHandle` 增 draft 通道输入（`engine` 为 null 时与其他方法一致显式拒绝）；payload 校验 `{ text: string, mode?: 'append'|'replace' }`，缺 text → `ok:false`（错误信息风格与既有 `component:sendMessage requires...` 一致）
- [ ] `ai-chat.tsx` 创建 per-chat draft 存储（D-handle 形态：`get/setLocal/apply/subscribe`）并接入 handle 闭包 + `chatContextValue`（保持 AI-31 稳定化模式：存储对象引用稳定，context value 不因 draft 写入重建）
- [ ] `AiChatContextValue` 增 draft 通道字段（optional，向后兼容 standalone 使用方）；`AiSenderView` 订阅 apply 通知合并进本地 draft + 键入 `setLocal` 写透（写透不通知防回环；append 语义在存储 `apply` 内基于 `get()` 当前值实现）
- [ ] `AI_NAMESPACE_ACTIONS` 增 `regenerate`；provider case 委托 `engine.regenerate(branchId?)`（可选 `args.branchId`，与 handle 同参）+ isProcessing busy-guard；null-engine 窗口与 send/clear 同口径显式拒绝

Exit Criteria:

- [ ] `rg -n "setSenderDraft" packages/flux-renderers-ai/src` 命中 handle / context / chat / sender 接线；`rg -n "setLocal" packages/flux-renderers-ai/src/renderers/ai-sender.tsx` 命中键入写透点
- [ ] `pnpm --filter @nop-chaos/flux-renderers-ai test` 中 Phase 1 (a)(b)(b2)(e) 组断言转绿；既有 adapter / sender 测试零破坏

### Phase 3 - feedback / suggestions 渲染器 + demo 重写

Status: planned
Targets: `ai-feedback.tsx`、`ai-suggestions.tsx`、`apps/playground/src/pages/ai-widgets-demo.tsx`

- Item Types: `Fix`

- [ ] `ai-feedback.tsx`：like/dislike toggle 写 `message.metadata.feedback`（voted 值，un-vote 清除）+ `aria-pressed` 与 `data-active` 双镜像；refresh 经 D-refresh 默认路径（ctx 存在 → busy-guard + `engine.regenerate()`，无 ctx 不变）；sources 动作 `Popover` 展示 `message.metadata.sources`（label/url 列表，空态提示）
- [ ] `ai-suggestions.tsx`：icon 字符串 → lucide 分发（5 项映射，主路径 SuggestionPill + popover overflow 路径一致）；未命中字面回退
- [ ] `ai-widgets-demo.tsx`：ai-chat 节点 `componentId: 'ai-widgets-chat'`；prompts / suggestions onSelect 与 voice onResult 改 `component:setSenderDraft`（args 见 Goals）；feedback `onAction` 保留 toast（通知语义）；`SUGGESTION_ITEMS` icon 值换 lucide 字符串键；`feedbackMsg` 增 `metadata.sources` 两条
- [ ] dev 实跑抽查：点击 prompt → 输入框出现文本；重复点击不重复；voice 转写追加；refresh 重新流式生成最新回复（计数不变）；like 激活态；sources 弹层；pill 图标为 svg（结果记 daily log）

Exit Criteria:

- [ ] demo 文件内 `action: 'showToast'` handler 仅剩 feedback onAction 与 voice onError 两处通知用途（grep 可核对）；`component:setSenderDraft` ≥3 处（prompts / suggestions / voice）
- [ ] Phase 1 (c)(d) unit 断言转绿；dev 抽查记录在案

### Phase 4 - e2e 转绿与回归

Status: planned
Targets: `tests/e2e/ai-widgets-button-actions.spec.ts` + 既有 ai spec 家族

- Item Types: `Proof`

- [ ] Phase 1 e2e ≥7 测试全部转绿
- [ ] 回归：17 个 ai spec 文件全过——重点 `ai-widgets-demo.spec.ts` 10 测试（结构断言不因事件重写破坏）、`ai-coverage-widgets.spec.ts:222-225`（like/dislike 存在性）、`ai-component-handle.spec.ts`（handle 语义不因新增方法破坏）、`ai-widgets-fixture.spec.ts` 6 测试

Exit Criteria:

- [ ] 新 spec ≥7 测试全过（Playwright，程序化断言）
- [ ] 17 个 ai spec 全过、零非计划断言修改

## Draft Review Record

- Reviewer / Agent: round 1 fresh session `ses_fcba06341ffejgsV5Pd0vroXo0`（2026-08-24，verdict `fail` 3 Major）；round 2 fresh session `ses_fcb90ddaaffeug0KUQ8lHzCYR0`（2026-08-24，verdict `pass` 0 Blocker / 0 Major / 2 Minor）
- Verdict: `pass`（round 2 共识达成）
- Rounds: 2
- Findings addressed: 【Major】① refresh e2e「assistant 计数 +1」与 live 引擎 truncate-rerun 语义矛盾（`engine/regenerate.ts:52-60` 截断重跑、`engine-branches.test.ts:51-59` 计数不变、空会话 no-op :45-46）——Current Baseline 已改记 live 语义 + roadmap/spec「+1」措辞偏差（DG 注记）；e2e ④ 改为可达成断言（`data-streaming` 复现 + 内容恢复 + 计数不变，前置先发消息）；② draft 通道单向缺口（apply 看不到 sender 实时键入）——改双向设计 `{ get, setLocal, apply, subscribe }`（键入 `setLocal` 写透不通知、apply 基于 `get()` 当前值计算后通知），exit 判据补 `setLocal` 命中；③ sources Popover 被标可选与 roadmap 完成判定 / 自身 Closure Gates 矛盾（Anti-Slacking 违例）——e2e ⑦ 改必备 + unit (c) 补列表与空态，计数 ≥6 改 ≥7 全文统一。【Minor，已修正】④ Source 路径笔误——round 1 误报（live 文本本为 `product-spec.md` 连字符，未改）；⑤ showToast grep 判据改「`action:'showToast'` handler 仅剩 feedback onAction 与 voice onError 两处」；⑥ e2e ③ 前置钉死（空 draft 单值）；⑦ roadmap「失焦/显式触发」措辞舍弃补记 Decision D-race；round 2——⑧ Phase 4 exit 残留 ≥6 统一为 ≥7；⑨ Goals append 补空基值规则（空 draft 直接写入不加换行）

## Closure Gates

- [ ] G4 收口：prompts / suggestions / voice → sender draft 真实写入、refresh → 最新 assistant 消息重新生成（流式复现 + 内容恢复，计数不变——live truncate-rerun 语义）、like/dislike → metadata + 激活态、sources → 弹层（e2e 7 测试）
- [ ] G9 收口：suggestion pill lucide svg（e2e 断言），emoji 字面不再出现于 widgets demo
- [ ] `AI_NAMESPACE_ACTIONS` 8 项 + `AI_COMPONENT_METHODS` 7 项（字面 drift-guard 断言在库）
- [ ] 既有 e2e 零破坏（17 个 ai spec 全过）
- [ ] 结构性变更在 mission 预授权包络内（mission description 明列 `setSenderDraft` 新方法 + `ai:regenerate` 新 namespace action；超出包络的偏离无）
- [ ] 不存在被静默降级到 deferred / follow-up 的 in-scope live defect（bug 166 非 in-scope，已登记路由 + 协调注记）
- [ ] owner-doc：无需逐 phase 更新（新方法 / 新 action 的 renderers.md 段落统一归 DG，按 plan guide Rule 17）
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### refresh 的 schema 显式覆盖（onRefresh 类专用事件）

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: refresh 产品语义已由渲染器内默认路径交付（D-refresh）；schema 显式覆盖是新增事件契约面，无当前消费方，DG 后有真实需求再评估
- Successor Required: `no`
- Successor Path: 无

## Non-Blocking Follow-ups

- bug 166 successor 执行时需兼容本 plan 落地后的 context value 形状（新增 draft 通道字段）——已在 `docs/bugs/166` 关联范围，无需本 plan 处理
- roadmap §D4 / product-spec §7「refresh → assistant 消息数 +1」措辞与 live 引擎 truncate-rerun 语义不符（计数不变 + branchId 更新）——本 plan 按可观测重新生成落地，DG 收口 log 注记对齐
- roadmap §D4「失焦 / 显式触发时执行」draft-race 措辞被 D-race 裁定舍弃（append-保留 + dedupe 交付其意图）——DG 收口 log 注记对齐

## Closure

Status Note:

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

-
