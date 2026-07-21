# flux-renderers-ai 实施辅助

> **定位**：`design.md` 的实施辅助附录，包含测试策略、渐进式路线、风险表、v1→v2 变更摘要。
> **作用**：让 `design.md` 聚焦"设计核心"（≤ 50KB），把"执行辅助"集中到本文件供实施者按需查阅。

## 1. 测试策略

| 层级             | 范围                                                                      | 文件组织                                              |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| 引擎单元         | `engine/` 全部（createEngine、combineDeltaData、makeAbortable、plugins）  | `src/engine/__tests__/*.test.ts`（纯 TS）             |
| React adapter    | `createReactMessageAdapter` + `useMessage` + `useConversation`            | `src/adapters/__tests__/*.test.tsx`（happy-dom）      |
| AiConnector 契约 | `AiConnector` 接口 + `createStreamBasedAiConnector`（用 mock env.stream） | `src/adapters/__tests__/ai-connector-factory.test.ts` |
| 渲染器单元       | 每个 renderer（mock props + render）                                      | `src/renderers/<name>.test.tsx` colocated             |
| 契约守卫         | `contract-honesty.test.ts`（每个 eventContract 都被实现引用）             | `src/__tests__/contract-honesty.test.ts`              |

**关键变更（vs v1）**：

- ❌ 移除"SSE 解析"专项测试（协议解析已下沉到 `env.stream` 内部，包内无需测试）
- ❌ 移除"Storage 实现"测试（包内不再有具体实现）
- ❌ 移除"Providers（createOpenAICompatibleProvider / createMockProvider）"测试（已删除）
- ✅ 新增"`AiConnector` 契约测试"（用 mock `env.stream` 验证 host helper 正确组装；重点测 chunk 类型映射）
- ✅ 新增"INV-1 守卫测试"（lint 或静态检查确保 `src/engine/` / `src/renderers/` 下无 `fetch`/`WebSocket`/`EventSource`/`localStorage`/`IndexedDB` 直调）
- ✅ 新增"`StreamChunkParseError` 抛错路径测试"（chunk 解析失败必须抛 `StreamChunkParseError`，含 `chunkIndex` / `rawChunk` / `cause`）
- ✅ 新增"`env.stream` 缺失降级测试"（`createStreamBasedAiConnector` 在 `env.stream` 缺失时抛错）
- ✅ 新增"SSE `[DONE]` 自动结束迭代测试"

Tier（按 AGENTS.md "Test Strategy Tiers"）：

- **Must automate**：`combineDeltaData` 算法（流式正确性是核心契约）、abort（用户控制语义）、tool 调用生命周期（多轮对话基础）、渲染器契约守卫、INV-1 守卫、`StreamChunkParseError` 抛错路径、`env.stream` 缺失降级。
- **Should have tests**：所有渲染器的渲染输出、events 透传、状态属性正确性、`AiConnector` 契约。
- **Not applicable**：纯文档章节。

## 2. 渐进式实现路线

> **前置依赖**：P0 必须**先**完成 `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` 评审 + `packages/flux-core` 扩 `RendererEnv.stream` + `apps/playground` 提供默认 stream 实现。否则 P0 无法跑通 mock 对话。

