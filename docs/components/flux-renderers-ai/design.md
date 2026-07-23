# flux-renderers-ai 包设计

> **版本**：v2（按 `audit.md` 修订；v1 → v2 变更摘要见文末 §20）
> **当前状态**：v2 已解决所有 FIX 项；待独立 fresh session 复审

## 1. 包定位

- `flux-renderers-ai` 是 flux 在 Layer 7（renderer 层）新增的 AI 对话渲染器包，让 schema 作者用声明式 JSON 搭建完整的 AI 对话界面：消息气泡、流式输出、输入发送、会话管理、附件、工具调用、推荐提示词。
- 包内同时承载 **AI 消息引擎**（框架无关核心 + React 适配），这是从 `tiny-robot`（Vue 3 实现，OpenTiny 团队，MIT）的 `kit/src/message/` 移植并改写为 React 19 + flux 风格的产物。引擎本身不依赖 flux-runtime，但通过渲染器与（可选的）ActionScope namespace / ComponentHandleRegistry 与 flux 平台能力对接。
- 与 `flux-renderers-content`（内容/反馈/媒体）、`flux-renderers-layout`（布局/流程/动作）并列，遵循同一包结构模板、同一渲染器契约、同一 styling contract。
- 主入口 `registerAiRenderers(registry)` 由 host 调用注册全部渲染器。

## 2. 设计目标

1. **声明式优先**：一个完整的对话界面（消息列表 + 输入框 + 流式响应）应能用一份 JSON schema 表达，不写一行 React 代码。
2. **引擎与渲染解耦**：消息状态机、流式累积、插件链、abort、存储等"行为"放在框架无关的引擎里；React 仅负责订阅与渲染。引擎可独立单测。
3. **flux 契约一致性**：所有渲染器遵守 `RendererComponentProps`（数据从 `props.props/meta/regions/events/helpers` 读，不直接访问 store），响应式读走 `useScopeSelector` 等 selector hooks，UI 组件全部来自 `@nop-chaos/ui`。
4. **平台能力渐进接入**：P0 自包含（engine 在包内 React Context 传播即可工作）；P1 把 `ai:send / ai:abort / ai:createConversation` 注册为 ActionScope namespace；P2 把 engine 作为 ComponentHandle 暴露，供跨组件控制。
5. **可替换的 AI 后端**：通过 `ResponseProvider` 函数式抽象接入任何 OpenAI 兼容服务（OpenAI、DeepSeek、通义、Kimi、自部署 vLLM 等），不绑死单一 SDK。
6. **不重写 AMIS**：AMIS 没有 AI 对话原生组件；本包是 flux 原生能力扩展，参考 tiny-robot 而非 AMIS。

## 3. 非目标

- 不实现 MCP（Model Context Protocol）协议客户端本体（Phase 7 可选，需引入 `@modelcontextprotocol/sdk` 作为可选 peerDep）。
- 不实现 Skills 系统（Anthropic 风格的 skill 文件夹加载）——非核心，按需再评估。
- 不实现 Sender 的 Tiptap 富文本扩展（@提及、模板插入、Slash 命令）作为 P0；P0 用 `<Textarea>` + auto-resize + 键盘事件。Tiptap 集成是 Phase 6 可选项。
- 不引入组件级 `api` 字段：所有 AI 请求通过 `ResponseProvider` 抽象注入，业务方在 host 层提供 provider 实现（封装自家后端 / 网关 / 鉴权），渲染器只接受已构造好的 provider 函数。
- 不在 P0 接 flux form owner：消息状态由 engine 自持，不写回 form value（避免 form 验证、提交语义被污染）。Phase 5 再评估"把 messages 序列化进 scope 字段"的高级场景。

> **Decision-A（P4 裁定，messages 进 form 字段）**：经 P4 Phase 1 评估裁定为 **落地 host 范式（路径 a）**，不扩 engine、不破 INV-17。host 在 `onResponseComplete`/按钮 handler 调 Layer C `component:getMessages` 取快照 → **序列化（深拷贝，如 `structuredClone`/JSON）** → `setValue` 写入 scope/form 字段。序列化步骤是 INV-17 的关键：`engine.messages` 仍是域内部唯一真源，host 持有独立副本（直接持有 engine 返回的引用会污染域内部，host 必须 copy）。proof 见 `packages/flux-renderers-ai/src/renderers/__tests__/phase4-platform-linkage.test.tsx`。本包无需新增 engine/handle 方法。

- 不引入新的 RendererDefinition 字段、新的 field kind、新的 marker 命名规则——严守现有契约（参见 `docs/references/renderer-interfaces.md`、`docs/architecture/styling-system.md`）。

## 4. 与 tiny-robot 的对照

| 维度                     | tiny-robot（Vue 3）                                                 | flux-renderers-ai（React 19 + flux）                                                                    | 决策                   |
| ------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------- |
| UI 框架                  | Vue 3.3 + `@opentiny/vue` + Tiptap/vue-3                            | React 19 + `@nop-chaos/ui` + 可选 Tiptap/react                                                          | 重写                   |
| 组件契约                 | Vue props/emits/slots + `provide/inject`                            | `RendererComponentProps` + 标准 hooks 表                                                                | 重写                   |
| 状态管理                 | Vue ref/reactive + `useBubbleStore` reactive 对象                   | `MessageEngine` + React adapter（`useSyncExternalStore`）                                               | 引擎保留，adapter 重写 |
| 消息引擎                 | `kit/src/message/core/engine.ts`（框架无关）                        | `src/engine/` 直接移植                                                                                  | **保留源码**           |
| 流式累积                 | `combineDeltaData` 算法                                             | 同                                                                                                      | **保留源码**           |
| 插件链                   | thinkingPlugin / toolPlugin / lengthPlugin / skillPlugin            | 前三个保留，skillPlugin 不移植                                                                          | 保留                   |
| Provider 抽象            | `ResponseProvider` 函数式（新）+ `BaseModelProvider`（@deprecated） | 只保留 `ResponseProvider`                                                                               | 改进                   |
| 富文本编辑               | Tiptap/vue-3 强耦合                                                 | `<Textarea>` + auto-resize（P0）；Tiptap/react 可选（P6）                                               | 简化                   |
| Markdown                 | markdown-it + DOMPurify                                             | `react-markdown` + `remark-gfm` + `rehype-raw` + DOMPurify（与 `flux-renderers-content/markdown` 对齐） | 复用现有依赖           |
| 主题                     | `--tr-*` CSS 变量 + `data-tr-color-mode` 属性                       | flux 现有 token + Tailwind（不引入新 token 命名空间）                                                   | 改写                   |
| 存储                     | LocalStorage / IndexedDB，含 Vue proxy 解包                         | 同接口，去掉 Vue 依赖，用 `structuredClone`                                                             | 改进                   |
| MCP/Skills               | skillPlugin + skill storage（fs/node/browser）                      | 不移植                                                                                                  | 丢弃                   |
| 会话组件 `Conversations` | 空壳（3 行占位）                                                    | 实做 `ai-conversations` 渲染器                                                                          | 改进                   |
| Bubble 渲染器注册制      | `find/renderer/priority` + 默认渲染器                               | **保留设计**，组件用 React 重写                                                                         | 保留设计               |

