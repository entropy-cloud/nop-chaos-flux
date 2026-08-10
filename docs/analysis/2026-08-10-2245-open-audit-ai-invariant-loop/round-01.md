# Round 1 — engine/adapter 面的 ⑩-family 残留与契约缺口

> 执行批次：`2026-08-10-2245-open-audit-ai-invariant-loop`（mission `ai-invariant-loop` 开放式对抗审查）
> 视角：契约考古学家 + 异常路径侦探 + 10x 规模运维者
> 状态：静态验证完成（代码路径 + 既有测试交叉证实；无需运行时 probe）
> 去重背景：已读 `docs/analysis/2026-08-09-1826-open-audit-ai-invariant-loop/round-01..03`（F1-F9）+ `docs/audits/2026-08-10-2245-multi-audit-ai-invariant-loop.md`（FIND-01..22）+ 07-23/07-24 两批 AI 审计；本批均为新实例，不重报。

## 发现 R1-F1（P1）— tool-loop-max 终止是 invariant ⑩「dangling tool_calls 清理面」的第四处漏网表面：末轮 assistant 的 tool_calls 无配对 tool 响应，永久留在 live 历史 + 渲染成无限旋转的 running 卡片

- **在哪里**：`packages/flux-renderers-ai/src/engine/create-engine.ts:267-282`（loop-top `rounds >= maxToolRounds` break + 仅写 `toolLoopMaxReached` 标记）、`:344-355`（随后无条件写 `completed`）；对照 ⑩ 的既有三清理面（`create-engine.ts:561-576` abort 分支 / `:315` tool-no-executor / `:334` abort-mid-executor 均调用 `cleanDanglingAssistantAt`）；`src/renderers/ai-bubble/renderers/tools.tsx:64-71`（`resolveToolState` 缺省返回 `{status:'running'}`）；`src/renderers/ai-tool-call.tsx:54,337-349`（running → 无限 `Loader2 animate-spin`）；`src/engine/utils.ts:173-215`（dangling 判定/清理谓词）。
- **是什么**：`maxToolRounds` 命中的那个回合：runOnce 提交了一个 `finishReason:'tool_calls'` 且 `tool_calls` 非空的 assistant（applyChunk 已合并增量），随后 loop-top 检查直接 break —— 该批 tool_calls **从不经过 `executeToolCalls`，也没有任何 `cleanDanglingAssistantAt` 调用**。结果：
  1. engine live 历史保留「dangling tool_calls assistant」（`getMessages()` 出口与 engine 订阅者可见）；
  2. `requestState` 被写成 `completed`，无错误、无停止按钮（loading=false）；
  3. UI 上该 assistant 的 tool card 状态是 `running`（tools.tsx 缺省值）→ **无限旋转的 spinner，永远不结束**；
  4. `toolLoopMaxReached` 标记被写进 metadata，但全包零渲染器读取（grep 证实仅测试引用）——引擎的「记录原因」没有任何渲染面。
- **为什么值得关心**：这是 mission 自己的「same family, missed surface」的精确复发模式：invariant ⑩ 的三清理面之外还有第四面（loop-max break）。请求载荷面（buildContext `sanitizeDanglingToolCalls`）与 autoSave 面（`use-conversation-autosave.ts:66`）把残留藏住了，所以「严格后端 400」不会发生——但 live 历史、`component:getMessages` 快照、以及 UI 三处都保留了损坏形状；8 轮以上连续 tool_calls 的 agentic 任务是真实场景（一次执行 8+ 个工具的复杂任务），用户看到的不是「达到上限」而是「永远在转的工具卡」，且没有中止入口。现有测试 `engine-tool-loop.test.ts:194-213` 只断言标记与轮数，**没有**断言该末轮 assistant 的 tool_calls 被清理，也没有任何渲染面测试。
- **修复方向**：loop-max break 处对 `outcome` 的 assistant 调用 `cleanDanglingAssistantAt(adapter, assistantIndex)`（与其它三面一致）；或至少在渲染面消费 `toolLoopMaxReached` 渲染终止说明并把卡片状态改为 `cancelled`。补 engine 侧回归（末轮 dangling 被 drop/strip）+ 渲染侧回归（loop-max 后卡片不显示 running）。
- **信心水平**：确定（代码路径逐行可证；`toolLoopMaxReached` 全仓仅测试引用为 grep 实证）

