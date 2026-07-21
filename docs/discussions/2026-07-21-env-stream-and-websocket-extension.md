# 扩充 RendererEnv：stream 与 openSocket 通用连接能力

> **类型**：INV-2 评审提案（按 `docs/references/new-renderer-introduction-audit.md` §INV-2 C 档流程）
> **触发场景**：`flux-renderers-ai` 包设计（`docs/components/flux-renderers-ai/audit.md` DECISION-1/2/3）
> **关联审计**：`docs/components/flux-renderers-ai/audit.md`

## 第 1 轮

### 用户原始表述

> flux 的设计要求就是所有的外部 io 必须通过 env 来抽象。新 IO 类型经过评审后可以扩充 env。
>
> streamFetcher 可以扩充，但必须是基本的连接能力，与具体的 AI 消息无关，也就是它后续可以承载其他的流式数据推送。websocket 也扩充。本地持久化可以 import 注入。

### AI 复述

用户对 `flux-renderers-ai` 审计（`audit.md`）提出的 3 个 DECISION 给出明确裁定：

| IO 类型                                | 裁定                    | 路径                                       |
| -------------------------------------- | ----------------------- | ------------------------------------------ |
| HTTP 流式（SSE / chunked）             | **扩 env（C 档）**      | 走 INV-2 评审流程，扩充 `RendererEnv`      |
| WebSocket 长连接                       | **扩 env（C 档）**      | 同上                                       |
| 本地持久化（localStorage / IndexedDB） | **import 注入（B 档）** | 不扩 env，host 通过 `xui:imports` 提供实现 |

**强约束**：stream 与 openSocket 必须是**通用连接能力**——

- 与 AI 消息格式无关（不出现 `ChatMessage` / `tool_calls` / `reasoning_content` 等字段）
- 后续可承载其他流式场景：实时日志推送、服务器事件通知、IM 客服、股票行情、协作编辑等
- 仅提供"建立连接 + 流式收发"的基本语义，协议解析（SSE event-splitting / JSON-lines / NDJSON / 自定义协议）由调用方处理

### AI 分析

#### 1. 按 INV-2 C 档评审标准 5 条逐项核对

| 评审标准                         | stream | openSocket | 说明                                                                                                          |
| -------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------- |
| ✅ 通用性（3+ 不相关组件都需要） | ✓      | ✓          | AI 对话、实时日志、服务器推送通知、IM、行情、协作编辑均需                                                     |
| ✅ 属于 host transport boundary  | ✓      | ✓          | 系统调用，不是业务能力                                                                                        |
| ✅ 不能被 importLoader 优雅覆盖  | ✓      | ✓          | import 适合"业务连接器"（带鉴权/路由/SDK）；env 适合"基础连接"                                                |
| ✅ 跨多 host 可统一抽象          | ✓      | ✓          | web（fetch streaming + WebSocket）/ SSR（node-fetch + ws）/ test（mock）都可实现                              |
| ✅ 与现有 env 能力强耦合         | ✓      | ✓          | `stream` 与 `fetcher` 是同一 HTTP 抽象的"一次性"vs"流式"两 mode；`openSocket` 是与 `fetcher` 并列的另一类连接 |

**两项均通过评审**，符合 C 档扩充条件。

#### 2. 接口形状提议（核心：抽象层次）

**关键设计原则**：

- `stream` 返回**原始字节流**（`AsyncGenerator<Uint8Array>` 或等价），**不**做协议解析。SSE / JSON-lines / NDJSON / 自定义协议由调用方在渲染器或 host helper 中处理。
- `openSocket` 返回**类 WebSocket 接口**（send/onmessage/close），不绑死浏览器 API。
- 两者都通过 `ctx.signal`（`AbortSignal`）统一 abort 语义，与 `fetcher` 一致。
- 两者都通过 `ApiResponse` envelope 报告连接级元信息（status / headers / 错误码），与 `fetcher` 一致。

**`env.stream` 提议形状**：

