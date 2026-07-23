# A1 flux-renderers-ai P0 骨架 + 最小闭环

> Plan Status: active
> Last Reviewed: 2026-07-23
> Source: `docs/components/flux-renderers-ai/design.md`（§5-§10、§18 不变量）、`engine.md`（§7-§9）、`renderers.md`、`docs/analysis/ai-survey/2026-07-21-tiny-robot-deep-analysis.md`
> Mission: ai
> Work Item: A1 — P0 骨架 + 最小闭环（4 renderer）
> Related: 上游 `2026-07-23-2143-1-a0-env-stream-and-socket-extension.md`（A0，硬前置）；下游 `2026-07-23-2143-3-a2-flux-renderers-ai-p1-conversations-markdown.md`（A2，依赖本计划）

## Purpose

创建 `@nop-chaos/flux-renderers-ai` 包，从 tiny-robot（Vue 3, MIT）移植框架无关的消息引擎核心并用 React 19 + flux 架构重写适配层，实现 P0 的 4 个核心渲染器（`ai-chat` / `ai-message-list` / `ai-bubble` / `ai-sender`），让 playground 能用 host 提供的 mock connector 跑通"发送 → 流式接收 → 气泡渲染"最小闭环。

## Current Baseline

- `packages/flux-renderers-ai/` 包**尚不存在**（`ls packages/ | grep ai` 仅 `tailwind-preset`）。
- A0 落地后 `env.stream?: StreamFetcher` 可用（mock 流式 chunk 经 `env.stream` 注入）。
- 设计文档全部完成且已 audit（`design.md` v2 解决所有 FIX 项、`engine.md`、`renderers.md`、`implementation.md`、`improvement-analysis.md`、`audit.md`），tiny-robot 深度调研报告与移植建议已完成。
- `flux-renderers-content` 包根导出 `sanitizeHtml` 纯函数（`@nop-chaos/flux-renderers-content`，`src/index.ts` re-export，**非** `/markdown` 子路径）；`ai-bubble` P0 markdown 渲染复用。
- 包结构、目录组织、`src/index.ts` 分组、package.json 模板、包外配置改动清单已在 `design.md` §6 完整定义。
- 渲染器契约（`RendererComponentProps`、标准 hooks 表、marker/data-slot 约定、INV-1 IO 边界守卫）已在 `design.md` §10、§13、§18 与 `docs/references/renderer-interfaces.md`、`docs/architecture/renderer-runtime.md` 定义。
- playground 各 host 文件各自构造 env 并调 `registerXxxRenderers(registry)`（如 `m5-showcase-shared.ts`），AI 渲染器注册可照此模式接入。

## Goals

- 建 `flux-renderers-ai` 包（package.json / tsconfig / tsconfig.build / vitest / 目录结构），完成包外配置注册（root tsconfig references、tsconfig.base.json paths、`vite.workspace-alias.ts`、playground `styles.css` import）。
- 移植框架无关引擎核心：`createMessageEngine` + `combineDeltaData` + 插件链（thinking/tool/length）+ `MessageStateAdapter`（native adapter 测试用）。
- 实现 React 适配：`createReactMessageAdapter`（`useSyncExternalStore`）+ `useMessage` hook + `useAutoScroll` hook + `createStreamBasedAiConnector`（host helper，把 `env.stream` 输出映射为 `AiConnector`）。
- 实现 P0 4 渲染器：`ai-chat`（Layout，Layer A React Context 传播 engine）、`ai-message-list`（Layout）、`ai-bubble`（Widget，P0 仅 markdown + loading renderer）、`ai-sender`（Widget）。
- playground 提供 mock connector（host helper，经 `createStreamBasedAiConnector` + mock `env.stream` 产出 canned OpenAI chunk）+ `example.json` + 示例页面 + 路由 + `registerAiRenderers(registry)`。
- 全量 `pnpm typecheck/build/lint/test` 全绿；playground 能发送并接收 mock 流式回复。

## Non-Goals