## 发现 R1-F2（P2）— ⑪ plugin ctx 写隔离只做到 element 层：`ctx.request.messages[i]` 的 `tool_calls` / `content` / `metadata` 嵌套值仍与 engine 历史共享引用

- **在哪里**：`src/engine/build-context.ts:55`（`sanitizeDanglingToolCalls(...).map(projectWireMessage)`）+ `src/engine/utils.ts:254-268`（`projectWireMessage`：`out[key] = value` 直接赋值，`tool_calls`/`content` 数组与 `metadata` 的嵌套值原样共享引用）。
- **是什么**：⑪ 修复（2026-08-10 multi-audit open P1-1）保证 `ctx.request.messages` 是新数组、元素是新对象——但元素内部的 `tool_calls` 数组、`content` parts 数组、`metadata` 的嵌套值（如 `sources`）是**与 live 消息共享的引用**。插件执行 `ctx.request.messages[0].tool_calls.push(x)` 或 `messages[0].content.push(part)` 会**写穿进 engine 历史**（且该污染同时进入发出给模型的载荷）。docs 的 §8.3 注释与 `MessageEngineContext` 类型注释（types.ts:277-287「mutations never write through into engine history」）对此做了过度承诺。
- **为什么值得关心**：与 round-1-1826 的 F1（数组层 live 暴露）同族、不同深度——F1 修了数组与元素层，嵌套层是剩余成员。插件作者按「shape the outgoing request」文档自然写到的就是这种 push；写入后无任何 gate 能拦（⑨ 门禁是运行时 hook 行为，不扫深度）。影响：历史腐蚀 + 载荷污染，静默。
- **修复方向**：`projectWireMessage` 对 `tool_calls`/`content` 做一层浅拷贝（或 `cleanDanglingToolCalls` 的 strip 路径已产生新数组的成员补齐），并在 types.ts/engine.md §8.3 明示嵌套值共享。
- **信心水平**：确定（纯引用分析）

## 发现 R1-F3（P2）— `useConversation` 无 storage + `initialConversations`：首会话 `activeConversationId` 已指向它但 `activeEngine` 恒为 null——K-⑥-3 的「默认会话按需建引擎」只覆盖了 storage bootstrap 面

- **在哪里**：`src/adapters/use-conversation.ts:125-130`（`activeId` 初始化取 `initialConversations?.[0]?.id`）、`:168`（`activeEngine` 初始 null）、`:329-338`（K-⑥-3：仅 storage bootstrap 分支为默认会话 `ensureEngineAndHydrate`）。
- **是什么**：无 storage 时用 `initialConversations` 播种，`activeConversationId` 是首个会话，但没有任何代码为它建 engine——`activeEngine` 保持 null，直到 host 显式调 `switchConversation`（测试 `use-conversation-switch.test.ts:219` 正是显式 switch 的路径）。绑定 `engine={activeEngine}` 的 ai-chat 因此渲染「select conversation」空态，尽管列表里明明有活动会话。类型注释「null before the first switch/create」把它写成了文档化行为，但 K-⑥-3 在 storage 面把同样的问题当作缺陷修了——同一 family（默认会话 engine 构建）在 no-storage 面漏了成员。
- **为什么值得关心**：新 host 按 engine.md §8.6 用 `initialConversations` 起步时，第一个会话的聊天区是死的，且没有任何报错指引；与 storage 面的自动构建行为不一致。
- **信心水平**：确定（状态初始化逐行可证）

