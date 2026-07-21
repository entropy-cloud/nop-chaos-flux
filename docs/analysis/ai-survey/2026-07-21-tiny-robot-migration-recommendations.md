# tiny-robot → React 19 + flux 移植建议

> **来源**：从 `2026-07-21-tiny-robot-deep-analysis.md` §10-§11 抽取。
> **重要声明**：本文件是 2026-07-21 调研时的**初步建议**。**实际落地以 `docs/components/flux-renderers-ai/design.md` v2 为准**；与本文件冲突时，以 design.md v2 为准。
> **配套**：调研事实部分见 `2026-07-21-tiny-robot-deep-analysis.md` §0-§9（不含建议）。

## 与 design.md v2 的冲突对照（必读）

| 本文件原建议                                                             | design.md v2 裁定     | 说明                                                                                                 |
| ------------------------------------------------------------------------ | --------------------- | ---------------------------------------------------------------------------------------------------- |
| §11.1 "SSE 解析 sseStreamToGenerator 直接拷贝"                           | **❌ 已否决**         | 协议解析下沉到 `env.stream`（INV-1 + DECISION-1）；包内不实现 SSE 解析                               |
| §11.1 "存储实现 localStorage/indexedDB 去掉 unwrapProxy 即可"            | **❌ 已否决**         | 持久化走 import 注入（DECISION-3）；包内不提供任何具体 storage 实现                                  |
| §11.1 "消息引擎核心 engine.ts 直接拷贝"                                  | **✅ 保留**           | 包内 `src/engine/` 移植                                                                              |
| §11.1 "插件 thinkingPlugin/toolPlugin/lengthPlugin 直接拷贝"             | **✅ 保留**           | 同上                                                                                                 |
| §11.1 "存储接口 types.ts 直接拷贝"                                       | **✅ 保留**（仅接口） | 包内 `src/storage/types.ts` 只定义 `ConversationStorageStrategy` 契约                                |
| §11.1 "Bubble 渲染器注册制设计"                                          | **✅ 保留**（设计）   | 组件用 React 重写                                                                                    |
| §11.2 "useMessage/useConversation 改 React hook"                         | **✅ 保留 + 重定位**  | 作为 **host helper**（不是渲染器内部 API）                                                           |
| §11.2 "ThemeProvider 用 React Context"                                   | **❌ 已否决**         | flux 不引入新 token 命名空间；用 flux 现有 token + Tailwind                                          |
| §11.2 "McpServerPicker UI 保留设计，MCP 协议层用 sdk 实现"               | **⚠️ 推迟**           | MCP 客户端挪到独立 `flux-mcp-connector` 包（P7 可选）                                                |
| §11.4 "推荐拆为 flux-ai-core / flux-ai-react / flux-renderers-ai 三个包" | **❌ 已否决**         | 单一 `flux-renderers-ai` 包结构，引擎作为包内子目录                                                  |
| §11.5.1 "useMessage 实现为 Zustand-style store"                          | **⚠️ 调整**           | engine 用 module-level store + `useSyncExternalStore` 桥接（与 Zustand 风格一致但不是 Zustand 实例） |
| §11.5.5 "主题保留 `--tr-*` 前缀"                                         | **❌ 已否决**         | 完全复用 flux 现有 token                                                                             |

---

## 10. 整体架构亮点和不足（调研时观察）

### 10.1 做得好（强烈推荐移植）

