# Flux DevTools 总体设计文档（内置调试器 · nop-entropy 集成 · 全面超越 Cypress）

- 日期：2026-11-17 · 状态：设计稿（待评审后立 M1 执行计划）
- 上游：[调研分析](./2026-11-17-flux-debugger-cypress-deep-analysis.md) · [路线图](./2026-11-17-flux-debugger-roadmap.md) · 截图与媒体采集专章：[flux-devtools-capture-design.md](./2026-11-17-flux-devtools-capture-design.md)
- 术语：AUT = 被调试的 flux 应用；cid = 节点挂载恒等（`data-cid`）；interactionId = 一次用户交互的关联键；网关 = nop-entropy 侧 DevTools Gateway。

---

## 1. 目标与非目标

### 1.1 目标

1. **内置**：调试器随 flux 应用一同发布，无需浏览器扩展、无需外挂进程、无需代理。开发态全功能，生产态可裁剪为诊断包采集。
2. **全面超越 Cypress 的调试体验**：
   - 时间旅行覆盖**状态**（scope/form/page/surface store 快照）而不仅是 DOM；
   - 用户会话**确定性录制/回放**（Cypress 只能重跑测试）；
   - **全栈链路**：前端 action ↔ fetcher ↔ Java span 合并时间轴，服务端调用可改参/短路；
   - **语义层 Why 面板**：回答"这个节点为什么 disabled/不渲染/值是这个"（schema/reaction/scope 白盒归因）；
   - 原生**截图/视频/视觉对比**子系统（见专章）。
3. **零成本默认**：无监听者时插桩开销 ≈ 0；开启时 P95 交互延迟增幅 < 10%。
4. **协议先行**：前端内核 ↔ Java 网关的消息协议独立于实现冻结，允许两端独立演进。

### 1.2 非目标

- 不做通用浏览器自动化（多站点爬取等）——只服务 flux 渲染的 AUT。
- 不替代 Chrome DevTools 的通用能力（JS 断点、CPU profile）。
- 不做多浏览器并行驱动矩阵（无外挂架构，天然无此需求）。

### 1.3 设计原则

| #   | 原则                   | 落地约束                                                                                         |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------ |
| P1  | 只经三个既有 seam 插桩 | `RendererPlugin`、RendererEnv 装饰、`ScopeStore.setSnapshot` 拦截；renderer 包不得 import 调试器 |
| P2  | 无监听者零成本         | 所有钩子先查"订阅数组长度"，为 0 走原路径                                                        |
| P3  | 快照惰性               | 克隆/序列化延迟到首次使用；display props 小投影先行                                              |
| P4  | 副作用与状态分离       | 时间旅行只还原状态；副作用经回放协议重演                                                         |
| P5  | 安全默认               | 脱敏先于存储/传输；网关拦截默认只读，改写需授权                                                  |

---

## 2. 总体架构

```
┌──────────────── 浏览器（AUT = flux 应用） ────────────────────────────┐
│                                                                       │
│  flux 运行时（packages/flux-runtime, flux-react）                       │
│   ├─ RendererPlugin 钩子: beforeCompile/afterCompile/                  │
│   │   beforeAction/**afterAction(新)**/onRender(新)/                    │
│   │   onExpressionEval(新,采样)/onError                                 │
│   ├─ ScopeStoreInterceptor: 包装 setSnapshot → 快照+变更事件            │
│   ├─ StabilityTracker(新): whenStable 原语                              │
│   └─ EnvDecorator: fetcher/stream/openSocket/notify → 事件+stub/spy    │
│                                                                       │
│  DevTools 内核（packages/nop-debugger 扩展）                            │
│   ├─ EventBus（diff/节流/display-full 分层）                            │
│   ├─ SnapshotRepository（scope 森林快照 + DOM 影子 + 截图引用）          │
│   ├─ Recorder / Replayer（会话录制/确定性回放）                          │
│   ├─ Assertion API（waitFor 重试查询 / dispatch 效果）                   │
│   ├─ CaptureSubsystem（截图/视频/视觉对比 → 见专章）                     │
│   └─ GatewayClient（WebSocket RPC）                                     │
│                                                                       │
│  调试器 UI                                                             │
│   a) NopDebuggerPanel 页内 Dock（开发态默认形态）                        │
│   b) 独立调试页（同一内核，跨窗口 WebSocket 广播，可选）                  │
└────────────────────────▲──────────────────────────────────────────────┘
                         │ WSS: /devtools/session（JSON-RPC over WebSocket）
┌────────────────────────┴──────────────────────────────────────────────┐
│  nop-entropy Java 后端 —— DevTools Gateway（新模块）                    │
│   ├─ SessionManager（attach/detach/鉴权/权限位/超时放行）               │
│   ├─ ServerInterceptor（服务调用边界 phase 帧，改参/短路/放行）          │
│   ├─ TraceCorrelator（interactionId ↔ traceId/span 合并）              │
│   ├─ SessionStore（会话/诊断包/截图/视频 归档 → 对象存储）               │
│   └─ ReplayService（会话重放任务、视觉基线库、AI 消费口）                 │
└────────────────────────────────────────────────────────────────────────┘
```