```ts
// packages/flux-core/src/types/renderer-api.ts
export interface StreamFetcher {
  (api: ExecutableApiRequest, ctx: ApiRequestContext): Promise<StreamFetchResult>;
}

export interface StreamFetchResult {
  /** 连接级元信息（status / headers / 错误码），与 fetcher 的 ApiResponse 同构（不含 data 字段） */
  response: Omit<ApiResponse, 'data'>;
  /** 原始字节流的异步迭代；连接关闭或 abort 时迭代结束 */
  chunks: AsyncGenerator<Uint8Array>;
}
```

调用方在渲染器或 host helper 中处理协议解析（SSE 等作为包内 utility 或 host helper，**不进 env**）。

**`env.openSocket` 提议形状**：

```ts
export interface WebSocketOpener {
  (url: string, options?: WebSocketOptions, ctx?: ApiRequestContext): WebSocketConnection;
}

export interface WebSocketOptions {
  protocols?: string | string[];
  headers?: Record<string, string>;
  binaryType?: 'blob' | 'arraybuffer';
  signal?: AbortSignal;
}

export interface WebSocketConnection {
  readonly readyState: 'connecting' | 'open' | 'closing' | 'closed';
  send(data: string | ArrayBufferLike): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: { type: 'open' }) => void) | null;
  onmessage: ((event: { type: 'message'; data: string | ArrayBufferLike }) => void) | null;
  onclose: ((event: { type: 'close'; code: number; reason: string }) => void) | null;
  onerror: ((event: { type: 'error'; error: unknown }) => void) | null;
}
```

接口形状与浏览器原生 WebSocket 接近，便于 host 直接代理；但用结构化 event 替代 `Event` 对象，避免 DOM 类型耦合。

#### 3. `RendererEnv` 扩充

```ts
// packages/flux-core/src/types/renderer-api.ts
export interface RendererEnv extends ExpressionExecutionEnv {
  fetcher: ApiFetcher;
  /** 流式响应（SSE / chunked / NDJSON / 自定义协议）。可选；host 不提供时调用方应回退到 fetcher + 轮询 */
  stream?: StreamFetcher;
  /** WebSocket 长连接。可选；host 不提供时调用方应回退到 fetcher + 轮询或显示错误 */
  openSocket?: WebSocketOpener;
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  // ... 其余字段不变
}
```

两个字段都 **optional**，不破坏现有 host。调用方使用前必须 capability check（`if (env.stream) ...`）。

#### 4. 实现责任分布

| 层                               | 责任                                                                          |
| -------------------------------- | ----------------------------------------------------------------------------- |
| `packages/flux-core`             | 接口定义（`StreamFetcher` / `WebSocketOpener` / 相关类型）                    |
| `packages/flux-runtime`          | 可能新增 built-in action（`stream` / `openSocket`）—— 待 DECISION-ACTION 裁定 |
| `apps/playground`                | 默认实现（基于浏览器 `fetch` ReadableStream + 原生 `WebSocket`）              |
| 其他 host（如 SSR / test）       | 各自提供实现，或保持 undefined（调用方降级）                                  |
| 调用方（如 `flux-renderers-ai`） | 在 engine/connector 层消费 stream + 实现 SSE 解析（包内 utility，不进 env）   |

#### 5. 与 `monitor` 的关系

`env.monitor.onApiRequest(payload)` 当前覆盖 `fetcher` 调用。扩充提案要求：

- `stream` 调用同样经 `monitor.onApiRequest`（连接建立时）
- 新增 `monitor.onStreamChunk?(payload: { api; chunkIndex; bytes; interactionId? })` 可选项（chunk 级监控，默认不启用避免性能影响）
- `openSocket` 新增 `monitor.onSocketOpen?` / `onSocketClose?` 可选项

监控细节作为可选项，不阻塞本次扩充。

#### 6. 命名说明

- `stream`：动词性，与 `fetcher` 名词性略不对称，但读起来自然（`env.stream(api)` vs `env.fetcher(api)`）。备选 `streamFetcher` / `fetchStream` / `streamingFetcher`，倾向最短的 `stream`。
- `openSocket`：动词性，明确"建立连接"动作。备选 `websocket` / `openWebSocket` / `socketOpener`。倾向 `openSocket`（短且通用，不绑死"WebSocket"实现，未来若出现 better transport 仍可用一名）。

