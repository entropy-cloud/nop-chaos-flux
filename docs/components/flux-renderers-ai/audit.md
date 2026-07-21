# flux-renderers-ai 原则审计

> **审计对象**：`docs/components/flux-renderers-ai/design.md` v1（含 `renderers.md`）
> **审计依据**：`docs/references/new-renderer-introduction-audit.md`
> **审计日期**：2026-07-21
> **审计结论**：**未通过**（INV-1 大面积违反，需重大修订后复审）
> **复审要求**：解决 FAIL/NEEDS-DECISION 项后，必须由独立 fresh session 复审（不可自审）

## 审计摘要

| Invariant                  | 结论               | 关键问题                                                                                       |
| -------------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| INV-1（IO 经 env）         | **FAIL**           | `src/providers/` + `src/sse/` + `src/storage/` 三处直调 `fetch`/SSE/`localStorage`/`IndexedDB` |
| INV-2（新 IO 扩 env 评审） | **NEEDS-DECISION** | 流式 IO 没走评审，默认"包内直调"是违规路径                                                     |
| INV-3（复用 flux runtime） | **PARTIAL**        | 持久化与 provider 自带，违反"不重造"原则                                                       |
| INV-4（内部 state 边界）   | **PARTIAL**        | `conversations` 归属矛盾；持久化策略自相矛盾                                                   |
| INV-5（契约边界）          | **PASS（小瑕疵）** | `useMessage` export 定位需明确                                                                 |

| Checklist          | 结论            |
| ------------------ | --------------- |
| A. IO 边界         | **大面积 FAIL** |
| B. 复用边界        | PARTIAL         |
| C. 内部 state 边界 | PARTIAL         |
| D. 契约边界        | PASS            |
| E. 扩展点边界      | PASS            |
| F. 样式边界        | PASS            |
| G. 包结构          | PASS            |

---

## INV-1：IO 边界审计 —— **FAIL**

### 列出组件所有外部 IO

| IO 类型              | 当前位置（design.md 引用）                | 是否经 env？                                       |
| -------------------- | ----------------------------------------- | -------------------------------------------------- |
| HTTP 一次性请求      | 未明确                                    | —                                                  |
| HTTP 流式响应（SSE） | `src/providers/openai-compatible.ts` §9.2 | ❌ 直调                                            |
| SSE 字节流解析       | `src/sse/sse-stream-to-generator.ts` §6   | ❌ 直调 `ReadableStream`/`getReader`/`TextDecoder` |
| 本地持久化（小数据） | `src/storage/local-storage.ts` §6         | ❌ 直调 `localStorage`                             |
| 本地持久化（大数据） | `src/storage/indexed-db.ts` §6            | ❌ 直调 `IndexedDB`（经 `idb` 库）                 |
| 动态 fetch 注入      | `OpenAICompatibleConfig.fetch` §9.2       | ❌ 业务方"注入 fetch"绕开 `env.fetcher`            |
| 通知                 | 渲染器内部                                | ✅ 未直调 toast，应走 `env.notify`                 |
| 路由                 | 未涉及                                    | —                                                  |
| 权限                 | 未涉及                                    | —                                                  |
| 业务能力注入         | `xui:imports` §12 示例                    | ✅ 合规                                            |

### 违规详情

**违规 1：`src/providers/openai-compatible.ts`**（design.md §6、§9.2）

```ts
export interface OpenAICompatibleConfig {
  baseURL: string;            // ← 硬编码 endpoint
  apiKey: string | (() => ...);   // ← API key 进前端代码
  fetch?: typeof fetch;       // ← 绕开 env.fetcher
}
```

`baseURL` 和 `apiKey` 字段违反 INV-1 末项"渲染器代码内没有硬编码 API key / baseURL / endpoint / model name"。即使通过 `xui:imports` 注入，构造函数本身也在做"前端直连大模型"——这与"所有 AI 大模型直接连接的能力都应该屏蔽在后台"的设计意图冲突。