## 5. Flux 中的包定位

| 属性         | 值                                                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 包名         | `@nop-chaos/flux-renderers-ai`                                                                                                         |
| 目录         | `packages/flux-renderers-ai/`                                                                                                          |
| Layer        | L7（renderer 层）                                                                                                                      |
| 依赖方向     | 仅可被 `flux` bundle（L8）和 host 应用依赖；不可被 L1–L6 反向依赖                                                                      |
| 工作区依赖   | `flux-core`、`flux-react`、`flux-i18n`、`ui`（按需 `flux-runtime`）                                                                    |
| 同层互依     | 默认不依赖其他 renderer 包；若复用 markdown sanitize，可走 `flux-renderers-content` 导出的纯函数（不绕走渲染器组件）                   |
| 包内模块分层 | `src/engine/`（框架无关）→ `src/adapters/`（React 适配 + host helpers）→ `src/renderers/`（flux 渲染器）→ `src/storage/`（仅接口契约） |

### 5.1 渲染器清单

> **实现状态**（2026-07-24）：P0 的 4 个渲染器（`ai-chat` / `ai-message-list` / `ai-bubble` / `ai-sender`）已在 A1 落地（✅）。P1 渲染器（`ai-conversations` / `ai-welcome` / `ai-prompts` / `ai-feedback`）已在 A2 落地（✅）。P2 渲染器（`ai-tool-call` / `ai-attachments`）已在 A3 落地（✅）——含 engine agentic 工具循环、Layer C ComponentHandle、`ai-bubble` tools/reasoning/image content renderer、A-6~A-12 深化项、消息编辑、虚拟滚动。P3 渲染器（`ai-citations` / HITL）已在 A4 落地（✅）。P4 高级集成（`ai-voice-input` / `ai-token-usage` / 消息分支 / `ai-suggestions` + 两平台联动 Decision）已在 A5 落地（✅）。P7 尚未实现（⬜）。

| Phase      | type               | 类别   | 职责                                                                             | 状态 |
| ---------- | ------------------ | ------ | -------------------------------------------------------------------------------- | ---- |
| P0         | `ai-chat`          | Layout | 完整对话面板（messages + sender + auto-scroll + 状态管理）                       | ✅   |
| P0         | `ai-message-list`  | Layout | 消息列表（分组、自动滚动、注册制渲染、A-8 虚拟滚动）                             | ✅   |
| P0         | `ai-bubble`        | Widget | 单条消息气泡（含 reasoning / tool_calls / markdown / image / 消息编辑）          | ✅   |
| P0         | `ai-sender`        | Widget | 输入区（submit / cancel / 字数 / Enter 提交）                                    | ✅   |
| P1         | `ai-conversations` | Widget | 会话列表侧边栏（新建/切换/重命名/删除）                                          | ✅   |
| P1         | `ai-welcome`       | Widget | 空状态欢迎页 + icon/title/description/footer                                     | ✅   |
| P1         | `ai-prompts`       | Widget | 推荐提示词卡片列表（垂直/水平/折行）                                             | ✅   |
| P1         | `ai-feedback`      | Widget | 消息底部操作条（copy/refresh/like/dislike/sources）                              | ✅   |
| P2         | `ai-attachments`   | Widget | 附件上传/预览（图片模式 / 卡片模式 / 拖放 / 多模态 image_url 发送）              | ✅   |
| P2         | `ai-tool-call`     | Widget | 工具调用卡片（状态、展开、JSON 高亮、A-6 按工具名注册专用渲染器、A-12 状态颜色） | ✅   |
| P3         | `ai-citations`     | Widget | 内联引用气泡（`[N]` 检测 + 悬停卡片 + 来源列表）                                 | ✅   |
| P3         | HITL 审批          | 增强   | `ai-tool-call` 增 `approval` 状态 + approve/reject 按钮                          | ✅   |
| P4         | `ai-voice-input`   | Widget | 语音输入（Web Speech API 直呼，非 IO 不经 env）                                  | ✅   |
| P4         | `ai-token-usage`   | Widget | Token / 成本 / 上下文占比显示（数据由 connector 填充 metadata）                  | ✅   |
| P4         | 消息分支           | 增强   | 重新生成时分支切换（branches 由 host 管理）                                      | ✅   |
| P4         | `ai-suggestions`   | Widget | 建议气泡（Popover / Pills）— 从 P2 降至 P4（`ai-prompts` 已覆盖）                | ✅   |
| P7（可选） | `ai-mcp-manager`   | Widget | MCP server 管理（启用/禁用/添加），需 host 注入 MCP 客户端                       | ⬜   |

> 详细的组件级改进（流式光标 / 时间戳 / 代码块复制按钮 / 工具状态颜色 / 拖放附件 / 消息编辑 / LaTeX 评估等）见 [`improvement-analysis.md`](./improvement-analysis.md) §4。Phase 路线与改进项 ID 映射见 [`implementation.md`](./implementation.md) §2。

### 5.2 与现有 renderer 的协作

- `ai-bubble` 渲染 markdown 内容时**复用** `flux-renderers-content/markdown` 的 sanitize 工具（导出为纯函数 `sanitizeHtml`），避免重复实现 XSS 防护。
- `ai-chat` 的 header / footer slot 可包含任意 flux renderer（button、cards、statistics 等），通过 `regions.header.render()` 渲染。
- 工具栏按钮（发送、停止、清空、附件）全部用 `@nop-chaos/ui` 的 `Button` / `IconButton`，不写 raw HTML。

## 6. 包结构与目录组织