### 待澄清问题

1. **接口形状细节**：
   - 1.1 `stream` 的 `chunks` 用 `AsyncGenerator<Uint8Array>` 还是 `ReadableStream<Uint8Array>`？前者更符合 JS 异步迭代习惯，后者更接近 fetch 原生；倾向 AsyncGenerator。
   - 1.2 `openSocket` 的 `onmessage` 等用 callback 还是 AsyncGenerator（`messages: AsyncGenerator`）？callback 接近浏览器原生，AsyncGenerator 更易组合；倾向 callback（与原生一致 + 性能好）。

2. **是否需要 built-in action**（`stream` / `openSocket`）：
   - 2.1 是否在 `flux-action-core` 注册 `stream` action（类比 `ajax`），让 schema 作者能直接 `{ action: 'stream', args: { api: {...}, targetPath: 'logs' } }` 把流式数据写进 scope？
   - 2.2 还是只暴露 env 字段，由渲染器/connector 自行消费？
   - 倾向：本次只扩 env，built-in action 留作后续提案（避免一次性扩太大）。

3. **abort 语义**：
   - 3.1 `stream` 通过 `ctx.signal`（已有）统一，abort 时 chunks generator 自然结束（return）—— 确认这种语义可接受？
   - 3.2 `openSocket` 通过 `options.signal`（新增），abort 时 `close()` 被调用，触发 `onclose` —— 确认？

4. **错误报告**：
   - 4.1 `stream` 的 `response` 字段含 `status / code / msg / errors`，与 `fetcher` 一致。连接级错误（DNS 失败 / 401）通过 response 报告；chunk 解析错误由调用方处理 —— 确认？
   - 4.2 `openSocket` 的连接级错误通过 `onerror` + `onclose(code, reason)` 报告，**不**经 ApiResponse envelope —— 确认？

5. **capability check 约定**：
   - 5.1 渲染器使用 `env.stream` 前必须 `if (!env.stream) { fallback or error }`，是否要在 flux-react 加一个 `useEnvCapability(name)` hook 标准化？
   - 倾向：本次不加，由调用方直接 `if` 判断。

6. **首版 host 实现**：
   - 6.1 `apps/playground` 是否本次就提供默认实现？还是先只扩接口、实现放后续？
   - 倾向：本次同时提供 playground 默认实现（基于浏览器原生），让 AI 组件能立即跑通。

### 修正说明

无（第 1 轮）。

---

## 第 2 轮

### 用户回答（Q1）

> streamFetcher 返回自动 chunk，并自动切分好。根据传入的参数控制把返回值都处理好。类似 Ajax 调用都自动处理好。

### AI 整理

用户对 Q1.1 给出关键裁定：**`streamFetcher` 是高层次抽象，不是低层字节管道**。

设计要求：

1. **自动 chunk 切分**：协议解析（SSE event-splitting / NDJSON line splitting / JSON-lines / 自定义）在 streamFetcher 内部完成，调用方不感知字节流
2. **参数控制返回值**：chunk 的输出类型由请求参数指定（类似 `fetcher` 的 `responseType`）
3. **类比 fetcher**：与 `env.fetcher` 的"自动处理 URL/body/解析"哲学一致

这意味着 v1 提案中"`chunks: AsyncGenerator<Uint8Array>`"是**错误抽象层次**——那只是底层连接能力，不是"基本连接能力 + 自动处理"。正确抽象应该让调用方拿到"已切分、已解析"的 chunk。

### AI 修订提案：`streamFetcher` 接口（v2）

