# A2 flux-renderers-ai P1 真实 AI + 会话 + 流式 Markdown + a11y

> Plan Status: active
> Last Reviewed: 2026-07-23
> Source: `docs/components/flux-renderers-ai/design.md`（§5.1、§10.4、§11.1 Layer B、§14.2）、`renderers.md`、`improvement-analysis.md` §4（A-1~A-5）
> Mission: ai
> Work Item: A2 — P1 真实 AI + 会话 + 流式 Markdown + a11y（4 renderer + 5 改进项）
> Related: 上游 `2026-07-23-2143-2-a1-flux-renderers-ai-p0-skeleton.md`（A1，硬前置）；下游 A3（P2 工具调用 + 附件）

## Purpose

在 A1 的 P0 骨架上，补齐"可用产品级 AI 对话"必需能力：4 个辅助渲染器（会话/欢迎/提示词/反馈）、ActionScope namespace `ai`（外部按钮与表达式可控制对话）、流式 Markdown CJK/代码 fence 缓冲（消除闪烁）、5 项组件级改进（A-1~A-5）、a11y 基线。完成后接 DeepSeek/OpenAI 真实 API 即可端到端对话。

## Current Baseline

- A1 落地后：`flux-renderers-ai` 包已建；4 个 P0 渲染器（`ai-chat`/`ai-message-list`/`ai-bubble`/`ai-sender`）可用；引擎核心 + React adapter + `createStreamBasedAiConnector` 可用；mock 流式对话在 playground 跑通；`env.stream` 可用。
- Layer A（React Context 传播 engine）已就绪；**Layer B（ActionScope namespace `ai`）未注册**——外部按钮无法触发 `ai:send`，表达式无 `${$ai.isProcessing}`。
- 流式 Markdown 直接用 `react-markdown` + sanitize（P0 占位）——CJK 半字符乱码、未闭合 code fence/`$$` 公式、整体闪烁三问题未解。
- 4 个 P1 渲染器（`ai-conversations`/`ai-welcome`/`ai-prompts`/`ai-feedback`）未实现。
- 5 项改进（A-1 ChatMessageDataPart 渲染支持 / A-2 流式缓冲 / A-3 代码块复制 / A-4 时间戳 / A-5 错误态组件）未落地。
- a11y 基线（`role="log"` + `aria-live="polite"`）未落地。
- design.md §14.2 已定义 namespace `ai` 的 7 个 action + `$ai` 表达式 helper；`useConversation` host helper 接口已在 `engine.md` §8.6 定义（host 用，非渲染器内 API）。

## Goals

- 实现 4 个 P1 渲染器：`ai-conversations`（新建/切换/重命名/删除）、`ai-welcome`、`ai-prompts`、`ai-feedback`（copy/refresh/like/dislike）。
- 注册 ActionScope namespace `ai`（Layer B）：`ai:send`/`ai:abort`/`ai:clear`/`ai:createConversation`/`ai:switchConversation`/`ai:deleteConversation`/`ai:renameConversation` + `$ai` 表达式 helper（`isProcessing`/`messages`/`activeConversationId`）；`ai-chat` onMount 注册、onUnmount 反注册。
- A-2 流式 Markdown 缓冲（design.md §10.4 路径 C：`react-markdown` 外包轻量 ~2KB 缓冲层，处理 CJK 缓冲 + code fence 缓冲），消除闪烁。
- A-3 代码块复制按钮、A-4 消息时间戳、A-5 错误态组件、A-1 `ChatMessageDataPart`（`data-${string}` content part）渲染器注册支持。
- a11y 基线：`ai-message-list` 根 `role="log"` + `aria-live="polite"`；`ai-sender` 提交后焦点回输。
- host 提供 OpenAI/DeepSeek connector（`apps/playground` 用 `createStreamBasedAiConnector`），playground 接真实 API 能对话；会话切换正常；外部按钮 `ai:send` 工作；流式 Markdown 不闪烁。

## Non-Goals

- **不**实现工具调用渲染与 `toolPlugin` 完整接入（`ai-tool-call`，A3）、附件（`ai-attachments`，A3）、ComponentHandle（Layer C，A3）。
- **不**实现虚拟滚动（A-8）、光标动画（A-11）、消息编辑、LaTeX（A3）。
- **不**实现持久化（刷新清空，A4）；`useConversation` 的 `storage` 参数对 host 仍可选（A4 才接 storage）。
- **不**实现引用气泡（`ai-citations`，A4）、HITL 审批（A4）、语音输入（A5）、token 用量（A5）、消息分支（A5）、建议气泡（A5）。
- **不**引入 mermaid/shiki（`design.md` §20 已裁定不引入）。
- **不**评估/适配 streamdown/core（design.md §10.4 路径 B，留 A3 评估）；P1 用路径 C 轻量缓冲。