```
packages/flux-renderers-ai/
├── package.json
├── tsconfig.json                    # extends ../../tsconfig.base.json, noEmit
├── tsconfig.build.json              # declaration, outDir:dist, exclude tests
├── vitest.config.ts                 # 复用 ../../vitest.shared.ts
└── src/
    ├── index.ts                     # 单一公开入口（分组：types / renderers / host utilities）
    ├── schemas.ts                   # 所有 Schema 类型集中
    ├── ai-renderer-definitions.ts   # RendererDefinition[] 主注册表
    ├── ai-renderer-definitions.test.tsx
    ├── styles.css                   # marker 样式（起步仅占位）
    ├── test-support.ts              # createMockRendererProps
    ├── __tests__/
    │   └── contract-honesty.test.ts # 契约守卫
    │
    ├── engine/                      # 框架无关核心（移植自 tiny-robot）
    │   ├── create-engine.ts         # createMessageEngine
    │   ├── types.ts                 # ChatMessage / MessageEngine / AiConnector / 插件接口
    │   ├── utils.ts                 # combineDeltaData / makeAbortable / ...
    │   ├── state-adapter.ts         # MessageStateAdapter 接口
    │   ├── native-adapter.ts        # createNativeMessageAdapter（测试用）
    │   └── plugins/
    │       ├── thinking-plugin.ts
    │       ├── tool-plugin.ts
    │       └── length-plugin.ts
    │
    ├── adapters/                    # React 适配
    │   ├── react-adapter.ts         # createReactMessageAdapter（useSyncExternalStore 桥接）
    │   ├── use-message.ts           # useMessage(options) hook（host utility）
    │   ├── use-conversation.ts      # useConversation(options) hook（host utility）
    │   ├── use-auto-scroll.ts       # useAutoScroll hook（P2 公开为 host utility）
    │   ├── ai-connector-factory.ts  # createStreamBasedAiConnector(env) —— host helper，把 env.stream 输出组装成 AiConnector（env.stream 已自动处理 SSE 切分+JSON 解析）
    │   └── ai-chat-context.tsx      # AiChatProvider / useAiChatContext（渲染器内部 Context）
    │
    ├── storage/                     # 仅类型契约，不含具体实现
    │   └── types.ts                 # ConversationStorageStrategy 接口（host 经 import 注入实现）
    │
    └── renderers/                   # flux 渲染器（每个一个 .tsx + .test.tsx）
        ├── ai-chat.tsx
        ├── ai-message-list.tsx
        ├── ai-bubble/
        │   ├── index.tsx            # AiBubbleRenderer 主组件
        │   ├── renderers/           # BubbleRenderers 注册制（参考 tiny-robot）
        │   │   ├── default-renderers.ts
        │   │   ├── text.tsx
        │   │   ├── markdown.tsx
        │   │   ├── reasoning.tsx
        │   │   ├── tools.tsx
        │   │   ├── tool.tsx
        │   │   ├── image.tsx
        │   │   └── loading.tsx
        │   └── types.ts             # BubbleBoxRendererMatch / BubbleContentRendererMatch
        ├── ai-sender.tsx
        ├── ai-conversations.tsx
        ├── ai-welcome.tsx
        ├── ai-prompts.tsx
        ├── ai-feedback.tsx
        ├── ai-attachments.tsx
        └── ai-tool-call.tsx
```

**关键变更（vs v1）**：

- ❌ **删除** `src/providers/`（不再内置 OpenAI/DeepSeek 连接实现）
- ❌ **删除** `src/sse/` 目录（SSE 解析由 `env.stream` 内部完成，包内无需自己解析）
- ❌ **删除** `src/storage/` 下的具体实现（仅保留接口契约；具体实现由 host 经 import 注入）
- ✅ **简化** `src/adapters/ai-connector-factory.ts`（不需要 `sse-parser`，因为 `env.stream` 已自动切分+解析）

### 6.1 入口 `src/index.ts`（分组：types / renderers / host utilities）

```ts
import { registerRendererDefinitions, type RendererRegistry } from '@nop-chaos/flux-core';
import { aiRendererDefinitions } from './ai-renderer-definitions.js';

// ============================================
// 第 1 组：Schema 类型（renderer 作者用）
// ============================================
export type {
  AiChatSchema,
  AiMessageListSchema,
  AiBubbleSchema,
  AiSenderSchema,
  AiConversationsSchema,
  AiWelcomeSchema,
  AiPromptsSchema,
  AiFeedbackSchema,
} from './schemas.js';

// ============================================
// 第 2 组：渲染器组件（registry 注册用，不应被业务代码直接引用）
// ============================================
export { AiChatRenderer } from './renderers/ai-chat.js';
export { AiMessageListRenderer } from './renderers/ai-message-list.js';
export { AiBubbleRenderer } from './renderers/ai-bubble/index.js';
// ... 其他渲染器

// ============================================
// 第 3 组：Host utilities（host 应用组装时用；NOT for use inside renderers）
// 业务方在 host 层用这些工具组装 AiConnector / engine / hooks，
// 经 xui:imports 注入到 schema 表达式可用。
// ============================================
export type {
  ChatMessage,
  MessageEngine,
  AiConnector,
  AiConversationInfo,
  ConversationStorageStrategy,
} from './engine/types.js';

export { createMessageEngine } from './engine/create-engine.js';
export { useMessage } from './adapters/use-message.js';
export { useConversation } from './adapters/use-conversation.js';
export { createStreamBasedAiConnector } from './adapters/ai-connector-factory.js';

// ============================================
// 第 4 组：注册表与注册函数（host 启动时调用）
// ============================================
export { aiRendererDefinitions } from './ai-renderer-definitions.js';
export type { AiRendererSchema } from './ai-renderer-definitions.js';

export function registerAiRenderers(registry: RendererRegistry) {
  return registerRendererDefinitions(registry, aiRendererDefinitions);
}
```

> **关键变更（vs v1）**：
>
> - ❌ 移除 `export { createOpenAICompatibleProvider }`、`export { createMockProvider }`、`export { localStorageStrategyFactory, indexedDbStrategyFactory }` 等具体实现导出
> - ✅ 新增 `export { createStreamBasedAiConnector }`（host helper，输入 `env.stream`，输出 `AiConnector`）
> - ✅ 分组明确标注"Host utilities — NOT for use inside renderers"，防止渲染器代码绕开 `props.props` / `props.events` / env 抽象
>
> 内部相对 import 必须带 `.js` 后缀（ESM + isolatedModules 要求）。

### 6.2 package.json

按 `flux-renderers-content` 模板（`sideEffects: ["*.css"]`、`exports` 含 `/styles.css` 子路径、`private: true`、workspace 协议）。关键差异：