| Phase                                            | 目标                                                                                                                                                                                                                              | 退出条件                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **P-1**：env.stream 扩充（**前置，不在本包内**） | 完成 env.stream 评审 + flux-core 扩接口 + playground 默认实现                                                                                                                                                                     | `env.stream` 在 playground 可用；评审 discussion 完成总结                 |
| **P0**：骨架 + 最小闭环                          | 建包；移植引擎 + React adapter + ai-connector-factory；实现 `ai-chat` / `ai-message-list` / `ai-bubble`（仅 markdown + loading renderer）/ `ai-sender`；host 提供 mock connector 经 `xui:imports` 注入；playground 跑通 mock 对话 | typecheck/build/lint/test 全过；playground 能发送并接收 mock 流式回复     |
| **P1**：真实 AI + 会话 + welcome                 | host 提供 OpenAI/DeepSeek connector（基于 `env.stream`）；`ai-conversations` / `ai-welcome` / `ai-prompts` / `ai-feedback`；ActionScope namespace `ai` 注册                                                                       | 接 DeepSeek/OpenAI 真实 API 能对话；会话切换正常；外部按钮 `ai:send` 工作 |
| **P2**：工具调用 + 附件                          | `ai-tool-call` + `toolPlugin` 完整接入；`ai-attachments` + 多模态 content part；ComponentHandle 注册                                                                                                                              | LLM 调用工具并回显结果；图片上传作为 `image_url` content part 发送        |
| **P3**：持久化（host 实现）                      | host 提供 localStorage / IndexedDB `ConversationStorageStrategy` 实现，经 `xui:imports` 注入；`useConversation` 在 host 层封装 storage 同步                                                                                       | 刷新页面后历史会话恢复；多会话并存                                        |
| **P4**：高级渲染器                               | `ai-suggestions`（popover / pills 两种形态）；自定义 boxRenderer / contentRenderer 注册机制完善                                                                                                                                   | 业务方能通过 `xui:imports` 注入自定义气泡渲染                             |
| **P5**：高级集成                                 | messages 序列化进 flux form 字段；`onResponseComplete` 接 data-source 联动                                                                                                                                                        | 对话历史可进入表单提交流程                                                |
| **P6**：Tiptap 富文本（可选）                    | `@tiptap/react` 接入；@提及 / 模板 / Slash 命令；保持 `<Textarea>` 作为降级                                                                                                                                                       | 富文本输入扩展通过 `senderExtensions` 字段注入                            |
| **P7**：MCP（可选，独立包）                      | 独立 `flux-mcp-connector` 包提供 MCP 客户端（依赖 `@modelcontextprotocol/sdk`）；本包只增加 `ai-mcp-manager` 渲染器消费它                                                                                                         | MCP server 启用后 LLM 能调用其工具                                        |

每个 Phase 落地时：

- 创建独立 plan 文档 `docs/plans/{date}-{phase}-flux-renderers-ai-{topic}.md`（按 `docs/plans/00-plan-authoring-and-execution-guide.md`）
- 更新 `design.md` 的"渲染器清单"（§5.1）状态
- 更新 `docs/logs/{year}/{month}-{day}.md` dev log
- 完成后跑全量 `pnpm typecheck && pnpm build && pnpm lint && pnpm test`，全绿才标 Phase 完成

## 3. 风险与取舍

| 风险                                                     | 等级 | 缓解策略                                                                                                                                                                                                             |
| -------------------------------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 引擎从 Vue 项目移植引入 Vue 残余依赖（reactive / toRaw） | 高   | 移植时删 `unwrapProxy`，用 `structuredClone`；CI 加依赖扫描，禁止 `vue` 出现在 dependencies                                                                                                                          |
| ChatMessage 类型与未来 OpenAI SDK 升级脱节               | 中   | 用结构化自定义类型（不直接 `import`），字段对齐但解耦；语义变化时手动同步                                                                                                                                            |
| 流式累积算法 bug 导致消息错乱                            | 高   | `combineDeltaData` 必须 100% 单测覆盖（含 tool_calls index 合并 / 多模态 content part 数组合并）                                                                                                                     |
| React 19 Concurrent 模式下 engine state 不一致           | 中   | 用 `useSyncExternalStore` 桥接（专为 concurrent 设计）；不在 render path 写 state                                                                                                                                    |
| Tiptap 强依赖（P6）引入体积                              | 中   | 把 Tiptap 设为可选 peerDep；`senderExtensions` 未声明时 bundle 不含 Tiptap                                                                                                                                           |
| 业务方需要"组件级 api"短路径（如 `ai-chat.api`）         | 中   | 严守 flux 原则（请求下沉 action / data-source / connector 注入），不开组件级 api；通过 `connector` 表达式注入解决                                                                                                    |
| 多模态 content part 与现有 markdown 渲染器冲突           | 中   | `ai-bubble` 自带 image/file/argument content renderer；markdown 仅处理 string content                                                                                                                                |
| `env.stream` / `env.openSocket` 在 host 未实现           | 中   | `createStreamBasedAiConnector` 启动时 capability check；缺失时抛错；host 经 `xui:imports` 暴露 capabilities 对象供 schema 表达式判断（如 `${$ai.capabilities?.stream ? '...full-mode...' : '...no-stream-msg...'}`） |
| `ai-conversations` 持久化策略选择                        | 低   | 不持有 storage，由 host 经 `xui:imports` 注入 `ConversationStorageStrategy`（详见 design.md §11.3）                                                                                                                  |
| 与 flux-renderers-content 的 markdown 复用边界           | 低   | 复用 sanitize 纯函数（`flux-renderers-content/src/sanitize.ts`），不依赖 markdown renderer 组件本体                                                                                                                  |
| MCP SDK（`@modelcontextprotocol/sdk`）污染本包           | 中   | MCP 客户端挪到独立 `flux-mcp-connector` 包（P7），本包只增加 `ai-mcp-manager` 渲染器 UI 消费它                                                                                                                       |

