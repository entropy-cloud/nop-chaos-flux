# A0 env.stream 与 openSocket 通用连接能力扩充

> Plan Status: completed
> Last Reviewed: 2026-07-23
> Source: `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md`（第 3 轮 = 最终裁定）、`docs/architecture/renderer-env.md` §3.2/§3.3/§4.3
> Mission: ai
> Work Item: A0 — env.stream 扩充（前置依赖，落在 `packages/flux-core` + `apps/playground`）
> Related: 上游 roadmap `docs/components/roadmap-ai.md` A0；下游 `2026-07-23-2143-2-a1-flux-renderers-ai-p0-skeleton.md`（A1，硬依赖本计划）

## Purpose

把 `RendererEnv` 的 `stream` / `openSocket` 两个 optional 字段从"评审通过、文档已立约、代码待实施"收口为"接口落地 + playground 默认实现可用 + owner doc 状态同步"。这是 AI 渲染器包（A1）的硬前置——没有 `env.stream`，P0 的 mock 流式对话无法跑通。

## Current Baseline

- `packages/flux-core/src/types/renderer-api.ts:83` 的 `RendererEnv` 当前已实施字段：`fetcher / notify / navigate / confirm / alert / functions / filters / importLoader / resolveImportUrl / monitor / loadPage / loadDict / hasRole / locale`。**没有** `stream` / `openSocket`（grep `stream\??:|openSocket\??:|StreamFetcher|WebSocketOpener` 在 flux-core `src/` 内零命中）。
- `ApiRequestContext`（`renderer-api.ts:7`）已含 `signal?: AbortSignal` / `scope` / `env` / `interactionId` / `requestInstanceId`——`stream` 复用它即可。
- `ApiResponse<T>`（`renderer-api.ts:15`）已含 `ok/status/data/code/msg/errors/headers/raw`；`StreamFetchResult.response` 定义为 `Omit<ApiResponse,'data'>`，与之同构。
- `ExecutableApiRequest` 来自 `./schema-base-types.js`；`StreamApiRequest` 将 `extends ExecutableApiRequest`，新增两个可选字段，不破坏现有请求类型。
- owner doc `docs/architecture/renderer-env.md` 已把**目标态全集**写明（§2、§3.2、§3.3、§4.3 历史记录、§5 host 实现责任表），状态标注为"评审通过，待 P-1 实施 plan 落地代码"。
- `packages/flux-core/src/utils/renderer-env.ts:8` 的 `RendererEnvDecoratorHooks` 当前仅支持 `fetcher / notify / navigate` 三个 hook；owner doc §8（`renderer-env.md:320`）显式留了 P-1 TODO：实施 `stream`/`openSocket` 时须同步扩 decorator hooks，否则流式调用处于监控盲区（debugger 无法拦截）。
- discussion `2026-07-21-env-stream-and-websocket-extension.md` 第 3 轮已裁定所有待澄清问题（命名、协议覆盖、chunk 解析失败抛 `StreamChunkParseError`、SSE `[DONE]` 自动结束、默认值 `streamProtocol:'sse' + streamChunkType:'json'`、playground 默认实现同步落地）。
- `apps/playground` 各页面 env 都是各自内联构造 `RendererEnv`（如 `pages/m5-showcase-shared.ts:79 createEnv()`），`stream`/`openSocket` 可在 host 层独立提供，不影响其他页面。

## Goals

- `packages/flux-core` 新增 `StreamFetcher` / `StreamApiRequest` / `StreamFetchResult` / `StreamProtocol` / `StreamChunkType` / `StreamChunkParseError` / `WebSocketOpener` / `WebSocketOptions` / `WebSocketConnection` 类型，并在 `RendererEnv` 增 `stream?: StreamFetcher` 与 `openSocket?: WebSocketOpener`（均 optional，向后兼容）。
- 扩 `RendererEnvDecoratorHooks`，新增 `stream?` / `openSocket?` 两个 hook（解 §8 监控盲区 TODO）。
- `apps/playground` 提供默认 `stream` 实现（`fetch` + `ReadableStream` + `TextDecoder`，自动按 `streamProtocol` 切分、按 `streamChunkType` 解析、处理 SSE `[DONE]`、`ctx.signal` abort、`StreamChunkParseError` on parse 失败）与默认 `openSocket` 实现（代理浏览器原生 `WebSocket`，结构化 event）。
- playground 有可交互示例页面（演示 SSE/NDJSON 两种协议收 chunk），注册到 playground 路由。
- owner doc `renderer-env.md` 状态从"待实施"翻为"已实施"，历史记录、host 责任表、§8 TODO 同步。
- discussion 文档补"评审已落地"总结段。