## Scope

### In Scope

- `packages/flux-renderers-ai/src/renderers/`：`ai-conversations.tsx` / `ai-welcome.tsx` / `ai-prompts.tsx` / `ai-feedback.tsx`。
- `packages/flux-renderers-ai/src/adapters/use-conversation.ts`：`useConversation` host helper（`engine.md` §8.6；conversations scope-owned，host 管理列表 + scope 同步）。
- ActionScope namespace `ai`：经 `useCurrentActionScope()` + `useNamespaceRegistration` 注册/反注册（`ai-chat` 渲染器内）+ `$ai` 表达式 helper。
- 流式 Markdown 缓冲层（A-2）：`ai-bubble` markdown 渲染器外包缓冲组件；代码块复制（A-3）；时间戳（A-4）；错误态组件（A-5）；`data-${string}` 渲染器注册支持（A-1）。
- a11y：`ai-message-list` `role="log"` + `aria-live="polite"`；`ai-sender` 焦点回输。
- `schemas.ts` 补 P1 schema 类型；`ai-renderer-definitions.ts` 注册 4 个新渲染器。
- `apps/playground/src/`：OpenAI/DeepSeek connector host helper + 会话示例 + 路由。
- `tests/e2e/`：真实/模拟对话 + 会话切换 + 外部 `ai:send` + 无闪烁抽查。
- owner doc 同步：`design.md` §5.1、`docs/components/index.md`、roadmap A2、dev log。

### Out Of Scope

- `flux-core` 改动（A0 已就绪）。
- Layer C ComponentHandle（A3）。
- storage 具体实现（A4）。

## Failure Paths

| 场景编号              | 触发                                    | 行为                                                       | 可重试 | 用户可见表现                   |
| --------------------- | --------------------------------------- | ---------------------------------------------------------- | ------ | ------------------------------ |
| `real-api-error`      | 真实 API 返回非 2xx / 网络错误          | engine `requestState:'error'`；A-5 错误态组件渲染          | 是     | 气泡显示错误态 + 重试入口      |
| `switch-while-stream` | 会话切换时当前会话正在流式              | 保留正在流式的会话后台运行（双层模型），切回可见已生成内容 | —      | 切换不中断当前流               |
| `ai-action-no-scope`  | host 未提供 actionScope                 | namespace 注册静默跳过（capability check），不崩溃         | —      | 外部按钮不可用，对话面板仍正常 |
| `markdown-truncated`  | 流式 chunk 导致未闭合 code fence / `$$` | 缓冲层暂缓渲染未闭合段，避免后续内容被当代码/公式          | —      | 不闪烁，闭合后才高亮           |
| `cjk-half-char`       | chunk 边界切断多字节 CJK 字符           | 缓冲层累积至完整字符再渲染                                 | —      | 无乱码                         |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**。理由：namespace `ai` 是对外 ActionScope 契约（schema 可声明式触发，属核心回归路径）；流式 Markdown 缓冲是体验关键且有明确失败模式（CJK 乱码/未闭合 fence）；4 个新渲染器需关键交互覆盖。Proof（缓冲层单测、namespace 注册/反注册）应在 Fix 之前/同时落地。

## Execution Plan

### Phase 1 - ActionScope namespace `ai`（Layer B）

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-chat.tsx`、namespace 注册模块、`docs/architecture/action-scope-and-imports.md`（如需核对保留别名）

- Item Types: `Fix | Proof`

- [ ] `ai-chat` 渲染器经 `useCurrentActionScope()`（`@nop-chaos/flux-react`，`packages/flux-react/src/context-hooks.ts:24`）取当前 ActionScope，再用现成 helper `useNamespaceRegistration(actionScope, 'ai', aiActionProvider)`（`packages/flux-react/src/workbench/hooks.ts`，参考 `report-designer-renderers/src/page-renderer.tsx:315`、`flow-designer-renderers/src/designer-page-body.tsx:170` 用法）注册 namespace。该 helper 内部用 `useLayoutEffect` 管理注册/反注册生命周期（capability check：`actionScope` 为 `undefined` 时跳过，host 无 actionScope 不崩溃）。**注**：`design.md` §11.1 Layer B 原文写 `runtime.actionScope?.registerNamespace`，与 live API 不符（runtime 无 `actionScope` 属性）；本计划以 live API 为准，实施时同步订正 `design.md` §11.1（参见 Non-Blocking Follow-ups）。
- [ ] `aiActionProvider` 实现 7 个 action：`send`/`abort`/`clear`/`createConversation`/`switchConversation`/`deleteConversation`/`renameConversation`（`design.md` §14.2）。
- [ ] `$ai` 表达式 helper：`isProcessing`/`messages`/`activeConversationId`（避开保留别名 `$form/$page/$crud/$designer/$slot/$surface/$resource`）。

Exit Criteria:

- [ ] focused 单测：namespace 注册/反注册（mock actionScope）；`ai:send`/`ai:abort`/`ai:clear` 委托 engine 正确；host 无 actionScope 时不崩溃（capability check 生效）。
- [ ] `$ai.isProcessing` 表达式求值正确（reactive 随 engine 状态变化）。

### Phase 2 - 流式 Markdown 缓冲（A-2）+ 代码块复制（A-3）+ ai-bubble 增强

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-bubble/**`