```ts
// packages/flux-core/src/types/renderer-api.ts

/** 流式协议类型；决定 streamFetcher 如何切分字节流为 chunk */
export type StreamProtocol =
  | 'sse' // Server-Sent Events：按 \n\n 切 event，提取 data: 行（兼容 OpenAI/Anthropic 等）
  | 'ndjson' // Newline-Delimited JSON：按 \n 切行
  | 'json-lines' // 同 ndjson（别名，语义等价）
  | 'text' // 不切分，按网络包到达分块（每个 chunk 是一段文本）
  | 'raw'; // 不解析，原样返回 Uint8Array（最低层，等价 v1 提案）

/** chunk 数据类型；决定 streamFetcher 如何反序列化每个 chunk */
export type StreamChunkType =
  | 'json' // JSON.parse(chunk)；返回 object
  | 'text' // chunk.toString()；返回 string
  | 'blob' // 返回 Blob
  | 'arraybuffer'; // 返回 ArrayBuffer

/** 流式请求：扩展 ExecutableApiRequest，复用 url/method/headers/body 等字段 */
export type StreamApiRequest = ExecutableApiRequest & {
  /** 流式协议，默认 'sse' */
  streamProtocol?: StreamProtocol;
  /** chunk 数据类型，默认 'json'（与 fetcher 的 responseType 默认一致） */
  streamChunkType?: StreamChunkType;
};

/** 流式响应：response 含连接级元信息，chunks 是已切分+已解析的 chunk 流 */
export interface StreamFetchResult<T = unknown> {
  /** 连接级元信息（与 ApiResponse 同构，不含 data 字段；data 通过 chunks 流提供） */
  response: Omit<ApiResponse, 'data'>;
  /** 已切分 + 已解析的 chunk 异步迭代；abort 或连接关闭时迭代结束 */
  chunks: AsyncGenerator<T>;
}

/** streamFetcher 主接口：与 fetcher 同构，仅返回值不同 */
export type StreamFetcher = <T = unknown>(
  api: StreamApiRequest,
  ctx: ApiRequestContext,
) => Promise<StreamFetchResult<T>>;
```

#### 自动处理矩阵

| `streamProtocol`            | 如何切分                                             | `streamChunkType: 'json'` 时返回                                      |
| --------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| `'sse'`（默认）             | 按 `\n\n` 切 event，提取 `data:` 行（处理 `[DONE]`） | `JSON.parse(data)`                                                    |
| `'ndjson'` / `'json-lines'` | 按 `\n` 切行                                         | `JSON.parse(line)`                                                    |
| `'text'`                    | 按网络包到达分块（每个 chunk 一段文本）              | chunk 本身即 string                                                   |
| `'raw'`                     | 不切分                                               | 不解析，返回 `Uint8Array`（与 `streamChunkType: 'arraybuffer'` 等价） |

#### 与 fetcher 的对照

| 维度          | `env.fetcher`                                                           | `env.stream`                                                                                 |
| ------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 请求          | `ExecutableApiRequest`（url/method/headers/body/dataType/responseType） | `StreamApiRequest` = `ExecutableApiRequest` + `streamProtocol` + `streamChunkType`           |
| 响应 envelope | `ApiResponse<T>`（含 data）                                             | `StreamFetchResult<T>` = `{ response: Omit<ApiResponse,'data'>, chunks: AsyncGenerator<T> }` |
| 自动处理      | URL 拼接 / body 序列化 / response 解析 / envelope 封装                  | URL 拼接 / body 序列化 / **chunk 切分** / **chunk 解析** / envelope 封装                     |
| abort         | `ctx.signal`                                                            | `ctx.signal`（abort 时 chunks 迭代结束）                                                     |
| 错误          | `response.status` / `response.code` / `response.msg`                    | 同                                                                                           |

#### 典型调用示例

```ts
// OpenAI / DeepSeek 流式对话
const { response, chunks } = await env.stream<OpenAIChatCompletionChunk>(
  {
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: { model: 'gpt-4', messages, stream: true },
    streamProtocol: 'sse', // 默认；OpenAI 用 SSE
    streamChunkType: 'json', // 默认；data 自动 JSON.parse
  },
  { scope, env, signal },
);
for await (const chunk of chunks) {
  // chunk 已是 { id, choices: [{ delta: { content: '...' } }] }
  // 调用方无需处理 SSE 切分、无需 JSON.parse
}

// 实时日志推送（NDJSON）
const { chunks } = await env.stream<LogEntry>(
  { url: '/api/logs/stream', streamProtocol: 'ndjson', streamChunkType: 'json' },
  ctx,
);

// 大文件下载分块（不解析）
const { chunks } = await env.stream<Uint8Array>(
  { url: '/api/large-file', streamProtocol: 'raw' },
  ctx,
);
```