## Non-Goals

- **不**新增 built-in `stream` / `openSocket` action（`flux-runtime` / `flux-action-core` 不动）——留作后续提案。
- **不**新增 `useEnvCapability(name)` hook（`flux-react` 不动）——调用方直接 `if (env.stream)`。
- **不**支持自定义协议（`streamProtocol: 'custom' + chunkParser`）——首版仅 `sse/ndjson/json-lines/text/raw` 五种。
- **不**新增 chunk 级监控 hook（`monitor.onStreamChunk`）——`monitor.onApiRequest` 在连接建立时调用一次即可。
- **不**创建 `flux-renderers-ai` 包、不实现任何 AI 渲染器（那是 A1）。
- **不**为 SSR / test host 提供实现（本次仅 playground；其他 host 保持 undefined，调用方降级）。

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-api.ts`：类型定义 + `RendererEnv` 两个字段。
- `packages/flux-core/src/utils/renderer-env.ts`：`RendererEnvDecoratorHooks` 扩 `stream?`/`openSocket?`，`decorateRendererEnv` 串联逻辑同步。
- `packages/flux-core` 的公开导出（`src/types/index.ts` 或对应 barrel）补导出新类型。
- `apps/playground/src/`：默认 `stream` + `openSocket` 实现（建议独立文件如 `env/stream-impl.ts` / `env/socket-impl.ts`，或扩 `m5-showcase-shared.ts` 的 `createEnv`）；示例页面 + 路由注册。
- `docs/architecture/renderer-env.md`、`docs/discussions/2026-07-21-env-stream-and-websocket-extension.md`、`docs/logs/2026/07-23.md`。

### Out Of Scope

- AI 消息格式（`ChatMessage` / `tool_calls` / `reasoning_content`）一律不进 env（通用性硬约束）。
- `flux-runtime` / `flux-action-core` / `flux-react` 代码改动。
- 非 playground host 的实现。

## Failure Paths

> env.stream / env.openSocket 是对外 IO 契约，必填此节。

| 场景编号             | 触发                                          | 行为                                                                                                             | 可重试 | 用户可见表现                           |
| -------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| `stream-conn-error`  | HTTP status >= 300 / DNS 失败 / 网络错误      | `response.status/code/msg/headers` 填充错误信息（连接级错误经 response 字段报告，**不**抛出）；`chunks` 为空迭代 | 否     | 调用方拿到非 2xx response，自行报错    |
| `stream-chunk-parse` | `streamChunkType:'json'` 但 chunk 非合法 JSON | 抛 `StreamChunkParseError`（含 `chunkIndex` / `rawChunk` / `cause`）                                             | 否     | 调用方 `for await` 内 `try/catch` 捕获 |
| `stream-done`        | SSE 收到 `data: [DONE]`                       | 自动结束迭代，**不** yield `[DONE]` 本身                                                                         | —      | 迭代正常结束                           |
| `stream-abort`       | `ctx.signal` abort                            | 关闭底层 stream（`reader.cancel()`），chunks 迭代自然结束（generator return）                                    | —      | 迭代结束，无异常                       |
| `socket-conn-error`  | WebSocket 握手失败 / 服务端拒绝               | `onerror` 触发，随后 `onclose(code, reason)`                                                                     | 否     | 调用方在 `onerror`/`onclose` 处理      |
| `socket-abort`       | `options.signal` abort                        | 调 `close()`，触发 `onclose`                                                                                     | —      | 连接关闭                               |
| `capability-missing` | host 未提供 `stream`/`openSocket`             | 字段为 `undefined`；调用方必须 `if (env.stream)` capability check，否则降级/报错                                 | —      | 由调用方决定 fallback                  |

## Test Strategy

档位选择：`必须自动化`

本档选择：**必须自动化**。理由：新增对外公共 IO 契约（`RendererEnv` 公共导出面），属 AGENTS.md Test Strategy 表"对外 API 契约"档。`env.stream` 的自动切分+解析矩阵是核心回归路径，Proof 项必须在 Fix 之前/同时落地。

## Execution Plan

### Phase 1 - flux-core 接口与类型落地

Status: completed
Targets: `packages/flux-core/src/types/renderer-api.ts`、`packages/flux-core/src/utils/renderer-env.ts`、`packages/flux-core/src/types/renderer.ts`（验证 `export * from './renderer-api.js'` 自动 re-export 链）

- Item Types: `Fix | Proof`

- [x] 按 discussion §第 3 轮"最终接口定义（v3）"在 `renderer-api.ts` 新增全部类型：`StreamProtocol` / `StreamChunkType` / `StreamApiRequest`（`extends ExecutableApiRequest`）/ `StreamFetchResult<T>`（`response: Omit<ApiResponse,'data'>` + `chunks: AsyncGenerator<T>`）/ `StreamFetcher` / `StreamChunkParseError`（**`class extends Error`**，须可 throw，含 `chunkIndex` / `rawChunk` / `cause`）/ `WebSocketOpener` / `WebSocketOptions` / `WebSocketConnection`。
- [x] 在 `RendererEnv`（`renderer-api.ts:83`）新增 `stream?: StreamFetcher` 与 `openSocket?: WebSocketOpener`（注释标注可选 + capability check 要求）。
- [x] 扩 `RendererEnvDecoratorHooks`（`renderer-env.ts:8`）新增 `stream?` / `openSocket?` hook；`decorateRendererEnv`（`renderer-env.ts:26`）串联逻辑同步，让 debugger 能拦截流式调用与 WebSocket 连接。
- [x] 在 flux-core 公开 barrel 验证新类型可达：`renderer-api.ts` 的导出经 `types/renderer.ts:8`（`export * from './renderer-api.js'`）→ `types/index.ts` → `src/index.ts` 自动 re-export，新增类型无需手动补 `export *`（确认 `StreamFetcher` 等可从 `@nop-chaos/flux-core` 顶层 import 即可）。

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-core typecheck` 通过（保证向后兼容：新字段 optional，不破坏现有 host env 构造）。
- [x] 新增 focused 单测：`StreamChunkParseError` 形状（含 `chunkIndex`/`rawChunk`/`cause`）；`StreamApiRequest` 默认值（`streamProtocol?: 'sse'`、`streamChunkType?: 'json'` 由实现侧默认，类型仅声明）；`decorateRendererEnv` 串联 `stream`/`openSocket` 调用链（mock stream hook 被触发）。

