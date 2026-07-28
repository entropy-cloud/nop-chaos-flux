# 遥测监控 (Monitor)

> Flux 的 Monitor 是一套轻量、可插拔的运行时遥测接口，用于观察 flux 内部发生的动作执行、API 请求、通知、错误、渲染等事件。Monitor **独立于 `RendererEnv`**，作为一个单独的 `<SchemaRenderer>` prop 传入，宿主也可以完全不传（默认不启用）。

---

## 设计原则

1. **单一函数**：Monitor 是一个函数 `onEvent(event: MonitorEvent)`，没有多个钩子。新增事件类型只需新增 discriminated union 变体，不需要改接口。

2. **独立于 env**：Monitor 不作为 `RendererEnv` 的属性，而是 `<SchemaRenderer monitor={onEvent}>` 的一个独立 prop。这样可以清晰分离"宿主能力"（env）和"运行时观测"（monitor）。

3. **同步 fire-and-forget**：`onEvent` 是同步调用、无返回值、不 throw 的。monitor 不应阻塞运行时逻辑，运行时也不依赖 monitor 的返回值。monitor 内部 throw 会被 `try/catch` 捕获并 `console.warn`，不影响业务逻辑。

4. **request + response 成对**：对有往返的事件（动作、API），同时提供 start/end 对，方便计算耗时和追踪完整生命周期。API 失败也应 emit `api:response`（带 error status），保证配对完整。

5. **E2E 友好**：Monitor 的事件流可以被宿主挂到 `window` 上供 E2E 测试读取，也可以传给自研的埋点 / APM 系统。

---

## 接口定义

### MonitorEvent

```typescript
type MonitorEvent =
  // ── 用户通知 ──
  | {
      type: 'notify';
      level: 'info' | 'success' | 'warning' | 'error';
      message: string;
    }

  // ── 动作生命周期 ──
  | {
      type: 'action:start';
      actionType: string;
      nodeId?: string;
      path?: SchemaPath;
      interactionId?: string;
    }
  | {
      type: 'action:end';
      actionType: string;
      nodeId?: string;
      path?: SchemaPath;
      interactionId?: string;
      durationMs: number;
      result?: ActionResult;
    }

  // ── API 请求/响应（成对，失败也 emit response） ──
  | {
      type: 'api:request';
      api: ExecutableApiRequest;
      actionType?: string;
      nodeId?: string;
      path?: SchemaPath;
      interactionId?: string;
    }
  | {
      type: 'api:response';
      api: ExecutableApiRequest;
      result: ApiResponse;
      actionType?: string;
      nodeId?: string;
      path?: SchemaPath;
      interactionId?: string;
      durationMs: number;
    }

  // ── 运行时错误 ──
  | {
      type: 'error';
      phase: 'compile' | 'render' | 'action' | 'expression' | 'api';
      error: unknown;
      nodeId?: string;
      path?: SchemaPath;
      details?: Record<string, unknown>;
    }

  // ── 渲染生命周期 ──
  | {
      type: 'render:start';
      nodeId: string;
      path: SchemaPath;
      componentType: string;
    }
  | {
      type: 'render:end';
      nodeId: string;
      path: SchemaPath;
      componentType: string;
      durationMs: number;
    };
```

### RendererMonitor 类型

```typescript
type RendererMonitor = (event: MonitorEvent) => void;
```

---

## Monitor 的传递路径

Monitor 独立于 env，内部运行时约 20 个调用点需要访问它。传递路径如下：

```
<SchemaRenderer monitor={handler}>
  │
  ├─ 1. SchemaRenderer 在 useMemo 中创建 Runtime
  │     └─ 将 monitor 存入 Runtime 实例的 monitor 字段
  │
  ├─ 2. SchemaRenderer 调用 applyMonitor(env, monitor)
  │     └─ 返回 decoratedEnv（notify/fetcher 被装饰）
  │     └─ decoratedEnv 传给 Runtime（Runtime 用 env 做标准操作）
  │
  ├─ 3. Action 执行器从 ActionContext.scope 获取 monitor
  │     └─ action-execution.ts 从 ctx 获取 monitor
  │     └─ action-runners.ts 从 ctx 获取 monitor
  │
  ├─ 4. 共享工具函数（reportRuntimeHostIssue 等）
  │     └─ 额外接受 monitor 参数（不为空时 emit）
  │
  └─ 5. React 渲染层通过 useRenderMonitor 获取 monitor
        └─ node-renderer-effects.ts 从 Runtime 获取 monitor
```

