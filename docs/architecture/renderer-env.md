# RendererEnv —— Host Transport Boundary

> **定位**：`RendererEnv` 接口的 owner doc。集中描述所有 env 字段、设计哲学、扩充流程。
> **强制性**：扩 `RendererEnv` 接口、新增 IO 类型、实现 host 默认 fetcher/stream/openSocket 等场景必须先读本文。

## 1. 设计哲学

低代码框架本质是**解释器**，它的"系统调用"由**宿主实现**而不是框架硬编码。框架只规定接口，具体实现交给宿主——这让同一套框架可以嵌入不同宿主环境（HTTP 库、路由库、鉴权方案、模块系统的选择权都留在宿主侧）。

`RendererEnv` 就是这套"系统调用"的契约。渲染器、runtime、action dispatcher 永不直接调浏览器/Node 全局 API（`fetch` / `WebSocket` / `localStorage` / `history.pushState` / 动态 `import()` 等），一律经 `env` 抽象。

这是 `docs/references/new-renderer-introduction-audit.md` INV-1 的根本依据。

## 2. env 字段全集

> **状态声明**：以下展示**目标态全集**。当前 `master` 分支 `packages/flux-core/src/types/renderer-api.ts:83` 已实施字段为：`fetcher / notify / navigate / confirm / alert / functions / filters / importLoader / resolveImportUrl / loadPage / loadDict / hasRole / locale`。（`monitor` 已从 env 移除，改用 `<SchemaRenderer monitor>` prop，详见 `docs/architecture/flux-monitor.md`。）
>
> `stream` 与 `openSocket` 已于 2026-07-21 经 INV-2 评审通过，并于 2026-07-23 **落地实施**（接口 + playground 默认实现 + decorator hooks，见 §4.3 历史记录）。两个字段均 optional，向后兼容。使用方应 capability check（`if (env.stream) ...`）。

```ts
export interface RendererEnv extends ExpressionExecutionEnv {
  // ===== 网络 IO =====
  fetcher: ApiFetcher; // HTTP 一次性请求（必填，已实施）
  stream?: StreamFetcher; // HTTP 流式响应（SSE/NDJSON/...，可选，2026-07-23 已实施）
  openSocket?: WebSocketOpener; // WebSocket 长连接（可选，2026-07-23 已实施）

  // ===== UI 反馈 =====
  notify: (level, message) => void; // Toast 通知（必填）
  confirm?: (message, title?) => Promise<boolean>; // 确认对话框
  alert?: (message, title?) => void; // 警告框

  // ===== 路由 =====
  navigate?: (to: string | number, options?) => void;

  // ===== 资源加载 =====
  loadPage?: (path: string, signal?) => Promise<SchemaInput>;
  loadDict?: (name: string, signal?) => Promise<DictBean>;

  // ===== 权限 =====
  hasRole?(role: string): boolean;

  // ===== 业务能力注入 =====
  importLoader?: ImportedLibraryLoader;
  resolveImportUrl?: (schemaUrl: string, from: string, options?) => string;

  // ===== 监控 =====
  // monitor 已移至 <SchemaRenderer monitor> prop（详见 docs/architecture/flux-monitor.md）

  // ===== 表达式扩展 =====
  functions?: Record<string, (...args: any[]) => any>;
  filters?: Record<string, (input: any, ...args: any[]) => any>;

  // ===== 元信息 =====
  locale?: string;
}
```

## 3. 字段规范

### 3.1 `fetcher: ApiFetcher`（必填，HTTP 一次性请求）

```ts
export type ApiFetcher = <T = unknown>(
  api: ExecutableApiRequest,
  ctx: ApiRequestContext,
) => Promise<ApiResponse<T>>;
```

- **职责**：发送 HTTP 请求并接收一次性响应（非流式）
- **自动处理**：URL 拼接（query/path 参数）/ body 序列化（按 `dataType`：json/form/data）/ response 解析（按 `responseType`：json/blob/text/arraybuffer）/ envelope 封装（`{ status, data, code, msg, errors, headers }`）
- **abort**：通过 `ctx.signal: AbortSignal`
- **owner doc**：`docs/architecture/api-data-source.md`、`docs/architecture/api-response-envelope.md`

### 3.2 `stream?: StreamFetcher`（可选，HTTP 流式响应）—— **2026-07-23 已实施**