1. **★★★★★ 框架无关的消息引擎**：`message/core/engine.ts` + `MessageStateAdapter` 抽象。这是整个项目最大的资产，让移植成本可能降低 70%。React adapter 大概只需 100 行（类似 vue.ts 的 136 行）
2. **★★★★★ 插件生命周期链**：`onTurnStart / onBeforeRequest / onCompletionChunk / onAfterRequest(+ requestNext 递归) / onTurnEnd / onError / onFinally`，覆盖了流式 AI 对话的所有扩展点。`thinkingPlugin`/`toolPlugin`/`skillPlugin`/`lengthPlugin` 各司其职
3. **★★★★ Bubble 渲染器注册制**：`find/renderer/priority` + 默认渲染器 + 业务方可注册。匹配维度灵活（按 message 字段、按 content type、按 role）。contentResolver 让内容解析也可定制
4. **★★★★ ResponseProvider 函数式抽象**：抛弃 OOP provider 类，一个函数搞定流式/非流式，对接 OpenAI 兼容服务极简
5. **★★★★ Conversation 双层模型**：ConversationInfo（轻量、全量在内存）+ Engine（重量、惰性创建、可清理）的分离；autoSave 节流；存储合并策略；删除时 abort+清理 watcher 的严谨性
6. **★★★★ combineDeltaData 算法**：处理 OpenAI 流式 chunk 的所有情况（string 拼接、按 index 合并 tool_calls 数组、object 递归），成熟稳定
7. **★★★ AutoSave 节流策略**：leading + trailing 双触发，既不丢首次更新也不被高频流式打爆
8. **★★★ 工具状态/结果解耦**：状态走 `message.state.toolCall[id]`，结果走全局 store——让 UI 组件无需直接接触 engine 就能拿到要展示的数据
9. **★★★ 工具调用并行执行 + 自动续轮**：`Promise.all(toolCallPromises)` 并行调工具，完成后 `requestNext()` 让 AI 继续回答
10. **★★★ 主题 CSS 变量方案**：与 flux 现有约定一致（但 flux 实际不复用其 `--tr-*` 命名空间）

### 10.2 做得不足（移植时可改进）

1. **❌ ChatMessage 三处定义**（`kit/types.ts` / `components/bubble/index.type.ts` / `message/types.ts`），新人难以选择。移植时**统一为一个 ChatMessage 类型**，基于 OpenAI SDK + 三个扩展字段（loading、metadata、state）
2. **❌ Conversations 组件是空壳**：声称的组件没实现，真正的逻辑在 `useConversation`，UI 在 `History`。命名误导。移植时直接做一个真实的 `<ConversationList>` 组件
3. **❌ MCP 命名误导**：组件叫 `McpServerPicker` 但只是通用插件管理 UI，没有任何 MCP 协议代码。移植时要么真接 `@modelcontextprotocol/sdk`，要么改名 `PluginManager`
4. **❌ Vue 响应式泄漏到存储层**：`unwrapProxy`/`toRaw` 出现在 `storage/utils.ts`。框架无关的 storage 不该依赖 Vue。React 移植直接删
5. **❌ Sender 与 Tiptap 强耦合**：所有富文本/键盘/模式切换逻辑都依赖 Tiptap。移植时如果不需要 @提及/模板，可换更轻的 textarea + auto-size
6. **❌ 老的 Provider 抽象（BaseModelProvider + AIClient）残留且被标 @deprecated**：增加认知负担。移植直接只保留 ResponseProvider
7. **❌ 重 SDK 依赖**：`message/types.ts` 大量 `import { ... } from 'openai/resources'`，让核心引擎绑死 OpenAI 类型。可考虑改成结构化类型（自己定义等价 interface）
8. **❌ Playground 是在线代码编辑器（@vue/repl），不是真实使用示例**：移植参考时找不到端到端用例
9. **❌ Sender context 用 provide/inject 暴露过多字段**：30+ 字段（`types/context.ts`），子组件都依赖整个 context，难以独立测试
10. **❌ 没有 React 适配**：native adapter 太简陋（只用于测试），生产场景必须自己写

### 10.3 Vue 生态绑死、无法直接移植的部分

- 所有 `.vue` SFC 模板（`<template>` + `<script setup>` + `<style scoped>`）
- 所有 composable（`useMessage`、`useConversation`、`useSenderCore`、`useEditor` 等）
- `provide/inject` + `InjectionKey` symbol 体系
- `defineModel`、`defineProps`、`defineEmits`、`defineSlots`、`defineOptions`
- `v-model`、`v-show`、`v-html`、`<component :is>`、`<slot>`
- `@tiptap/vue-3` 扩展（要换 `@tiptap/react`，API 接近）
- `@vueuse/core`（很多组件用了它的工具）
- `@opentiny/vue`（OpenTiny Vue 组件库依赖）
- `reactive`/`ref`/`computed`/`watch`/`watchEffect`/`toRaw`/`isProxy`
- `vDropzone` 自定义指令（要改成 React 的 useDrop hook）

---

## 11. 移植到 React 19 + flux 的设计要点清单

### 11.1 ★ 必须保留（直接复用源码）