## 4. v1 → v2 变更摘要

本节由 `audit.md` 触发，解决 v1 审计发现的所有 FAIL / NEEDS-DECISION / PARTIAL 项。

| 修订项                                                                                           | 对应 audit 项      | v2 落地位置                      |
| ------------------------------------------------------------------------------------------------ | ------------------ | -------------------------------- |
| 删除 `src/providers/`、`src/sse/`、`src/storage/` 具体实现                                       | INV-1 违规 / FIX-1 | design.md §6 目录结构、§6.1 入口 |
| `AiResponseProvider` → `AiConnector`（命名+职责更准确）                                          | FIX-2              | design.md §9 全节重写            |
| `conversations` / `activeConversationId` 统一为 scope-owned                                      | FIX-3              | design.md §11.2、§11.5           |
| 补 state ownership 清单表                                                                        | FIX-4              | design.md §11.5                  |
| `src/index.ts` 分组（types / renderers / host utilities）                                        | FIX-5              | design.md §6.1                   |
| IO 边界裁定（stream/openSocket 走 C 档、storage 走 B 档）                                        | DECISION-1/2/3     | design.md §11.4                  |
| 持久化策略重写（走 import 注入，不扩 env）                                                       | DECISION-3         | design.md §11.3                  |
| MCP SDK 挪到独立 `flux-mcp-connector` 包                                                         | REVIEW-1/2         | 本文件 §2 P7、§3 风险表          |
| `useMessage` / `useConversation` 标注为 host helper                                              | INV-5 瑕疵         | design.md §6.1、§11.5            |
| 新增 INV-1 / INV-4 不变量条目                                                                    | INV-1 / INV-4 强化 | design.md §18.2、§18.3           |
| 新增 INV-1 守卫测试 + StreamChunkParseError 抛错测试 + env.stream 缺失降级测试 + SSE [DONE] 测试 | 测试补强           | 本文件 §1                        |
| 新增 P-1 前置 phase（env.stream 扩充评审）                                                       | DECISION-1 依赖    | 本文件 §2                        |

## 5. v2 fresh-session 复审记录

- **第 1 轮复审**：2026-07-21，由独立 fresh sub-agent 完成（不在本 design.md 起草 session 内）
- **复审结论**：发现 7 项 blocking + 7 项 non-blocking，全部在本轮已修复
- **修复后状态**：v2.1（设计稳定，待 P-1 实施 plan 落地代码）
- **复审报告**：见会话归档（包含完整证据 `文件:行号`）

## 6. Host 集成示例（mock 端到端）

P0 退出条件要求"playground 跑通 mock 对话"。以下是 host 侧组装 mock connector + storage 的端到端示例骨架，P0 实施时按此模式落地。