```ts
export type StreamFetcher = <T = unknown>(
  api: StreamApiRequest,
  ctx: ApiRequestContext,
) => Promise<StreamFetchResult<T>>;

export type StreamApiRequest = ExecutableApiRequest & {
  streamProtocol?: StreamProtocol; // 'sse' | 'ndjson' | 'json-lines' | 'text' | 'raw'，默认 'sse'
  streamChunkType?: StreamChunkType; // 'json' | 'text' | 'blob' | 'arraybuffer'，默认 'json'
};

export interface StreamFetchResult<T = unknown> {
  response: Omit<ApiResponse, 'data'>; // 连接级元信息（与 fetcher envelope 同构，无 data）
  chunks: AsyncGenerator<T>; // 已切分+已解析的 chunk 流
}
```

- **职责**：发送 HTTP 请求并接收流式响应（SSE / NDJSON / chunked / 自定义协议）
- **抽象层次**：与 `fetcher` 同构（高层次抽象，不是低层字节管道）
- **自动处理**：URL/body 序列化（复用 fetcher 逻辑）+ chunk 切分（按 `streamProtocol`）+ chunk 解析（按 `streamChunkType`）+ SSE `[DONE]` 自动结束迭代
- **abort**：通过 `ctx.signal`；触发后 chunks 迭代自然结束
- **错误模型**：
  - 连接级错误：`response.status / code / msg / errors`（与 fetcher 一致）
  - chunk 解析错误：抛 `StreamChunkParseError`（含 `chunkIndex` / `rawChunk` / `cause`），由调用方 `try/catch`
- **capability check**：使用前必须 `if (env.stream) { ... } else { fallback or error }`
- **评审来源**：`docs/discussions/2026-07-21-env-stream-and-websocket-extension.md`

#### 自动处理矩阵

| `streamProtocol`            | 如何切分                                                          | `streamChunkType: 'json'` 时                                  |
| --------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| `'sse'`（默认）             | 按 `\n\n` 切 event，提取 `data:` 行；处理 `data: [DONE]` 自动结束 | `JSON.parse(data)`                                            |
| `'ndjson'` / `'json-lines'` | 按 `\n` 切行；空行跳过                                            | `JSON.parse(line)`                                            |
| `'text'`                    | 按网络包到达分块                                                  | `String(chunk)`                                               |
| `'raw'`                     | 不切分                                                            | 返回 `Uint8Array`（与 `streamChunkType: 'arraybuffer'` 等价） |

#### 典型场景

- AI 对话流式响应（OpenAI / DeepSeek / Anthropic 等 SSE 协议）
- 实时日志推送（NDJSON）
- 服务器事件通知（SSE）
- 大文件分块下载（raw）

### 3.3 `openSocket?: WebSocketOpener`（可选，WebSocket 长连接）—— **2026-07-23 已实施**