| 模块                      | 源文件                                                                          | 复用方式                                                                                             | v2 状态                                           |
| ------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 消息引擎核心              | `kit/src/message/core/engine.ts`                                                | 直接拷贝，依赖 adapter 注入                                                                          | ✅ 已采纳                                         |
| 引擎类型                  | `kit/src/message/types.ts`                                                      | 直接拷贝（可考虑把 `openai/resources` 类型替换为自定义结构类型）                                     | ✅ 已采纳（自定义类型）                           |
| 引擎工具                  | `kit/src/message/utils.ts`                                                      | 直接拷贝（`combineDeltaData`/`normalizeToAsyncGenerator`/`makeAbortable`/`pickFields`/`omitFields`） | ✅ 已采纳                                         |
| 框架无关 adapter          | `kit/src/message/adapters/native.ts` + `shared.ts`                              | 直接拷贝                                                                                             | ✅ 已采纳                                         |
| 插件                      | `kit/src/message/plugins/{thinkingPlugin,toolPlugin,lengthPlugin}.ts`           | 直接拷贝                                                                                             | ✅ 已采纳                                         |
| ~~SSE 解析~~              | ~~`kit/src/utils.ts:sseStreamToGenerator`~~                                     | ~~直接拷贝~~                                                                                         | **❌ 已否决**：协议解析下沉到 `env.stream`        |
| 存储接口                  | `kit/src/storage/types.ts`                                                      | 直接拷贝                                                                                             | ✅ 已采纳（仅接口）                               |
| ~~存储实现~~              | ~~`kit/src/storage/{localStorageStrategy,indexedDBStrategy}.ts`~~               | ~~拷贝时去掉 `unwrapProxy`~~                                                                         | **❌ 已否决**：持久化走 import 注入（DECISION-3） |
| ~~主题 CSS 变量~~         | ~~`components/src/styles/variables.css`~~                                       | ~~直接拷贝~~                                                                                         | **❌ 已否决**：复用 flux 现有 token               |
| Bubble 渲染器注册制的设计 | `bubble/index.type.ts` 的 `BubbleBoxRendererMatch`/`BubbleContentRendererMatch` | 拷贝类型设计，组件用 React 重写                                                                      | ✅ 已采纳                                         |

### 11.2 ★ 需要改写（思路保留，代码重写）

| 模块                                        | 原实现                                        | React 19 改写思路                                                                                                        | v2 状态                                     |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| React message adapter                       | `kit/src/message/adapters/vue.ts`             | 新写 `createReactMessageAdapter()`：内部用 module-level store + `Set<listener>`，配合 `useSyncExternalStore`             | ✅ 已采纳                                   |
| `useMessage` Hook                           | `kit/src/vue/message/useMessage.ts`           | 写 `useMessage(options)`：内部 `useRef` 持有 engine 实例（lazy init），用 `useSyncExternalStore` 订阅 `engine.subscribe` | ✅ 已采纳（重定位为 host helper）           |
| `useConversation` Hook                      | `kit/src/vue/conversation/useConversation.ts` | 同上思路，但因引擎本身是状态机，可考虑用 Zustand store 包一层                                                            | ✅ 已采纳（host helper）                    |
| Bubble / BubbleList / BubbleProvider        | `bubble/*.vue`                                | React 组件。BubbleProvider 用 Context 注入 renderer 配置。BubbleList 用 `useMemo` 算 groupStrategy                       | ✅ 已采纳                                   |
| Sender                                      | `sender/index.vue` + composables              | Tiptap 改用 `@tiptap/react`（P6 可选）                                                                                   | ✅ P0 用 `<Textarea>` 降级                  |
| 其他展示组件（Welcome/Prompts/Feedback 等） | 各自 .vue                                     | 按 props/slots 翻译为 props/JSX children                                                                                 | ✅ 已采纳                                   |
| Attachments                                 | `attachments/*.vue`                           | 数据模型保留，组件用 React 重写                                                                                          | ✅ 已采纳                                   |
| ThemeProvider                               | `theme-provider/index.vue`                    | 用 React Context + `useEffect`                                                                                           | **❌ 已否决**：flux 不引入新 token 命名空间 |
| Bubble 子渲染器                             | `bubble/renderers/*.vue`                      | Markdown 用 `react-markdown` + `rehype-raw` 替代 markdown-it                                                             | ✅ 已采纳                                   |
| McpServerPicker / McpAddForm                | `mcp-server-picker/`                          | UI 保留设计，配套的 MCP 协议层用 `@modelcontextprotocol/sdk` 实现                                                        | ⚠️ P7 推迟，挪到独立包                      |