模块归属：

| 模块                                   | 仓库/包                                         | 说明                 |
| -------------------------------------- | ----------------------------------------------- | -------------------- |
| StabilityTracker、插件钩子、store 拦截 | flux 仓库（flux-core 契约、flux-runtime 实现）  | P1 seam 扩展         |
| 内核其余全部                           | flux 仓库 `packages/nop-debugger`（可拆子模块） | 已有包扩展           |
| UI 面板                                | flux 仓库（playground + 面板组件）              |                      |
| Gateway / 拦截 / 归档 / 回放服务       | nop-entropy 平台（Java）                        | 平台排期，协议先冻结 |

---

## 3. 插桩层设计

### 3.1 RendererPlugin 扩展（flux-core 契约）

```ts
// packages/flux-core/src/types/renderer-plugin.ts（扩展）
export interface RendererPlugin {
  beforeCompile?(schema: unknown, ctx: CompileContext): void;
  afterCompile?(result: CompileResult, ctx: CompileContext): void;
  beforeAction?(invocation: ActionInvocation, ctx: ActionContext): void;
  afterAction?(result: ActionOutcome, ctx: ActionContext): void; // 新增
  onRender?(span: RenderSpan, ctx: RenderContext): void; // 新增
  onExpressionEval?(trace: EvalTrace, ctx: EvalContext): void; // 新增，采样
  onError?(err: unknown, ctx: ErrorContext): void;
}

export interface RenderSpan {
  cid: string;
  nodeId: string;
  instancePath: string;
  phase: 'resolve' | 'commit' | 'unmount';
  durationMs: number;
  dependencyPaths: readonly string[]; // 来自依赖收集器
}

export interface EvalTrace {
  expressionSource: string;
  nodeId?: string;
  cid?: string;
  readPaths: readonly string[];
  resultPreview?: string; // 截断+脱敏
  error?: { code: string; message: string }; // 如 UnpopulatedScopeAccessError
}
```

实现要点：

- 插件列表为只读数组，调用点为 `plugins.length && plugins.forEach(...)`——P2。
- `onRender` 由 `NodeRenderer` 的 resolve/commit 段埋点提供 `durationMs`（`performance.now()` 差值）；dependencyPaths 复用 `ScopeDependencyCollector`。
- `onExpressionEval` 默认采样率 0，调试器开启"表达式追踪"时设为 1/N；结果预览经 `redactPreview()`（§9）。

### 3.2 ScopeStore 拦截与快照

`ScopeStore.setSnapshot(next, change)`（flux-runtime/src/scope.ts:42）是每 store 唯一写入点。拦截器在 flux-runtime 内提供注册口（而非在调试器里 monkey-patch）：

```ts
// flux-runtime 新增（内核消费）
export interface StoreWriteObserver {
  onWrite(scopeId: string, snapshot: ScopeSnapshot, change: ScopeChange, revision: number): void;
}
runtime.registerStoreWriteObserver(obs: StoreWriteObserver): () => void;
```

一致性算法（scope 森林对齐）：