## 发现 R1-F4（P2）— bootstrap `loadConversations` 期间 `deleteConversation` 的被删会话被 K-⑦ merge 复活为幽灵列表项

- **在哪里**：`src/adapters/use-conversation.ts:299-350`（mount bootstrap）、`:311-326`（K-⑦ merge：`convs` 全量作为基底 + mirror 中不在 `convs` 的成员）、`:501-552`（deleteConversation 同步过滤 mirror）。
- **是什么**：K-⑦ 只守卫了「load 期间 clearAll」（`listClearedRef`）；「load 期间 deleteConversation(X)」没有守卫——delete 同步从 mirror 移除 X，但 bootstrap resolve 后 merge 以 `convs`（load 时点的快照，含 X）为基底，X 被**复活**进 `conversations` 列表（其 storage 记录已被删除；若这是唯一会话，还会被 `setActiveId(current => current ?? convs[0].id)` 提升为 active，随后 `ensureEngineAndHydrate` 对已删记录的 loadMessages 返回空）。同族（bootstrap 晚 resolve 复活）的 create 方向（probe-2）与 clearAll 方向（K-⑦-1）都修了，delete 方向未覆盖。
- **为什么值得关心**：窗口窄（需在 load 期间程序化 delete），但幽灵项 + 可能的幽灵 active 提升是同一批 ghost 家族的真实成员；K-⑦ 的 merge 注释声称覆盖「任意 displacement」，实际只覆盖 clearAll。
- **信心水平**：确定（纯状态推演；delete 与 merge 两路径均逐行可证）

## 发现 R1-F5（P2）— `ai` ActionScope namespace 无实例隔离：同页两个 ai-chat 时后挂载者顶替前挂载者的 provider，且先卸载者会整 namespace 注销

- **在哪里**：`src/renderers/ai-chat.tsx:200-206`（`useNamespaceRegistration(actionScope, 'ai', actionProvider)`）；`packages/flux-runtime/src/action-scope.ts:53-68`（`registerNamespace`：已有 provider 且不同引用时 `cleanupProvider(existing)` 后顶替；unregister 按「当前 provider 是本人」才删除——后挂载者卸载时整个 namespace 被删）。
- **是什么**：两个 ai-chat 实例共享一个 ActionScope 时，`ai:send`/`ai:abort`/`ai:clear` 静默路由到**最后挂载**的那个 chat 的引擎；前一个 chat 的 provider 被提前 cleanup；后挂载者卸载后 namespace 整体消失，第一个 chat 的 `ai:*` 动作变成 unknown-action 失败。ComponentHandle 路径（cid/componentId）是实例安全的，唯独 namespace 路径不是——没有警告、没有文档说明「每页一个 ai-chat」的限制。
- **为什么值得关心**：10x 运维视角——分屏/侧栏多 AI 助手页面（`ai:send` 从兄弟组件驱动）会把消息发进错误的会话，静默且难排查；单页多实例是 chat 产品常见形态。修复方向：namespace 按 cid 派生（`ai-<cid>`）或注册时检测冲突并 console.warn。
- **信心水平**：很可能（action-scope 实现逐行确认；多实例 UI 场景未在包内测试覆盖）

## 本轮排除（读过、验证后放弃）

- React Compiler 对 ai-message-list 的流式冻结猜想——babel 实际编译产物证实 `AiMessageListView` 因 `react-hooks/incompatible-library`（useVirtualizer）被 Compiler 整体跳过、未 memoize，逐 chunk 更新可达，非问题。
- `abort()` 不清理 `processingState`——瞬态窗口，且无渲染器读取 processingState，非问题。
- `onResponseComplete` 载荷尾消息为 tool 消息——逐路径推演 loop-max break 时尾消息仍是 assistant，非问题。
- `useConversation` 的 `storage` 渲染闭包捕获——storage 策略函数行为等价，非问题。
- 同页双 chat 的组件 handle 冲突——cid 隔离存在，仅 namespace 路径（R1-F5）有问题。
