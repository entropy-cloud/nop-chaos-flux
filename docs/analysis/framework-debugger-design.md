# 框架级调试器设计草案

> 角色说明: 本文是面向实现前讨论的设计草案，记录当前仓库约束、目标范围和推荐方案，不是已经落地的最终架构契约。

> 设计日期: 2026-03-20

## 1. 背景

当前仓库已经具备一部分可观测能力，但它们还没有形成一个独立、统一、可复用的框架级调试器：

- `apps/playground/src/App.tsx` 中已经有一个本地的 `Live Monitor / Runtime Activity` 面板
- `packages/amis-react/src/index.tsx` 已经会通过 `env.monitor` 发出 render 相关事件
- `packages/amis-runtime/src/action-runtime.ts` 已经会发出 action 和部分 api 相关事件
- `packages/amis-runtime/src/request-runtime.ts` 已经具备请求执行层的切入点
- `packages/amis-schema/src/index.ts` 已经定义了 `RendererMonitor`、`RendererPlugin`、`ErrorMonitorPayload` 等契约

这说明仓库并不缺少“调试数据来源”，缺的是一套：

- 独立 package 形式的调试器能力
- 统一事件模型
- 全局开关和宿主接入方式
- 漂浮、可拖拽、可折叠、可隐藏的调试 UI
- 比 playground 现有日志页更完整的关键信息展示

## 2. 设计目标

本次调试器设计的目标是：

1. 提供一个独立 package 的框架级调试器，避免把调试逻辑继续堆在 `apps/playground` 中。
2. 通过 `window` 上的全局开关控制调试器是否启用。
3. 默认以漂浮面板方式显示，可拖拽位置，可折叠、可隐藏。
4. 隐藏后保留一个不影响页面操作的入口，例如左下角 launcher。
5. 覆盖框架关键生命周期信息，而不只是简单的日志滚动列表。
6. 尽量复用当前仓库已有的 `monitor`、`plugin`、`fetcher`、`notify` 注入能力。
7. 参考 `C:/can/nop/templates/amis` 的调试器思路，但不直接复制实现和交互模型。

## 3. 当前仓库约束和架构依据

### 3.1 仓库结构

当前仓库是一个 `pnpm` monorepo，关键结构如下：

- `apps/playground/` 是当前第一集成面
- `packages/amis-schema/` 定义契约层
- `packages/amis-runtime/` 负责编译、动作、请求、页面、表单运行时
- `packages/amis-react/` 负责 React 集成和渲染边界
- `packages/amis-renderers-*` 是具体 renderer 实现

从依赖边界看，调试器最适合站在 `SchemaRenderer` 根边界之外接入，而不是侵入某个 renderer 包内部。

### 3.2 当前已有调试相关能力

已有能力的主要锚点如下：

- `packages/amis-schema/src/index.ts`
  - `RendererMonitor`
  - `RendererPlugin`
  - `ErrorMonitorPayload`
- `packages/amis-react/src/index.tsx`
  - `NodeRenderer` 中发出 `onRenderStart` / `onRenderEnd`
- `packages/amis-runtime/src/action-runtime.ts`
  - 发出 `onActionStart` / `onActionEnd`
  - 在部分 action 中发出 `onApiRequest`
- `packages/amis-runtime/src/request-runtime.ts`
  - 请求执行层也会发出 `onApiRequest`
- `apps/playground/src/App.tsx`
  - 已经将 `render` / `action` / `api` / `notify` 事件组织成右侧日志面板

### 3.3 对调试器设计最重要的现实约束

1. 当前 `onApiRequest` 存在双来源：动作层和请求执行层都可能上报。
2. 当前没有统一的 `api:end`、`api:error`、`api:abort` 事件，需要靠包装 `env.fetcher` 补齐。
3. 当前 `RendererMonitor.onError` 虽然有契约，但错误链路还没有完全统一，不能只依赖它。
4. 当前没有公开的 form/page store 调试订阅接口，所以第一版不应强耦合内部 store 私有实现。
5. 当前最稳定的宿主接入边界是 `SchemaRendererProps` 暴露出的：
   - `env`
   - `plugins`
   - `onActionError`

