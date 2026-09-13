# three-canvas 工业协议集成设计（v5）

> 分册：`docs/components/threejs-integration/design.md` §5 索引 | 版本 5.0（2026-09-13）
> 消费者：I3.1。契约事实：`packages/flux-core/src/types/renderer-api.ts:136-167`；host 实现：`apps/playground/src/env/socket-impl.ts`。

## 1. 设计原则

1. **只消费 `RendererEnv.openSocket` 标准契约**，不硬编码 Socket.IO 或任何具体协议栈；协议差异（Modbus/OPC-UA 网关、FUXA）由 URL 与消息 schema 承载。
2. **勘误声明**：roadmap 旧表述「复用 scada 的 socket 数据桥接模式」经 I0.1 核对不成立——`flux-renderers-industrial` 包内无 `openSocket` 调用；scada 可复用的是**数据合帧模式**（PointStore/RefreshPipeline → 本设计的 pendingUpdates/flush）。socket 侧消费本册 §2 契约 + 自建 §3 重连。
3. 能力缺失降级：`env.openSocket` 未实现时适配器进入 `unavailable` 态并一次性上报，不轮询重试。

## 2. openSocket 消费契约（live 核对）

```typescript
// renderer-api.ts:136-167 要点
openSocket?: (url: string, options?: WebSocketOptions, ctx?: ApiRequestContext) => WebSocketConnection;
// - 同步返回（非 Promise，禁止 await）
// - 使用前必须 capability check：if (!env.openSocket) { ...降级... }
// - 事件为属性赋值风格：socket.onmessage = fn / onclose / onerror / onopen
// - WebSocketConnection: { readyState, send(data), close(code?, reason?), on* }
// - options.signal abort → host 实现（socket-impl.ts:114-121）触发 close()
```

消息模型（three-canvas ↔ 工业网关）：

```jsonc
// 发送（订阅）
{ "type": "subscribe", "tags": ["VALVE_001.position"], "polling": 1000 }
// 接收（数据帧）
{ "type": "data", "payload": { "VALVE_001.position": 42.5 } }
```

## 3. ReconnectionManager

```typescript
export interface ReconnectionManagerConfig {
  maxRetries: number; // 默认 10
  baseDelay: number; // ms，默认 500（保证「检测断开→首试启动 <1s」指标在 ±25% 抖动下成立）
  maxDelay: number; // ms，默认 30000
  onReconnect: () => void;
  timer?: (cb: () => void, ms: number) => unknown; // 可注入（测试）
}
```

- `scheduleReconnect()`：指数退避 `baseDelay * 2^retryCount` + ±25% 随机抖动（防惊群），clamp 到 `maxDelay`；超过 `maxRetries` 给出并上报 `reconnect-give-up`。
- `cancel()`：置 cancelled + 清 timer（幂等）。
- `reset()`：连接成功（`onopen`）后调用，retryCount 归零、恢复可调度。
- 可测性：timer 注入使退避序列可用 vitest fake timers 断言（I3.1「必须自动化」proof）。

## 4. IndustrialAdapter

```typescript
export interface IndustrialTagConfig {
  id: string; // 连接标识
  url: string; // ws(s) 网关地址
  tags: Array<{ name: string; address: string; type: 'bool' | 'int16' | 'float32' }>;
  polling?: number; // ms，交由网关侧轮询
}

export class IndustrialAdapter {
  constructor(config: {
    env: RendererEnv;
    scope: ScopeRef;
    onError?: (code: string, message: string, error?: unknown) => void;
  });
  connect(cfg: IndustrialTagConfig): void; // 同 id 重入：先 disconnect 再建连
  disconnect(id: string): void;
  disconnectAll(): void; // 组件卸载调用
}
```

行为契约：

| 阶段             | 行为                                                                                                                                                                                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| capability check | `!env.openSocket` → `unavailable` + 上报 `socket-unavailable`（一次），不重试                                                                                                                                                                          |
| 建连             | `env.openSocket(url)` 同步返回（此刻 readyState 为 `connecting`，不可 send）；`onopen` → `reconnection.reset()` → 发送 subscribe 帧                                                                                                                    |
| 数据帧           | `onmessage` 属性赋值；`JSON.parse` 失败 → 上报 `socket-message-parse`（去重）；`type === 'data'` → 按 `address → tag` 映射做类型转换（bool→Boolean、int16→parseInt、float32→parseFloat，NaN 丢弃）→ `scope.update(\`dataSources.${tag.name}\`, value)` |
| 断开             | `onclose` → `scheduleReconnect()`（主动 disconnect 除外——unsub 顺序：先置状态再 close，避免主动关闭触发重连）                                                                                                                                          |
| 错误             | `onerror` → 上报 + `scheduleReconnect()`                                                                                                                                                                                                               |
| 卸载             | `disconnectAll()`：close + `cancel()` 重连                                                                                                                                                                                                             |

**scope 写入路径**：tag 值写入 `dataSources.<name>` 成员；three-canvas 绑定表达式以 `${dataSources.VALVE_001.position}` 消费——socket 数据与页面数据在 scope 层汇合，绑定桥接无需感知数据来源（design-data-binding.md §4 数据流起点）。

## 5. 失败路径表

| 触发                  | 行为                               | 可重试                 | 用户可见                                 |
| --------------------- | ---------------------------------- | ---------------------- | ---------------------------------------- |
| `env.openSocket` 缺失 | `unavailable` 态，上报一次         | 否                     | onError 诊断（`socket-unavailable`）     |
| 连接被拒/网络断       | 指数退避重连，≤ maxRetries         | 是                     | onError（`socket-connect-failed`，去重） |
| 重连耗尽              | 停止重试，上报 `reconnect-give-up` | 否（重挂载组件可重来） | onError                                  |
| 数据帧解析失败        | 丢弃该帧，上报（去重）             | 是（后续帧）           | onError 诊断                             |
| tag 类型转换 NaN      | 丢弃该值，不写 scope               | 是                     | 无（静默容错）                           |

## 6. 与 v4 差异清单

| #   | v4                               | v5                                                | 依据                                                        |
| --- | -------------------------------- | ------------------------------------------------- | ----------------------------------------------------------- |
| 1   | `connectWebSocket` 内联重连      | Manager 独立类 + 可注入 timer                     | 可测性（I3.1 proof 要求）                                   |
| 2   | `protocols: ['工业协议']` 魔法值 | 移除；协议语义走 URL/消息 schema                  | 契约（WebSocketOptions.protocols 为子协议协商，非业务标签） |
| 3   | 无主动关闭/重连竞态处理          | disconnect 先置状态再 close                       | 竞态防御                                                    |
| 4   | 无 capability check 降级态       | `unavailable` + 一次性上报                        | renderer-api.ts:186-188                                     |
| 5   | 错误仅 console                   | onError 诊断通道（code/message/error 三参，去重） | D6 对齐                                                     |