- **不**实现真实 AI connector（OpenAI/DeepSeek，A2 的 host 职责）；P0 仅 mock connector。
- **不**实现 `ai-conversations` / `ai-welcome` / `ai-prompts` / `ai-feedback`（A2）。
- **不**注册 ActionScope namespace `ai`（Layer B，A2）与 ComponentHandle（Layer C，A3）。
- **不**实现流式 Markdown CJK/代码 fence 缓冲（A2 A-2）；P0 直接用 `react-markdown` + sanitize（已知非流式安全，闪烁在 A2 优化）。
- **不**实现 `ai-bubble` 的 reasoning/tools/image 子渲染器（P0 仅 markdown + loading）；`ai-tool-call`/`ai-attachments`（A3）。
- **不**实现持久化（`ConversationStorageStrategy` 仅留接口契约 `src/storage/types.ts`，不提供实现，A4）。
- **不**接 flux form owner（消息状态由 engine 自持，Phase 5 再评估）。
- **不**引入 Tiptap（A6）；P0 sender 用 `<Textarea>` + auto-resize。
- **不**内置任何具体 Connector 工厂（`createOpenAIConnector` 等均为 host 职责）；包内仅 `createStreamBasedAiConnector`（不含后端配置、不含协议解析）。

## Scope

### In Scope

- `packages/flux-renderers-ai/`：`package.json`、`tsconfig.json`（extends `../../tsconfig.base.json`，`noEmit`）、`tsconfig.build.json`、`vitest.config.ts`（复用 `../../vitest.shared.ts`）、`src/` 全部内容（按 `design.md` §6 目录结构）。
- `src/engine/`：`create-engine.ts` / `types.ts` / `utils.ts`（`combineDeltaData`）/ `state-adapter.ts` / `native-adapter.ts` / `plugins/{thinking,tool,length}-plugin.ts`。
- `src/adapters/`：`react-adapter.ts` / `use-message.ts` / `use-auto-scroll.ts` / `ai-connector-factory.ts` / `ai-chat-context.tsx`。
- `src/storage/types.ts`：仅 `ConversationStorageStrategy` 接口。
- `src/renderers/`：`ai-chat.tsx` / `ai-message-list.tsx` / `ai-bubble/{index.tsx, types.ts, renderers/{default-renderers,markdown,loading,text}.tsx}` / `ai-sender.tsx`。
- `src/{index.ts, schemas.ts, ai-renderer-definitions.ts, styles.css, test-support.ts}` + `src/__tests__/contract-honesty.test.ts`（INV-1 守卫）。
- 包外配置：root `tsconfig.json` references、`tsconfig.base.json` paths、`vite.workspace-alias.ts`、`apps/playground/src/styles.css`。
- `apps/playground/src/`：mock connector + `example.json` + 示例页面 + 路由注册 + `registerAiRenderers(registry)`。
- `tests/e2e/`：mock 对话 e2e。

### Out Of Scope

- `flux-core` / `flux-runtime` / `flux-react` / `ui` 的代码改动（除非包外配置必须）。
- 任何真实后端连接（A2）。
- virtual scroll / LaTeX / 工具卡片 / 附件 / 引用 / HITL / 语音 / token 用量 / 消息分支（A3-A5）。

## Failure Paths

| 场景编号              | 触发                               | 行为                                                                               | 可重试 | 用户可见表现              |
| --------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- | ------ | ------------------------- |
| `connector-throw`     | `connector.stream()` 抛错          | engine 写 `requestState: 'error'`；assistant 消息标记错误；触发 `onError` 插件钩子 | 否     | 气泡显示错误态            |
| `abort`               | 用户点停止 / `engine.abort()`      | `ctx.signal` abort；`requestState: 'aborted'`；已接收内容保留                      | 是     | 停止流式，保留已生成内容  |
| `empty-send`          | `sendMessage('')` 空内容           | engine no-op（不发起请求）                                                         | —      | 无反应                    |
| `connector-missing`   | `connector` 表达式求值为 undefined | `ai-chat` 显示错误提示（不崩溃）                                                   | 否     | 面板提示 connector 未配置 |
| `first-chunk-loading` | 发送后等待首个 chunk               | assistant 消息 `loading: true`，`ai-bubble` 渲染 loading renderer                  | —      | 显示加载占位              |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**。理由：引擎核心（`combineDeltaData` 流式累积、状态机）是全新核心代码且为后续所有 Phase 的基础；新渲染器需关键回归路径覆盖。引擎 Proof（纯 TS 单测）必须在 React 适配落地前完成。