**违规 2：`src/sse/sse-stream-to-generator.ts`**（design.md §6）

整个 SSE 解析模块直接调浏览器/Node streaming API（`ReadableStream` / `getReader` / `TextDecoder` / `EventSource`），flux 全仓当前零此类调用（`grep WebSocket|EventSource|text/event-stream|ReadableStream|getReader` 无命中）。这相当于绕开 env 引入了新 IO 类型。

**违规 3：`src/storage/local-storage.ts` + `indexed-db.ts`**（design.md §6）

直调 `localStorage` 和 `IndexedDB`，违反 INV-1 禁止直调清单。

**违规 4：包公开导出**（design.md §6.1）

```ts
export { createOpenAICompatibleProvider } from './providers/openai-compatible.js';
export { localStorageStrategyFactory, indexedDbStrategyFactory } from './storage/factories.js';
```

这些违规实现成了包的**公开 API**，等于鼓励所有使用者绕开 env。

### 修订要求

1. **删除** `src/providers/` 目录及其导出
2. **删除** `src/sse/` 目录及其导出
3. **删除** `src/storage/` 下的具体实现（`local-storage.ts` / `indexed-db.ts` / `factories.ts`），保留 `types.ts` 接口契约
4. 包内只保留：
   - `MessageEngine` 接口契约（接收 `AiConnector` 抽象，不感知协议）
   - React 适配（`useMessage` / `useConversation`）
   - 渲染器组件
5. 任何 fetch / SSE / WebSocket / localStorage / IndexedDB 的具体实现由 **host** 提供，通过 `xui:imports` 注入

---

## INV-2：新 IO 类型扩 env 评审 —— **NEEDS-DECISION**

### 当前状态

design.md 默认"包内自带 SSE 解析 + fetch 调用"，这相当于选了一条**非合规路径**——既不是 INV-2 的 A（组合现有 env），也不是 B（import 注入），也不是 C（评审扩 env）。这是"包内硬编码新 IO 类型"，绕开了评审流程。

### 必须裁定的核心问题

**Q1：流式响应（SSE）走 A/B/C 哪一档？**

- **A 档（组合现有 env）**：`env.fetcher` 是 Promise-based，**结构上无法承载流式**。A 档不可行。
- **B 档（import 注入 connector）**：host 提供 `{ openai: () => AsyncGenerator<chunk> }` 经 `xui:imports` 注入，渲染器只消费 AsyncGenerator。**优点**：零侵入、屏蔽后端、host 自由实现。**缺点**：每个 host 都要自己实现 connector；通用性低。
- **C 档（评审扩 env）**：扩 `RendererEnv` 增加 `streamFetcher?: (api, ctx) => AsyncGenerator<StreamChunk>`（或类似）。**优点**：官方流式通道、统一 host 实现、3+ 组件可复用（AI 对话、实时日志、服务器推送通知）。**缺点**：需要评审 + 所有 host 改动。

**Q2：WebSocket 长连接走 A/B/C 哪一档？**

同上结构。WebSocket 比 SSE 更通用（双向），可能更值得 C 档。

**Q3：本地持久化（localStorage / IndexedDB）走 A/B/C 哪一档？**

- **A 档**：flux 当前无 `env.storage` 抽象，A 不可行。
- **B 档**：host 提供 storage adapter 经 import 注入；渲染器内部只持有 `ConversationStorageStrategy` 接口。**推荐**。
- **C 档**：扩 `env.storage?: StorageStrategy`。**不推荐**——业务相关性强、通用性弱（不是所有 host 都需要本地持久化）。

### 修订要求

design.md 必须新增一节"IO 边界裁定"，对 Q1/Q2/Q3 明确选择 A/B/C 之一，并说明理由。若选 C，必须起草评审提案（`docs/discussions/`）并链接到本审计。

**推荐裁定**（待 design.md 作者确认）：