## 4. 对参考调试器的取舍

参考路径：`C:/can/nop/templates/amis`

### 4.1 值得借鉴的部分

- 通过全局开关控制是否启用调试器
- 调试 UI 独立挂载，不嵌入业务渲染树内部
- 同时提供日志视角和 inspect 视角，而不是只有一块纯日志列表
- 只抓关键链路，而不是无上限打印所有细节
- 对组件实例和页面元素建立映射关系，便于定位问题

### 4.2 不建议照搬的部分

- 不建议直接使用 `findDOMNode`
- 不建议做成单一全局单例和全局可变注册表
- 不建议大量依赖 document 级事件和脆弱的 DOM 查询逻辑
- 不建议只做“右侧固定边栏 + 宽度 resize”这一种形态
- 不建议沿用过于松散的日志结构，应该从第一版就统一事件模型

## 5. 推荐产物形态

推荐新增独立 package：

- `@nop-chaos/amis-debugger`

推荐定位：

- 它是一个框架级调试器 package
- 负责采集、归一化、存储、展示调试信息
- 不负责业务逻辑
- 不直接依赖具体 renderer 包实现

## 6. package 边界设计

### 6.1 依赖边界

建议依赖：

- `@nop-chaos/amis-schema`
- `react`
- `react-dom`（如果面板通过 portal 挂到 body）

第一版尽量不要直接依赖：

- `@nop-chaos/amis-runtime`
- `@nop-chaos/amis-react`
- `@nop-chaos/amis-renderers-basic`
- `@nop-chaos/amis-renderers-form`
- `@nop-chaos/amis-renderers-data`

原因是调试器应依赖“契约层”，而不是依赖“实现层”。

### 6.2 推荐目录结构

建议 package 结构类似：

```text
packages/amis-debugger/
  package.json
  src/
    index.ts
    types.ts
    window-gate.ts
    controller/
      create-debugger-controller.ts
      debugger-store.ts
      timeline.ts
      dedupe.ts
    adapters/
      decorate-env.ts
      create-monitor.ts
      create-plugin.ts
      create-error-handler.ts
    react/
      DebuggerPanel.tsx
      DebuggerLauncher.tsx
      DebuggerProvider.tsx
      use-draggable.ts
      use-debugger-state.ts
    ui/
      debugger.css
```

## 7. 宿主接入方式

### 7.1 最合适的挂载点

最推荐的挂载点是 `SchemaRenderer` 的宿主边界，也就是当前类似 `apps/playground/src/App.tsx` 这种位置。

原因：

- 这是当前仓库最稳定、最明确的注入点
- 可以同时接入 `env`、`plugins`、`onActionError`
- 不会污染具体 renderer 组件实现
- 调试 UI 可以作为 `SchemaRenderer` 的 sibling 存在，真正独立于 schema 渲染树

### 7.2 推荐接入 API

建议调试器 package 暴露一个高层组装器：

```ts
const debuggerController = createAmisDebugger({
  id: 'playground-main'
});

const env = debuggerController.decorateEnv(baseEnv);
const plugins = [...basePlugins, debuggerController.plugin];
const onActionError = debuggerController.onActionError;
```

然后在宿主根部渲染：

```tsx
<>
  <SchemaRenderer
    schema={schema}
    data={data}
    env={env}
    plugins={plugins}
    onActionError={onActionError}
  />
  <AmisDebuggerPanel controller={debuggerController} />
</>
```

这样做的好处是：

- 宿主改造面小
- 调试器 UI 生命周期与 schema 节点生命周期解耦
- 后续可以支持一个页面多个 renderer root

## 8. `window` 全局开关设计

用户要求通过 `window` 上的全局开关控制调试器是否显示，建议做成两级语义：

### 8.1 全局启用开关

建议主开关：

```ts
window.__NOP_AMIS_DEBUGGER__
```

允许两种形式：

```ts
window.__NOP_AMIS_DEBUGGER__ = true;
window.__NOP_AMIS_DEBUGGER__ = {
  enabled: true,
  defaultOpen: true,
  defaultTab: 'timeline',
  position: { x: 24, y: 24 },
  dock: 'floating'
};
```

含义建议如下：

