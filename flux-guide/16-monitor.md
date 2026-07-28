# Monitor：运行时遥测

> 通过 `<SchemaRenderer monitor={onEvent}>` 观察运行时事件（notify、动作、API 请求/响应、错误、渲染）。类型定义见 `packages/flux-core/src/types/renderer-api.ts`，设计文档见 `../docs/architecture/flux-monitor.md`。

---

## Monitor 独立于 env

Monitor 是 `<SchemaRenderer>` 的独立 prop，不属于 `RendererEnv`：

```typescript
<SchemaRenderer
  schema={schema}
  env={env}
  monitor={(event) => {
    if (event.type === 'error') console.error('[flux]', event.phase, event.error)
  }}
/>
```

不传则默认不启用，不影响任何运行时行为。

---

## 事件类型

| 事件                           | 说明                                                     |
| ------------------------------ | -------------------------------------------------------- |
| `notify`                       | `env.notify(level, message)` 被调用时。由装饰器自动捕获  |
| `action:start` / `action:end`  | Action 执行前后。含 `actionType`、`durationMs`、`result` |
| `api:request` / `api:response` | `env.fetcher` 调用时。自动捕获，失败也 emit response     |
| `error`                        | 运行时错误（action/expression/API adaptor throw）        |
| `render:start` / `render:end`  | React 组件挂载/卸载时                                    |

---

## 自动捕获：env 装饰

传了 `monitor` 后，`env.notify` 和 `env.fetcher` 会被自动装饰，`notify`、`api:request`、`api:response` 事件自动 emit，无需额外配置。

---

## 宿主集成

```typescript
// 最小实现：打印错误
<SchemaRenderer
  schema={schema}
  env={env}
  monitor={(event) => {
    if (event.type === 'error') {
      console.error('[flux]', event.phase, event.error)
    }
  }}
/>

// APM 集成
<SchemaRenderer
  schema={schema}
  env={env}
  monitor={(event) => {
    if (event.type === 'action:start') apm.startSpan(`action:${event.actionType}`)
    if (event.type === 'action:end') apm.endSpan(`action:${event.actionType}`, event.durationMs)
    if (event.type === 'error') apm.recordError(event.error, { phase: event.phase })
  }}
/>
```

---

## E2E 测试：为什么必须用 monitor，为什么 page.error 不够

### 常见陷阱：前台报错但测试没发现

Flux 运行时遇到错误（API 返回 `status: -1`、action throw 等）时，默认行为是调用 `env.notify('error', message)` 显示 toast。这个 toast 是**业务错误**，不是 JS 异常。

`page.on('pageerror')` 只能捕获**未处理的 JS 异常**（`TypeError`、React crash 等），**无法捕获业务错误 toast**。如果宿主的 `notify` 实现只调 `toast.error()` 而不 `console.error()`，则现有的 `errorMonitor` fixture（监听 `console.error` + `pageerror`）也捕获不到。

### 后果

```
后端返回 保存失败 (status: -1)
  → Flux runtime 调 env.notify('error', '保存失败')
  → 宿主显示 toast（用户看到报错）
  → 测试通过 ✅（pageerror 未触发，console.error 未触发）
  → 前台报错了，但 E2E 测试没发现 ❌
```

### 解决方案

使用 monitor 监听 `type: 'notify'` + `level: 'error'` 事件，能捕获所有业务错误 toast。

### 测试写法

Step 1：宿主在 test harness 中把 monitor 事件写入 `window.__fluxEvents`：

```typescript
// 测试模式下的 SchemaRenderer 调用
const fluxEvents: MonitorEvent[] = []
if (import.meta.env.DEV || process.env.VITEST) {
  ;(window as any).__fluxEvents = fluxEvents
}

<SchemaRenderer
  schema={schema}
  env={env}
  monitor={(e) => { fluxEvents.push(e) }}
/>
```

Step 2：Playwright 测试中断言零错误：

```typescript
// 在页面操作后检查是否有错误 toast
const notifyErrors = await page.evaluate(
  () =>
    (window as any).__fluxEvents?.filter((e: any) => e.type === 'notify' && e.level === 'error') ??
    [],
);
expect(notifyErrors, `Unexpected error toasts: ${JSON.stringify(notifyErrors)}`).toHaveLength(0);

// 也检查运行时错误（action throw、expression 求值失败等）
const runtimeErrors = await page.evaluate(
  () => (window as any).__fluxEvents?.filter((e: any) => e.type === 'error') ?? [],
);
expect(runtimeErrors, `Unexpected runtime errors: ${JSON.stringify(runtimeErrors)}`).toHaveLength(
  0,
);

// 同时保留 page.on('pageerror') 捕获 JS 异常（已有的 errorMonitor fixture）
// 两者互补，覆盖所有错误类型
```

### 覆盖矩阵

| 错误类型                      | page.on('pageerror') | monitor('error')        | monitor('notify', 'error') |
| ----------------------------- | -------------------- | ----------------------- | -------------------------- |
| JS 异常（TypeError 等）       | ✅                   | ❌（除非 action throw） | ❌                         |
| React crash（Error Boundary） | ✅                   | ❌                      | ❌                         |
| API 业务失败（status: -1）    | ❌                   | ❌（需要 action throw） | ✅ 由 env.notify 自动捕获  |
| action throw 未处理           | ❌                   | ✅ 由 error 事件捕获    | ❌                         |
| 验证错误                      | ❌                   | ❌                      | ❌（形式校验不走 notify）  |

**最佳实践**：三者同时使用，互补覆盖。`page.on('pageerror')` + monitor 的 `error` + monitor 的 `notify` 三者结合，才能覆盖全部错误类型。

---

## 与旧 env.monitor 的区别

| 旧机制（已移除）           | 新机制                    |
| -------------------------- | ------------------------- |
| 6 个钩子方法               | 1 个 `onEvent` 函数       |
| 新增事件需加新方法         | 新增事件只需加 union 变体 |
| `notify` 在 monitor 范围外 | 自动捕获                  |
| 无 `api:response`          | 自动捕获（含 throw 路径） |
| 作为 `env.monitor`         | 独立 prop                 |