- Item Types: `Fix | Proof`

- [ ] A-2：在 `react-markdown` 外包轻量缓冲组件（~2KB gzip，design.md §10.4 路径 C），处理 CJK 多字节缓冲（chunk 边界切断字符时累积至完整）+ code fence 缓冲（未闭合 ```/`$$`/`\(` 暂缓渲染）；其余 markdown 解析仍走现有 sanitize pipeline。
- [ ] A-3：代码块复制按钮（`ai-bubble` markdown 渲染器内，复用 `navigator.clipboard` 经 host 抽象或直接 ui Button，遵守 INV-1 若涉及剪贴板 IO）。
- [ ] A-1：`data-${string}` content part 渲染器注册支持（`BubbleContentRendererMatch` 匹配 `type` 前缀 `data-`）。

Exit Criteria:

- [ ] A-2 focused 单测：CJK 半字符 chunk 输入 → 完整字符输出；未闭合 code fence → 后续内容不被当代码；闭合后正常高亮。
- [ ] A-3 行为抽查：复制按钮点击后剪贴板含代码内容。
- [ ] A-1 单测：`data-sources` part 经注册渲染器渲染（host 注册自定义渲染器覆盖默认）。

### Phase 3 - 4 个 P1 渲染器 + 时间戳（A-4）+ 错误态（A-5）

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/{ai-conversations,ai-welcome,ai-prompts,ai-feedback}.tsx`、`src/adapters/use-conversation.ts`、`schemas.ts`、`ai-renderer-definitions.ts`

- Item Types: `Fix | Proof`

- [ ] `ai-conversations`（Widget marker `nop-ai-conversations`）：会话列表侧边栏，新建/切换/重命名/删除；conversations/activeConversationId 经 `useScopeSelector` 读 schema 表达式（scope-owned，host 管理）。
- [ ] `ai-welcome`（Widget marker `nop-ai-welcome`）：空状态欢迎页（icon/title/description/footer）。
- [ ] `ai-prompts`（Widget marker `nop-ai-prompts`）：推荐提示词卡片列表（垂直/水平/折行布局）。
- [ ] `ai-feedback`（Widget marker `nop-ai-feedback`）：消息底部操作条（copy/refresh/like/dislike/sources）。
- [ ] `useConversation` host helper（`engine.md` §8.6）：双层模型（conversations 全量内存 + engines Map 惰性创建，切走清理非活跃非 processing，保留正在流式的会话后台运行）。
- [ ] A-4 消息时间戳（`ai-bubble` 渲染 `message.metadata.createdAt`）；A-5 错误态组件（engine `requestState:'error'` 时渲染）。

Exit Criteria:

- [ ] 4 渲染器各有 focused 单测（marker + 关键交互：conversation CRUD 委托、feedback copy/like 触发 events）。
- [ ] `useConversation` 单测：会话切换保留后台流式 engine（双层模型验证）；conversations 经 scope 同步。
- [ ] `schemas.ts` 4 个 P1 schema 类型补齐；`ai-renderer-definitions.ts` 注册 4 新渲染器。

### Phase 4 - a11y 基线

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/ai-message-list.tsx`、`ai-sender.tsx`、相关渲染器

- Item Types: `Fix | Proof`

- [ ] `ai-message-list` 根元素 `role="log"` + `aria-live="polite"`（流式新消息可被屏阅器播报）。
- [ ] `ai-sender` 提交后焦点回输输入框。
- [ ] 状态属性 presence-only 复核（`data-streaming` 等 false 时省略）。

Exit Criteria:

- [ ] focused 单测/抽查：`ai-message-list` 根含 `role="log"` 与 `aria-live="polite"`；sender 提交后焦点在输入框（用 `page.evaluate`/locator 验证，禁止截图诊断）。

### Phase 5 - host 真实 connector + playground 示例 + e2e

Status: planned
Targets: `apps/playground/src/`、`tests/e2e/`

- Item Types: `Fix | Proof`

- [ ] playground host helper：OpenAI/DeepSeek connector（`createStreamBasedAiConnector` + `buildRequest` 构造 OpenAI 兼容请求；apiKey/baseURL/model 由 host 提供，不进包内）。
- [ ] 会话示例页面（含 `ai-conversations` + `ai-chat` + 外部 `ai:send` 按钮）+ 路由注册。
- [ ] e2e：模拟/真实 API 对话 + 会话新建/切换/删除 + 外部按钮 `ai:send` 触发 + 流式 Markdown 无闪烁抽查（断言连续 chunk 下 DOM 文本不含乱码/异常高亮）。

Exit Criteria:

- [ ] playground 接真实 API（如可用）或 mock 真实协议能端到端对话；会话切换正常；外部按钮 `ai:send` 工作；流式 Markdown 不闪烁（人工抽查 + e2e 断言记录 dev log）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session）—— round 1: ses_070c46885ffefw6pcZ1BCjPaf1；round 2: ses_070be1d4bffeSH0sHVg7bR1yk1
- Verdict: `pass-with-minors`（round 1 为 `revised`，round 2 升 `pass-with-minors`）
- Rounds: 2
- Findings addressed:
  - **Major（已解决）**：Phase 1 namespace 注册 API 原写 `runtime.actionScope?.registerNamespace` 与 live 不符（runtime 无 `actionScope` 属性）。订正为 live API：`useCurrentActionScope()`（`packages/flux-react/src/context-hooks.ts:24`）+ `useNamespaceRegistration(actionScope, 'ai', aiActionProvider)`（`packages/flux-react/src/workbench/hooks.ts:102`，内部 `useLayoutEffect` + capability check）；移除"NodeRenderer 集中管理/不自己写 mount hook"措辞；引用用法经核对（`report-designer-renderers/src/page-renderer.tsx:315`、`flow-designer-renderers/src/designer-page-body.tsx:170`）；`design.md` §11.1 Layer B 同源 drift 已记入 Non-Blocking Follow-ups 待订正。round 2 确认 Major 已解决、无新 Blocker/Major。
  - Minor：`ai-tool-call` `aria-label`（roadmap 标 P1）随 `ai-tool-call` 渲染器在 A3 落地，已记入 Non-Goals 与 Non-Blocking Follow-ups；In-Scope 摘要残留 stale `runtime.actionScope` 措辞已对齐为 `useCurrentActionScope()` + `useNamespaceRegistration`。
  - 零 Blocker / 零 Major。保留别名清单 `$form/$page/$crud/$designer/$slot/$surface/$resource`（`$ai` 未保留）、改进项 A-1~A-5、A2 工作项范围均经 live repo 核对一致。

## Closure Gates

- [ ] 4 个 P1 渲染器实现，遵守 renderer 契约、marker、`@nop-chaos/ui` only、INV-1 守卫测试仍通过。
- [ ] ActionScope namespace `ai` 注册/反注册正确，7 个 action + `$ai` helper 可用；host 无 actionScope 时不崩溃。
- [ ] A-2 流式 Markdown 缓冲消除 CJK 乱码与未闭合 fence 问题（focused 单测覆盖）。
- [ ] A-1/A-3/A-4/A-5 落地。
- [ ] a11y 基线（`role="log"` + `aria-live="polite"` + 焦点回输）落地。
- [ ] host 真实 connector 可用，会话切换、外部 `ai:send`、无闪烁均验证；e2e 通过。
- [ ] owner doc `design.md` §5.1 P1 渲染器状态、`docs/components/index.md`、roadmap A2（`todo`→`done`）、Phase Status A2 同步；dev log 记录。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### streamdown/core 适配（design.md §10.4 路径 B）

- Classification: `optimization candidate`
- Why Not Blocking Closure: P1 用路径 C 轻量缓冲（~2KB）已解 CJK + code fence 闪烁；streamdown/core（~8KB，含 math 完整支持）是更重方案，A3 评估 LaTeX/KaTeX 时一并评估是否引入。
- Successor Required: `yes` → A3

### useAutoScroll 公开为 host utility（A-9）

- Classification: `optimization candidate`
- Why Not Blocking Closure: P1 仍内部使用；公开 API 表面与外部使用场景一起在 A3（A-9）设计。
- Successor Required: `yes` → A3

## Non-Blocking Follow-ups

- 订正 `design.md` §11.1 Layer B：将 `runtime.actionScope?.registerNamespace` 改为 live API `useCurrentActionScope()` + `useNamespaceRegistration`（本计划 Phase 1 已按 live API 执行；design doc 描述需同步）。
- 工具状态颜色（A-12）、推理持续时间（A-10）、流式光标动画（A-11）属 A3 渲染器深化范围。
- `ai-tool-call` 根元素 `aria-label`（roadmap 标为 P1 a11y）随 `ai-tool-call` 渲染器在 A3 一并落地（本计划 Non-Goal，A3 收口）。
- messages 序列化进 flux form 字段（Phase 5 评估项）属 A5。

## Closure

Status Note: <<关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link>>

Follow-up:

- <<只记录 non-blocking follow-up>>