具体来说：

### 3.1 Runtime 实例持有 monitor

每个 Runtime 实例有一个公开的 `monitor` 字段（非 `__` 前缀，是设计契约的一部分）：

```typescript
// 在 SchemaRenderer 的 useMemo 中
const runtime = useMemo(() => {
  // ...
  if (runtimeInstance && monitor) {
    runtimeInstance.monitor = monitor; // 公开字段，供内部模块读取
  }
  return runtimeInstance;
}, [schema, env, monitor]);
```

Runtime 实例是一个对象引用稳定的 React ref，内部模块可以通过它访问 monitor。

### 3.2 Action 执行上下文获取 monitor

`ActionDispatcherContext` 和 `ActionContext` 增加 `monitor` 字段：

```typescript
interface ActionContext {
  // ... 现有字段
  /** 运行时 monitor，可能为 undefined */
  monitor?: RendererMonitor;
}
```

在 action 执行链入口处从 Runtime 实例读取并设置：

```typescript
// SchemaRenderer 创建 action 执行器时
const dispatcher = createActionDispatcher(runtime, {
  monitor: runtime.monitor,
  // ...
});
```

### 3.3 共享工具函数接受可选 monitor

```typescript
// runtime-host-reporting.ts
function reportRuntimeHostIssue(
  input: { env: RendererEnv; notify?: boolean },
  /* new */ monitor?: RendererMonitor,
) {
  if (monitor) {
    monitor({ type: 'error', phase: input.phase ?? 'render', error, details });
  }
  // ...
}
```

调用点传入 monitor（有则传，无则 undefined）。

---

## applyMonitor：装饰 env 所有函数以自动 emit 事件

Monitor 不直接属于 `RendererEnv`，但通过 `applyMonitor(env, monitor)` 一次性装饰 `env` 上所有可观察的函数，使每次调用自动 emit 对应事件：

> `ctx.actionType` 由 action runner 在执行 `env.fetcher` 之前注入 `ApiRequestContext`。如果 `fetcher` 调用不是由 action runner 发起的（例如宿主直接调用），`ctx.actionType` 可能为 undefined。

```typescript
function applyMonitor(env: RendererEnv, monitor: RendererMonitor): RendererEnv {
  const emit = (event: MonitorEvent) => {
    try {
      monitor(event);
    } catch (err) {
      console.warn('[flux] monitor.onEvent threw:', err);
    }
  };

  // fetcher 单独处理（需要 start/end 配对 + 计时 + 异常路径）
  const wrapFetcher: RendererEnv['fetcher'] = async (api, ctx) => {
    emit({
      type: 'api:request',
      api,
      actionType: ctx?.actionType,
      nodeId: ctx?.nodeId,
      interactionId: ctx?.interactionId,
    });
    const start = performance.now();
    try {
      const result = await env.fetcher(api, ctx);
      emit({
        type: 'api:response',
        api: { ...api },
        result,
        actionType: ctx?.actionType,
        nodeId: ctx?.nodeId,
        interactionId: ctx?.interactionId,
        durationMs: performance.now() - start,
      });
      return result;
    } catch (error) {
      emit({
        type: 'api:response',
        api: { ...api },
        result: {
          status: -1,
          data: null,
          msg: error instanceof Error ? error.message : String(error),
        },
        actionType: ctx?.actionType,
        nodeId: ctx?.nodeId,
        interactionId: ctx?.interactionId,
        durationMs: performance.now() - start,
      });
      throw error;
    }
  };

  // 其余函数用通用包装器
  const wrapSimple = <T extends (...args: any[]) => any>(
    fn: T,
    eventType: MonitorEvent['type'],
    buildArgs?: (...args: Parameters<T>) => Record<string, unknown>,
  ): T =>
    ((...args: any[]) => {
      emit({ type: eventType, ...buildArgs?.(...(args as Parameters<T>)) } as MonitorEvent);
      return fn(...args);
    }) as T;

  return {
    ...env,
    fetcher: wrapFetcher,
    notify: wrapSimple(env.notify, 'notify', (level, message) => ({ level, message }) as any),
    // 以下函数 emit 通用事件，具体 payload 待后续扩展
    navigate: env.navigate ? wrapSimple(env.navigate, 'navigate' as any) : undefined,
    confirm: env.confirm ? wrapSimple(env.confirm, 'confirm' as any) : undefined,
    alert: env.alert ? wrapSimple(env.alert, 'alert' as any) : undefined,
    stream: env.stream ? wrapSimple(env.stream, 'stream:request' as any) : undefined,
    openSocket: env.openSocket ? wrapSimple(env.openSocket, 'openSocket' as any) : undefined,
    loadPage: env.loadPage ? wrapSimple(env.loadPage, 'load:page' as any) : undefined,
    loadDict: env.loadDict ? wrapSimple(env.loadDict, 'load:dict' as any) : undefined,
  };
}
```