### 对 `flux-renderers-ai` 的影响（关键简化）

由于 streamFetcher **自动处理 SSE 切分 + JSON 解析**，`flux-renderers-ai` 的设计进一步简化：

1. **删除** `src/sse/sse-stream-to-generator.ts`（不再需要 SSE 解析模块——协议解析已下沉到 env.stream 内部）
2. **简化** `src/adapters/ai-connector-factory.ts`：
   ```ts
   export function createStreamBasedAiConnector(options: {
     env: RendererEnv;
     buildRequest: (req: AiConnectorRequest) => StreamApiRequest;
     // parseChunk 不再需要
   }): AiConnector {
     return {
       async stream(req) {
         const api = options.buildRequest(req);
         // streamFetcher 自动 SSE 切分 + JSON 解析
         const { response, chunks } = await options.env.stream(
           { ...api, streamProtocol: 'sse', streamChunkType: 'json' },
           { scope: dummyScope, env: options.env, signal: req.signal },
         );
         if (response.status !== 200) {
           throw new Error(`AI connector failed: ${response.status} ${response.msg ?? ''}`);
         }
         // chunks 已是 OpenAI ChatCompletionChunk 结构，转换为 AiConnectorChunk
         return (async function* () {
           for await (const chunk of chunks) {
             yield toAiConnectorChunk(chunk);
           }
         })();
       },
     };
   }
   ```
3. **简化** `AiConnectorChunk`：直接映射 streamFetcher 输出的 OpenAI chunk 结构，无需重新定义协议层

### 待澄清问题（第 2 轮）

1. **协议参数命名**：
   - 1.1 用 `streamProtocol` + `streamChunkType` 还是其他命名？备选：`stream.mode` / `stream.parser` / `protocol`+`type`。倾向现有命名（明确且与 `responseType` 对仗）。

2. **协议覆盖面**：
   - 2.1 首版支持哪些 `streamProtocol`？建议：`sse` / `ndjson` / `text` / `raw` 四种（覆盖 95% 场景）。
   - 2.2 自定义协议（如 protobuf 流、MessagePack 流）如何扩展？是否在 `streamProtocol: 'custom'` + `chunkParser` 回调？倾向：本次不支持，需要时再加。

3. **chunk 解析失败的错误处理**：
   - 3.1 当 `streamChunkType: 'json'` 但某个 chunk 不是合法 JSON（如流式截断）时，streamFetcher 是跳过、报错、还是 yield 一个 `{ error }` 对象？倾向：抛 `StreamChunkParseError`，由调用方在 `for await` 中 `try/catch` 处理。

4. **`[DONE]` 信号处理（SSE 特有）**：
   - 4.1 OpenAI SSE 用 `data: [DONE]` 标记流结束。streamFetcher 是否自动识别并结束迭代（不 yield `[DONE]` 本身）？倾向：是，自动处理。

5. **default 值确认**：
   - 5.1 `streamProtocol` 默认 `'sse'`、`streamChunkType` 默认 `'json'` —— 确认？
   - 5.2 理由：SSE 是流式推送最常见协议（OpenAI/Anthropic/服务器事件），JSON 是最常见 chunk 格式；默认组合让"AI 对话"场景零配置。

### 未回答的原 Q2-Q6（继续保留）

第 1 轮的 Q2（built-in action）、Q3（abort 语义细节）、Q4（错误报告细节）、Q5（capability check hook）、Q6（playground 默认实现）继续作为待澄清问题。

---

## 第 3 轮

### 用户裁定

> 按照你认为的推荐执行。先完成设计文档。暂时不用 plan。

### AI 整理（采用所有推荐倾向作为最终裁定）

第 1 轮与第 2 轮的所有推荐倾向作为正式裁定落地：