1. 每次 write 事件到达，内核将其放入当前 `batchEpoch`（以 microtask + `StabilityTracker` 静默窗为界）。
2. epoch 收口时，遍历 `runtime.getLiveScopeIds()`（含 form/page/surface sidecar），读取各 store 的 `{snapshot, revision}`，构造 `ForestSnapshot`：

```ts
interface ForestSnapshot {
  epoch: number; // 单调递增
  interactionId?: string;
  revisions: Record<scopeId, number>;
  scopes: Record<scopeId, ScopeSnapshot>; // 结构共享：未变 scope 复用引用
  capturedAt: number;
}
```

3. 环形历史默认 `maxSnapshots: 200`（可配），淘汰最旧；DOM 影子与截图按需挂引用。
4. 内存控制：`ScopeSnapshot` 本为 immutable 对象，未变子树天然共享；预览序列化（面板用）只做选中 scope 的惰性投影。

### 3.3 StabilityTracker（whenStable 原语）

```ts
class StabilityTracker {
  private counters = { fetch: 0, stream: 0, transition: 0, suspense: 0, scopeDebounce: 0 };
  private waiters: Array<() => void> = [];
  isStable(): boolean; // 全部计数器为 0 且去抖窗静默
  whenStable(timeoutMs?): Promise<void>; // 稳定即 resolve；超时 resolve 并标记 degraded
  onChange(cb: (stable: boolean, reason: string) => void): () => void;
}
```

- 计数源：`decorateDebuggerEnv` 的 fetcher/stream（进入 +1 / settle −1）、React `startTransition`/Suspense 边界（经 `onRender` span 的 phase）、scope 变更去抖窗（默认 50ms 无写）。
- 用途：录制步进、断言重试门、快照 epoch 收口、"应用已稳定"面板指示（对应 Cypress loading spinner）。

### 3.4 Env 装饰（拦截 + stub/spy）

现有 `decorateDebuggerEnv` 扩展为可编程面：

```ts
interface EnvStubRegistry {
  stub(matcher: FetcherMatcher, responder: FakeResponse | (req) => Promise<FakeResponse>): Disposable;
  spy(matcher: FetcherMatcher): CallLog;                  // 只记录
  fakeClock(): ClockController;                           // 接管 setTimeout/Date/now()
  barrier(matcher): (release: (patch?) => void) => void;  // 手动放行/改包（调试用）
}
type FetcherMatcher = { url?: Glob; method?: string; service?: string /* nop 服务名 */ };
```

`stream/openSocket` 同构包装：帧级事件（Cypress 无 WebSocket 帧拦截——超越点之一）。

---

## 4. 事件模型与总线

### 4.1 Log 对象（借鉴 cypress/log.ts，语义化扩展）

```ts
interface DevLog {
  id: string;
  parentId?: string; // 嵌套插入形成的树（§5.2）
  kind: LogKind; // 'action'|'api'|'render'|'eval'|'state'|'assertion'|'capture'|'error'|'intercept'|'lifecycle'
  label: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  startedAt: number;
  endedAt?: number;
  refs: {
    interactionId?: string;
    cid?: string;
    nodeId?: string;
    epoch?: number;
    snapshotId?: string;
    screenshotId?: string;
    spanId?: string; /* Java */
  };
  display: DisplayProps; // 小投影：面板列表直接渲染
  full?: FullProps; // 惰性：inspect 时才从内核取
}
```

### 4.2 总线机制（照抄 Cypress 三技巧 + 网关镜像）

1. **diff 触发**：emit 前 `toJSON()` 深比较（剔除 `updatedAt`），不同才发 `log:added` / `log:changed`。
2. **4ms 节流**：同 id 连续变更合并为尾帧。
3. **display/full 分层**：面板只订阅 display；inspect 走 `kernel.getFullLog(id)`。
4. **网关镜像**：开启远程会话时，同一总线经 `GatewayClient.rpc('log.emit', ...)` 镜像到 Java；网关侧同样 diff/节流后落库。

### 4.3 事件 ↔ 自动化口

`window.__NOP_DEBUGGER_API__` 扩展（保持向后兼容，e2e 探针面不变）：