> **注意**：`{ ...api }` 是浅拷贝，`api.data` 通过引用共享。消费者不应依赖事件后被突变的数据。

---

## SchemaRenderer 集成

由于 monitor **设置后不会修改**，`applyMonitor` 只需在 SchemaRenderer 初始化时调用一次：

```typescript
function createSchemaRenderer(defs) {
  return function SchemaRenderer({ schema, env, monitor, ...props }) {
    // monitor 不可变，首次渲染后不会重建
    const decoratedEnv = useMemo(
      () => (monitor ? applyMonitor(env, monitor) : env),
      [env, monitor],
    )

    const runtime = useMemo(() => {
      const inst = createRuntime({ env: decoratedEnv, ... })
      if (monitor) {
        inst.monitor = monitor
      }
      return inst
    }, [schema, decoratedEnv])

    // ...
  }
}
```

> `monitor` 不在 `runtime` 的依赖数组中，因为 monitor 不可变——它在首次创建后不会变化，无需触发 runtime 重建。`decoratedEnv` 的依赖是 `[env, monitor]`，因为 env 可能由宿主重建（如语言环境切换），此时需要重新装饰。

---

## 事件触发时机

| 事件           | 触发时机                                        | 触发位置                         | 如何获取 monitor            |
| -------------- | ----------------------------------------------- | -------------------------------- | --------------------------- |
| `notify`       | `env.notify(level, message)` 被调用时           | `applyMonitor` 的 notify 装饰器  | 通过装饰器自动 emit         |
| `action:start` | action runner 执行前                            | `action-execution.ts`            | 从 ActionContext.monitor    |
| `action:end`   | action runner 完成后（含失败）                  | `action-execution.ts`            | 从 ActionContext.monitor    |
| `api:request`  | `env.fetcher` 被调用时                          | `applyMonitor` 的 fetcher 装饰器 | 通过装饰器自动 emit         |
| `api:response` | `env.fetcher` 返回或 throw 时                   | `applyMonitor` 的 fetcher 装饰器 | 通过装饰器自动 emit         |
| `error`        | 内部错误（action/expression/API adaptor throw） | 各错误路径                       | 从 Runtime 实例或上下文参数 |
| `render:start` | React 组件 mount 时                             | `node-renderer-effects.ts`       | 从 Runtime 实例             |
| `render:end`   | React 组件 unmount 时                           | `node-renderer-effects.ts`       | 从 Runtime 实例             |

---

## 宿主使用示例

### 最小实现：console.log

```typescript
<SchemaRenderer
  schema={schema}
  env={env}
  monitor={(event) => {
    if (event.type === 'error') {
      console.error('[flux]', event.phase, event.error)
    }
  }}
/>
```

### E2E 测试：记录所有事件

```typescript
// fixture 中注入
const events: MonitorEvent[] = []

const TestApp = () => (
  <SchemaRenderer
    schema={schema}
    env={env}
    monitor={(e) => events.push(e)}
  />
)

// 测试断言
expect(events.filter(e => e.type === 'notify' && e.level === 'error')).toHaveLength(0)

// 检查某次 API 调用是否成功
const apiResp = events.find(e => e.type === 'api:response')
expect(apiResp?.result.status).toBe(0)
```

### APM / 埋点集成

```typescript
const monitor: RendererMonitor = (event) => {
  if (event.type === 'action:start') {
    apm.startSpan(`action:${event.actionType}`);
  } else if (event.type === 'action:end') {
    apm.endSpan(`action:${event.actionType}`, event.durationMs);
  } else if (event.type === 'error') {
    apm.recordError(event.error, { phase: event.phase });
  }
};
```

---

## E2E 测试中的应用

在 Playwright 测试中，可以通过 `page.evaluate` 访问宿主挂到 `window` 上的事件队列。这是 **宿主责任**——flux 核心不自动暴露 `window.__fluxEvents`。宿主在测试模式下可以这样设置：