## Execution Plan

### Phase 1 - 包 bootstrap 与配置注册

Status: planned
Targets: `packages/flux-renderers-ai/{package.json,tsconfig.json,tsconfig.build.json,vitest.config.ts}`、root `tsconfig.json`、`tsconfig.base.json`、`vite.workspace-alias.ts`、`apps/playground/src/styles.css`

- Item Types: `Fix | Proof`

- [ ] 按 `design.md` §6.2 / §6.3 建 `package.json`（`sideEffects:["*.css"]`、`exports` 含 `/styles.css`、`private:true`、workspace 协议、`dependencies` 仅 `flux-core/flux-react/flux-i18n/ui`、`peerDependencies` react/lucide-react/react-markdown 等）。
- [ ] 建 `tsconfig.json`（extends `../../tsconfig.base.json`、`noEmit`、含 `include: ["src", "../../types/**/*.d.ts"]` 以引入全局类型，照 `flux-renderers-content` 模板）、`tsconfig.build.json`（declaration、`outDir:dist`、exclude tests）、`vitest.config.ts`（复用 `../../vitest.shared.ts` 的 `createSharedVitestConfig`）。
- [ ] 包外配置：root `tsconfig.json` references 加本包；`tsconfig.base.json` paths 加两条 alias；`vite.workspace-alias.ts` 加 `@nop-chaos/flux-renderers-ai` 与 `/styles.css`；`apps/playground/src/styles.css` 加 `@import`。
- [ ] 建 `src/index.ts`（按 §6.1 分组占位：types / renderers / host utilities / registry）。**P0 仅导出 P0 符号**——`useConversation`（属 A2，`design.md` §6.1 列出但本计划 Non-Goal）暂不导出，避免盲抄 §6.1 导致缺失模块 typecheck 错误；`styles.css`（marker 占位）。

Exit Criteria:

- [ ] `pnpm --filter @nop-chaos/flux-renderers-ai typecheck` 通过（即便内容是占位，包可被 workspace 解析）。
- [ ] playground `styles.css` 引入后 `pnpm --filter @nop-chaos/app-playground typecheck` 不报错（验证 alias 注册正确）。

### Phase 2 - 引擎核心移植（框架无关）

Status: planned
Targets: `packages/flux-renderers-ai/src/engine/**`

- Item Types: `Fix | Proof`

- [ ] `types.ts`：`ChatRole` / `ChatMessageContentPart`（含 P1 占位 `data-${string}` 类型，参见 `engine.md` §7.1）/ `ChatToolCall` / `ChatMessage` / `ChatMessageUIState` / `AiConversationInfo` / `AiConnector`/`AiConnectorChunk`/`AiConnectorRequest`（`engine.md` §9.2）/ `MessageEngine` / `MessageEnginePlugin`。
- [ ] `utils.ts`：移植 `combineDeltaData(target, source)`（string 拼接、按 `index` 合并数组、object 递归合并、`type` 字段不覆盖）。
- [ ] `create-engine.ts`：`createMessageEngine`（`engine.md` §8.1 接口：`getState/subscribe(全量+分通道)/sendMessage/send/abort/setConnector/registerPlugin`）。
- [ ] `state-adapter.ts` + `native-adapter.ts`：`MessageStateAdapter` 抽象 + `createNativeMessageAdapter`（纯 TS，闭包持 state，测试用）。
- [ ] `plugins/`：`thinking-plugin` / `tool-plugin` / `length-plugin`（`engine.md` §8.3 钩子：onTurnStart/onBeforeRequest/onCompletionChunk/onAfterRequest/onTurnEnd/onError）。

Exit Criteria:

- [ ] `src/engine/` 下零 `import 'react'` / 零 DOM 全局引用（`design.md` §18.1 不变量 1）——INV-1 守卫测试覆盖。
- [ ] focused 单测：`combineDeltaData` 全分支（string+string、按 index 合并数组、object 递归、`type` 不覆盖、新字段赋值）；engine 状态机流转（idle→processing→completed/aborted/error）；native adapter subscribe/notify。

### Phase 3 - React 适配与 host helper