- `false` 或未设置: 不启用调试器，不渲染面板，也不渲染 launcher
- `true`: 启用调试器，按默认配置运行
- 对象: 启用调试器，并覆盖默认行为

### 8.2 运行时显隐开关

即使调试器启用，也需要支持用户在运行时隐藏面板，但保留一个极小 launcher。

建议区分：

- “全局禁用”: 由 `window.__NOP_AMIS_DEBUGGER__` 决定
- “面板隐藏”: 调试器仍启用，但 UI 折叠为左下角 launcher

这样可以满足：

- 开发或联调时打开调试器
- 页面正常使用时将其隐藏，不影响操作
- 需要时随时从左下角重新拉起

## 9. 事件采集设计

调试器不应直接暴露底层 monitor 原始事件，而应先归一化成统一 timeline 事件。

### 9.1 事件来源

建议采集五类来源：

1. `env.monitor`
   - render start/end
   - action start/end
   - api request

2. `RendererPlugin`
   - `beforeCompile`
   - `afterCompile`
   - `beforeAction`
   - `onError`
   - 可选 `wrapComponent`

3. `env.fetcher` 包装
   - request start
   - response end
   - abort
   - error
   - duration

4. `env.notify` 包装
   - info / success / warning / error 通知

5. 根级 `onActionError`
   - 作为动作错误兜底

### 9.2 统一事件模型

建议内部统一成如下事件种类：

- `compile:start`
- `compile:end`
- `render:start`
- `render:end`
- `action:start`
- `action:end`
- `api:start`
- `api:end`
- `api:abort`
- `notify`
- `error`
- `state:snapshot`

建议每条事件至少包含：

- `id`
- `sessionId`
- `timestamp`
- `kind`
- `source`
- `nodeId?`
- `path?`
- `rendererType?`
- `actionType?`
- `requestKey?`
- `durationMs?`
- `summary`
- `detail`

其中：

- `summary` 用于列表快速阅读
- `detail` 用于详情区或 JSON 查看器

### 9.3 双重 API 上报的处理

由于当前仓库里 `onApiRequest` 可能同时来自动作层和请求层，调试器必须在内部做下列之一：

- 去重
- 或者明确标记 `source: action-runtime | request-runtime | fetcher`

推荐方案是：

- timeline 中只保留一条主 `api:start`
- 额外把其它来源作为事件附属元数据

避免一发请求在 UI 中出现两到三条几乎重复的开始日志。

## 10. UI 形态设计

### 10.1 基本形态

调试器 UI 建议不是固定右侧边栏，而是一个可拖拽的漂浮面板：

- 默认浮在页面上层
- 可拖拽移动位置
- 支持最小化
- 支持关闭为 launcher
- 支持记忆上次位置

原因：

- 比右侧固定栏更不占页面结构空间
- 更适合复杂页面和多栏布局
- 更符合“调试时打开，不调试时尽量不干扰”的目标

### 10.2 隐藏后的 launcher

当面板隐藏后，建议在左下角显示一个小型 launcher：

- 尺寸小
- 高 z-index
- 不覆盖主要交互区
- 可以显示最近错误数量或未读事件数

推荐默认位置：

- 左下角，距离视口边缘 `16px ~ 24px`

### 10.3 推荐面板布局

第一版建议面板分为三层：

1. 顶部状态栏
   - 启用状态
   - 当前 session
   - 暂停采集
   - 清空事件
   - 最小化
   - 关闭为 launcher

2. 中部 Tab 区
   - `Overview`
   - `Timeline`
   - `Node`
   - `Network`

3. 底部详情区
   - 当前选中事件详情
   - JSON 展开查看
   - 关键字段摘要

### 10.4 推荐 Tab 设计

#### Overview

显示“当前框架是否健康、活跃”的摘要信息：

- 最近一次 compile 时间
- 最近一次 action
- 最近一次请求
- 最近错误数
- 当前事件吞吐量
- 当前 schema root 数量

#### Timeline

替代 playground 当前的简单日志面板，成为第一主视图：

- 时间倒序事件流
- 分类筛选
- 关键字搜索
- 暂停流式写入
- 清空
- 只看错误
- 只看当前节点