```ts
interface NopDebuggerApiV2 extends V1 {
  getStability(): { stable: boolean; counters: Record<string, number> };
  getSnapshotAt(epoch: number): SerializedForestSnapshot | null;
  enterPreview(epoch: number): boolean;
  leavePreview(): void;
  waitFor(pred: WaitForPredicate, opts?): Promise<WaitResult>;
  screenshot(opts?: ScreenshotOptions): Promise<ScreenshotResult>; // 见专章
  getSession(): SerializedSession | null;
  replay(session, opts?): ReplayHandle;
}
```

---

## 5. 时间旅行设计

### 5.1 双层快照

| 层     | 内容                                                                    | 采集时机                                   | 还原方式                                                                                                     |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 状态层 | `ForestSnapshot`（全 scope 森林）                                       | 每个 epoch 收口（§3.2）                    | 逐 store `setSnapshot(prev, {kind:'replace', paths:[], sourceScopeId:'__devtools'})`，按拓扑序（子先父）恢复 |
| DOM 层 | DOM 影子（`importNode` 克隆，剥 script，CSS 内容 ID 去重）+ 惰性 attach | 交互步边界（interactionId 结束）或显式标记 | 预览时挂载影子层（§5.3）                                                                                     |

### 5.2 步骤树（嵌套插入，Cypress command_queue.ts:151 移植）

- 用户输入 → 新 interactionId → 根 Log；其触发的 action 若派生子 action（`beforeAction` 期间再 dispatch），子 Log `parentId = 当前执行节点 id` 并插入其父的队首之后。
- 时间轴呈现 = 树的先序遍历；展开节点显示嵌套链（对应 Cypress Command Log）。
- 每个节点挂 `refs.snapshotId`（该步结束时 epoch）与 `refs.screenshotId`（可选自动截图，见专章）。

### 5.3 预览（hover/pin）协议

1. `enterPreview(epoch)`：① 备份活 DOM（再照一次影子）；② 挂载目标 DOM 影子到覆盖层，透明遮罩 + "预览中"横幅；③ 状态层进入**只读虚拟模式**：面板读取 `ForestSnapshot` 渲染 scope 树/表达式求值，**不真正回写 store**（避免副作用）。
2. 可选"深度预览"（显式按钮）：真正回写 store（§5.1 拓扑序），用于交互式探索；任何真实输入（keydown/pointerdown 捕获阶段）立即 `leavePreview()` 还原活 DOM。
3. `pin`：固定某步，跨事件保持（Cypress iframe-model 同款）。

### 5.4 快照 diff 视图

相邻 epoch 的 scope diff：复用 `ScopeChange.paths` + 浅比较叶子，输出路径级增/删/改列表；与 DOM 影子高亮联动（变更路径对应的 cid 高亮——依赖图反查，§7）。

---

## 6. 断言与等待 API（retry-ability）

```ts
type WaitForPredicate =
  | { type: 'cid'; cid: string; state: (inspect: NodeInspect) => boolean }
  | { type: 'scope'; selector: (data: ScopeData) => unknown; until: (v: unknown) => boolean }
  | { type: 'event'; kind: LogKind; match: (log: DevLog) => boolean }
  | { type: 'stability' };

waitFor(pred, { timeoutMs = 4000, intervalMs = 32, stableGate = true }): Promise<WaitResult>;
// WaitResult = { ok: true; attempts: number; durationMs: number } | { ok: false; attempts; lastError; trace: EvalTrace[] }
```

- 每次重试发 `assertion:retry` Log（面板显示尝试次数与最近失败原因）——Cypress retries.ts 语义。
- `stableGate`：每次重试前 `whenStable()`（Cypress :149 同款）。
- 效果/查询二分：`dispatch(action)` 一次执行不重试；`waitFor` 纯查询可重试。e2e 与用户共享同一 API。

---

## 7. 语义层：Why 面板与依赖图（低代码差异化核心）

### 7.1 Why 归因算法

输入：cid + 当前 epoch。输出：归因链。

