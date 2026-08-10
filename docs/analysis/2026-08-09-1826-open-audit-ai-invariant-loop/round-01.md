# Round 1 — engine 插件上下文 live 引用暴露（plugin write-isolation）

> 执行批次：`2026-08-09-1826-open-audit-ai-invariant-loop`（mission `ai-invariant-loop` 开放式对抗审查）
> 视角：异常路径侦探 + 契约考古学家
> 状态：已验证（运行时 probe 3/3 通过，probe 文件已删除）

## 发现 F1（P1）— plugin hook 上下文暴露 engine 内部 live 数组；按文档用法改写即静默腐蚀引擎状态

- **在哪里**：`packages/flux-renderers-ai/src/engine/create-engine.ts:572-599`（`buildContext`）、`:253-256`（onTurnStart 调用面）、`:376`（onTurnEnd 调用面）
- **是什么**：`buildContext` 在无 `systemPrompt` 时把 `requestMessages` 直接指向内部 live 数组 `adapter.getState().messages`（`:584-586`：`requestMessages = history`，而 `history = allMessages` 仅在尾占位符存在时 `slice(0,-1)`）。`onTurnStart`（runTurn 推入 incoming 消息后、占位符尚未 push，尾部不是 placeholder）与 `onTurnEnd`（轮已结束，尾部是已提交 assistant）两个时机拿到的是 **live 内部数组**；`onBeforeRequest`/`onCompletionChunk`/`onAfterRequest` 因占位符已 push 拿到的是 copy（偶然安全）。`ctx.state` 同为 live 状态对象。
- **为什么值得关心**：`engine.md §8.3` 明确把 `onTurnStart` 的典型用途记为「skill 注入 system prompt」——插件作者最自然的实现就是改写 `ctx.request.messages`。运行时 probe 证实：
  1. `onTurnStart` 的 `ctx.request.messages === engine.getState().messages`（同一引用）；
  2. 插件向其中 `push` 一条 system 消息 → 消息**永久进入引擎内部历史**（绕过 `mutate`/notify，且会进入下一次请求载荷与 autoSave 快照）；
  3. `onTurnEnd` 同样暴露 live 数组。
     引擎在其它所有出口（O-2 `getMessages` 浅隔离、Decision-A 投影 structuredClone、K-⑩ 快照面）都做引用隔离，唯独插件 ctx 是无人看管的写面——与「same family, missed method」的历史复发模式同构（登记族「plugin 生命周期」只覆盖 hook 并发/错误隔离/unregister 交错，不覆盖写面）。
- **修复建议**：`buildContext` 中对 `requestMessages` 无条件浅拷贝（或仅拷贝数组引用层），并在 engine.md §8.3 明示 ctx 只读；或至少为 `onTurnStart`/`onTurnEnd` 传入 copy。门禁候选：不变式 ⑨ 扩展「plugin ctx 只读面」或 `scanMirrorWriteSurface` 类静态规则（较难），运行时参数化成员更现实。
- **信心水平**：确定（静态 + 运行时双证实）

## 本轮排除（读过、验证后放弃）

- `structuredClone(Error)` — Error 对象可克隆，非问题。
- `applyChunk` 就地突变与 ReactMessageAdapter 快照身份——每次 chunk 都经 `commitAssistant` 提交 + notify，无陈旧读窗口（见 Round 3 的 O-2 注释漂移条目）。
- `runOnce` 内 onBeforeRequest 的 ctx 是 copy（占位符已 push），安全。