#### Node

用于看“某个节点为什么这样渲染”：

- 当前选中节点 `nodeId`
- `path`
- `rendererType`
- 最近 render 次数和耗时
- 最近 action 触发记录
- 可用时显示 meta / props 摘要

第一版不要求完整复刻 amis 原调试器的 DOM inspect，但应预留后续接入空间。

#### Network

用于看 API 生命周期：

- 请求方法、URL、状态
- 持续时间
- 来源节点
- action 触发链路
- 请求参数摘要
- 响应摘要
- 取消状态

## 11. 必须展示的关键信息

根据当前仓库架构，以下信息属于“关键性信息”，应优先纳入第一版或第一阶段增强版。

### 11.1 第一优先级

- render 完成事件
- action 开始/结束
- API 开始/结束/取消/失败
- notify 消息
- compile 开始/完成
- action 级错误
- request 级错误

### 11.2 第二优先级

- 事件关联的 `nodeId`、`path`、`rendererType`
- action 结果状态，例如 success / failed / cancelled
- API duration
- 当前 session 内的错误统计
- 最近一次交互链路摘要

### 11.3 第三优先级

- 当前节点 props 摘要
- 当前节点 meta 摘要
- 当前作用域数据快照摘要
- 编译后的节点结构摘要
- 调试器内部性能统计

## 12. 交互功能清单

建议功能按阶段拆分。

### 12.1 MVP 必须包含

- `window` 全局启用开关
- 漂浮面板
- 拖拽移动
- 最小化 / 隐藏
- 左下角 launcher
- Timeline 事件流
- render/action/api/notify/error/compile 分类展示
- 筛选
- 暂停
- 清空
- 事件详情查看

### 12.2 第一阶段增强

- Network 专项视图
- 错误聚合视图
- 事件搜索
- 面板位置持久化
- 最近错误角标
- API 去重与链路归并

### 12.3 第二阶段增强

- 节点 inspect
- 节点级 render 统计
- 选中节点最近事件过滤
- 作用域快照查看
- 编译结果摘要

### 12.4 暂不建议放入第一版

- 完整 DOM inspect 选取器
- 通过表达式执行器直接运行任意 JS
- 深度订阅内部 form/page store 私有状态
- 远程上传日志
- action replay

## 13. 状态与性能设计

调试器是开发工具，但仍然不能明显拖慢页面。

### 13.1 存储策略

建议内部维护一个 session 级 store：

- 内存态时间线
- 默认事件上限，例如 300 ~ 500 条
- 超出上限时丢弃最旧事件

### 13.2 UI 性能策略

- 列表虚拟化不是第一版必须项，但要预留
- JSON 详情按需展开
- 大对象只展示摘要，原始内容惰性查看
- render 高频事件可做合并或节流

### 13.3 安全与环境边界

- 默认只在开发环境启用
- 生产环境除非显式开启，否则不加载 UI
- 对 request/response 数据支持脱敏策略
- 不默认展示敏感 header、token、cookie

## 14. 推荐 API 草案

建议对外暴露以下能力：

```ts
export interface AmisDebuggerOptions {
  id?: string;
  enabled?: boolean;
  maxEvents?: number;
  launcherPosition?: 'left-bottom';
}

export interface AmisDebuggerController {
  enabled: boolean;
  plugin: RendererPlugin;
  decorateEnv(env: RendererEnv): RendererEnv;
  onActionError(error: unknown, context: ActionContext): void;
  show(): void;
  hide(): void;
  toggle(): void;
  clear(): void;
  pause(): void;
  resume(): void;
}

export function createAmisDebugger(options?: AmisDebuggerOptions): AmisDebuggerController;
export function AmisDebuggerPanel(props: { controller: AmisDebuggerController }): React.ReactElement | null;
```

## 15. 面向 AI 自动诊断的内置支持

调试器不仅要方便人类开发者看面板，也必须方便 AI 代理自动读取状态、检索事件、等待异步结果、生成诊断报告。

这意味着调试器需要同时提供两层接口：

1. 面向宿主接入的 UI/controller 接口
2. 面向自动化诊断的稳定 automation API

### 15.1 设计原则