| IO 类型          | 推荐档位             | 理由                                                          |
| ---------------- | -------------------- | ------------------------------------------------------------- |
| HTTP 流式（SSE） | **C（评审扩 env）**  | 通用系统调用，3+ 场景（AI/日志/推送）需要，跨 host 可统一抽象 |
| WebSocket        | **C（评审扩 env）**  | 同上，更通用                                                  |
| 本地持久化       | **B（import 注入）** | 业务相关、不是系统调用                                        |

---

## INV-3：复用 flux runtime —— **PARTIAL**

### 合规项 ✓

- §5.2 复用 `flux-renderers-content/markdown` 的 sanitize 函数
- §10.2 工具栏按钮用 `@nop-chaos/ui`
- §11 集成策略明确用 ActionScope + ComponentHandleRegistry + xui:imports
- §3 P0 不接 flux form owner

### 违规/可疑项 ✗

**违规 1：持久化层重复造**

`src/storage/local-storage.ts` + `indexed-db.ts` 是包内自造的持久化。flux 当前无 `env.storage`，但持久化属于 host 关注点（参见用户原话"渲染器纯展示，存储是 host 关注点"）。应改为接口契约 + host 注入实现。

**违规 2：provider 层重复造**

`src/providers/openai-compatible.ts` 是包内自造的 AI 连接器。应改为 `AiConnector` 接口契约 + host 注入实现。

**可疑项：MCP SDK 依赖**

design.md §5.1 `ai-mcp-manager` (P7) 需要 `@modelcontextprotocol/sdk`。这个依赖应该作为：

- (a) `peerDependencies`（host 可选装入）
- (b) 完全挪出包，host 经 import 注入 MCP 客户端

design.md 没明确，**待裁定**。建议 (b)：MCP 是业务能力，不是系统调用。

### 修订要求

1. 持久化：删实现、保留 `ConversationStorageStrategy` 接口
2. provider：删实现、保留 `AiConnector` 接口（替代 `AiResponseProvider`，命名上更准确——它是 connector 不是 provider）
3. MCP：明确作为 host 经 import 注入，包内不依赖 SDK

---

## INV-4：内部 state 边界 —— **PARTIAL**

### 合规项 ✓

- §10.2 `AiChatProvider` + `useAiChatContext` 作为渲染器**内部** React Context
- §8 MessageEngine + `useSyncExternalStore` 桥接
- §11.3 默认"engine 不持久化"
- §11.2 `engine.messages` / `isProcessing` 经 engine 订阅
- §8.5 `useRef` lazy init 持有 engine，符合"env 引用变化不重建"

### 矛盾项

**矛盾 1：持久化策略自相矛盾**

- §11.3："默认：engine 不持久化（页面刷新清空）"
- §6：`src/storage/` 自带 LocalStorage / IndexedDB 实现
- §6.1：公开导出 `localStorageStrategyFactory` / `indexedDbStrategyFactory`

同时存在"不持久化"和"自带持久化实现并对外导出"，矛盾。修订方向：删除具体实现，只留接口契约，host 按需注入。

**矛盾 2：`conversations` 归属不清**

- §11.2："conversations 列表 → useScopeSelector 读 schema 表达式（host 层管理）"
- §8.6：`useConversation` 返回 `conversations: AiConversationInfo[]`（包内持有）
- §5.1 `ai-conversations` 渲染器："消费 schema 注入的 conversations 数组"

到底是 scope-owned 还是域内部？必须选定。**建议**：`conversations` 列表是 **scope-owned**（host 提供），`active conversationId` 是 **scope-owned**，单会话的 `engine` 是**域内部**（每个会话独占 engine）。

### state ownership 清单（建议）