| 问题                                    | 最终裁定                                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Q1.1（第 1 轮）** chunks 形态         | AsyncGenerator（已第 2 轮重新设计）                                                              |
| **Q1.2（第 1 轮）** openSocket 消息形式 | callback（`onmessage` / `onopen` / `onclose` / `onerror`）                                       |
| **Q2（第 1 轮）** built-in action       | 本次**只扩 env**，built-in `stream` / `openSocket` action 留作后续提案                           |
| **Q3.1（第 1 轮）** stream abort        | 通过 `ctx.signal`（已有）；abort 时 chunks 迭代自然结束（generator return）                      |
| **Q3.2（第 1 轮）** openSocket abort    | 通过 `options.signal`（新增）；abort 时调用 `close()`，触发 `onclose`                            |
| **Q4.1（第 1 轮）** stream 连接级错误   | `response.status / code / msg / errors`，与 fetcher 一致                                         |
| **Q4.2（第 1 轮）** openSocket 错误     | 通过 `onerror` + `onclose(code, reason)`，不经 ApiResponse envelope                              |
| **Q5.1（第 1 轮）** capability hook     | 本次**不加** `useEnvCapability` hook；调用方直接 `if (env.stream)` 判断                          |
| **Q6.1（第 1 轮）** playground 默认实现 | 本次**同步落地**（基于浏览器原生 fetch streaming + WebSocket）                                   |
| **Q1.1（第 2 轮）** 协议参数命名        | `streamProtocol` + `streamChunkType`（与 `responseType` 对仗）                                   |
| **Q2.1（第 2 轮）** 首版协议覆盖        | `sse` / `ndjson` / `json-lines` / `text` / `raw` 五种（`json-lines` 作为 `ndjson` 别名等价处理） |
| **Q2.2（第 2 轮）** 自定义协议          | 本次**不支持**；未来如需 `streamProtocol: 'custom' + chunkParser` 再提案                         |
| **Q3.1（第 2 轮）** chunk 解析失败      | **抛 `StreamChunkParseError`**（含 `chunkIndex` / `rawChunk` / `cause`），由调用方 `try/catch`   |
| **Q4.1（第 2 轮）** SSE `[DONE]`        | 自动识别并结束迭代，**不** yield `[DONE]` 本身                                                   |
| **Q5.1（第 2 轮）** 默认值              | `streamProtocol: 'sse'` + `streamChunkType: 'json'`（AI 对话场景零配置）                         |

### 最终接口定义（v3，最终版）

```ts
// packages/flux-core/src/types/renderer-api.ts

// ============================================
// env.stream —— 流式响应（SSE / NDJSON / 自定义协议自动切分+解析）
// ============================================

export type StreamProtocol =
  | 'sse' // Server-Sent Events：按 \n\n 切 event，提取 data: 行；自动处理 [DONE]
  | 'ndjson' // Newline-Delimited JSON：按 \n 切行
  | 'json-lines' // ndjson 别名（语义等价）
  | 'text' // 按网络包到达分块
  | 'raw'; // 不解析，原样返回 Uint8Array

export type StreamChunkType =
  | 'json' // JSON.parse(chunk)；返回 object
  | 'text' // String(chunk)；返回 string
  | 'blob' // 返回 Blob
  | 'arraybuffer'; // 返回 ArrayBuffer

export type StreamApiRequest = ExecutableApiRequest & {
  streamProtocol?: StreamProtocol; // 默认 'sse'
  streamChunkType?: StreamChunkType; // 默认 'json'
};

export interface StreamFetchResult<T = unknown> {
  response: Omit<ApiResponse, 'data'>;
  chunks: AsyncGenerator<T>;
}

export type StreamFetcher = <T = unknown>(
  api: StreamApiRequest,
  ctx: ApiRequestContext,
) => Promise<StreamFetchResult<T>>;

export interface StreamChunkParseError extends Error {
  chunkIndex: number;
  rawChunk: string;
  cause?: unknown;
}

// ============================================
// env.openSocket —— WebSocket 长连接
// ============================================

export interface WebSocketOpener {
  (url: string, options?: WebSocketOptions, ctx?: ApiRequestContext): WebSocketConnection;
}

export interface WebSocketOptions {
  protocols?: string | string[];
  headers?: Record<string, string>;
  binaryType?: 'blob' | 'arraybuffer';
  signal?: AbortSignal;
}

export interface WebSocketConnection {
  readonly readyState: 'connecting' | 'open' | 'closing' | 'closed';
  send(data: string | ArrayBufferLike): void;
  close(code?: number, reason?: string): void;
  onopen: ((event: { type: 'open' }) => void) | null;
  onmessage: ((event: { type: 'message'; data: string | ArrayBufferLike }) => void) | null;
  onclose: ((event: { type: 'close'; code: number; reason: string }) => void) | null;
  onerror: ((event: { type: 'error'; error: unknown }) => void) | null;
}

// ============================================
// RendererEnv 扩充（两个字段都 optional，向后兼容）
// ============================================

export interface RendererEnv extends ExpressionExecutionEnv {
  fetcher: ApiFetcher;
  /** 流式响应（SSE / NDJSON / 自定义协议自动切分+解析）。可选；host 不提供时调用方应回退到 fetcher + 轮询 */
  stream?: StreamFetcher;
  /** WebSocket 长连接。可选；host 不提供时调用方应回退或显示错误 */
  openSocket?: WebSocketOpener;
  notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;
  // ... 其余字段不变
}
```