面向 AI 的接口需要满足：

- 结构化，避免只能解析自然语言日志
- 稳定，避免依赖 UI DOM 结构
- 可查询，支持按 `kind`、`group`、`nodeId`、`path`、`actionType`、`requestKey` 等字段过滤
- 可等待，支持“等待某类事件出现后再继续”
- 可摘要，支持快速产出诊断报告，而不是让 AI 每次都自己重扫全部事件
- 可发现，允许通过 `window` 上的全局对象直接拿到当前调试控制器或调试 hub

### 15.2 推荐自动化 API 形态

建议 `@nop-chaos/amis-debugger` 暴露一套明确的 automation API：

```ts
export interface AmisDebuggerAutomationApi {
  controllerId: string;
  sessionId: string;
  version: '1';
  getSnapshot(): AmisDebuggerSnapshot;
  getOverview(): AmisDebuggerOverview;
  queryEvents(query?: AmisDebugEventQuery): AmisDebugEvent[];
  getLatestEvent(query?: AmisDebugEventQuery): AmisDebugEvent | undefined;
  getLatestError(): AmisDebugEvent | undefined;
  createDiagnosticReport(options?: AmisDiagnosticReportOptions): AmisDiagnosticReport;
  waitForEvent(options?: AmisWaitForEventOptions): Promise<AmisDebugEvent>;
  clear(): void;
  pause(): void;
  resume(): void;
  show(): void;
  hide(): void;
  toggle(): void;
  setActiveTab(tab: AmisDebuggerTab): void;
  setPanelPosition(position: { x: number; y: number }): void;
}
```

其中最关键的是：

- `queryEvents()` 让 AI 直接做结构化检索
- `getLatestEvent()` 让 AI 快速获取某类最新状态
- `getLatestError()` 让 AI 直接定位最近错误
- `createDiagnosticReport()` 让 AI 快速获取可以直接用于推理的摘要
- `waitForEvent()` 让 AI 可以在自动交互流程里等待请求结束、错误出现、动作完成

### 15.3 推荐查询模型

建议事件查询对象至少支持：

- `kind`
- `group`
- `level`
- `source`
- `nodeId`
- `path`
- `rendererType`
- `actionType`
- `requestKey`
- `text`
- `sinceTimestamp`
- `untilTimestamp`
- `limit`

这样 AI 就可以执行类似诊断：

- 找最近 10 条 error
- 找某个 `nodeId` 的 render/action 事件
- 找 `/api/users` 相关请求
- 找最近一次 `submitForm` 的结束结果
- 找某个时间点之后新增的所有错误

### 15.4 推荐全局暴露方式

为了方便 browser automation、Playwright、DevTools Console、AI agent 直接读取，建议在 `window` 上暴露：

```ts
window.__NOP_AMIS_DEBUGGER_API__
window.__NOP_AMIS_DEBUGGER_HUB__
```

语义建议：

- `__NOP_AMIS_DEBUGGER_API__` 指向当前活动 controller 的 automation API
- `__NOP_AMIS_DEBUGGER_HUB__` 用于多实例场景，按 `controllerId` 管理多个调试器实例

示例：

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;
const latestError = api?.getLatestError();
const report = api?.createDiagnosticReport({ eventLimit: 25 });
```

多实例示例：

```ts
const hub = window.__NOP_AMIS_DEBUGGER_HUB__;
const controller = hub?.getController('playground-main');
const renderEvents = controller?.queryEvents({ group: 'render', limit: 20 });
```

等待事件示例：

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;

await api?.waitForEvent({
  kind: 'api:end',
  text: '/api/users',
  timeoutMs: 5000
});
```

诊断报告示例：

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;