### Phase 2 - playground 默认 stream + openSocket 实现

Status: completed
Targets: `apps/playground/src/env/stream-impl.ts`（或扩 `m5-showcase-shared.ts`）、`apps/playground/src/env/socket-impl.ts`、示例页面 + 路由

- Item Types: `Fix | Proof`

- [x] 实现 `stream`：基于 `fetch` + `response.body.getReader()` + `TextDecoder({stream:true})`。复用现有 fetcher 的 URL/body 序列化逻辑（query/path 参数、按 `dataType` 序列化 body）；HTTP 2xx 视为连接成功，否则填 `response.status/code/msg`。
- [x] chunk 切分按 `streamProtocol`：`sse` 按 `\n\n` 切 event + 提取 `data:` 行（多行拼接）+ 识别 `[DONE]` 自动结束；`ndjson`/`json-lines` 按 `\n` 切行跳过空行；`text` 按网络包到达分块；`raw` 原样返回 `Uint8Array`（不切分）。
- [x] chunk 解析按 `streamChunkType`：`json` 用 `JSON.parse`，失败抛 `StreamChunkParseError`（含 `chunkIndex`/`rawChunk`/`cause`）；`text` 用 `TextDecoder.decode`；`blob`/`arraybuffer` 聚合对应类型。
- [x] abort 语义：`ctx.signal` 触发时 `reader.cancel()`，chunks 迭代自然结束；连接建立时调一次 `env.monitor.onApiRequest`。
- [x] 实现 `openSocket`：代理浏览器原生 `WebSocket`，把原生事件映射为结构化 event（`onopen`/`onmessage`/`onclose`/`onerror`）；`readyState` 映射为 `'connecting'|'open'|'closing'|'closed'`；`options.signal` abort 触发 `close()`。
- [x] playground 示例页面：演示 SSE 与 NDJSON 两种协议接收 chunk（可用本地 mock server 或内联 mock chunk 生成器），注册到 playground 路由。