### host 实现责任

| 层                      | 责任                                                                                                                                                                                | 落地阶段        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| `packages/flux-core`    | 接口定义（`StreamFetcher` / `StreamChunkParseError` / `WebSocketOpener` / `WebSocketConnection` / `StreamProtocol` / `StreamChunkType` / `StreamApiRequest` / `StreamFetchResult`） | P-1（env 扩充） |
| `apps/playground`       | 默认实现：`stream` 基于 `fetch` + `ReadableStream` + TextDecoder；`openSocket` 基于浏览器原生 `WebSocket` 代理                                                                      | P-1             |
| `packages/flux-runtime` | **不**新增 built-in action（本次仅扩 env）                                                                                                                                          | —               |
| `packages/flux-react`   | **不**新增 `useEnvCapability` hook                                                                                                                                                  | —               |
| 其他 host（SSR / test） | 各自提供实现，或保持 undefined（调用方降级）                                                                                                                                        | —               |

### 自动处理细节（host 实现规范）

P-1 实施 plan 时，host 实现必须遵守以下"自动处理"规范：

1. **URL 拼接**：复用 `ExecutableApiRequest` 现有规则（query 参数 / path 参数）
2. **body 序列化**：按 `dataType`（json/form/data）
3. **请求头**：合并 `headers` + 鉴权 header（与 fetcher 一致）
4. **响应判定**：HTTP status >= 200 && < 300 视为连接成功；其他 status 填入 `response.status / code / msg`
5. **chunk 切分**：
   - `sse`：按 `\n\n` 切 event；每 event 提取 `data:` 行内容（多行拼接）；识别 `data: [DONE]` 自动结束迭代
   - `ndjson` / `json-lines`：按 `\n` 切行；空行跳过
   - `text`：按网络包到达分块（不跨包拼接）
   - `raw`：原样返回 Uint8Array（不切分）
6. **chunk 解析**（按 `streamChunkType`）：
   - `json`：`JSON.parse(chunk)`；解析失败抛 `StreamChunkParseError`（含 chunkIndex / rawChunk / cause）
   - `text`：`String.fromCodePoint(...bytes)` 或 `TextDecoder.decode(chunk, { stream: true })`
   - `blob`：聚合为 Blob
   - `arraybuffer`：聚合为 ArrayBuffer
7. **abort**：`ctx.signal` 触发时，关闭底层 stream（`reader.cancel()`），让 chunks 迭代自然结束
8. **监控**：`env.monitor.onApiRequest` 在连接建立时调用一次；chunk 级监控（`onStreamChunk`）作为可选 hook 留待后续

---

## 总结

### 最终需求

扩充 `RendererEnv` 两个 optional 字段，提供**通用的、与 AI 无关的**流式连接能力：

1. **`env.stream?: StreamFetcher`**：HTTP 流式响应，自动按协议（SSE/NDJSON/text/raw）切分、按 chunkType（json/text/blob/arraybuffer）解析；与 `env.fetcher` 同构的高层次抽象。
2. **`env.openSocket?: WebSocketOpener`**：WebSocket 长连接，类浏览器原生接口；结构化 event 替代 DOM Event。