| State                                     | Ownership                              | 理由                                                     |
| ----------------------------------------- | -------------------------------------- | -------------------------------------------------------- |
| `engine.messages`                         | 域内部                                 | 高频流式更新，不写 scope                                 |
| `engine.requestState` / `processingState` | 域内部                                 | 引擎状态机                                               |
| `engine.isProcessing`                     | 域内部 → projection                    | 内部持有，经 `$ai.isProcessing` 表达式 helper 投影（P1） |
| `draft text`（输入框）                    | local（useState）                      | 纯 UI 局部                                               |
| `conversations` 列表                      | **scope-owned**                        | host 管理，schema 表达式可读                             |
| `activeConversationId`                    | **scope-owned**                        | 同上                                                     |
| 单会话 `engine` 实例                      | 域内部                                 | 不可进 scope（含函数/handler）                           |
| `tool_calls` 状态                         | 域内部（`message.state.toolCall[id]`） | 引擎管                                                   |
| 自动滚动位置                              | local                                  | UI 细节                                                  |

### 修订要求

1. design.md §7.2 / §11.2 加一节"state ownership 清单"，按上表格式列出所有 state
2. §11.3 删除"包内 storage"相关描述
3. §8.6 明确 `useConversation` 是**host helper**（不是渲染器内部用），导出位置应该在包的"host utilities"分组下，不与渲染器混在一起

---

## INV-5：契约边界 —— **PASS（小瑕疵）**

### 合规项 ✓

- 所有渲染器签名 `(props: RendererComponentProps<XxxSchema>) => RendererRenderOutput`
- §18.2 数据读自 `props.props/meta/regions/events/helpers`
- §18.3 响应式读走 `useScopeSelector`
- §11 Layer A "AiChatProvider 是渲染器内部 Context，与 flux 标准 hooks 不冲突"
- §18.9 不引入新 RendererDefinition 字段 / 新 field kind

### 小瑕疵

**瑕疵 1：`useMessage` / `useConversation` 公开导出的定位**

§6.1 `export { useMessage } from './adapters/use-message.js'` —— 让 host 能用。但这两个 hook 的定位需要明确：

- 选项 A：**仅内部用**（只 ai-chat 渲染器内部用）→ 从 index.ts 移除导出
- 选项 B：**host helper**（host 应用组装时可用，类似 flux-react 的 hooks）→ 保留导出，但在文档中明确"host helper，非渲染器内 API"

**建议选项 B**：因为 host 可能需要在 `xui:imports` 的 module factory 里组装 connector + engine，需要这些 hook。但 design.md 必须明确分组（例如 index.ts 注释 `// Host utilities — not for use inside renderers`）。

### 修订要求

design.md §6.1 加注释明确 host utilities 与 renderer API 的分组。

---

## Checklist A-G 详细勾选

### A. IO 边界 —— **大面积 FAIL**

- [ ] **A1** 列出组件所有外部 IO —— **未做**（本审计补做，见 INV-1 表）
- [ ] **A2** 每个 IO 都已归位 —— **FAIL**（fetch/SSE/localStorage/IndexedDB 未归位）
- [ ] **A3** 渲染器代码内没有直接调用 fetch/WebSocket/EventSource/localStorage/IndexedDB —— **FAIL**
- [ ] **A4** 没有硬编码 API key / baseURL / endpoint / model name —— **FAIL**（`OpenAICompatibleConfig.baseURL/apiKey`）
- [ ] **A5** 新 IO 类型按 INV-2 走评审或退化为 import —— **未做**

### B. 复用边界 —— **PARTIAL**

- [x] B1 表单走 FormRuntime（P0 不接 form owner）✓
- [ ] **B2** 数据请求走 ajax / data-source —— **FAIL**（自带 provider）
- [x] B3 弹框走 dialog / drawer ✓
- [x] B4 业务能力走 xui:imports ✓
- [x] B5 UI 走 @nop-chaos/ui ✓
- [x] B6 表达式走 FormulaCompiler ✓
- [x] B7 布局走 page/container/flex/grid/panel ✓

### C. 内部 state 边界 —— **PARTIAL**

- [ ] **C1** 列出所有 state + ownership —— **部分做了但矛盾**（见 INV-4 矛盾 2）
- [x] C2 域内部 state 不进 scope ✓
- [x] C3 高频更新不写 scope ✓
- [x] C4 env 引用变化不重建内部 state ✓
- [ ] **C5** projection 通道选择 —— P1/P2 规划了但未细化
- [x] C6 复杂内部 state 参考 flow-designer-core ✓（§6 src/engine/ 结构对齐）