```ts
export type WebSocketOpener = (
  url: string,
  options?: WebSocketOptions,
  ctx?: ApiRequestContext,
) => WebSocketConnection;

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

- **职责**：建立 WebSocket 长连接
- **接口形态**：类浏览器原生 `WebSocket`，但用结构化 event 替代 DOM `Event` 对象（避免 DOM 类型耦合，便于 SSR/Node 实现）
- **abort**：通过 `options.signal`；触发后调用 `close()`，触发 `onclose`
- **错误模型**：通过 `onerror` + `onclose(code, reason)`（不经 ApiResponse envelope）
- **capability check**：使用前必须 `if (env.openSocket) { ... } else { fallback or error }`
- **典型场景**：IM 客服、协作编辑、实时游戏、双向消息推送

### 3.4 `notify` / `confirm` / `alert`（UI 反馈）

```ts
notify: (level: 'info' | 'success' | 'warning' | 'error', message: string) => void;  // 必填
confirm?: (message: string, title?: string) => Promise<boolean>;
alert?: (message: string, title?: string) => void;
```

- **职责**：Toast / 确认框 / 警告框
- **owner doc**：`docs/architecture/api-data-source.md:134`（notify 错误归一）、`docs/architecture/variant-vocabulary.md:188`（level 命名规范）
- **禁止**：渲染器直调 `window.alert` / `window.confirm` / 第三方 toast 库

### 3.5 `navigate`（路由）

```ts
navigate?: (to: string | number, options?: { replace?: boolean }) => void;
```

- **职责**：路由跳转
- **owner doc**：`docs/architecture/api-data-source.md:154`（runtime 不绑路由，唯一导航入口）
- **禁止**：渲染器直调 `history.pushState` / `window.location`

### 3.6 `loadPage` / `loadDict`（资源加载）

```ts
loadPage?: (path: string, signal?: AbortSignal) => Promise<SchemaInput>;
loadDict?: (name: string, signal?: AbortSignal) => Promise<DictBean>;
```

- **owner doc**：`docs/architecture/flux-page-dict-loading-and-precompile.md:29`

### 3.7 `hasRole`（权限）

```ts
hasRole?(role: string): boolean;
```

- **职责**：`xui:roles` schema 字段过滤的权限检查；缺省时 allow-all

### 3.8 `importLoader` / `resolveImportUrl`（业务能力注入）

```ts
importLoader?: ImportedLibraryLoader;
resolveImportUrl?: (schemaUrl: string, from: string, options?: Record<string, unknown>) => string;
```

- **owner doc**：`docs/architecture/module-cache-and-import-stack.md:139`
- **用途**：`xui:imports` 的 module 解析入口；同时产生 action namespace + 表达式 helper 两个 channel

### 3.9 `monitor`（已移除）

> `monitor` 已从 `RendererEnv` 移除，改用 `<SchemaRenderer monitor>` prop。详见 `docs/architecture/flux-monitor.md`。

### 3.10 `functions` / `filters`（表达式扩展）

```ts
functions?: Record<string, (...args: any[]) => any>;
filters?: Record<string, (input: any, ...args: any[]) => any>;
```

- **owner doc**：`docs/architecture/flux-formula.md`

### 3.11 `locale`（国际化）

```ts
locale?: string;
```

- 用作 page/dict 缓存的 key 之一

## 4. 扩充流程（INV-2）

当现有 env 能力不覆盖新场景（如未来需要 `env.storage` / `env.bluetooth` / `env.fileSystem`）时，按以下优先级处理：

| 优先级 | 方案                                             | 适用场景                                                                                        |
| ------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| **A**  | 用现有 env 能力组合                              | 能用 `fetcher` + adapter / 现有 import 解决                                                     |
| **B**  | 走 `env.importLoader` + `xui:imports` 注入连接器 | 业务连接器（自家网关、第三方 SDK、自定义协议）                                                  |
| **C**  | **经架构评审后扩充 `RendererEnv` 接口**          | 通用系统调用（3+ 不相关组件都需要、属于 host transport boundary、不能被 importLoader 优雅覆盖） |

### 4.1 C 档评审标准（5 条全满足）

- ✅ 通用性：3+ 个不相关组件都需要（不是某个业务组件专用）
- ✅ 属于 host transport boundary（系统调用，不是业务能力）
- ✅ 不能被 importLoader 优雅覆盖（import 适合"业务连接器"，env 适合"系统调用"）
- ✅ 跨多个 host 实现可统一抽象（web / SSR / test / 离线）
- ✅ 与现有 env 能力有强耦合（如 `fetch` + streaming 是同一抽象的两个 mode）

### 4.2 C 档评审流程（4 步）

1. **提案**：在 `docs/discussions/` 起草（参考 `2026-07-21-env-stream-and-websocket-extension.md` 范例），说明覆盖场景、为何 A/B 不够、提议的接口形状、向后兼容策略
2. **评审**：discussion 收集意见；通过后更新本文（`docs/architecture/renderer-env.md`）+ 相关 owner doc
3. **实现**：扩 `RendererEnv` 接口（`packages/flux-core/src/types/renderer-api.ts`）；为所有 host 实现（`apps/playground` 等）补默认实现
4. **兼容**：新字段必须 **optional**，不破坏现有 host

### 4.3 历史扩充记录

| 日期       | 字段                               | 评审来源                                                            | 状态   |
| ---------- | ---------------------------------- | ------------------------------------------------------------------- | ------ |
| 2026-07-23 | `env.stream?: StreamFetcher`       | `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` | 已实施 |
| 2026-07-23 | `env.openSocket?: WebSocketOpener` | 同上                                                                | 已实施 |

## 5. Host 实现责任

每个 host 应用（`apps/playground` / SSR / test）必须为以下字段提供实现：

| 字段                    | 必填？  | playground 默认实现                                                                                |
| ----------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| `fetcher`               | ✅ 必填 | mock / 真实后端                                                                                    |
| `stream`                | 可选    | **已落地**（`apps/playground/src/env/stream-impl.ts`：`fetch` + `ReadableStream` + `TextDecoder`） |
| `openSocket`            | 可选    | **已落地**（`apps/playground/src/env/socket-impl.ts`：代理浏览器原生 `WebSocket`）                 |
| `notify`                | ✅ 必填 | `@nop-chaos/ui` 的 `toast()`                                                                       |
| `confirm` / `alert`     | 可选    | `@nop-chaos/ui` 的 Dialog                                                                          |
| `navigate`              | 可选    | 基于 `history` 或路由库                                                                            |
| `loadPage` / `loadDict` | 可选    | 后端 API 或本地 mock                                                                               |
| `hasRole`               | 可选    | 缺省 allow-all                                                                                     |
| `importLoader`          | 可选    | 静态注册表或动态 `import()`                                                                        |
| `monitor`               | 已移除  | 改用 `<SchemaRenderer monitor>` prop（见 `flux-monitor.md`）                                       |
| `functions` / `filters` | 可选    | 静态注册表                                                                                         |
| `locale`                | 可选    | i18n 库                                                                                            |

## 6. 渲染器/RUNTIME 使用规则（强制）

1. **永不直调**：`fetch` / `XMLHttpRequest` / `axios` / `WebSocket` / `EventSource` / `RTCPeerConnection` / `localStorage` / `sessionStorage` / `IndexedDB` / `history.pushState` / `window.open` / 动态远程 `import()`
2. **必须经 env**：所有 IO 经对应字段（fetcher / stream / openSocket / loadPage / loadDict / navigate / notify / confirm / alert / hasRole / importLoader）
3. **必填字段使用前不检查**（`fetcher` / `notify` 保证存在）；**可选字段使用前必须 capability check**（`if (env.stream) ...`）
4. **env 引用稳定性**：渲染器内部 state（如复杂组件的 engine / store）不应因 env 引用变化而重建（用 `useRef` lazy init + 适配层）

详见 `docs/references/new-renderer-introduction-audit.md` INV-1。

## 7. 与其他 owner doc 的关系

本文是 **`RendererEnv` 字段全集与扩充流程**的 owner doc，不重复字段细节：

| 关注点                                          | 看                                                                  |
| ----------------------------------------------- | ------------------------------------------------------------------- |
| 渲染器契约 / `useRendererEnv` hook              | `docs/architecture/renderer-runtime.md`                             |
| `fetcher` 的 host transport boundary 描述       | `docs/architecture/api-data-source.md`                              |
| `ApiResponse` envelope                          | `docs/architecture/api-response-envelope.md`                        |
| `loadPage` / `loadDict` 接口                    | `docs/architecture/flux-page-dict-loading-and-precompile.md`        |
| `importLoader` / `resolveImportUrl`             | `docs/architecture/module-cache-and-import-stack.md`                |
| `monitor` 在性能诊断中的角色                    | `docs/architecture/flux-monitor.md`                                 |
| `functions` / `filters` 表达式扩展              | `docs/architecture/flux-formula.md`                                 |
| 设计哲学（为什么 IO 经 env）                    | `docs/articles/flux-design-introduction.md:606`                     |
| Runtime requirements（环境稳定性 / 域私有通道） | `docs/low-code-dsl-runtime-requirements.md`                         |
| INV-1 / INV-2 原则审计                          | `docs/references/new-renderer-introduction-audit.md`                |
| 2026-07-21 stream / openSocket 评审             | `docs/discussions/2026-07-21-env-stream-and-websocket-extension.md` |

## 8. env 装饰器（decorator）

`decorateRendererEnv(env, hooks)`（`packages/flux-core/src/utils/renderer-env.ts:26`）允许在不替换 env 的情况下包装 `fetcher` / `notify` / `navigate` / `stream` / `openSocket`：

```ts
const decorated = decorateRendererEnv(env, {
  fetcher: (next, api, ctx) => {
    console.log('outgoing request', api);
    return next(api, ctx);
  },
});
```

用途：debugger 拦截 / 审计日志 / 错误转换 / A/B 测试。

> **已解决（2026-07-23）**：`RendererEnvDecoratorHooks` 已扩 `stream?` / `openSocket?` hook（随 P-1 实施 `env.stream` / `env.openSocket` 同步落地）。debugger 现可拦截流式调用与 WebSocket 连接，监控盲区已消除。

## 9. 待裁定项

以下能力当前**未**纳入 env，由 INV-2 评审流程处理：

- **本地持久化**（`localStorage` / `IndexedDB` 统一抽象）：当前由 host 经 `xui:imports` 注入 storage adapter（B 档）；不扩 env
- **文件系统访问**（File System Access API / Node fs）：跨 host 场景暂无强需求
- **蓝牙 / USB / 串口等设备 IO**：暂无需求

如未来 3+ 不相关组件都需要这些能力，按 §4 流程走 C 档评审。