两个字段都向后兼容（optional），调用方使用前做 capability check。

### 关键决策

1. **通用性是硬约束**：`env.stream` / `env.openSocket` 不出现任何 AI 消息格式字段（如 `ChatMessage` / `tool_calls` / `reasoning_content`）；可承载 AI 对话、实时日志、IM、行情、协作编辑等所有流式场景。
2. **`env.stream` 是高层次抽象**：与 `env.fetcher` 同构，不是低层字节管道。自动处理 URL/body 序列化、chunk 切分、chunk 解析、SSE `[DONE]` 识别。调用方拿到的 chunks 已是"切好+解析好"的对象。
3. **向后兼容**：两个字段都 optional，不破坏现有 host。
4. **协议覆盖**：首版支持 sse/ndjson/json-lines/text/raw 五种；json-lines 作为 ndjson 别名。自定义协议（`'custom' + chunkParser`）本次不支持。
5. **错误模型**：
   - 连接级错误：`response.status / code / msg / errors`（stream）/ `onerror + onclose(code, reason)`（openSocket）
   - chunk 解析错误：抛 `StreamChunkParseError`（含 `chunkIndex` / `rawChunk` / `cause`）
6. **abort**：通过 `ctx.signal`（stream）/ `options.signal`（openSocket）统一；abort 时 stream 迭代自然结束，socket 触发 close。
7. **默认值**：`streamProtocol: 'sse'` + `streamChunkType: 'json'`（AI 对话场景零配置；90% 主流场景兼容）。
8. **本地持久化不扩 env**：本地持久化（localStorage / IndexedDB）走 B 档（import 注入），不进 env。理由：业务相关性强、不是系统调用。
9. **不新增 built-in action**：本次不注册 `stream` / `openSocket` action，schema 侧使用仅通过渲染器内部消费；built-in action 留作后续提案。
10. **不新增 capability hook**：本次不加 `useEnvCapability`；调用方直接 `if (env.stream)` 判断。
11. **playground 默认实现同步落地**：`apps/playground` 在 P-1 阶段提供默认实现（基于浏览器原生），让 AI 组件能立即跑通。

### 待定事项

无（所有关键决策已裁定）。

未来可能扩展（不在本次范围）：

- built-in `stream` / `openSocket` action（让 schema 直接声明式消费）
- `useEnvCapability(name)` 标准化 hook
- 自定义协议支持（`streamProtocol: 'custom'` + `chunkParser` 回调）
- chunk 级监控 hook（`monitor.onStreamChunk`）
- `env.storage` 通用持久化抽象（如果未来 3+ 不相关组件都需要）

### 后续行动

1. **更新 `docs/components/flux-renderers-ai/design.md`**：v2 已引用本评审，确认最终接口（无需重写）
2. **扩 `packages/flux-core/src/types/renderer-api.ts`**：按"最终接口定义（v3）"扩 `RendererEnv`，新增相关类型
3. **`apps/playground` 提供默认实现**：基于 `fetch` + `ReadableStream` + 浏览器原生 `WebSocket`
4. **更新 owner doc**：候选位置
   - `docs/architecture/api-data-source.md`（已有 `env.fetcher` 描述，可补 stream 章节）
   - 或新建 `docs/architecture/env-io-boundaries.md`（集中描述所有 env IO 抽象）
   - **建议**：本次先在 `docs/references/new-renderer-introduction-audit.md` 加一节"env 现有 IO 速查"指向新字段；owner doc 由后续 plan 推进
5. **记录 dev log**：`docs/logs/2026/07-21.md` 已同步
6. **后续 plan**（用户指示"暂时不用 plan"，故本次不写）：当 AI 组件准备进 P0 实现时，再起草 `docs/plans/{date}-env-stream-and-socket-extension-plan.md` 实施 plan + P0 plan

### 影响

- `flux-renderers-ai/design.md` v2：稳定，无需大改（设计已对齐本评审）
- `flux-renderers-ai/audit.md`：DECISION-1/2/3 全部闭环
- `docs/references/new-renderer-introduction-audit.md` INV-2 流程：首个真实用例走通，作为后续扩 env 提案的范例