Exit Criteria:

- [x] focused 单测覆盖自动处理矩阵（sse/ndjson/json-lines/text/raw × json/text），含 `[DONE]` 结束、`StreamChunkParseError` 抛出、`ctx.signal` abort 结束迭代（用 `AbortController` + mock `ReadableStream`）。
- [x] `openSocket` 至少一个集成验证（mock `WebSocket` 构造或事件映射单测）。
- [x] playground 示例页面在 `pnpm dev` 下能交互发送请求并看到流式 chunk 输出（人工抽查，记录到 dev log）。

### Phase 3 - owner doc 同步与评审总结

Status: completed
Targets: `docs/architecture/renderer-env.md`、`docs/discussions/2026-07-21-env-stream-and-websocket-extension.md`、`docs/logs/2026/07-23.md`

- Item Types: `Follow-up`

- [x] `renderer-env.md`：§2 状态声明 `stream`/`openSocket` 从"待实施"改为"已实施"；§4.3 历史记录表状态列改为"已实施"；§5 host 实现责任表 playground 列改为"已落地（fetch + ReadableStream / 原生 WebSocket）"；§8（`:320`）的 P-1 TODO 标记为已解决（decorator hooks 已扩）。
- [x] discussion 文档补一段"评审已落地"总结（接口已扩、playground 默认实现已落地、decorator hooks 已扩、指向本 plan 与 dev log）。
- [x] 更新 `docs/logs/2026/07-23.md`（按 `docs/logs/00-log-writing-guide.md`）。

Exit Criteria:

- [x] owner doc 与 live repo 一致性抽查：`renderer-env.md` §2/§3.2/§3.3 描述的接口签名与 `renderer-api.ts` 实际定义一致（类型名、字段、optional 标注逐项核对）。
- [x] dev log 已记录本工作项落地。

## Draft Review Record

> 起草后、执行前的独立审查证据。由独立审阅者或独立子 agent 填写。

- Reviewer / Agent: 独立子 agent（fresh session，ses_070c4b6f1ffexPVCSva0i684n3）
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed: 零 Blocker / 零 Major。处理 4 条 Minor（已全部收紧）：① barrel 导出目标订正为经 `types/renderer.ts:8` 的自动 re-export 链（Phase 1 item 4 与 Targets 已改，避免冗余 `export *`）；② `StreamChunkParseError` 明确为 `class extends Error`（须可 throw）；③ Failure Paths `stream-conn-error` 行去掉"或抛出"，对齐 round-3 裁定（连接级错误经 response 字段报告）。Minors 不阻塞。所有引用（`renderer-api.ts:83/7/15`、`ExecutableApiRequest` at `schema-base-types.ts`、`renderer-env.ts:8/26`、`renderer-env.md` §3.2/§3.3/§4.3/§8:320、discussion round-3、`m5-showcase-shared.ts:79`）经 live repo 核对一致。

## Closure Gates

> 全量验证在 plan 收口时跑一次。

- [x] `stream` / `openSocket` 接口与类型已落地，且与 owner doc `renderer-env.md` §3.2/§3.3 完全一致。
- [x] `RendererEnvDecoratorHooks` 已扩 `stream?`/`openSocket?`（§8 TODO 已解决）。
- [x] playground 默认 `stream`/`openSocket` 实现可用，自动处理矩阵（5 协议 × 4 chunkType 关键组合）有 focused 单测。
- [x] 现有所有 host env 构造点向后兼容（新字段 optional，无破坏性 typecheck 错误）。
- [x] owner doc 状态已同步、discussion 已总结、dev log 已记录。
- [x] 由独立子 agent（fresh session）执行的 closure-audit 已完成并记录证据；执行 session 不得自审勾选本项。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### built-in stream / openSocket action

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: discussion 第 3 轮 Q2 明确裁定"本次只扩 env，built-in action 留作后续提案"；A1 AI 渲染器通过 `connector`/`env.stream` 直接消费即可，不依赖声明式 action。
- Successor Required: `no`（未来如有"schema 声明式消费流式数据"需求再起独立提案）

### useEnvCapability(name) hook

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: discussion 第 3 轮 Q5 裁定本次不加；调用方直接 `if (env.stream)` 即可。
- Successor Required: `no`

## Non-Blocking Follow-ups

