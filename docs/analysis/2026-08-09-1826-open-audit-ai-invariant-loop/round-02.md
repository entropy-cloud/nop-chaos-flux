# Round 2 — conversation adapter 契约面（connector 热替换 + 死选项字段）

> 执行批次：`2026-08-09-1826-open-audit-ai-invariant-loop`（mission `ai-invariant-loop` 开放式对抗审查）
> 视角：契约考古学家 + 死代码清道夫
> 状态：静态验证完成（`rg setConnector` 全文件零命中）

## 发现 F2（P2）— `useConversation` 建出的 engine 对 connector 变更永久失效（部分应用型静默 no-op）

- **在哪里**：`packages/flux-renderers-ai/src/adapters/use-conversation.ts:84-87`（connectorRef 更新）、`:168-183`（buildEngine 在构建时捕获 `connectorRef.current`）、全文零 `setConnector` 调用
- **是什么**：`useMessage` 的自建 engine 有 connector 热替换 effect（`use-message.ts:97-102`），`useConversation` 自己 build 的 engine 则**没有任何 connector 同步路径**：host 更换 `connector` 后，已建会话的 engine 永远用旧 connector，只有新 build 的会话用新 connector——同一页面内新旧会话指向不同后端（旧会话继续用旧 API key/旧模型，可能已失效的凭据）。
- **为什么值得关心**：`setConnector` 热替换是 engine.md §8.1/design.md §18.3 的明确契约；2151 审计已登记 useMessage 侧 mount-time-only 限制（当时接受为设计 + 缺文档注记），但 **useConversation 侧从未被检查**——属于「same family, missed method」家族在 conversation 管理路径上的新实例。与 m4「never touch an external engine's connector」不冲突（这些 engine 是 hook 自建的，owner 就是 hook 自己）。影响：持久化会话场景下切模型/provider 后旧会话静默继续用旧后端，凭据轮换场景下旧会话全部报错且无提示。
- **修复建议**：在 `useConversation` 加 effect：`for (const engine of engineCache.values()) engine.setConnector(connector)`（connector 引用变化时），或至少文档明示「useConversation 的 connector 为构建时捕获，变更需重建 hook」。
- **信心水平**：确定（静态证据充分）

## 发现 F3（P2）— `UseConversationOptions.createEngineOptions` 类型允许但实现忽略 `engine` 字段

- **在哪里**：`use-conversation.ts:18`（`Omit<UseMessageOptions, 'connector'>`）、`:168-183`（buildEngine 不转发 `engine`）
- **是什么**：类型上 `createEngineOptions.engine` 合法（UseMessageOptions 含 `engine?`），实现 `buildEngine` 只转发 8 个字段，`engine` 静默丢弃——host 传 `createEngineOptions: { engine: myEngine }` 得到的是自建 engine。
- **为什么值得关心**：类型契约允许一个静默无效的选项，host 会在「换引擎」场景踩空且无任何警告；Omit 应改为 `Omit<UseMessageOptions, 'connector' | 'engine'>`。
- **信心水平**：确定

## 本轮排除

- `clearAll` 的 `engineCache.keys()` 遍历源（= multi-audit P1-3/P1-4，不重报）。
- unmount 不排空 pendingSavesRef（= multi-audit P2-2，不重报）。
- bootstrap effect 依赖 `storage` 引用（= multi-audit P2-7，不重报）。