1. **meta 归因**（disabled/visible/className）：取节点 metaProgram 求值记录 → 列出每条输入（表达式源 → 依赖 scope 路径 → 当时值）→ 定位令其为假的路径。
2. **props 归因**：同上，针对目标 prop。
3. **不渲染归因**：`visible=false`？父容器 region 未激活？异常被 error boundary 吞（取 `onError` Log）？
4. **reaction 归因**：该节点的 reactionPlans 逐条评估命中条件，展示未命中谓词。
5. **数据归因**：值来自哪条 source/reaction/上游 action 写入——反查快照 diff 历史（哪个 epoch 首次写入该路径）。

实现底座：`explanations.ts`（已有）+ 依赖收集器路径 + 快照历史；产出 `WhyReport { question, verdict, evidence: EvidenceLink[] }`，evidence 均可点击跳转（时间轴 epoch / cid / 表达式）。

### 7.2 依赖图

- 节点：scope 路径、表达式（源码+cid）、reaction plan、cid。
- 边：写边（action/source 写路径，来自快照 diff）、读边（依赖收集器）、派生边（region/slot）。
- 用途：变更影响分析（"改这个路径会影响哪些节点"）、写-读竞态检查（同一 epoch 内先读后写 → 警告）。
- 渲染：面板内力导向/分层图，大数据量（>2k 边）退化为路径查询而非全图。

### 7.3 cid 选择器（Selector Playground 免启发式版）

点选元素 → `data-cid` 直达节点；同时给出传统 selector（`data-test` > `data-cid` > 最短唯一 CSS，`getBestSelector` 思路）供测试代码复制。

---

## 8. 录制与确定性回放

### 8.1 会话格式（v1，JSON）

```ts
interface DevSession {
  version: 1;
  meta: { appVersion; schemaFingerprint; startedAt; userAgent; locale };
  clock: { origin: number; events: ClockEvent[] }; // fake-clock 需要
  inputs: InputEvent[]; // 归一化 FluxActionEvent 载荷（含目标 cid、事件类型、payload 快照）
  envFrames: EnvFrame[]; // fetcher/stream 录制响应（脱敏，按 requestId 关联）
  checkpoints: Checkpoint[]; // 每 N 步 ForestSnapshot 摘要（revision 向量 + 关键路径哈希）
  logs: DevLog[]; // display 投影，供回放对照
}
```

### 8.2 回放器

1. 新建独立 `SchemaRenderer`（可挂在隐藏容器或独立调试页 iframe）。
2. fake-clock 驱动时间；fetcher 全部 stub 到 envFrames；输入按序 dispatch。
3. 每步后比较实际 `ForestSnapshot` 摘要与录制 checkpoint：一致 → 绿；分歧 → 记录 `Divergence { step, path, expected, actual }` 并可停在该状态供检查（**超越点：Cypress 无任何会话回放**）。
4. 副作用策略：默认全部 stub（navigate/dialog/print 记录不执行）；"半真模式"可选放行白名单。

### 8.3 与诊断包的关系

生产诊断包 = 脱敏 DevSession（可含关键截图）；工程师在开发环境 `replay(诊断包)` 复现问题——M7 的核心场景。

---

## 9. 安全、脱敏与权限

1. **redaction.ts 扩展**：路径规则（glob）+ 值规则（正则，如手机号/token）；应用于：full props、快照序列化、录制帧、截图 DOM 遮罩（专章）、上传前终检。
2. **网关鉴权**：调试会话绑定平台账号 + `devtools:debug` / `devtools:intercept-write` / `devtools:replay-others` 权限位；无权限只读镜像。
3. **拦截帧安全**：`before:handler` 改参默认禁用，开启需会话级确认 + 审计记录（复用 schema-patch 审计模式）。
4. **生产开关**：构建宏裁剪（`__FLUX_DEVTOOLS__`），生产仅保留错误遥测 + 诊断包采集器（最小内核）。

---

## 10. Java 网关设计（nop-entropy）

### 10.1 模块