const report = api?.createDiagnosticReport({
  eventLimit: 25,
  query: {
    sinceTimestamp: Date.now() - 10_000
  }
});
```

### 15.5 推荐诊断报告结构

建议内置一类稳定摘要对象，而不是让 AI 每次都手写聚合逻辑：

```ts
export interface AmisDiagnosticReport {
  controllerId: string;
  sessionId: string;
  generatedAt: number;
  snapshot: {
    enabled: boolean;
    panelOpen: boolean;
    paused: boolean;
    activeTab: AmisDebuggerTab;
    filters: AmisDebuggerFilterKind[];
  };
  overview: AmisDebuggerOverview;
  latestError?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  recentEvents: AmisDebugEvent[];
}
```

这类结构特别适合：

- AI 在自动化失败后快速做首轮归因
- issue bot 自动附加调试摘要
- 回归测试失败时生成结构化诊断上下文

### 15.6 结构化 network 摘要

为了避免 AI 只能解析 `detail` 字符串，建议所有 API 相关事件都尽量携带独立的结构化 `network` 字段，例如：

```ts
export interface AmisDebugEventNetworkSummary {
  method: string;
  url: string;
  status?: number;
  ok?: boolean;
  aborted?: boolean;
  requestDataKeys?: string[];
  responseDataKeys?: string[];
  responseType?: string;
}
```

推荐用途：

- AI 判断请求是否成功，不必解析 `summary`
- AI 看请求/响应大致结构，不必展开整个 payload
- AI 按 `url`、`status`、`requestDataKeys` 做快速筛选和归因

### 15.7 节点级诊断接口

建议内置一个节点聚合诊断接口，而不是每次都让 AI 先 `queryEvents()` 再自己聚合：

```ts
export interface AmisNodeDiagnosticsOptions {
  nodeId?: string;
  path?: string;
  limit?: number;
}

export interface AmisNodeDiagnostics {
  nodeId?: string;
  path?: string;
  rendererTypes: string[];
  totalEvents: number;
  countsByGroup: Partial<Record<AmisDebuggerFilterKind, number>>;
  countsByKind: Partial<Record<AmisDebugEventKind, number>>;
  latestRender?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestError?: AmisDebugEvent;
  recentEvents: AmisDebugEvent[];
}
```

这样 AI 可以直接执行：

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;
const nodeDiagnostics = api?.getNodeDiagnostics({ nodeId: 'user-form' });
```

而不是自己二次扫描整条时间线。

### 15.8 交互链路与 session 导出接口

除了单事件查询和单节点诊断，还建议提供两类更高层接口：

1. `getInteractionTrace()`
2. `exportSession()`

推荐形态：

```ts
export interface AmisInteractionTraceQuery {
  requestKey?: string;
  actionType?: string;
  nodeId?: string;
  path?: string;
  sinceTimestamp?: number;
  untilTimestamp?: number;
  limit?: number;
}

export interface AmisInteractionTrace {
  query: AmisInteractionTraceQuery;
  totalEvents: number;
  matchedEvents: AmisDebugEvent[];
  relatedErrors: AmisDebugEvent[];
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  latestError?: AmisDebugEvent;
  requestKeys: string[];
  actionTypes: string[];
  nodeIds: string[];
  paths: string[];
}

export interface AmisDebuggerSessionExport {
  controllerId: string;
  sessionId: string;
  generatedAt: number;
  snapshot: AmisDebuggerSnapshot;
  overview: AmisDebuggerOverview;
  latestError?: AmisDebugEvent;
  latestAction?: AmisDebugEvent;
  latestApi?: AmisDebugEvent;
  events: AmisDebugEvent[];
}
```

用途建议：

- `getInteractionTrace()` 适合 AI 在一次点击、一次提交、一次请求失败之后追踪相关链路
- `exportSession()` 适合 AI、测试框架、issue bot、CI 产出稳定 JSON 快照

示例：

```ts
const api = window.__NOP_AMIS_DEBUGGER_API__;

const trace = api?.getInteractionTrace({
  path: 'body.1'
});

const exported = api?.exportSession({
  eventLimit: 50
});
```

### 15.9 脱敏与安全导出

由于 AI 调试器最终可能接入真实接口，请求和响应中可能包含敏感字段，因此建议导出能力默认支持脱敏。

推荐配置：

```ts
export interface AmisDebuggerRedactionOptions {
  enabled?: boolean;
  redactKeys?: string[];
  mask?: string;
  maxDepth?: number;
  redactValue?(context: AmisDebuggerRedactionMatchContext): unknown;
  allowValue?(context: AmisDebuggerRedactionMatchContext): boolean;
}
```

