# 遥测监控 (Monitor)

> Flux 的 Monitor 是一套轻量、可插拔的运行时遥测接口。Monitor **独立于 `RendererEnv`**，作为 `<SchemaRenderer>` 的一个可选 prop 传入，宿主可以完全不传（默认不启用，零事件开销）。

> Status: active（本文件描述当前 live 实现）
> 实现范围：**仅 `error` 事件变体**（渲染期错误 + 动作诊断错误，plan 841 落地）。其余事件族（动作生命周期、API、渲染生命周期、表达式诊断等）尚未实现，见「已知缺口」。

---

## 设计原则

1. **单一函数**：Monitor 是一个函数 `onEvent(event)`，没有多个钩子。新增事件类型只需新增 discriminated union 变体，不需要改接口。
2. **独立于 env**：Monitor 不作为 `RendererEnv` 的属性，而是 `<SchemaRenderer monitor={onEvent}>` 的一个独立 prop。这样清晰分离"宿主能力"（env）和"运行时观测"（monitor）。
3. **同步 fire-and-forget**：`onEvent` 同步调用、无返回值、不参与业务控制流。运行时不依赖 monitor 的返回值；monitor 自身 throw 会被 `try/catch` 捕获并 `console.warn`，不影响业务逻辑（`emitMonitorError` / action-execution 的 emit 包裹均遵循此契约）。
4. **E2E 友好**：Monitor 的事件流可以被宿主挂到 `window` 上供 E2E 测试读取，也可以传给自研埋点 / APM 系统。

---

## 接口定义（已实现）

类型位于 `packages/flux-core/src/types/monitor.ts`，经 `@nop-chaos/flux-core` 公开导出：

```typescript
export interface RendererMonitorErrorEvent {
  type: 'error';
  phase: 'compile' | 'render' | 'action' | 'expression' | 'api';
  error: unknown;
  nodeId?: string;
  path?: string;
  details?: Record<string, unknown>;
}

export type RendererMonitorEvent = RendererMonitorErrorEvent;

export type RendererMonitor = (event: RendererMonitorEvent) => void;
```

`SchemaRendererProps.monitor?: RendererMonitor`（`types/renderer-hooks.ts`，additive 可选 prop）。

---

## 传递路径（已实现）

```
<SchemaRenderer monitor={handler}>
  │
  ├─ 1. Runtime 创建参数线程化（动作诊断面）
  │     SchemaRenderer → createRendererRuntime({ monitor })
  │     → createActionDispatcher({ monitor })
  │     → ActionDispatcherContext.monitor
  │     → reportActionError 在 onActionError 钩子自失败时 emit
  │       { type: 'error', phase: 'action', error, details: { source: 'onActionError-hook' } }
  │
  └─ 2. React Context 线程化（渲染边界面）
        SchemaRenderer → <MonitorContext.Provider value={monitor}>
        → NodeErrorBoundary / SchemaRootErrorBoundary componentDidCatch emit
          { type: 'error', phase: 'render', error, nodeId? }
```

实现落点：

| 落点                                | 文件                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 类型定义                            | `packages/flux-core/src/types/monitor.ts`                                                                                                 |
| 根 prop                             | `packages/flux-core/src/types/renderer-hooks.ts`（`SchemaRendererProps.monitor`）                                                         |
| Dispatcher ctx 字段 + 错误诊断 emit | `packages/flux-action-core/src/action-dispatcher/types.ts`、`action-diagnostics.ts`（emit 本体；`action-execution.ts` 为调用方）          |
| Runtime 创建参数                    | `packages/flux-runtime/src/runtime-factory.ts`                                                                                            |
| React context + 边界 emit           | `packages/flux-react/src/contexts.ts`（`MonitorContext`）、`node-error-boundary.tsx`、`monitor-emit.ts`（共享 fire-and-forget emit）      |
| 判别测试                            | `packages/flux-react/src/__tests__/monitor-channel.test.tsx`、`packages/flux-action-core/src/__tests__/action-dispatcher-monitor.test.ts` |

---

## 已知缺口（后续迭代）

以下事件类型尚未纳入实现，将来按需添加（完整 union + 内部调用点全量接线属 feature 节奏，deep-audit 2026-11-02 / plan 841 Non-Blocking Follow-up 已登记）：

- 动作生命周期（`action:start` / `action:end`）、API（`api:request` / `api:response`）、渲染生命周期（`render:start` / `render:end`）、表达式诊断（`expression:undefined-variable`）
- `navigate`：`env.navigate(to)` 被调用时
- `confirm` / `alert`：模态对话框 UX 阻塞事件
- `stream:request / stream:chunk / stream:end`：流式读取器生命周期事件

另有两处相邻但独立的观测面，不属于本通道：

- **公式侧窄接口**：`ExpressionExecutionEnv.monitor?.onError`（`flux-core/src/types/expression-env-types.ts`）为 formula 包自有的窄类型面；formula 编译器当前的 reporter 为空操作 stub（`formula-compiler.ts`），未接入本通道。
- **nop-debugger**：使用其自有 event store（与 Monitor 机制无关）。