Status: planned
Targets: `packages/flux-renderers-ai/src/adapters/**`

- Item Types: `Fix | Proof`

- [ ] `react-adapter.ts`：`createReactMessageAdapter`（module-level store + `Set<listener>` + `useSyncExternalStore` 友好的 state 引用替换 + 按 kind 分通道通知）。
- [ ] `use-message.ts`：`useMessage({connector,initialMessages,plugins})`（`useRef` lazy init engine；connector 引用变化调 `setConnector`；React 19 默认不加 `useMemo`/`useCallback`）。
- [ ] `use-auto-scroll.ts`：`useAutoScroll` hook（P2 才公开为 host utility，P0 先内部用）。
- [ ] `ai-connector-factory.ts`：`createStreamBasedAiConnector({env,buildRequest})`——调 `env.stream`（已自动 SSE 切分+JSON 解析），把 OpenAI chunk 结构映射为 `AiConnectorChunk`，**不含** baseURL/apiKey/model 硬编码、**不含**协议解析代码（`design.md` §18.2 不变量 14/15）。
- [ ] `ai-chat-context.tsx`：`AiChatProvider` / `useAiChatContext`（engine 在 `ai-chat` 根节点传播；`ai-chat` 外用时返回 null）。

Exit Criteria:

- [ ] `createStreamBasedAiConnector` focused 单测：mock `env.stream` 返回 canned OpenAI chunk generator → 验证映射为 `AiConnectorChunk`；`response.status !== 200` 抛错路径。
- [ ] `useMessage` 行为抽查（react adapter 订阅 + connector 热替换不重建 engine 实例）。

### Phase 4 - P0 渲染器实现

Status: planned
Targets: `packages/flux-renderers-ai/src/renderers/**`、`src/{schemas.ts,ai-renderer-definitions.ts,test-support.ts}`、`src/__tests__/contract-honesty.test.ts`

- Item Types: `Fix | Proof`

- [ ] `schemas.ts`：P0 schema 类型（`AiChatSchema`/`AiMessageListSchema`/`AiBubbleSchema`/`AiSenderSchema`）。
- [ ] `ai-chat.tsx`：Layout marker `nop-ai-chat` + `data-slot="ai-chat-root"`；`<AiChatProvider>` 包裹；渲染 header/beforeMessages/`AiMessageListRenderer`/`AiSenderRenderer`/footer region；Layer A 内部 Context 传播。
- [ ] `ai-message-list.tsx`：Layout marker `nop-ai-message-list`；分组、注册制渲染调度（P0 简化）、auto-scroll 接入。
- [ ] `ai-bubble/{index.tsx, types.ts, renderers/}`：Widget marker `nop-ai-bubble`；`BubbleContentRendererMatch` 注册制（`design.md` §10.3）；P0 默认渲染器 `loading` + `markdown`（复用 `@nop-chaos/flux-renderers-content` 包根导出的 `sanitizeHtml`）+ `text`。
- [ ] `ai-sender.tsx`：Widget marker `nop-ai-sender`；`<Textarea>` + auto-resize + Enter 提交 + 字数 + submit/cancel；全部用 `@nop-chaos/ui` 组件，禁止裸 HTML。
- [ ] `ai-renderer-definitions.ts`：4 个 `RendererDefinition` 主注册表；`test-support.ts`：`createMockRendererProps`。
- [ ] `contract-honesty.test.ts`：INV-1 守卫（`src/engine`+`src/renderers` 零直调 `fetch`/`WebSocket`/`EventSource`/`localStorage`/`IndexedDB`/动态 `import()`）+ marker 存在 + UI 组件来自 `@nop-chaos/ui`。

Exit Criteria:

- [ ] 4 渲染器各有 focused 单测（marker 存在、关键交互：sender submit→engine.sendMessage、bubble markdown 渲染、message-list 渲染 messages）。
- [ ] INV-1 守卫测试通过（`design.md` §18.2 不变量 11-15 全覆盖）。
- [ ] 状态属性 presence-only（`data-streaming` false 时省略，不输出 `="false"`，`design.md` §13.2/§18.1 不变量 5）。

### Phase 5 - playground mock 闭环与 e2e

Status: planned
Targets: `apps/playground/src/`、`tests/e2e/`