```
devtools-gateway/
  api/        WSS endpoint、会话 REST（列表/归档/下载）
  session/    SessionManager（attach/detach/心跳/超时放行）
  intercept/  ServerInterceptor（服务调用边界织入，phase 帧编排）
  correlate/  TraceCorrelator（interactionId ↔ traceId/span）
  store/      SessionStore（DB 元数据 + 对象存储媒体：截图/视频/会话）
  replay/     ReplayService（服务端重放调度、视觉基线库）
```

### 10.2 RPC 协议（JSON over WSS，先冻结）

```ts
// 请求
{ id: string; method: string; params?: unknown }        // method 如 'log.emit','intercept.register','session.attach'
// 响应
{ id: string; result?: unknown; error?: { code: string; message: string } }
// 服务端推送
{ event: string; payload: unknown }                     // 如 'intercept.frame','session.forceDetach'
```

拦截帧（镜像 Cypress net-stubbing，两方 await/continue）：

```ts
// Java → 前端
{ event: 'intercept.frame', payload: {
    eventId: string; phase: 'before:handler'|'after:handler';
    service: string; requestId: string; interactionId?: string;
    args?: unknown /* before */ | { result?: unknown, durationMs } /* after */;
    timeoutMs: 3000 }}
// 前端 → Java
{ id: eventId, method: 'intercept.resolve', params:
    { action: 'continue' } | { action: 'modify', patch: JsonPatch } | { action: 'shortCircuit', response: unknown } }
```

超时未 resolve → Java 自动 continue 并标记 `degraded`（不阻塞业务，§风险）。

### 10.3 合并时间轴

`TraceCorrelator` 以 interactionId 为键把 Java span（耗时、服务名、SQL 摘要、异常）挂到前端 Log 树的同名节点；面板时间轴双泳道渲染（前端 action/api 段 + 后端 span 段），点击互跳。

---

## 11. 性能设计

| 项                      | 预算           | 手段                                                                        |
| ----------------------- | -------------- | --------------------------------------------------------------------------- |
| 无监听者插桩            | ≈0（<1% 噪声） | 订阅数组长度快速路径（P2）                                                  |
| 开启后交互 P95 延迟增幅 | <10%           | 事件 diff/节流；快照结构共享；DOM 影子惰性；表达式采样                      |
| 快照内存                | 默认 <50MB     | 环形上限 + 结构共享 + 影子/截图按需；超限自动降采样（每 k 个 epoch 保留 1） |
| 截图/视频               | 见专章预算     |                                                                             |
| 网关                    | 不阻塞业务线程 | 拦截帧异步编排 + 超时放行；网关独立线程池                                   |

微基准脚本入 `scripts/__tests__/`，作为每阶段 CI 红线。

---

## 12. 测试策略

- **Must automate**：快照一致性（scope 森林）、时间旅行还原、回放确定性（含注入随机的分歧检测）、拦截协议（前端↔模拟网关）、脱敏、截图管线（固定 DOM → 像素哈希）、零成本插桩基准。
- **Should have**：Why 归因用例集（"disabled 之谜"等）、依赖图查询、面板交互 e2e。
- UI 断言一律程序化（`page.evaluate`），截图仅辅助诊断（AGENTS.md 政策）。

## 13. 风险登记

| 风险                   | 等级 | 缓解                                                                                         |
| ---------------------- | ---- | -------------------------------------------------------------------------------------------- |
| store 回写引发级联反应 | 中   | 深度预览限显式触发；`sourceScopeId:'__devtools'` 可被 reaction 过滤                          |
| 回放不确定性           | 高   | fake-clock + envFrames + checkpoint 分歧检测即为此而生；无法消除则降级为"近似回放+diff 报告" |
| 截图跨域资源污染       | 中   | 专章 §3 降级链                                                                               |
| 网关复杂度侵入业务     | 中   | 协议先行、只读默认、超时放行、独立模块                                                       |
| 面板体积进生产包       | 低   | 构建宏裁剪 + 动态 import                                                                     |

## 14. 里程碑映射

见 [Roadmap](./2026-11-17-flux-debugger-roadmap.md) M1–M7；本文档各节 ↔ 里程碑：§3–§4→M1；§5→M2；§6→M3；§7→M4；§8→M5；§10→M6；§9+诊断包→M7。截图/视频（专章）横跨 M2/M5/M6/M7。