### 11.3 ★ 可以丢弃（不需要移植）

| 模块                                                                   | 原因                                    | v2 状态                                  |
| ---------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| `kit/src/providers/base.ts` + `openai.ts` + `client.ts`                | 整套 `BaseModelProvider` 已 @deprecated | ✅ 已采纳                                |
| `kit/src/utils.ts:handleSSEStream` 回调式版本                          | 保留生成器式即可                        | ✅ 已采纳（且生成器式也下沉 env.stream） |
| `kit/src/utils.ts:extractTextFromResponse` + `formatMessages`          | 只服务于废弃 API                        | ✅ 已采纳                                |
| `components/src/sender-compat/` 整个目录                               | v0.3.0 兼容层，无价值                   | ✅ 已采纳                                |
| `kit/src/message/plugins/skillPlugin.ts` + `kit/src/skills/`           | 复杂度高，非核心，按需移植              | ✅ 已采纳                                |
| `kit/src/skills/storage/{fs,node}.ts`                                  | Node 环境 skill 存储                    | ✅ 已采纳                                |
| `components/src/bubble/composables/useBubbleStore.ts` 的 reactive 方案 | 改用 React Context                      | ✅ 已采纳                                |
| `playground/` 整个                                                     | 是 Vue 在线编辑器                       | ✅ 已采纳                                |

### 11.4 推荐的 React 包结构（建议）

> **⚠️ 已被 design.md v2 §6 推翻**：实际采用单一 `flux-renderers-ai` 包结构（引擎作为包内子目录），原因见 design.md §6。本节仅作历史参考。

```
packages/
├── flux-ai-core/                    ← 对应 kit/src/message + kit/src/utils
├── flux-ai-react/                   ← 对应 kit/src/vue + 部分 hooks
└── flux-renderers-ai/               ← 对应 components/src
```

### 11.5 移植时的关键设计决策

| 决策项                 | 调研建议                                          | v2 裁定                                                                         |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------- |
| 状态管理选型           | Zustand vanilla store + `use-sync-external-store` | ✅ engine 用 module-level store + `useSyncExternalStore`（与 Zustand 风格一致） |
| ChatMessage 类型统一   | 基于 OpenAI SDK + 3 扩展字段                      | ✅ 已采纳                                                                       |
| Sender 是否必须 Tiptap | 不需要 @提及/模板则用 Textarea                    | ✅ P0 用 Textarea，P6 可选 Tiptap                                               |
| MCP 实现策略           | UI 保留设计，后端用 sdk                           | ⚠️ P7 推迟，独立 `flux-mcp-connector` 包                                        |
| 主题融合               | 保留 `--tr-*` 前缀                                | **❌ 已否决**：复用 flux 现有 token                                             |
| 测试策略               | 引擎 + plugins 原样带单测                         | ✅ 已采纳                                                                       |

---

## 附：源文件定位速查

- Bubble 渲染器注册制类型：`packages/components/src/bubble/index.type.ts:94-124, 211-219`
- Bubble 默认渲染器：`packages/components/src/bubble/renderers/defaultRenderers.ts:12-50`
- 消息引擎核心：`packages/kit/src/message/core/engine.ts:65-474`
- ChatMessage 三处定义：`packages/kit/src/types.ts:36` / `packages/components/src/bubble/index.type.ts:25` / `packages/kit/src/message/types.ts:23`
- ResponseProvider 抽象：`packages/kit/src/message/types.ts:40-43`
- 工具插件：`packages/kit/src/message/plugins/toolPlugin.ts:125-479`
- 思考插件：`packages/kit/src/message/plugins/thinkingPlugin.ts:3-66`
- SSE 流式生成器：`packages/kit/src/utils.ts:164-249`
- Delta 合并算法：`packages/kit/src/message/utils.ts:133-189`
- ConversationInfo/Conversation：`packages/kit/src/vue/conversation/types.ts:5-23`
- useConversation 状态管理：`packages/kit/src/vue/conversation/useConversation.ts:9-351`
- 存储接口：`packages/kit/src/storage/types.ts:7-28`
- 主题 CSS 变量：`packages/components/src/styles/variables.css:1-489`
- Vue/React adapter 对照：`packages/kit/src/message/adapters/vue.ts:42-136` ↔ `packages/kit/src/message/adapters/native.ts:4-62`
