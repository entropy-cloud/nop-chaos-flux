# Round 01 — Engine correctness & contract honesty

> 执行批次: 2026-07-23-2141-open-audit-ai · 视角: 契约考古学家 + 异常路径侦探 + 跨边界信使
> 审计对象: `packages/flux-renderers-ai/`
> 验证基线: `pnpm typecheck` PASS · `pnpm test` 274/274 PASS · `pnpm lint` clean
> 去重背景: 已读 `docs/components/flux-renderers-ai/audit.md`（设计层 INV-1..INV-5 已闭环）、`docs/references/reopened-design-decisions-and-audit-adjudications.md`（5 条裁定均不命中本轮发现）

本轮聚焦 **engine 核心、adapter 抽象、ActionScope/ComponentHandle 契约、schema↔实现一致性**。所有发现均为本执行首次记录。

---

## F1.1 [P1/确定] `MessageEngine` 没有回合串行化，`sendMessage`/`send` 可重入

- **位置**: `src/engine/create-engine.ts:148-167`（`sendMessage`/`send`/`runTurn`），对照 `clear:522`、`setMessages:128`、`regenerate:543` 都有 `isProcessing` 守卫。
- **是什么**: `sendMessage` 与 `send` 进入 `runTurn` 时**没有任何 `isProcessing` 守卫**。`clear`/`setMessages`/`regenerate` 都显式拒绝“流进行中”的调用，唯独两个发送方法没有。
- **后果**: 若在一个回合进行中再次调用 `sendMessage`（典型入口：`ai:send` action @ `ai-action-provider.ts:74`、`component:sendMessage` @ `ai-component-handle.ts:54`，或 host 直接 `engine.sendMessage`），第二次 `runTurn` 会 `createAbortController()` 并覆写 `draft.abortController`（`create-engine.ts:188`），导致：
  1. 前一回合的 `AbortController` 引用从 state 丢失，`engine.abort()` 只能取消新 controller，旧 stream 永远不被取消（孤儿流）。
  2. 两条流交错向同一个 `messages` 数组追加/提交 assistant 占位（`runOnce` 各自 `push` 占位并 `commitAssistant`），产生顺序错乱、内容串行的损坏会话。
  3. `requestState` 被两个回合互相改写。
- **为什么值得关心**: `ai-sender` 的提交按钮 `disabled={loading || ...}`（`ai-sender.tsx:98`）只挡了 UI 直发路径；但 `ai:send` / `component:sendMessage` / host 直调这三条公共 API 都没有串行化。引擎是**公开导出的 host utility**（`createMessageEngine`/`useMessage`/`useConversation`），其契约不应假设调用方一定先禁用按钮。这是会话数据完整性缺陷。
- **根因**: 设计假设“UI 串行”，但引擎/动作/组件 handle 三层都没有把串行约束内化；`clear`/`setMessages`/`regenerate` 的守卫说明作者知道 in-flight 风险，唯独漏了 send。
- **建议**: 在 `runTurn` 入口（或 `sendMessage`/`send`）加 `if (isProcessing) { abort() 或 return/reject }`；或维护单飞 promise（in-flight turn 的 promise，新调用 chained 到其后）。
- **测试缺口**: `engine/__tests__/engine.test.ts` 无任何并发/重入/双发用例（仅断言 `isProcessing===false` 收尾）。`adapters/__tests__/use-conversation.test.ts` 也未涉及。

---

## F1.2 [P1/确定] `useConversation.buildEngine` 静默丢弃 `tools`/`toolExecutor`/`maxToolRounds`

- **位置**: `src/adapters/use-conversation.ts:83-93`（`buildEngine`），类型 `createEngineOptions: Omit<UseMessageOptions,'connector'>`（line 18）。
- **是什么**: `buildEngine` 只把 `plugins`/`initialMessages`/`extraRequestParams`/`systemPrompt`/`adapter` 转发给 `createMessageEngine`，**完全遗漏** `tools`、`toolExecutor`、`maxToolRounds`（这三项在 `UseMessageOptions` 与 `CreateMessageEngineOptions` 里都存在）。
- **后果**: 任何用 `useConversation`（多会话/持久化场景）做 agentic tool-loop 的 host，其每个会话引擎都**没有 tools、没有 toolExecutor**。引擎路径 `create-engine.ts:232` 一旦遇到 `finish_reason:'tool_calls'` 就因 `!toolExecutor` 直接转 `error`（Failure Path `tool-no-executor`）。即 P2 agentic 能力在 `useConversation` 路径下**永远不可用**，且无任何告警。
- **为什么值得关心**: 这是“类型接受了、实现没转发”的典型契约漂移，编译期/测试都发现不了（见测试缺口）。
- **根因**: `buildEngine` 与 `useMessage` 的 engine 构造参数列表分叉；`useMessage`（`use-message.ts:63-75`）正确转发了全部三项，`useConversation.buildEngine` 没有对齐。
- **测试缺口**: `adapters/__tests__/use-conversation.test.ts` 对 `toolExecutor`/`tools`/`maxToolRounds` **零引用**（grep 无命中）。

---

## F1.3 [P2/很可能] `MessageStateAdapter` 接口是“假抽象”——引擎依赖 adapter 未暴露的私有字段