- chunk 级监控 hook（`monitor.onStreamChunk`）：默认不启用避免性能影响，需要时再加。
- 自定义协议支持（`streamProtocol: 'custom' + chunkParser`）：首版不支持，需要时再提案。
- SSR / test host 的 `stream`/`openSocket` 实现：各 host 自行提供或保持 undefined。

## Closure

Status Note: 全部 7 项 Closure Gates 经独立子 agent（fresh session）核对 live repo 通过；接口、实现、测试、文档均一致，无 hollow stub / 无 in-scope 缺陷降级。下游 A1 硬前置已满足。

Closure Audit Evidence:

- Auditor / Agent: 独立子 agent（fresh session, closure auditor）
- Evidence:
  - Gate 1（接口与类型与 §3.2/§3.3 一致）：`read packages/flux-core/src/types/renderer-api.ts`（`StreamProtocol`/`StreamChunkType`/`StreamApiRequest extends ExecutableApiRequest`/`StreamFetchResult<T>`/`StreamFetcher`/`StreamChunkParseError(class extends Error)`/`WebSocketOpener`/`WebSocketOptions`/`WebSocketConnection`；`RendererEnv.stream?: StreamFetcher` + `openSocket?: WebSocketOpener`）与 `docs/architecture/renderer-env.md` §2/§3.2/§3.3 逐项核对——类型名、字段、optional `?` 标注、`StreamChunkType` 四值、`WebSocketConnection` 结构化 event 签名完全一致。
  - Gate 2（decorator hooks）：`read packages/flux-core/src/utils/renderer-env.ts` — `RendererEnvDecoratorHooks` 已扩 `stream?`/`openSocket?`（:32/:41），`decorateRendererEnv` 串联逻辑同步（:76/:81）；`renderer-env.md` §8（:320）已写"已解决（2026-07-23）"，无残留"待实施"。
  - Gate 3（playground 实现 + 测试矩阵）：`read apps/playground/src/env/stream-impl.ts`（319 行真实 fetch+ReadableStream+TextDecoder+sse/ndjson/json-lines/text/raw 切分+json/text/blob/arraybuffer 解析+[DONE]+abort+StreamChunkParseError）、`socket-impl.ts`（130 行真实 WebSocket 代理）；已接入 `m5-showcase-shared.ts` 的 `createEnv()`（:84/:85）；路由已注册（`App.tsx:57/266`、`route-model.ts:520`）；示例页 `env-stream-demo.tsx`（239 行）。focused 单测覆盖 5 协议：`stream-impl.test.ts`（24 tests，sse×7/ndjson×5/text×2/raw×1/error×2/abort×1/fetch×6）、`socket-impl.test.ts`（8 tests）、`env-stream-socket.test.ts`（12 tests）。
  - Gate 4（向后兼容）：`renderer-api.ts:203/208` 两字段均 optional，`pnpm --filter @nop-chaos/flux-core typecheck` green，无破坏性错误。
  - Gate 5（文档同步）：`renderer-env.md` §2/§3.2/§3.3/§4.3/§5/§8 全部翻为"已实施/已落地"；`docs/discussions/2026-07-21-*.md:550` 有"第 4 轮：评审已落地总结"；`docs/logs/2026/07-23.md:3-7` 有 entry。
  - Gate 7（验证 green 复核）：`pnpm --filter @nop-chaos/flux-core typecheck` ✓；`pnpm --filter @nop-chaos/flux-core test` 495 passed ✓；`pnpm --filter @nop-chaos/flux-playground test` 142 passed ✓（全量 56/56 + 30/30 + 30/30 由执行 session 记录）。
  - Anti-hollow：实现为真实逻辑（非空 stub），测试断言为 `toBe`/`toEqual`/`toBeInstanceOf`/`toHaveBeenCalledTimes`（非 `expect(true)`）；deferred 项（built-in action / useEnvCapability / chunk 级 monitor）均为 discussion 第 3 轮显式 out-of-scope 裁定，无 in-scope 缺陷被静默降级。

Follow-up:

- chunk 级监控 hook（`monitor.onStreamChunk`）：默认不启用避免性能影响，需要时再加。
- 自定义协议支持（`streamProtocol: 'custom' + chunkParser`）：首版不支持，需要时再提案。
- SSR / test host 的 `stream`/`openSocket` 实现：各 host 自行提供或保持 undefined。