```ts
// apps/playground/src/ai-mock-host.ts
import {
  createStreamBasedAiConnector,
  useConversation,
  type AiConnector,
  type ConversationStorageStrategy,
  type ChatMessage,
} from '@nop-chaos/flux-renderers-ai';
import type { RendererEnv } from '@nop-chaos/flux-core';

// 1. Mock connector：用 env.stream + mock SSE 响应
export function createMockConnector(env: RendererEnv): AiConnector {
  return createStreamBasedAiConnector({
    env,
    buildRequest: (req) => ({
      url: 'mock://ai/chat',
      method: 'POST',
      body: { messages: req.messages },
      // env.stream 默认 sse + json
    }),
  });
  // 注：playground 的 env.stream 实现里要识别 'mock://' 协议并返回 mock SSE 流
}

// 2. In-memory mock storage（演示 P3 持久化方案的注入模式）
export function createMockStorage(): ConversationStorageStrategy {
  const conversations = new Map<string, { info: any; messages: ChatMessage[] }>();
  return {
    async loadConversations() {
      return Array.from(conversations.values()).map((v) => v.info);
    },
    async loadMessages(id) {
      return conversations.get(id)?.messages ?? [];
    },
    async saveConversation(info) {
      if (!conversations.has(info.id)) conversations.set(info.id, { info, messages: [] });
      else conversations.get(info.id)!.info = info;
    },
    async saveMessages(id, messages) {
      if (!conversations.has(id)) conversations.set(id, { info: { id }, messages: [] });
      conversations.get(id)!.messages = messages;
    },
    async deleteConversation(id) {
      conversations.delete(id);
    },
  };
}

// 3. Host 启动时注册 import
export function registerAiHost(runtime: RendererRuntime, env: RendererEnv) {
  // 通过 xui:imports 注册命名空间 'ai'，同时产生表达式 helper（$ai）+ action namespace（ai:*）
  runtime.registerImport('ai', {
    connectors: {
      mock: createMockConnector(env),
      // openai: createOpenAIConnector(env, { baseURL, apiKey, model }),  // P1 实施时补
    },
    storage: createMockStorage(),
    capabilities: {
      stream: Boolean(env.stream),
      openSocket: Boolean(env.openSocket),
    },
  });
}

// 4. Schema 引用
//    { "type": "ai-chat", "connector": "${$ai.connectors.mock}" }
//    { "type": "ai-conversations", "conversations": "${$page.conversations}", ... }
```

**关键点**：

- mock `env.stream` 实现识别 `mock://` 协议（P-1 实施 plan 时由 playground 默认 stream 实现支持）
- mock connector 仍走真实 `env.stream` 通道（不绕开 env 抽象），符合 INV-1
- storage 完全由 host 提供，渲染器零感知

## 7. 参考文档

- `docs/references/new-renderer-introduction-audit.md` — **本设计的原则审计入口**
- `docs/components/flux-renderers-ai/audit.md` — 本设计的 v1 审计记录（已解决，归档）
- `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` — `env.stream` / `env.openSocket` 扩充评审提案
- `docs/references/quick-reference.md` — flux hooks / types 速查
- `docs/references/renderer-interfaces.md` — RendererDefinition 字段全集
- `docs/architecture/renderer-runtime.md` — 渲染器与运行时契约
- `docs/architecture/renderer-env.md` — RendererEnv 字段全集 owner doc
- `docs/architecture/styling-system.md` — Renderer Styling Contract
- `docs/architecture/renderer-markers-and-selectors.md` — marker / data-slot / data-state 协议
- `docs/architecture/action-scope-and-imports.md` — ActionScope / xui:imports
- `docs/architecture/flux-runtime-module-boundaries.md` — 包边界
- `docs/architecture/form-validation.md` — owner / scope 数据流参考
- `docs/components/package-reorganization-analysis.md` — 包分配 rationale
- `docs/plans/00-plan-authoring-and-execution-guide.md` — 计划写作规范
- `docs/context/ai-autonomy-policy.md` — Protected Areas / autonomy levels
- `docs/analysis/ai-survey/2026-07-21-tiny-robot-deep-analysis.md` — tiny-robot 深度调研报告（引擎移植来源）