- Item Types: `Fix | Proof`

- [ ] playground host helper：mock connector（`createStreamBasedAiConnector` + mock `env.stream` 产出 canned OpenAI SSE chunk，模拟逐字流式）；经 `xui:imports` 注册 `ai.connectors.mock`。
- [ ] `example.json` + 示例页面 + 路由注册 + `registerAiRenderers(registry)` 接入。
- [ ] e2e 测试：在 playground 页面输入文本 → 点发送 → 断言 mock 流式回复逐字出现在气泡里（用 `page.locator` 断言内容，**禁止**用截图诊断）。

Exit Criteria:

- [ ] playground `pnpm dev` 下能发送并接收 mock 流式回复（人工抽查记录 dev log）。
- [ ] e2e mock 对话测试通过（`pnpm test:e2e` 对应文件绿）。

## Draft Review Record

- Reviewer / Agent: 独立子 agent（fresh session，ses_070c48e1effe6kRp5cY92tFeBQ）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。处理 3 条 Minor（已全部收紧）：① `sanitizeHtml` 导入路径订正——由包根 `@nop-chaos/flux-renderers-content` 导出（`src/index.ts` re-export，非 `/markdown` 子路径，该子路径不存在）；② Phase 1 显式注明 P0 `index.ts` 不导出 A2 的 `useConversation`（避免盲抄 `design.md` §6.1 导致缺失模块 typecheck 错误）；③ Phase 1 `tsconfig.json` 补 `include: ["src", "../../types/**/*.d.ts"]`（照 content 模板引入全局类型）。A0 硬前置正确声明且不阻塞本计划升 active（顺序队列，依赖显式）。Minors 不阻塞。引用（`flux-renderers-ai` 不存在、`sanitizeHtml` 存在、`vitest.shared.ts` 存在、4 步包注册配置、`registerRendererDefinitions`/`RendererRegistry` 均存在）经 live repo 核对一致。

## Closure Gates

- [ ] `flux-renderers-ai` 包已建并完成包外配置注册，workspace 可解析、playground styles.css 已 import。
- [ ] 引擎核心框架无关（`src/engine` 零 React/DOM 依赖），`combineDeltaData` 全分支有单测。
- [ ] P0 4 渲染器实现，遵守 renderer 契约（`props.props/meta/regions/events/helpers`）、marker、`@nop-chaos/ui` only、INV-1 守卫测试通过。
- [ ] playground mock 流式对话闭环可跑通，e2e 测试通过。
- [ ] 不内置任何具体 Connector 实现、不实现 SSE 协议解析、`src/storage` 只含接口（`design.md` §18 不变量 13-15）。
- [ ] owner doc `docs/components/flux-renderers-ai/design.md` §5.1 渲染器清单状态 + `docs/components/index.md` 同步（P0 4 渲染器标已实现）。
- [ ] roadmap `docs/components/roadmap-ai.md` A1 状态 `todo`→`done`，Phase Status A1 同步。
- [ ] dev log `docs/logs/2026/07-23.md` 记录。
- [ ] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

### 流式 Markdown CJK/代码 fence 缓冲

- Classification: `optimization candidate`
- Why Not Blocking Closure: P0 直接用 `react-markdown` + sanitize 已可渲染（非流式安全）；CJK 乱码/未闭合 fence 闪烁是体验优化，A2（A-2）专项收口。mock connector 内容可控，P0 闭环不触发该缺陷。
- Successor Required: `yes` → `2026-07-23-2143-3-a2-...`（A2 A-2）

### useAutoScroll 公开为 host utility

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: P0 内部使用即可；公开 API 表面留到 A2（A-9）与外部使用场景一起设计。
- Successor Required: `yes` → A2/A3

## Non-Blocking Follow-ups

- `ai-bubble` reasoning/tools/image 子渲染器在 P1/P2 增量补齐。
- 插件链 `skillPlugin` 不移植（`design.md` §4 决策，非核心）。

## Closure

Status Note: <<关闭时填写>>

Closure Audit Evidence:

- Auditor / Agent: <<独立子 agent>>
- Evidence: <<task id / daily log link>>

Follow-up:

- <<只记录 non-blocking follow-up>>