```typescript
// 宿主 app 的 flux 初始化（测试模式）
const fluxEvents: MonitorEvent[] = []

// 可选：暴露到 window 供 Playwright 读取
if (import.meta.env.DEV || process.env.VITEST) {
  ;(window as any).__fluxEvents = fluxEvents
}

<SchemaRenderer
  schema={schema}
  env={env}
  monitor={(e) => { fluxEvents.push(e) }}
/>
```

Playwright 测试中：

```typescript
// 检查操作过程中没有 error notify
const errors = await page.evaluate(
  () =>
    (window as any).__fluxEvents?.filter((e: any) => e.type === 'notify' && e.level === 'error') ??
    [],
);
expect(errors).toHaveLength(0);

// 检查对应 API 请求成功
const apiResps = await page.evaluate(
  () => (window as any).__fluxEvents?.filter((e: any) => e.type === 'api:response') ?? [],
);
expect(apiResps.some((r) => r.result.status === 0)).toBe(true);
```

---

## 与现有机制的对比

| 维度            | 旧机制（6 钩子 + env.monitor）           | 新机制（onEvent + 独立 prop）              |
| --------------- | ---------------------------------------- | ------------------------------------------ |
| 接口数          | 6 个可选方法                             | 1 个函数                                   |
| 扩展性          | 新增事件需加新方法 + 新 payload 类型     | 新增事件只需加 union 变体                  |
| `notify` 可见性 | 不在 monitor 范围内                      | 通过装饰器自动捕获                         |
| `api:response`  | 无                                       | 通过装饰器自动捕获（含 throw 路径）        |
| API 失败时配对  | 无                                       | 始终 emit `api:response`，保证配对         |
| 与 env 耦合     | 作为 `env.monitor` 属性                  | 独立 prop，env 不感知                      |
| 双重包装风险    | nop-debugger 和 env 装饰器都包装 fetcher | 单一所有者：applyMonitor 的装饰器          |
| 传递到 Runtime  | 随 env 自动传递                          | 通过 Runtime 实例 + ActionContext 显式传递 |

---

## 迁移路径

### 阶段 1：新增 monitor prop + applyMonitor（无 breaking change）

1. 定义 `MonitorEvent` discriminated union 和 `RendererMonitor` 类型
2. `SchemaRendererProps` 增加 `monitor?: RendererMonitor`
3. 实现 `applyMonitor(env, monitor)` — 基于已有的 `decorateRendererEnv`
4. `createSchemaRenderer` 内部检测 `monitor` prop：
   - 调用 `applyMonitor` 装饰 env
   - 将 monitor 存入 Runtime 实例
5. `ActionDispatcherContext` / `ActionContext` 增加 `monitor` 字段，在入口处从 Runtime 实例读取
6. 共享工具函数（`reportRuntimeHostIssue`、`reportImportFailure`）增加可选 `monitor` 参数
7. `node-renderer-effects.ts` 从 Runtime 实例读取 monitor（已有 `input.monitor` 参数，保持兼容）

### 阶段 2：内部调用点切换

更新约 20 个内部调用点，从 `env.monitor?.onXxx?.({...})` 改为通过 context / Runtime / 参数获取的 monitor 调用 `monitor?.({ type: 'xxx', ... })`。

### 阶段 3：nop-debugger 适配

nop-debugger 从包装 6 个 monitor 钩子 + 独立 fetcher 包装改为实现单个 `onEvent` 函数，消除双重包装问题。

### 阶段 4：废弃旧接口（可选）

标记 `RendererMonitor` 的 6 个钩子为 `@deprecated`，未来版本移除。过渡期间兼容策略：

| 新旧状态              | 行为                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| 只传新 `monitor` prop | 新逻辑生效                                                                  |
| 只设旧 `env.monitor`  | 旧逻辑生效（向后兼容）                                                      |
| 同时存在              | 新 monitor prop 优先，旧 `env.monitor` 被忽略（通过 console.warn 提醒迁移） |

---

## 已知缺口（后续迭代）

以下事件类型尚未纳入 MonitorEvent，将来可按需添加：

- **`navigate`**：`env.navigate(to)` 被调用时。可通过装饰器自动捕获。
- **`confirm` / `alert`**：模态对话框是显著的 UX 阻塞事件。
- **`stream:request / stream:chunk / stream:end`**：流式读取器（`env.stream`）的生命周期事件。