- `dependencies`：核心只依赖 `flux-core / flux-react / flux-i18n / ui`；**不再依赖 `idb`**（持久化由 host 经 import 注入）
- `peerDependencies`：`react@^19`、`lucide-react`、`react-markdown`、`remark-gfm`、`rehype-raw`、`dompurify`（与 `flux-renderers-content/markdown` 同栈）
- `scripts`：与 content 包一致（`build` 含 `copy-build-assets.mjs` 拷 CSS）
- **不依赖** `openai` SDK、`@modelcontextprotocol/sdk`、`idb`、`eventsource` 等具体连接库

### 6.3 包外配置改动清单（新建包必做）

1. `tsconfig.json`（root）：references 数组加 `{ "path": "./packages/flux-renderers-ai" }`
2. `tsconfig.base.json`：paths 加两条 alias
3. `vite.workspace-alias.ts`：加 `@nop-chaos/flux-renderers-ai` 与 `@nop-chaos/flux-renderers-ai/styles.css`
4. `apps/playground/src/styles.css`：加 `@import '@nop-chaos/flux-renderers-ai/styles.css';`
5. `apps/playground/src/App.tsx` 及各 multi-scenario host 文件：调用 `registerAiRenderers(registry)`

## 7. 数据模型 → `engine.md`