推荐默认脱敏关键字：

- `token`
- `authorization`
- `cookie`
- `password`
- `secret`
- `accessKey`
- `refreshToken`

设计建议：

- UI 可继续展示高层摘要
- `exportSession()` 输出时对结构化 `exportedData` 做脱敏
- 网络事件中保留 `requestDataKeys` / `responseDataKeys` 这样的 shape 信息，避免 AI 因脱敏而完全失去上下文
- 允许宿主通过 `redaction` 配置覆盖默认规则

这样可以平衡两件事：

- AI 足够拿到可分析的结构信息
- 导出的 JSON 不轻易泄露敏感值

### 15.10 不建议 AI 依赖的对象

不建议把以下内容当成 AI 主接口：

- 调试面板 DOM 结构
- 文本渲染后的视觉布局
- CSS class 是否存在
- 浏览器控制台里的人类可读字符串日志

原因是这些接口不稳定、易变、难以结构化消费。

AI 的主接口应该始终是：

- controller 方法
- automation API
- 全局 hub
- 结构化 diagnostic report

## 16. 推荐实现顺序

### Phase 1: 核心采集和 Timeline

- 新建 `packages/amis-debugger`
- 完成 `window` 开关判断
- 完成 controller/store/timeline
- 完成 `env` 装饰和 `plugin` 注入
- 完成基础浮动面板和 launcher
- 在 playground 接入验证

### Phase 2: Network 和错误视图

- 包装 `fetcher`，补齐 `api:end` / `api:error` / `api:abort`
- 建立请求去重和链路关联
- 增加错误聚合与详情

### Phase 3: Node 视图增强

- 补充节点级统计
- 增加节点上下文摘要
- 评估是否需要更轻量的 inspect 能力

## 17. 对 playground 现有日志页的替代关系

当前 `apps/playground/src/App.tsx` 中的右侧日志面板可以视为原型验证。正式调试器落地后，建议关系如下：

- playground 不再自己维护一套独立活动日志模型
- playground 改为接入 `@nop-chaos/amis-debugger`
- playground 可以保留少量 demo 配置代码，但不再持有完整调试 UI 逻辑

这样可以保证：

- 调试能力从 demo 代码上升为框架能力
- 未来其它 app 也可以接入同一套调试器
- playground 本身回归“集成验证面”，而不是“调试器实现容器”

## 18. 最终建议

综合当前仓库架构、现有 monitor 能力和参考实现经验，推荐结论如下：

1. 新增独立 package `@nop-chaos/amis-debugger`。
2. 以 `SchemaRenderer` 宿主根边界作为唯一主接入点。
3. 通过 `window.__NOP_AMIS_DEBUGGER__` 作为全局启用开关。
4. 调试器 UI 采用漂浮、可拖拽、可隐藏的面板，而不是固定右侧栏。
5. 隐藏后保留左下角 launcher，保证不影响页面正常使用。
6. 第一版聚焦 `compile + render + action + api + notify + error` 六类关键信息。
7. 调试器内部必须先建立统一 timeline 事件模型，再决定 UI 如何展示。
8. 不直接复制参考 amis 调试器的 DOM 和全局单例实现，但借鉴其“全局开关、独立浮层、日志 + inspect 双视角”的思路。
9. 必须内置面向 AI 的 automation API、全局 hub 和结构化 diagnostic report，避免 AI 只能通过读 UI 文本来诊断问题。

## 19. 关键代码锚点

当前仓库：

- `apps/playground/src/App.tsx`
- `packages/amis-schema/src/index.ts`
- `packages/amis-react/src/index.tsx`
- `packages/amis-runtime/src/action-runtime.ts`
- `packages/amis-runtime/src/request-runtime.ts`
- `docs/architecture/frontend-baseline.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/amis-runtime-module-boundaries.md`

参考实现：

- `C:/can/nop/templates/amis/packages/amis-core/src/utils/debug.tsx`
- `C:/can/nop/templates/amis/packages/amis-core/src/SchemaRenderer.tsx`
- `C:/can/nop/templates/amis/packages/amis-core/src/factory.tsx`
- `C:/can/nop/templates/amis/docs/zh-CN/extend/debug.md`