- **位置**: `src/engine/create-engine.ts:108,131,505,509,526,544`（共 6 处 `(adapter as unknown as { state: InternalMessageState }).state.*`）；接口定义 `src/engine/types.ts:217-224`；基类 `src/engine/state-adapter.ts:19-27`。
- **是什么**: `MessageStateAdapter` 接口的 `getState()` 只返回 `PublicMessageState`（无 `connector`/`abortController`），刻意“解耦引擎与视图层”。但引擎实际需要这两个字段，于是用 `as unknown as { state: InternalMessageState }` **穿透接口**去读 adapter 实例的 `state` 私有字段——而该字段只有 `BaseMessageStateAdapter` 子类（`BaseNativeAdapter`/`ReactMessageAdapter`）才持有。
- **后果**: 接口被导出为公共扩展点（`index.ts` Group 2/3 导出 `MessageStateAdapter`、`createReactMessageAdapter`、`createNativeMessageAdapter`），暗示 host 可以自定义 adapter（例如 Zustand-backed）。但任何**直接实现 `MessageStateAdapter` 接口**（不继承 `BaseMessageStateAdapter`）的 adapter，会让 `setConnector`/`clear`/`abort`/`abortController` 读取全部得到 `undefined` → `setConnector` 永远判定“未变化”而跳过、`abort` 永远 no-op、`clear`/`setMessages` 的 in-flight 守卫失效。即“公共扩展点”其实是**只对两个内置子类工作**。
- **为什么值得关心**: 这是“契约考古学家”视角的典型——接口签名承诺了通用性，实现只兑现了私有依赖。`contract-honesty.test.ts` 只校验 IO（无 fetch/react/tiptap）和 storage interface-only，**未校验 adapter 接口自足性**。
- **建议**: 要么把 `connector`/`abortController` 纳入 `MessageStateAdapter` 接口（或新增 `getConnector()`/`getAbortController()`），要么把 adapter 收敛为非公共的内部细节（从导出移除 `MessageStateAdapter` 类型）。当前“既导出又穿透”的中间态是最差的。
- **信心**: 很可能（6 处 cast 与接口定义已确认；运行期只在自定义 adapter 下崩坏，内置两个 adapter 不受影响）。

---

## F1.4 [P2/确定] `ai-message-list` 声明了分组契约但完全未实现

- **位置**: `src/renderers/ai-message-list.tsx:31`（`AiMessageListView` 接收 `groupStrategy`）、`:128`（renderer 把 `resolved.groupStrategy` 传入）；`src/schemas.ts:98-101`（`AiMessageListSchema.groupStrategy/dividerRole/maxGroupSize`）；`src/ai-renderer-definitions.ts:82-85`（三个字段注册为 `kind:'prop'`）。
- **是什么**: schema 声明 `groupStrategy: 'consecutive'|'divider'|'none'`、`dividerRole`、`maxGroupSize`，并在 renderer-definition 里注册为 prop 字段，renderer 还把 `groupStrategy` 透传给 view——但 `AiMessageListView` 函数体内**从未读取** `props.groupStrategy`（也不接收 `dividerRole`/`maxGroupSize`），列表永远是平铺渲染（`messages.map(...)` / 虚拟列表）。
- **后果**: schema 作者以为有“连续同角色分组 / 分隔线 / 分组上限”能力；实际无任何分组行为。设计层（design.md）若依赖该能力则下游会静默得不到。
- **根因**: 字段先于实现落地，未补实现也未从 schema 摘除。
- **建议**: 要么实现分组，要么先从 schema/definition 移除这三字段以免误导。

---

## F1.5 [P3/确定] `onError` schema 事件丢弃真实错误，只回传占位 Error

- **位置**: `src/renderers/ai-chat.tsx:186-187`。
- **是什么**: 引擎 catch 到真实 error 后，`onError` 插件钩子拿到的是原始 error（`create-engine.ts:269-271,387-389`），但 `ai-chat` 的 schema `onError` 事件回传的是 `new Error('AI request failed')`——一个固定文案占位，**真实错误信息（auth/网络/限流/解析）全部丢失**。
- **后果**: host 无法在 schema 层按错误类型分流处理（重试 vs 提示登录 vs 降级）。引擎内部错误对象已存在，却在最后一公里被替换成占位。
- **建议**: 把引擎错误（或其 message/cause）随事件 payload 传出（需扩 `onError` payload 类型并让 `runTurn`/`runOnce` 的 catch 把 error 暂存到可被 subscribe 读到的位置）。

---

## F1.6 [P3/确定] `abort()` 含一个空 recipe 的 `mutate`（死代码 + 无意义通知）

- **位置**: `src/engine/create-engine.ts:512-519`。
- **是什么**:
  ```ts
  adapter.mutate('requestState', () => {
    // requestState is updated by the stream's catch block ...
    // set it here too so synchronous abort is observable immediately.
  });
  adapter.mutate('requestState', (draft) => { draft.requestState='aborted'; ... });
  ```
  第一个 `mutate` 的 recipe **函数体为空**（只有注释），但仍触发一次 `notify('requestState')`，向所有订阅者广播一次“状态没变”的通知。紧接的第二个 `mutate` 才真正改状态。
- **后果**: 每次 abort 多一次无意义 re-render/通知；代码意图（注释）与实现（空函数体）矛盾，易误导后续维护者以为“这里有同步设置”。属于残留的死代码。
- **建议**: 删除第一个空 `mutate`。

---

## 本轮小结

6 条发现，均首次记录，不与 `reopened-design-decisions` 5 条裁定重合（裁定 1 是 field-shell wrapped action；裁定 2-5 是 surface/object-field/table/designer 的双态与汇总归属，与本轮 engine/adapter/contract 无关）。最高价值是 F1.1（回合重入）与 F1.2（tool 配置丢弃）——两者都在“测试全绿”的前提下隐藏，且都跨“公开 host utility 契约”边界。