数据模型（`ChatMessage`、`ChatMessageContentPart`、`ChatToolCall`、`ChatToolCallUIState`、消息状态机、`AiConversationInfo`）详见 [`engine.md §7`](./engine.md#7-数据模型)。

## 8. 引擎与适配器 → `engine.md`

引擎核心（`MessageEngine` 接口、`MessageStateAdapter` 抽象、插件链生命周期、流式累积算法、`useMessage` hook、`useConversation` hook）详见 [`engine.md §8`](./engine.md#8-引擎与适配器)。

## 9. Connector 抽象 → `engine.md`

Connector 契约（`AiConnector` 接口、包内不提供具体实现、host 注入方式、`useMessage` 接口变更、不保留的旧抽象）详见 [`engine.md §9`](./engine.md#9-connector-抽象替代-v1-的-provider-抽象)。

## 10. 渲染器设计

完整 schema 字段、events、DOM 结构与示例见 [`renderers.md`](./renderers.md)。本节给出设计原则与渲染器注册制（注册制是 tiny-robot 最值得保留的设计）。

### 10.1 Layout vs Widget 二分

| 渲染器            | 类别   | marker                | 内部样式                                                      |
| ----------------- | ------ | --------------------- | ------------------------------------------------------------- |
| `ai-chat`         | Layout | `nop-ai-chat`         | 不硬编码 spacing；由 schema `className` 的 `stack-*` 别名表达 |
| `ai-message-list` | Layout | `nop-ai-message-list` | 同上                                                          |
| `ai-bubble`       | Widget | `nop-ai-bubble`       | 内部直接用 Tailwind                                           |
| `ai-sender`       | Widget | `nop-ai-sender`       | 同上                                                          |
| 其他              | Widget | `nop-ai-*`            | 同上                                                          |

### 10.2 ai-chat 内部 Context 传播

```
<section class="nop-ai-chat" data-slot="ai-chat-root">
  <header data-slot="ai-chat-header">{header.render()}</header>
  {beforeMessages}
  <AiMessageListRenderer />     ← useAiChatContext() 读 engine
  {afterMessages}
  <AiSenderRenderer />          ← useAiChatContext() 读 engine
  <footer data-slot="ai-chat-footer">{footer.render()}</footer>
</section>
```

`AiChatProvider` 在根节点包裹，向下传播 engine 实例（由 `useMessage({ connector })` 创建）。子渲染器通过 `useAiChatContext()` 拿 engine；在 ai-chat 外用时返回 null（让 `ai-bubble` 也能独立用于非对话场景）。

### 10.3 ai-bubble 渲染器注册制（吸收 tiny-robot 设计）

```ts
export interface BubbleContentRendererMatch {
  find(message: ChatMessage, content: unknown, contentIndex: number): boolean;
  renderer: React.ComponentType<BubbleContentRendererProps>;
  priority?: number;
}

// P2 新增：按工具名匹配（host 可注册专用工具卡片，如 ai-tool-bash / ai-tool-edit）
export interface BubbleToolRendererMatch {
  toolName: string | RegExp; // 匹配 tool_call.function.name
  renderer: React.ComponentType<BubbleToolRendererProps>;
  priority?: number;
}

export const BubbleRendererMatchPriority = {
  LOADING: -1,
  NORMAL: 0,
  CONTENT: 10,
  ROLE: 20,
} as const;
```

默认 content renderers：`loading` / `markdown`（复用 `flux-renderers-content/sanitize`）/ `image` / `reasoning` / `tools`。业务方通过 `xui:imports` 注册自定义渲染器到 `BubbleProvider` 覆盖默认。

P2 增强：默认注册 `*` 通用 fallback；包内**不**提供任何专用工具渲染器（保持体积最小）；专用实现（如 bash / edit / search）由 host 经 `xui:imports` 注入，参照 Agent Elements 的 `tool-<Name>` 命名约定。

### 10.4 流式 Markdown 渲染（P1 关键增强）

**问题**：v2 默认用 `react-markdown` + `remark-gfm` + `rehype-raw` + DOMPurify，**非流式安全**——流式 chunk 累积时会出现：

- 不完整 CJK 字符渲染为乱码
- 未闭合代码 fence 导致后续内容全被当代码高亮
- 未闭合 `$$` / `\(` 公式导致后续内容渲染失败
- 整体闪烁感强（每 chunk 重新解析全文档）

**P1 路径 C（推荐）**：在 `react-markdown` 外包一层轻量缓冲（~2KB gzip），仅处理 CJK 缓冲 + 代码 fence 缓冲；其他 Markdown 解析仍走现有 sanitize pipeline。

**P2 评估路径 B（已裁定）**：评估 streamdown/core（~8KB gzip，排除 mermaid/shiki；CJK + code + math 完整支持）。**裁定结论：不引入**。当前路径 C 缓冲（`markdown-buffer.ts`，A2 落地）已覆盖流式安全核心问题（CJK 代理对拆分、未闭合 ```/~~~ fence、未闭合 `$$`/`\(`）。streamdown 的增量收益（完整 math 渲染）依赖 LaTeX 决策（见下，亦裁定不内置），引入 ~8KB 体积换取的边际收益不足以让所有 host 承担。保留路径 C；streamdown 列为 optimization candidate，移出 A3 scope（host 若需可经 `xui:imports`注入自定义`BubbleContentRenderer`）。

**LaTeX / KaTeX（已裁定）**：评估 `remark-math` + `rehype-katex`（~20KB gzip + KaTeX CSS）。**裁定结论：不内置**。LaTeX 公式渲染为高频必需场景的证据不足；内置会让所有 host 承担 ~20KB 体积 + CSS。改为 out-of-scope improvement：host 经自定义 `BubbleContentRenderer`（pre-process content 走 remark-math+rehype-katex）或 `xui:imports` 注入。

**不引入 mermaid / shiki**：体积过大（mermaid ~120KB / shiki ~50KB gzip），与 flux 纯前端渲染定位不符；如需，host 经 region 注入。详见 `improvement-analysis.md` §3.2、§6。

### 10.5 响应式 connector 切换

`connector` 表达式求值结果变化（例如用户切换模型 / 切换 provider）时，engine 通过 `setConnector` 热替换，下一条 `sendMessage` 用新 connector；进行中的请求不中断（避免半句响应分裂）。

## 11. 与 flux 的集成策略

### 11.1 集成层次（三层渐进）

```
┌────────────────────────────────────────────────────────────────┐
│ Layer C (P2): ComponentHandleRegistry                          │
│   schema 可写 { action: 'component:sendMessage', componentId }  │
│   跨组件控制（如外部按钮触发对话发送）                            │
├────────────────────────────────────────────────────────────────┤
│ Layer B (P1): ActionScope namespace 'ai'                       │
│   schema 可写 { action: 'ai:send', args: { text } }            │
│   任意位置触发对话（限制在同 actionScope 内）                     │
├────────────────────────────────────────────────────────────────┤
│ Layer A (P0): React Context + 标准 hooks                       │
│   ai-chat 内部用 AiChatProvider 传播 engine                    │
│   子渲染器（ai-bubble / ai-sender）用 useAiChatContext()        │
└────────────────────────────────────────────────────────────────┘
```

**Layer A（P0 必做，自包含）**：

- `ai-chat` 渲染器在根节点用 `<AiChatProvider engine={engine}>` 包裹。
- 子渲染器通过 `useAiChatContext()` 读 engine、messages、isProcessing。
- `useAiChatContext()` 抛错时（在 ai-chat 外用），fallback 为 null（让 ai-bubble 也能独立用于非对话场景）。
- 不引入新的 React Context 替代 flux 标准 hooks——这是渲染器**内部**的内部 Context，与 `useRendererRuntime` 等 ambient hooks 不冲突。

**Layer B（P1 增强）**：

- `ai-chat` 渲染器经 `useCurrentActionScope()`（`@nop-chaos/flux-react`）取当前 ActionScope，再用 `useNamespaceRegistration(actionScope, 'ai', aiActionProvider)` 注册命名空间（live API；capability check：`actionScope` 为 `undefined` 时跳过，host 无 actionScope 不崩溃）。`useNamespaceRegistration` 内部用 `useLayoutEffect` 管理注册/反注册生命周期。
- `aiActionProvider` 实现 7 个 action：`send`/`abort`/`clear`/`createConversation`/`switchConversation`/`deleteConversation`/`renameConversation`（§14.2）。引擎级 action 委托 engine；会话级 action 委托 host 提供的 `AiConversationController`（经 `ai-chat.conversationController` prop 绑定）。
- engine 状态投影：`ai-chat` 经 `useHostScope({ isProcessing, messages, activeConversationId }, path, 'ai')` 把响应式状态发布到 host scope，descendants 经 `useScopeSelector` 读取（`$ai.xxx` schema 表达式形式还需 host 经 `xui:imports` 别名配置）。
- 保留命名空间 `$ai`（用于表达式，如 `${$ai.isProcessing}`）—— **避开保留别名** `$form/$page/$crud/$designer/$slot/$surface/$resource`（参见 `docs/architecture/action-scope-and-imports.md`）。

**Layer C（P2 跨组件控制）**：

- `ai-chat` 渲染器经 `useCurrentComponentRegistry()` hook（`@nop-chaos/flux-react`，渲染器侧 live 访问器）取当前 `ComponentHandleRegistry`，再用 `registry.register(handle, { cid })` 注册 component handle（live API；**非** `runtime.componentRegistry?.register`）。注册在 `useEffect` 中完成，返回的反注册函数在 unmount 时调用；capability check：registry 为 `undefined` 时静默 skip（Failure Path `component-handle-no-registry`）。
- handle 实现 `ComponentCapabilities.invoke(method, payload, ctx)` 分发模型（**非** flat methods）—— action 系统对 `component:<method>` action 经 `action-adapter.ts` 调 `invoke`。分发 5 个逻辑方法名：`sendMessage`（`{ text }` 或多模态 `{ parts }`）/ `abort` / `clear` / `getMessages`（只读快照，依赖 Phase 1 engine 扩展）/ `setMessages`（`{ messages }` 整体替换）。
- handle 的 `id` 取 schema 显式 `componentId` 或 `props.meta.testid`/`props.id`；`name` 取 `componentName`（默认 `'ai-chat'`）。
- schema 可写 `{ action: 'component:sendMessage', componentId: 'my-chat', args: { text: 'hello' } }`。
- 适合"页面外按钮触发对话发送"场景。

### 11.2 数据流：响应式 vs 命令式

| 数据                                      | 读方式                                                            | 写方式                                        |
| ----------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| `engine.messages`                         | `useAiChatContext()` 订阅（内部 `useSyncExternalStore`）          | engine 自身写（流式累积、send、abort）        |
| `engine.isProcessing`                     | 同上                                                              | 同上                                          |
| `connector`（schema 表达式）              | `useScopeSelector(s => evaluate(props.props.connector))`          | schema 改值触发重新求值 → engine.setConnector |
| `draft text`（输入框）                    | `useState`                                                        | `setDraft`                                    |
| **`conversations` 列表**                  | **scope-owned**，`useScopeSelector` 读 schema 表达式（host 管理） | host 经 `useConversation` helper 同步到 scope |
| **`activeConversationId`**                | 同上                                                              | 同上                                          |
| 工具调用状态 `message.state.toolCall[id]` | engine 内部订阅                                                   | toolPlugin 写                                 |

> **Decision-B（P4 裁定，data-source 联动）**：经 P4 Phase 1 评估裁定为 **无需新增 engine/handle 便捷方法**（路径 a）。`onResponseComplete` 事件 payload 已含末条 message（`ai-chat.tsx` 在 `processing→completed` 时触发），host 可直接在事件 handler 中触发 `data-source:reload/insert`（或调用 `component:getMessages` 取快照后联动）。playground 联动示例见 `apps/playground/src/pages/ai-linkage-demo.tsx`。

**禁止**：在渲染器内直接调 `scope.get(path)` / `scope.materializeVisible()`（违反 `docs/architecture/renderer-runtime.md` 护栏 Bug-Derived Rule 1）。

**禁止**：渲染器内直接调 `fetch` / `WebSocket` / `EventSource` / `localStorage` / `IndexedDB`（违反 `docs/references/new-renderer-introduction-audit.md` INV-1）。所有外部 IO 经 `RendererEnv`（含本包扩充的 `env.stream` / `env.openSocket`）或经 `connector` / `storage` 接口注入。

### 11.3 持久化策略（重写：走 import 注入，不扩 env）

按 `audit.md` DECISION-3 裁定：**本地持久化走 B 档（import 注入），不扩 env**。

#### 设计

- 包内**仅提供** `ConversationStorageStrategy` 接口契约（`src/storage/types.ts`）：
  ```ts
  export interface ConversationStorageStrategy {
    loadConversations: () => MaybePromise<AiConversationInfo[]>;
    loadMessages: (conversationId: string) => MaybePromise<ChatMessage[]>;
    saveConversation: (conversation: AiConversationInfo) => MaybePromise<void>;
    saveMessages: (conversationId: string, messages: ChatMessage[]) => MaybePromise<void>;
    deleteConversation?: (conversationId: string) => MaybePromise<void>;
  }
  ```
- 包内**不提供**任何具体实现（`localStorage` / `IndexedDB` / `Server` 均由 host 实现）
- host 通过 `xui:imports` 注入实现：
  ```ts
  runtime.registerImport('ai', {
    storage: createLocalStorageStorage({ key: 'my-app-ai' }), // host 实现
    // 或 createIndexedDbStorage({ dbName: 'my-app' }),
    // 或 createServerStorage({ endpoint: '/api/conversations' }),
  });
  ```
- schema 通过 `ai-chat.storage: "${$ai.storage}"` 引用

#### 默认行为

- 渲染器默认**不持久化**（页面刷新清空）—— 符合"渲染器纯展示，存储是 host 关注点"
- 若 schema 显式声明 `storage` 字段且 import 注入了实现，则启用持久化
- `useConversation` hook 的 `storage` 参数为 **optional**：host 必须选择——注入 `ConversationStorageStrategy` 实现以启用持久化（mount 引导 `loadConversations`、切换经 `engine.setMessages` 重水合、turn 完成按 `autoSaveMessages` 调 `saveMessages` 落盘），不注入则默认不持久化（与 live `storage?: ConversationStorageStrategy` 类型 + 本节"默认不持久化"一致）。storage 失败为非致命（`storage-load-error` / `storage-save-error`，不阻塞对话）。

#### 理由

- 持久化是业务决策（哪些会话要存？存哪？加密吗？同步到服务端吗？），不是系统调用
- 不同 host 有完全不同的存储方案（web localStorage / web IndexedDB / server DB / 离线优先 / 无存储），不应该塞进 env 让所有 host 都要实现
- 与"AI 大模型直接连接能力屏蔽在后台"同一原则：业务能力下沉到 host

### 11.4 IO 边界裁定（按 audit.md DECISION-1/2/3 落地）

本节是 `audit.md` 三个 DECISION 的最终裁定结果。完整评审过程、接口签名、host 实现规范详见 `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md`；env 字段 owner doc 见 `docs/architecture/renderer-env.md` §3.2/§3.3。

| IO 类型                                | 裁定                  | 落地方式                                                              |
| -------------------------------------- | --------------------- | --------------------------------------------------------------------- |
| HTTP 流式（SSE / chunked / NDJSON）    | **C 档：扩 env**      | 新增 `RendererEnv.stream?: StreamFetcher`（通用连接能力，与 AI 无关） |
| WebSocket 长连接                       | **C 档：扩 env**      | 新增 `RendererEnv.openSocket?: WebSocketOpener`（通用连接能力）       |
| 本地持久化（localStorage / IndexedDB） | **B 档：import 注入** | 不扩 env；host 经 `xui:imports` 提供实现                              |

**通用性硬约束**：`env.stream` / `env.openSocket` 与 AI 消息格式**完全无关**，仅提供"建立连接 + 流式收发 + 协议切分 + chunk 解析"语义；可承载 AI 对话 / 实时日志 / IM / 行情 / 协作编辑等所有流式场景。

**`env.stream` 抽象层次**：与 `env.fetcher` 同构（高层次抽象），不是低层字节管道。自动处理 URL/body 序列化、chunk 切分（按 `streamProtocol`）、chunk 解析（按 `streamChunkType`）、SSE `[DONE]` 识别。调用方拿到的 chunks 已是"切分好 + 解析好"的对象。

**本包消费模式**：`createStreamBasedAiConnector({ env, buildRequest })` 是 host helper（在 `src/adapters/ai-connector-factory.ts`）。它调 `env.stream` 拿到已切分+已解析的 chunks，仅做 OpenAI chunk 结构 → `AiConnectorChunk` 的纯字段映射。包内**不**直调 fetch / EventSource / ReadableStream，**不**实现 SSE 协议解析。完整代码示例见 discussion §第 2 轮。

**前置依赖**：P0 必须先完成 `env.stream` 评审 + `packages/flux-core` 扩接口 + `apps/playground` 默认实现。

### 11.5 State ownership 清单（按 audit.md FIX-4 落地）

| State                                                                 | Ownership                           | 持有方                            | 投影通道（如需对外暴露）                                           |
| --------------------------------------------------------------------- | ----------------------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `engine.messages`                                                     | **域内部**                          | `MessageEngine`                   | P2 ComponentHandle `getMessages()` 只读快照                        |
| `engine.requestState` / `processingState`                             | **域内部**                          | `MessageEngine`                   | P1 `$ai.isProcessing` 表达式 helper                                |
| `engine.isProcessing`                                                 | **域内部**                          | `MessageEngine`（派生）           | 同上                                                               |
| `draft text`（输入框）                                                | **local**                           | `useState`                        | 不投影                                                             |
| **`conversations` 列表**                                              | **scope-owned**                     | host 经 scope 提供                | 直接走 schema 表达式（`conversations: "${$page.conversations}"`）  |
| **`activeConversationId`**                                            | **scope-owned**                     | host 经 scope 提供                | 同上                                                               |
| 单会话 `engine` 实例                                                  | **域内部**                          | `useConversation` 内部 Map        | 不可进 scope（含函数/handler）                                     |
| `tool_calls` 状态（`message.state.toolCall[id]`）                     | **域内部**                          | `toolPlugin` 写入 `message.state` | 不投影（消息级跟随 messages 快照）                                 |
| `tool_calls` 审批态（`message.state.toolCall[id].approval`，P3 HITL） | **域内部**                          | engine 持有字段                   | 通过 `onAction: 'approve'/'reject'` event 触发 host action handler |
| 消息编辑态（`message.state.editing`，P2 增强项）                      | **域内部**                          | engine 持有                       | 通过 `onAction: 'edit'/'resubmit'` event 触发                      |
| 消息 metadata.usage（P4 token 用量）                                  | **域内部**（跟随 message.metadata） | connector 填充                    | 不投影（消息级跟随 messages 快照）                                 |
| 自动滚动位置                                                          | **local**                           | `useState` / `useRef`             | 不投影                                                             |
| 折叠态（thinking / tool 展开）                                        | **域内部**（`message.state`）       | engine 管                         | 不投影                                                             |
| 输入框当前 attachment 列表                                            | **local**（或 controlled）          | `useState`                        | 可选 controlled（schema 绑定）                                     |

**关键裁定（按 audit.md FIX-3）**：`conversations` 列表是 **scope-owned**（host 管理），不是域内部。

- `ai-conversations` 渲染器消费 schema 表达式（`conversations: "${$page.conversations}"`）
- host 用 `useConversation` hook 在应用层管理列表 + scope 同步
- 单会话的 `engine` 实例（含 messages / requestState）仍是域内部（高频流式不写 scope）

**与 v1 的矛盾消除**：v1 §11.2 写"conversations useScopeSelector 读 schema 表达式（host 管理）"，但 `engine.md` §8.6 `useConversation` 又返回 `conversations: AiConversationInfo[]`（包内持有）—— v2 统一为"host 管理 + scope-owned，渲染器读 schema 表达式"。`useConversation` 退化为 **host helper**（不是渲染器内部 API），文档明确标注。

## 12. Schema 示例（端到端）

完整示例见 [`renderers.md`](./renderers.md)。最小可运行示例：

```json
{
  "type": "ai-chat",
  "connector": "${$ai.connectors.openai}",
  "placeholder": "Ask anything...",
  "systemPrompt": "You are a helpful assistant.",
  "header": { "type": "text", "text": "AI Assistant" },
  "beforeMessages": { "type": "ai-welcome", "title": "Hello", "description": "Ask me anything." }
}
```

`$ai.connectors.openai` 假设 host 在 `xui:imports` 注册了名为 `ai` 的 import，提供 `connectors` 表达式 helper（返回 host 用 `createStreamBasedAiConnector(env, config)` 构造的 `AiConnector` 实例）。

## 13. 样式与 marker 约定

### 13.1 marker 类

| 渲染器           | 根 marker              | 类别                       |
| ---------------- | ---------------------- | -------------------------- |
| ai-chat          | `nop-ai-chat`          | Layout（不硬编码 spacing） |
| ai-message-list  | `nop-ai-message-list`  | Layout                     |
| ai-bubble        | `nop-ai-bubble`        | Widget                     |
| ai-sender        | `nop-ai-sender`        | Widget                     |
| ai-conversations | `nop-ai-conversations` | Widget                     |
| ai-welcome       | `nop-ai-welcome`       | Widget                     |
| ai-prompts       | `nop-ai-prompts`       | Widget                     |
| ai-feedback      | `nop-ai-feedback`      | Widget                     |
| ai-attachments   | `nop-ai-attachments`   | Widget                     |
| ai-tool-call     | `nop-ai-tool-call`     | Widget                     |

### 13.2 data-slot 内部结构（无 BEM）

完整树状结构见 [`renderers.md`](./renderers.md) §15。核心约定：

- 根节点：`data-slot="ai-chat-root"` 等
- 子节点：`data-slot="ai-chat-header"` / `data-slot="ai-bubble-content"` 等
- 状态属性 presence-only：`data-streaming`、`data-tool-status`、`data-disabled` 在 false 时**省略**，不输出 `="false"`

> 严守 `docs/architecture/renderer-markers-and-selectors.md`：状态用 `data-*` / `aria-*`，**禁止 BEM modifier**（如 `nop-ai-bubble--streaming`）。

### 13.4 不引入新 token 命名空间

tiny-robot 用 `--tr-*` 前缀。flux-renderers-ai **不引入** `--tr-*` 或 `--ai-*` token，全部复用 flux 现有 token + Tailwind utility classes（如 `bg-muted`, `text-foreground`, `rounded-lg`）。若未来确需 AI 专属视觉 token，由 `theme-tokens` 包统一加，不由本包私自加。

## 14. 事件、动作与组件句柄

### 14.1 渲染器 events（P0）

完整 events 总览见 [`renderers.md`](./renderers.md) §13。

### 14.2 ActionScope namespace（P1）

`ai-chat` 渲染器自动注册 `ai` 命名空间到当前 ActionScope：

| action                  | 参数                    | 行为                          |
| ----------------------- | ----------------------- | ----------------------------- |
| `ai:send`               | `{ text: string }`      | 调 `engine.sendMessage(text)` |
| `ai:abort`              | —                       | 调 `engine.abort()`           |
| `ai:clear`              | —                       | 清空 messages                 |
| `ai:createConversation` | `{ title?, metadata? }` | 委托 conversation runtime     |
| `ai:switchConversation` | `{ id }`                | 同上                          |
| `ai:deleteConversation` | `{ id }`                | 同上                          |
| `ai:renameConversation` | `{ id, title }`         | 同上                          |

表达式 helper（同名命名空间）：`${$ai.isProcessing}`、`${$ai.messages}`、`${$ai.activeConversationId}`。

### 14.3 ComponentHandle（P2）

`ai-chat` 注册 component handle，可被 `componentId` / `componentName` 寻址：

| method        | 参数           | 行为                          |
| ------------- | -------------- | ----------------------------- |
| `sendMessage` | `{ text }`     | 同 `ai:send`                  |
| `abort`       | —              | 同 `ai:abort`                 |
| `clear`       | —              | 同 `ai:clear`                 |
| `getMessages` | —              | 返回当前 messages（只读快照） |
| `setMessages` | `{ messages }` | 替换整个 messages 数组        |

## 15. 测试策略

详见 `implementation.md` §1。

## 16. 渐进式实现路线

详见 `implementation.md` §2。前置依赖（P-1 env.stream 扩充评审）见同节。

## 17. 风险与取舍

详见 `implementation.md` §3。

## 18. 不变量（写代码时必须成立）

### 18.1 引擎/渲染器内部不变量（v1 保留）

1. **引擎框架无关**：`src/engine/` 下任何文件不得 `import 'react'` / `import 'vue'` / 引用 DOM 全局变量（`document` / `window`）。所有 IO 经注入。
2. **渲染器契约**：所有 `src/renderers/*.tsx` 必须签名为 `(props: RendererComponentProps<XxxSchema>) => RendererRenderOutput`；数据读自 `props.props/meta/regions/events/helpers`。
3. **响应式数据走 selector hooks**：渲染器 render 期读响应式 scope 数据必须用 `useScopeSelector` 等价 hook；禁用 `scope.get`。
4. **marker 必须存在**：每个渲染器根节点必须有 `nop-ai-*` marker class（playground 有 audit 脚本检查）。
5. **状态属性 presence-only**：`data-streaming`、`data-tool-status` 等状态属性，false 时**省略**而非 `="false"`。
6. **UI 组件全部来自 `@nop-chaos/ui`**：禁止 raw `<div>` / `<button>` / `<input>` / `<textarea>`（除非 ui 包不提供等效组件）。
7. **包不反向依赖**：`packages/flux-renderers-ai/` 不得被 L1–L6 包依赖。
8. **构建产物只进 dist/**：`src/` 下不出现 `.js` / `.d.ts` / `.js.map`。
9. **不引入新 RendererDefinition 字段或新 field kind**：严守 `docs/references/renderer-interfaces.md`。若未来需要扩展，先走 plan-first 流程对齐。
10. **不修改 `packages/ui/src/index.ts`**：若需要新 UI 组件（如 `<Avatar>` 用于气泡头像），先 ask-first。

### 18.2 IO 边界不变量（v2 新增，按 `new-renderer-introduction-audit.md` INV-1）

11. **包内不直调任何外部 IO API**：`src/engine/` 与 `src/renderers/` 下**禁止**直接调用 `fetch` / `XMLHttpRequest` / `WebSocket` / `EventSource` / `RTCPeerConnection` / `localStorage` / `sessionStorage` / `IndexedDB` / `history.pushState` / 动态 `import()`。CI 加 INV-1 守卫测试。
12. **包内不硬编码后端配置**：禁止出现 `baseURL` / `apiKey` / `model` 等业务字段在包代码中。所有后端配置由 host 在 `xui:imports` 注册时提供。
13. **`src/storage/` 只含接口**：包内不提供任何具体 storage 实现（localStorage / IndexedDB / Server 均由 host 提供）。
14. **不内置任何具体 Connector 实现**：包内不出现 `createOpenAIConnector` / `createDeepSeekConnector` / `createMockConnector` 等工厂。仅提供 `createStreamBasedAiConnector`（host helper，把 `env.stream` 输出映射为 `AiConnector`，不含后端配置，不含协议解析——`env.stream` 已自动处理）。
15. **不实现 SSE/流式协议解析**：协议解析（SSE 切分、NDJSON 切分、chunk JSON.parse）已下沉到 `env.stream` 内部，包内不出现 `src/sse/sse-stream-to-generator.ts` 或类似模块。

### 18.3 state 边界不变量（v2 新增，按 INV-4）

16. **`conversations` / `activeConversationId` 是 scope-owned**：渲染器通过 `useScopeSelector` 读 schema 表达式，不在包内自持。`useConversation` hook 是 host helper（不在渲染器内部用）。
17. **`engine.messages` 是域内部**：不写 scope；高频流式更新避免订阅风暴。
18. **env 引用变化不重建内部 state**：engine 用 `useRef` lazy init，env 引用变化只触发 `setConnector` 等适配调用，不重建 engine 实例。

## 19. 参考文档 / v1→v2 变更摘要 / 复审记录

v1→v2 变更摘要（§4）、第 1 轮 fresh-session 复审记录（§5）、Host 集成示例（§6）、参考文档列表（§7）详见 `implementation.md`。

## 20. 改进路线（基于外部库对照）

`improvement-analysis.md` 基于 7 个外部 React AI 组件库（assistant-ui / AI Elements / CopilotKit / Chat UI / AIKit / Agent Elements / VLLNT UI）对照分析，提出 18 项改进（A-1~A-18，按 P1/P2/P3/P4/P7 分级）。本设计已采纳的架构级改进：

| 改进                                                           | 来源                          | 落地位置                                                         |
| -------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `ChatMessageDataPart` 通用 data part（A-1）                    | Chat UI                       | `engine.md` §7.1 ChatMessageContentPart 加 `data-${string}` 类型 |
| `ChatToolCallUIState.approval` HITL（A-14）                    | Agent Elements / assistant-ui | `engine.md` §7.1 + §11.5 state ownership                         |
| `BubbleToolRendererMatch` 工具类型化（A-6）                    | Agent Elements                | §10.3 ai-bubble 渲染器注册制                                     |
| 流式 Markdown 缓冲层（A-2 / A-7）                              | Streamdown                    | §10.4 流式 Markdown 渲染                                         |
| `useAutoScroll` hook 公开（A-9）                               | AIKit                         | §6 目录结构 + §11.5 state ownership                              |
| 新渲染器：`ai-citations` / `ai-voice-input` / `ai-token-usage` | AI Elements / VLLNT UI        | §5.1 渲染器清单                                                  |
| 消息分支（A-16）                                               | assistant-ui / AI Elements    | §5.1 渲染器清单                                                  |

**组件级细节增强**（时间戳 / 流式光标 / 代码块复制 / 工具状态颜色 / 拖放附件 / 消息编辑 / LaTeX 评估 / a11y `aria-live` / 虚拟滚动等）见 `improvement-analysis.md` §3-§7。Phase 路线与改进项 ID 映射见 `implementation.md` §2。

**已明确不引入**：mermaid / shiki / Babel standalone / MCP SDK 包内依赖 / LLM 提供商 SDK（理由见 `improvement-analysis.md` §6）。