### D. 契约边界 —— **PASS**

- [x] D1 渲染器签名标准 ✓
- [x] D2 数据从 props.\* 读 ✓
- [x] D3 响应式读走 selector hooks ✓
- [x] D4 render 期无 scope.get / 无 side effect ✓
- [x] D5 不发明平行协议 ✓
- [x] D6 不直接访问 store ✓

### E. 扩展点边界 —— **PASS**

- [x] E1 region / value-or-region ✓
- [x] E2 event + ActionSchema ✓
- [ ] **E3** reaction —— design.md 没明确提（但有 events 和 scope 反应式覆盖大部分场景）→ **建议补充说明 reaction 的适用场景**
- [x] E4 xui:imports ✓
- [x] E5 不塞实现细节字段 ✓

### F. 样式边界 —— **PASS**

- [x] F1 nop-ai-\* marker ✓
- [x] F2 data-slot 无 BEM ✓
- [x] F3 data-\* presence-only ✓
- [x] F4 Layout vs Widget 二分清晰 ✓
- [x] F5 不引入新 token 命名空间 ✓
- [x] F6 cn() 用法 ✓

### G. 包结构 —— **PASS**

- [x] G1-G9 全部合规（package.json / tsconfig / vitest / alias / project reference / styles import / playground 注册 / 单一入口 / .js 后缀）

---

## 例外与未决项

### 必须解决（阻塞 design.md 通过审计）

1. **【DECISION-1】** SSE / 流式 IO 走 INV-2 的 A/B/C 哪一档？（推荐 C：评审扩 env）
2. **【DECISION-2】** WebSocket 长连接走 A/B/C 哪一档？（推荐 C：同上）
3. **【DECISION-3】** 本地持久化走 A/B/C 哪一档？（推荐 B：import 注入）
4. **【FIX-1】** 删除 `src/providers/`、`src/sse/`、`src/storage/` 下的具体实现
5. **【FIX-2】** 引入 `AiConnector` 接口（替代 `AiResponseProvider`），命名更准确
6. **【FIX-3】** 统一 `conversations` 归属（建议 scope-owned）
7. **【FIX-4】** 补充 state ownership 清单表
8. **【FIX-5】** index.ts 分组（renderers / host utilities / types）

### 待评审（不阻塞 design.md 通过，但需在 P1 前裁定）

9. **【REVIEW-1】** MCP SDK 依赖方式（peerDep vs host import）
10. **【REVIEW-2】** `ai-mcp-manager` 是否应留在本包（可能应作为独立包或挪到 host）
11. **【REVIEW-3】** `useMessage` / `useConversation` 作为 host helper 导出的 API 稳定性承诺

### 可选改进

12. design.md §15 测试策略应包含"`AiConnector` 接口契约测试"（让 host 实现可验证）
13. design.md 应增加"host 集成示例"章节，展示如何在 `apps/playground` 注入 mock connector / mock storage

---

## 下一步流程

按 `docs/references/new-renderer-introduction-audit.md` §INV-2 与 `docs/plans/00-plan-authoring-and-execution-guide.md`：

1. **起草评审提案**：在 `docs/discussions/` 起草 SSE / WebSocket 扩 env 的评审提案（覆盖 DECISION-1/2）
2. **修订 design.md v2**：解决所有 FIX-\* 项 + 嵌入 DECISION 结果
3. **独立复审**：design.md v2 必须由**独立 fresh session** 复审（不可由本次审计 session 复审）
4. **复审通过后**：design.md 才能进入 P0 实现阶段，按 `docs/plans/00-plan-authoring-and-execution-guide.md` 起草 P0 plan

**本审计 session 不得**：自审 design.md v2、勾选 closure gate、标记 design.md 为"通过"。
